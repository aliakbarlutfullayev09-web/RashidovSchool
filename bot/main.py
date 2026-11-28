import asyncio
import logging
from aiogram import Bot, Dispatcher
from bot.config import config
from bot.db import create_pool
from bot.middlewares.auth import AuthMiddleware
from bot.handlers import start, testing, admin, ai_helper, payments
from bot.services.phase4_guards import handle_dispatcher_error
from bot.services.streak import setup_streak_scheduler

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
from bot.auth import sign_supabase_jwt, verify_telegram_init_data
from bot.db import create_user, get_user
from bot.handlers.payments import api_router as payments_api_router


class TelegramAuthRequest(BaseModel):
    initData: str
    app: str = "user"


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

logging.basicConfig(level=logging.INFO)

async def main():
    pool = await create_pool(config.DATABASE_URL)
    
    bot = Bot(token=config.BOT_TOKEN)
    dp = Dispatcher()
    
    # Apply auth middleware to messages and callback queries
    auth_middleware = AuthMiddleware()
    dp.message.middleware(auth_middleware)
    dp.callback_query.middleware(auth_middleware)
    
    # Quick middleware to inject pool
    @dp.update.outer_middleware()
    async def inject_pool(handler, event, data):
        data['pool'] = pool
        return await handler(event, data)
        
    dp.include_router(start.router)
    dp.include_router(testing.router)
    dp.include_router(admin.router)
    dp.include_router(ai_helper.router)
    dp.include_router(payments.router)

    @dp.error()
    async def global_bot_error_handler(event):
        return await handle_dispatcher_error(event)
    
    setup_streak_scheduler(pool)
    
    # Setup FastAPI
    app = FastAPI(title="Rashidov Biologiya API")
    app.state.pool = pool
    app.state.bot = bot
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Telegram-Init-Data"],
    )

    @app.middleware("http")
    async def security_headers_middleware(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Content-Security-Policy"] = "frame-ancestors https://web.telegram.org https://*.telegram.org;"
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(Exception)
    async def uniform_exception_handler(request: Request, exc: Exception):
        logging.getLogger("bot.api").warning("unhandled_error path=%s", request.url.path)
        return JSONResponse(
            status_code=500,
            content={"ok": False, "code": "INTERNAL_ERROR", "error": "Internal server error"},
        )

    @app.get("/health")
    async def healthcheck():
        return {"ok": True}

    @app.post("/api/auth/telegram")
    async def auth_telegram(req_data: TelegramAuthRequest, request: Request):
        ip = _client_ip(request)
        async with request.app.state.pool.acquire() as conn:
            import json as _json

            rl_raw = await conn.fetchval(
                "SELECT public.check_rate_limit($1, $2, $3)",
                f"auth:bot:ip:{ip}",
                20,
                60,
            )
            rl = _json.loads(rl_raw) if isinstance(rl_raw, str) else dict(rl_raw)
            if not rl.get("allowed"):
                return JSONResponse(
                    status_code=429,
                    headers={"Retry-After": str(max(1, int(rl.get("retry_after") or 60)))},
                    content={"ok": False, "code": "RATE_LIMIT_EXCEEDED", "error": "Too many requests"},
                )
        try:
            verified = verify_telegram_init_data(
                req_data.initData,
                [config.BOT_TOKEN],
                max_age_seconds=config.INIT_DATA_MAX_AGE_SECONDS,
            )
        except ValueError as exc:
            raise HTTPException(status_code=401, detail=str(exc)) from exc

        tid = verified["telegram_id"]
        tg_user = verified["tg_user"]
        full_name = " ".join(
            p for p in (tg_user.get("first_name"), tg_user.get("last_name")) if p
        ).strip() or "Student"
        app_mode = "admin" if req_data.app == "admin" else "user"

        user = await get_user(request.app.state.pool, tid)
        if app_mode == "admin":
            if not user or user.get("role") not in ("teacher", "admin", "superadmin"):
                raise HTTPException(status_code=403, detail="Forbidden")
        elif user is None:
            lang = "ru" if tg_user.get("language_code") == "ru" else "uz"
            user = await create_user(request.app.state.pool, tid, full_name, lang=lang)

        token = None
        if config.SUPABASE_JWT_SECRET:
            token = sign_supabase_jwt(
                telegram_id=tid,
                app_role=str(user.get("role") or "student"),
                jwt_secret=config.SUPABASE_JWT_SECRET,
                ttl_seconds=config.SESSION_JWT_TTL_SECONDS,
            )
        return {"ok": True, "token": token, "user": user}
    
    app.include_router(payments_api_router)
    
    uvicorn_config = uvicorn.Config(app, host="0.0.0.0", port=config.FASTAPI_PORT, log_level="info")
    server = uvicorn.Server(uvicorn_config)
    
    try:
        await asyncio.gather(
            dp.start_polling(bot),
            server.serve()
        )
    finally:
        await pool.close()

if __name__ == '__main__':
    asyncio.run(main())
