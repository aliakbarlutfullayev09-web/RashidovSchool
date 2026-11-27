import hmac
from contextlib import asynccontextmanager

import httpx
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import BufferedInputFile, LabeledPrice, Update
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from admin_bot import admin_router
from config import get_settings
from student_bot import STARS_PRICES, student_router
from supabase_client import SupabaseRest


class CreateStarsInvoiceRequest(BaseModel):
    stars: int
    userId: int | None = None


class SendLessonVideoRequest(BaseModel):
    userId: int
    lessonId: int | None = None
    videoUrl: str | None = None
    title: str | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
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

    sb = SupabaseRest(settings.SUPABASE_URL, settings.SUPABASE_KEY, sb_http)

    student_dp = Dispatcher()
    student_dp["sb"] = sb
    student_dp["tg_http"] = tg_http
    student_dp["settings"] = settings
    student_dp.include_router(student_router)

    admin_dp = Dispatcher()
    admin_dp["sb"] = sb
    admin_dp["settings"] = settings
    admin_dp["student_bot"] = student_bot
    admin_dp.include_router(admin_router)

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


app = FastAPI(title="Rashidov School Bots", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _verify_secret(secret_header: str | None, expected: str) -> None:
    if not secret_header or not hmac.compare_digest(secret_header, expected):
        raise HTTPException(status_code=403, detail="Forbidden")


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


@app.post("/api/payments/create-stars-invoice")
async def create_stars_invoice_link(
    req_data: CreateStarsInvoiceRequest,
    request: Request,
) -> dict[str, object]:
    if req_data.stars not in STARS_PRICES:
        raise HTTPException(status_code=400, detail="Invalid Stars package")
    neurons = STARS_PRICES[req_data.stars]
    formatted = f"{neurons:,}".replace(",", " ")
    bot: Bot = request.app.state.student_bot
    invoice_url = await bot.create_invoice_link(
        title=f"{formatted} Neyron",
        description=f"Rashidov School balansiga {formatted} Neyron darhol qo'shiladi.",
        payload=f"buy_neurons_{req_data.stars}",
        provider_token="",
        currency="XTR",
        prices=[LabeledPrice(label=f"{formatted} Neyron", amount=req_data.stars)],
    )
    return {"ok": True, "invoiceUrl": invoice_url}


@app.post("/api/lessons/send-video")
async def send_lesson_video(
    req_data: SendLessonVideoRequest,
    request: Request,
) -> dict[str, object]:
    bot: Bot = request.app.state.student_bot
    sb: SupabaseRest = request.app.state.sb

    video_url = (req_data.videoUrl or "").strip()
    title = (req_data.title or "").strip()

    if req_data.lessonId:
        try:
            lesson = await sb.get_lesson(req_data.lessonId)
            if lesson:
                video_url = lesson.get("video_url") or video_url
                title = lesson.get("title") or title
        except Exception:
            pass

    if not video_url:
        raise HTTPException(status_code=400, detail="Video URL is missing")

    caption = title or "Video dars"
    try:
        await bot.send_video(
            chat_id=req_data.userId,
            video=video_url,
            caption=caption,
            supports_streaming=True,
            protect_content=True,
        )
        return {"ok": True, "protected": True}
    except Exception:
        async with httpx.AsyncClient(timeout=45.0, follow_redirects=True) as dl:
            media_resp = await dl.get(video_url)
            media_resp.raise_for_status()
            if len(media_resp.content) > 48 * 1024 * 1024:
                raise HTTPException(status_code=413, detail="Video exceeds 50MB bot upload limit")
            await bot.send_video(
                chat_id=req_data.userId,
                video=BufferedInputFile(media_resp.content, filename="lesson.mp4"),
                caption=caption,
                supports_streaming=True,
                protect_content=True,
            )
            return {"ok": True, "protected": True}
