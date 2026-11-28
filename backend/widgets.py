import html
import logging
import zlib
from typing import Any

import httpx
from aiogram import Bot
from aiogram.enums import ParseMode
from aiogram.types import InlineKeyboardMarkup

from supabase_client import DEFAULT_SUPPORT_CONTACTS

logger = logging.getLogger(__name__)

_COMMON_CSS = (
    "*{box-sizing:border-box;margin:0;padding:0}"
    "body{background:#09090b;color:#fafafa;"
    "font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:10px}"
    ".card{background:rgba(255,255,255,0.04);"
    "border:1px solid rgba(255,255,255,0.09);border-radius:16px;padding:14px}"
    ".row{display:flex;align-items:center;justify-content:space-between;gap:8px}"
    ".title{font-size:16px;font-weight:700;letter-spacing:-0.01em;color:#fff}"
    ".badge{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);"
    "border-radius:999px;padding:4px 10px;font-size:12px;font-weight:600;"
    "color:#f4f4f5;white-space:nowrap;font-variant-numeric:tabular-nums}"
    ".sub{margin-top:8px;font-size:12.5px;line-height:1.45;color:#a1a1aa}"
    ".hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}"
    ".hdr-l{display:flex;align-items:center;gap:8px}"
    ".ico{width:28px;height:28px;border-radius:9px;display:flex;align-items:center;"
    "justify-content:center;font-size:14px;flex-shrink:0}"
    ".ico-em{background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.28)}"
    ".ico-pu{background:rgba(168,85,247,0.15);border:1px solid rgba(168,85,247,0.28)}"
    ".ico-bl{background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.28)}"
    ".id-bar{display:flex;align-items:center;justify-content:space-between;"
    "padding:9px 12px;border-radius:12px;background:rgba(255,255,255,0.05);"
    "border:1px solid rgba(255,255,255,0.08);margin-bottom:8px}"
    ".id-lbl{font-size:11px;font-weight:600;letter-spacing:0.06em;color:#71717a}"
    ".id-val{font-size:17px;font-weight:700;color:#fff;font-variant-numeric:tabular-nums}"
    ".item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;"
    "background:#141417;border:1px solid rgba(255,255,255,0.06);margin-top:6px}"
    ".item-t{font-size:12.5px;font-weight:700;color:#f4f4f5;line-height:1.25}"
    ".item-d{font-size:11px;color:#8e8e93;margin-top:2px;font-family:ui-monospace,monospace}"
)


def _wrap_doc(body_html: str) -> str:
    doc = (
        f"<!doctype html><html><head><meta charset='utf-8'>"
        f"<style>{_COMMON_CSS}</style></head><body>{body_html}</body></html>"
    )
    raw = doc.encode("utf-8")
    if len(raw) > 32768 or len(zlib.compress(raw, level=9)) > 4096:
        raise ValueError("Widget HTML exceeds Telegram Bot API size limits")
    return doc


def render_start_widget(name: str, balance: int, lang: str) -> str:
    safe_name = html.escape(name or "Student")
    if lang == "ru":
        greeting = f"Привет, {safe_name}!"
        slogan = "Rashidov School — учись системно, закрепляй практикой и расти каждый день."
    else:
        greeting = f"Salom, {safe_name}!"
        slogan = "Rashidov School — tizimli o'rganing, amaliyot bilan mustahkamlang va har kuni o'sing."

    return _wrap_doc(
        "<div class='card'>"
        "<div class='row'>"
        f"<div class='title'>{greeting}</div>"
        f"<div class='badge'>🧠 {balance}</div>"
        "</div>"
        f"<div class='sub'>{slogan}</div>"
        "</div>"
    )


def render_support_widget(
    user_id: int,
    lang: str,
    contacts: dict[str, Any] | None = None,
) -> str:
    c = contacts or DEFAULT_SUPPORT_CONTACTS
    bio_tg = html.escape(str(c.get("bio", {}).get("telegram") or "@rashidov_bio_mentor"))
    bio_ph = html.escape(str(c.get("bio", {}).get("phone") or "+998 90 123 45 67"))
    chem_tg = html.escape(str(c.get("chem", {}).get("telegram") or "@rashidov_chem_mentor"))
    chem_ph = html.escape(str(c.get("chem", {}).get("phone") or "+998 90 765 43 21"))
    tech_tg = html.escape(str(c.get("tech", {}).get("telegram") or "@rashidov_support"))
    tech_ph = html.escape(str(c.get("tech", {}).get("phone") or "+998 95 889 78 88"))

    if lang == "ru":
        title = "Связь и помощь"
        bio_t = "Вопросы по биологии"
        chem_t = "Вопросы по химии"
        tech_t = "Тех. поддержка и оплата"
        hint = "Для ручного пополнения или помощи нажмите кнопку ниже и передайте ваш ID."
    else:
        title = "Aloqa va yordam"
        bio_t = "Biologiya bo‘yicha savollar"
        chem_t = "Kimyo bo‘yicha savollar"
        tech_t = "Texnik yordam va to‘lov"
        hint = "Qo‘lda to‘ldirish yoki yordam uchun quyidagi tugmani bosing va ID raqamingizni yuboring."

    body = (
        "<div class='card'>"
        "<div class='hdr'>"
        "<div class='hdr-l'>"
        "<div class='ico ico-em'>🎧</div>"
        f"<div class='title'>{title}</div>"
        "</div>"
        f"<div class='badge'>ID {user_id}</div>"
        "</div>"
        "<div class='id-bar'>"
        "<span class='id-lbl'>TELEGRAM ID</span>"
        f"<span class='id-val'>{user_id}</span>"
        "</div>"
        "<div class='item'><div class='ico ico-em'>🧬</div>"
        f"<div><div class='item-t'>{bio_t}</div><div class='item-d'>{bio_tg} · {bio_ph}</div></div></div>"
        "<div class='item'><div class='ico ico-pu'>🧪</div>"
        f"<div><div class='item-t'>{chem_t}</div><div class='item-d'>{chem_tg} · {chem_ph}</div></div></div>"
        "<div class='item'><div class='ico ico-bl'>⚙️</div>"
        f"<div><div class='item-t'>{tech_t}</div><div class='item-d'>{tech_tg} · {tech_ph}</div></div></div>"
        f"<div class='sub'>{hint}</div>"
        "</div>"
    )
    return _wrap_doc(body)


async def send_widget_with_fallback(
    *,
    bot: Bot,
    http_client: httpx.AsyncClient,
    chat_id: int,
    widget_html: str,
    fallback_text: str,
    reply_markup: InlineKeyboardMarkup | None = None,
) -> None:
    payload: dict[str, object] = {
        "chat_id": chat_id,
        "html": widget_html,
    }
    if reply_markup is not None:
        payload["reply_markup"] = reply_markup.model_dump(exclude_none=True)

    try:
        resp = await http_client.post(
            f"https://api.telegram.org/bot{bot.token}/sendWidget",
            json=payload,
            timeout=10.0,
        )
        data = resp.json()
        if resp.is_success and data.get("ok") is True:
            return
        logger.warning("sendWidget returned non-ok response: %s", data)
    except Exception as exc:
        logger.warning("sendWidget failed, using fallback message: %s", exc)

    await bot.send_message(
        chat_id=chat_id,
        text=fallback_text,
        parse_mode=ParseMode.HTML,
        reply_markup=reply_markup,
    )
