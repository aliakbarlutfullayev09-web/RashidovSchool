import logging
import os
from contextlib import asynccontextmanager

import httpx
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import BufferedInputFile, LabeledPrice, Update
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from admin_bot import admin_router
from auth import sign_supabase_jwt, verify_bearer_jwt, verify_telegram_init_data, verify_webhook_secret
from config import get_settings
from payment_logic import STARS_PRODUCTS, generate_stars_merchant_trans_id
from security_utils import SSRFError, build_allowed_video_hosts, validate_external_video_url
from student_bot import student_router
from supabase_client import SupabaseRest

logger = logging.getLogger("backend.api")


class TelegramAuthRequest(BaseModel):
    initData: str
    app: str = "user"


class AdminSendMessageRequest(BaseModel):
    telegramId: int
    text: str


class CreateStarsInvoiceRequest(BaseModel):
    productId: str


class SendLessonVideoRequest(BaseModel):
    lessonId: int


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if not settings.WEBHOOK_SECRET or not settings.WEBHOOK_SECRET.strip():
        raise RuntimeError("WEBHOOK_SECRET must be configured and non-empty")
    if not settings.supabase_server_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY must be configured")

    sb_http = httpx.AsyncClient(timeout=10.0)
    tg_http = httpx.AsyncClient(timeout=10.0)

    student_bot = Bot(
        token=settings.STUDENT_BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    admin_bot = Bot(
        token=settings.ADMIN_BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )

    sb = SupabaseRest(settings.SUPABASE_URL, settings.supabase_server_key, sb_http)

    student_dp = Dispatcher()
    student_dp["sb"] = sb
    student_dp["tg_http"] = tg_http
    student_dp["settings"] = settings
    student_dp.include_router(student_router)

    @student_dp.error()
    async def on_student_dp_error(event):
        logger.error("Unhandled student update error: %s", type(event.exception).__name__)
        return True

    admin_dp = Dispatcher()
    admin_dp["sb"] = sb
    admin_dp["settings"] = settings
    admin_dp["student_bot"] = student_bot
    admin_dp.include_router(admin_router)

    @admin_dp.error()
    async def on_admin_dp_error(event):
        logger.error("Unhandled admin update error: %s", type(event.exception).__name__)
        return True

    app.state.settings = settings
    app.state.sb = sb
    app.state.student_bot = student_bot
    app.state.admin_bot = admin_bot
    app.state.student_dp = student_dp
    app.state.admin_dp = admin_dp

    try:
        yield
    finally:
        await student_bot.session.close()
        await admin_bot.session.close()
        await sb_http.aclose()
        await tg_http.aclose()


def _env_cors_origins() -> list[str]:
    raw = ",".join(
        filter(
            None,
            [
                os.getenv("ALLOWED_ORIGINS", ""),
                os.getenv("STUDENT_WEBAPP_URL", ""),
                os.getenv("ADMIN_WEBAPP_URL", ""),
            ],
        )
    )
    origins: list[str] = []
    for item in raw.split(","):
        clean = item.strip().rstrip("/")
        if clean and clean not in origins:
            origins.append(clean)
    return origins


app = FastAPI(title="Rashidov School Bots", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_env_cors_origins(),
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
    logger.warning("unhandled_error path=%s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"ok": False, "code": "INTERNAL_ERROR", "error": "Internal server error"},
    )


@app.get("/health")
async def healthcheck():
    return {"ok": True}


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _enforce_rate_limit(sb: SupabaseRest, buckets: list[tuple[str, int, int]]) -> None:
    for key, limit, window_sec in buckets:
        verdict = await sb.check_rate_limit(key, limit, window_sec)
        if not verdict.get("allowed"):
            retry_after = max(1, int(verdict.get("retry_after") or window_sec))
            raise HTTPException(
                status_code=429,
                detail="Too many requests",
                headers={"Retry-After": str(retry_after)},
            )


def _verify_secret(secret_header: str | None, expected: str) -> None:
    if not verify_webhook_secret(secret_header, expected):
        raise HTTPException(status_code=403, detail="Forbidden")


async def _resolve_admin_user(
    request: Request,
    authorization: str | None,
    x_telegram_init_data: str | None,
) -> dict:
    settings = request.app.state.settings
    sb: SupabaseRest = request.app.state.sb
    telegram_id: int | None = None

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        try:
            claims = verify_bearer_jwt(token, settings.jwt_signing_secret)
            telegram_id = int(claims["telegram_id"])
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid session token") from exc
    elif x_telegram_init_data:
        try:
            verified = verify_telegram_init_data(
                x_telegram_init_data,
                [settings.ADMIN_BOT_TOKEN, settings.STUDENT_BOT_TOKEN],
                max_age_seconds=settings.INIT_DATA_MAX_AGE_SECONDS,
            )
            telegram_id = verified["telegram_id"]
        except ValueError as exc:
            raise HTTPException(status_code=401, detail="Invalid Telegram initData") from exc
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    user = await sb.get_user(telegram_id)
    if not user or user.get("role") not in ("teacher", "admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


@app.post("/api/auth/telegram")
async def auth_telegram(req_data: TelegramAuthRequest, request: Request) -> dict[str, object]:
    settings = request.app.state.settings
    sb: SupabaseRest = request.app.state.sb
    await _enforce_rate_limit(sb, [(f"auth:backend:ip:{_client_ip(request)}", 20, 60)])
    app_mode = "admin" if req_data.app == "admin" else "user"
    tokens = (
        [settings.ADMIN_BOT_TOKEN, settings.STUDENT_BOT_TOKEN]
        if app_mode == "admin"
        else [settings.STUDENT_BOT_TOKEN]
    )

    try:
        verified = verify_telegram_init_data(
            req_data.initData,
            tokens,
            max_age_seconds=settings.INIT_DATA_MAX_AGE_SECONDS,
        )
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc

    tid = verified["telegram_id"]
    tg_user = verified["tg_user"]
    full_name = " ".join(
        p for p in (tg_user.get("first_name"), tg_user.get("last_name")) if p
    ).strip() or "Student"

    user = await sb.get_user(tid)
    if app_mode == "admin":
        if not user or user.get("role") not in ("teacher", "admin", "superadmin"):
            raise HTTPException(status_code=403, detail="Forbidden")
        perms = user.get("permissions") or {"can_promo": False, "can_gift": False, "can_send": False}
        if user.get("role") in ("superadmin", "admin"):
            perms = {"can_promo": True, "can_gift": True, "can_send": True}
        user = {**user, "permissions": perms}
    else:
        if user is None:
            lang = "ru" if tg_user.get("language_code") == "ru" else "uz"
            user = await sb.create_user(telegram_id=tid, full_name=full_name, language=lang)

    jwt_token = sign_supabase_jwt(
        telegram_id=tid,
        app_role=str(user.get("role") or "student"),
        jwt_secret=settings.jwt_signing_secret,
        ttl_seconds=settings.SESSION_JWT_TTL_SECONDS,
    )
    return {"ok": True, "token": jwt_token, "user": user}


@app.get("/api/admin/student-profile/{telegram_id}")
async def admin_student_profile(
    telegram_id: int,
    request: Request,
    authorization: str | None = Header(default=None),
    x_telegram_init_data: str | None = Header(default=None),
) -> dict[str, object]:
    await _resolve_admin_user(request, authorization, x_telegram_init_data)
    bot: Bot = request.app.state.student_bot
    try:
        chat = await bot.get_chat(telegram_id)
        return {
            "ok": True,
            "profile": {
                "username": chat.username or "",
                "first_name": chat.first_name or "",
                "last_name": chat.last_name or "",
                "bio": getattr(chat, "bio", "") or "",
            },
        }
    except Exception:
        return {"ok": False, "profile": None}


@app.post("/api/admin/send-message")
async def admin_send_message(
    req_data: AdminSendMessageRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    x_telegram_init_data: str | None = Header(default=None),
) -> dict[str, object]:
    admin_user = await _resolve_admin_user(request, authorization, x_telegram_init_data)
    role = admin_user.get("role")
    perms = admin_user.get("permissions") or {}
    if role not in ("superadmin", "admin") and not perms.get("can_send"):
        raise HTTPException(status_code=403, detail="Missing can_send permission")

    clean_text = (req_data.text or "").strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Message text is required")

    bot: Bot = request.app.state.student_bot
    try:
        await bot.send_message(chat_id=req_data.telegramId, text=clean_text, parse_mode=None)
        return {"ok": True}
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to send message via Telegram")


@app.post("/webhook/student")
async def webhook_student(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict[str, bool]:
    _verify_secret(x_telegram_bot_api_secret_token, app.state.settings.WEBHOOK_SECRET)
    bot: Bot = app.state.student_bot
    update = Update.model_validate(await request.json(), context={"bot": bot})
    await app.state.student_dp.feed_update(bot, update)
    return {"ok": True}


@app.post("/webhook/admin")
async def webhook_admin(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict[str, bool]:
    _verify_secret(x_telegram_bot_api_secret_token, app.state.settings.WEBHOOK_SECRET)
    bot: Bot = app.state.admin_bot
    update = Update.model_validate(await request.json(), context={"bot": bot})
    await app.state.admin_dp.feed_update(bot, update)
    return {"ok": True}


async def _resolve_caller_telegram_id(
    request: Request,
    authorization: str | None,
    x_telegram_init_data: str | None,
) -> int:
    settings = request.app.state.settings
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        try:
            claims = verify_bearer_jwt(token, settings.jwt_signing_secret)
            return int(claims["telegram_id"])
        except Exception as exc:
            raise HTTPException(status_code=401, detail="Invalid session token") from exc
    if x_telegram_init_data:
        try:
            verified = verify_telegram_init_data(
                x_telegram_init_data,
                [settings.STUDENT_BOT_TOKEN],
                max_age_seconds=settings.INIT_DATA_MAX_AGE_SECONDS,
            )
            return int(verified["telegram_id"])
        except ValueError as exc:
            raise HTTPException(status_code=401, detail="Invalid Telegram initData") from exc
    raise HTTPException(status_code=401, detail="Authentication required")


@app.post("/api/payments/create-stars-invoice")
async def create_stars_invoice_link(
    req_data: CreateStarsInvoiceRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    x_telegram_init_data: str | None = Header(default=None),
) -> dict[str, object]:
    caller_id = await _resolve_caller_telegram_id(request, authorization, x_telegram_init_data)
    sb: SupabaseRest = request.app.state.sb
    await _enforce_rate_limit(
        sb,
        [
            (f"invoice:user:{caller_id}", 10, 60),
            (f"invoice:ip:{_client_ip(request)}", 20, 60),
        ],
    )
    product = STARS_PRODUCTS.get(req_data.productId)
    if not product:
        raise HTTPException(status_code=400, detail="Invalid Stars package")

    merchant_trans_id = generate_stars_merchant_trans_id(caller_id)
    await sb.create_payment_order(
        user_id=caller_id,
        merchant_trans_id=merchant_trans_id,
        provider="stars",
        product_id=product.product_id,
        currency="XTR",
        amount_minor=product.stars,
        xp_credited=product.neurons,
    )

    bot: Bot = request.app.state.student_bot
    try:
        invoice_url = await bot.create_invoice_link(
            title=product.title,
            description=f"Rashidov School balansiga {product.title} darhol qo'shiladi.",
            payload=merchant_trans_id,
            provider_token="",
            currency="XTR",
            prices=[LabeledPrice(label=product.title, amount=product.stars)],
        )
    except Exception:
        await sb.update_payment_status(merchant_trans_id, "failed")
        raise HTTPException(status_code=502, detail="Failed to create Stars invoice")

    return {"ok": True, "invoiceUrl": invoice_url, "orderId": merchant_trans_id}


async def _safe_download_video_bytes(url: str, max_bytes: int = 48 * 1024 * 1024) -> bytes:
    async with httpx.AsyncClient(timeout=20.0, follow_redirects=False) as dl:
        async with dl.stream("GET", url) as resp:
            if 300 <= resp.status_code < 400:
                raise HTTPException(status_code=403, detail="Redirects are forbidden")
            if resp.status_code != 200:
                raise HTTPException(status_code=502, detail="Video download failed")
            cl = resp.headers.get("content-length")
            if cl and int(cl) > max_bytes:
                raise HTTPException(status_code=413, detail="Video exceeds 50MB bot upload limit")
            chunks: list[bytes] = []
            total = 0
            async for chunk in resp.aiter_bytes():
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(status_code=413, detail="Video exceeds 50MB bot upload limit")
                chunks.append(chunk)
            return b"".join(chunks)


@app.post("/api/lessons/send-video")
async def send_lesson_video(
    req_data: SendLessonVideoRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    x_telegram_init_data: str | None = Header(default=None),
) -> dict[str, object]:
    caller_id = await _resolve_caller_telegram_id(request, authorization, x_telegram_init_data)
    settings = request.app.state.settings
    bot: Bot = request.app.state.student_bot
    sb: SupabaseRest = request.app.state.sb

    await _enforce_rate_limit(
        sb,
        [
            (f"video:user:{caller_id}", 15, 60),
            (f"video:ip:{_client_ip(request)}", 30, 60),
        ],
    )

    if req_data.lessonId <= 0:
        raise HTTPException(status_code=400, detail="Valid lessonId is required")

    access = await sb.check_lesson_access(caller_id, req_data.lessonId)
    if not access.get("found"):
        raise HTTPException(status_code=404, detail="Lesson not found")
    if not access.get("allowed"):
        raise HTTPException(status_code=403, detail="Access denied")

    raw_video = str(access.get("video_url") or "").strip()
    if not raw_video:
        raise HTTPException(status_code=400, detail="Video is not available")

    caption = str(access.get("title") or "Video dars").strip()
    is_url = "://" in raw_video
    if is_url:
        allowed_hosts = build_allowed_video_hosts(settings.SUPABASE_URL, settings.VIDEO_ALLOWED_HOSTS)
        try:
            video_source = validate_external_video_url(raw_video, allowed_hosts=allowed_hosts)
        except SSRFError as exc:
            raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    else:
        video_source = raw_video

    try:
        await bot.send_video(
            chat_id=caller_id,
            video=video_source,
            caption=caption,
            supports_streaming=True,
            protect_content=True,
        )
        return {"ok": True, "protected": True}
    except Exception:
        if not is_url:
            raise HTTPException(status_code=502, detail="Failed to send protected video via Telegram")
        media_bytes = await _safe_download_video_bytes(video_source)
        await bot.send_video(
            chat_id=caller_id,
            video=BufferedInputFile(media_bytes, filename="lesson.mp4"),
            caption=caption,
            supports_streaming=True,
            protect_content=True,
        )
        return {"ok": True, "protected": True}
