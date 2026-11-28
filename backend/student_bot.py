import asyncio
import html
import logging
from urllib.parse import quote

import httpx
from aiogram import Bot, F, Router
from aiogram.enums import ParseMode
from aiogram.filters import Command, CommandObject, CommandStart
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    PreCheckoutQuery,
    WebAppInfo,
)

from config import Settings
from payment_logic import STARS_PRODUCTS, validate_stars_pre_checkout
from supabase_client import SupabaseRest
from widgets import render_start_widget, render_support_widget, send_widget_with_fallback

logger = logging.getLogger(__name__)
student_router = Router(name="student")

STARS_PRICES: dict[int, int] = {p.stars: p.neurons for p in STARS_PRODUCTS.values()}


def _norm_lang(lang: str | None) -> str:
    return "ru" if lang == "ru" else "uz"


def _parse_ref_id(args: str | None, self_id: int) -> int | None:
    if not args or not args.startswith("ref_"):
        return None
    raw = args[4:].strip()
    if not raw.isdigit():
        return None
    ref_id = int(raw)
    return ref_id if ref_id != self_id else None


@student_router.message(CommandStart())
async def cmd_start(
    message: Message,
    command: CommandObject,
    bot: Bot,
    sb: SupabaseRest,
    tg_http: httpx.AsyncClient,
    settings: Settings,
) -> None:
    tg_user = message.from_user
    if not tg_user:
        return

    user = await sb.get_user(tg_user.id)
    if user is None:
        ref_id = _parse_ref_id(command.args, tg_user.id)
        ref_user = await sb.get_user(ref_id) if ref_id else None
        actual_ref = ref_id if ref_user else None

        user = await sb.create_user(
            telegram_id=tg_user.id,
            full_name=tg_user.full_name or "Student",
            referred_by=actual_ref,
            language="uz",
        )

        if ref_user and actual_ref and actual_ref != tg_user.id:
            inserted_ref = await sb.create_referral(referrer_id=actual_ref, referred_id=tg_user.id)
            if inserted_ref:
                await sb.increment_balance(actual_ref, 1000)
                await sb.log_transaction(
                    user_id=actual_ref,
                    amount=1000,
                    tx_type="referral",
                    description="Referral bonus",
                )
                ref_lang = _norm_lang(ref_user.get("language"))
                push_text = (
                    "🎁 Друг присоединился по твоей ссылке! Тебе начислено +1000 🧠."
                    if ref_lang == "ru"
                    else "🎁 Do'stingiz havolangiz orqali qo'shildi! Sizga +1000🧠 berildi."
                )
                try:
                    await bot.send_message(
                        chat_id=actual_ref,
                        text=push_text,
                        parse_mode=ParseMode.HTML,
                    )
                except Exception as exc:
                    logger.warning("Failed referral push to %s: %s", actual_ref, exc)

    lang = _norm_lang(user.get("language"))
    name = user.get("full_name") or tg_user.full_name or "Student"
    balance = int(user.get("balance") or 0)

    btn_text = "🚀 Открыть Rashidov School" if lang == "ru" else "🚀 Rashidov School'ni ochish"
    markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=btn_text, web_app=WebAppInfo(url=settings.STUDENT_WEBAPP_URL))]
        ]
    )

    safe_name = html.escape(name)
    fallback_text = (
        f"<b>Привет, {safe_name}!</b>\nБаланс: <b>🧠 {balance}</b>\n\n"
        "Rashidov School — учись системно, закрепляй практикой и расти каждый день."
        if lang == "ru"
        else f"<b>Salom, {safe_name}!</b>\nBalans: <b>🧠 {balance}</b>\n\n"
        "Rashidov School — tizimli o'rganing, amaliyot bilan mustahkamlang va har kuni o'sing."
    )

    await send_widget_with_fallback(
        bot=bot,
        http_client=tg_http,
        chat_id=message.chat.id,
        widget_html=render_start_widget(name=name, balance=balance, lang=lang),
        fallback_text=fallback_text,
        reply_markup=markup,
    )


@student_router.message(Command("lang"))
async def cmd_lang(message: Message, sb: SupabaseRest) -> None:
    tg_user = message.from_user
    if not tg_user:
        return
    user = await sb.get_user(tg_user.id)
    lang = _norm_lang(user.get("language") if user else None)

    text = "Выберите язык интерфейса:" if lang == "ru" else "Interfeys tilini tanlang:"
    markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🇺🇿 O'zbekcha", callback_data="lang:uz"),
                InlineKeyboardButton(text="🇷🇺 Русский", callback_data="lang:ru"),
            ]
        ]
    )
    await message.answer(text=text, parse_mode=ParseMode.HTML, reply_markup=markup)


@student_router.callback_query(F.data.in_({"lang:uz", "lang:ru"}))
async def cb_lang(callback: CallbackQuery, sb: SupabaseRest) -> None:
    if not callback.from_user or not callback.data:
        return
    new_lang = callback.data.split(":", 1)[1]
    await sb.update_language(callback.from_user.id, new_lang)

    confirm = (
        "✅ Язык изменён на <b>Русский</b>."
        if new_lang == "ru"
        else "✅ Til <b>O'zbekcha</b>ga o'zgartirildi."
    )
    if callback.message:
        await callback.message.edit_text(text=confirm, parse_mode=ParseMode.HTML)
    await callback.answer()


@student_router.message(Command("support"))
async def cmd_support(
    message: Message,
    bot: Bot,
    sb: SupabaseRest,
    tg_http: httpx.AsyncClient,
) -> None:
    tg_user = message.from_user
    if not tg_user:
        return
    user = await sb.get_user(tg_user.id)
    contacts = await sb.get_support_contacts()
    lang = _norm_lang(user.get("language") if user else None)

    if lang == "ru":
        topup_msg = f"Здравствуйте! Хочу пополнить баланс в @RashidovSchool_bot. Мой ID: {tg_user.id}"
        support_msg = f"Здравствуйте! Нужен ответ по @RashidovSchool_bot. Мой ID: {tg_user.id}"
        btn1 = "💳 Пополнить баланс"
        btn2 = "💬 Задать вопрос / Помощь"
        fallback = (
            f"<b>Связь и помощь</b>\n"
            f"ID: <code>{tg_user.id}</code>\n\n"
            f"🧬 Биология: {contacts['bio']['telegram']} · {contacts['bio']['phone']}\n"
            f"🧪 Химия: {contacts['chem']['telegram']} · {contacts['chem']['phone']}\n"
            f"⚙️ Тех. поддержка: {contacts['tech']['telegram']} · {contacts['tech']['phone']}"
        )
    else:
        topup_msg = f"Assalomu alaykum! @RashidovSchool_bot balansini to'ldirmoqchiman. Mening ID: {tg_user.id}"
        support_msg = f"Assalomu alaykum! @RashidovSchool_bot bo'yicha savolim bor. Mening ID: {tg_user.id}"
        btn1 = "💳 Balansni to'ldirish"
        btn2 = "💬 Savol berish / Yordam"
        fallback = (
            f"<b>Aloqa va yordam</b>\n"
            f"ID: <code>{tg_user.id}</code>\n\n"
            f"🧬 Biologiya: {contacts['bio']['telegram']} · {contacts['bio']['phone']}\n"
            f"🧪 Kimyo: {contacts['chem']['telegram']} · {contacts['chem']['phone']}\n"
            f"⚙️ Texnik yordam: {contacts['tech']['telegram']} · {contacts['tech']['phone']}"
        )

    markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=btn1, url=f"https://t.me/mynus_x?text={quote(topup_msg)}")],
            [InlineKeyboardButton(text=btn2, url=f"https://t.me/mynus_x?text={quote(support_msg)}")],
        ]
    )

    await send_widget_with_fallback(
        bot=bot,
        http_client=tg_http,
        chat_id=message.chat.id,
        widget_html=render_support_widget(user_id=tg_user.id, lang=lang, contacts=contacts),
        fallback_text=fallback,
        reply_markup=markup,
    )


@student_router.pre_checkout_query()
async def on_pre_checkout(query: PreCheckoutQuery, sb: SupabaseRest) -> None:
    try:
        async def _check() -> tuple[bool, str | None]:
            payment = await sb.get_payment_by_merchant_trans_id(query.invoice_payload)
            return validate_stars_pre_checkout(
                payment,
                caller_user_id=query.from_user.id,
                currency=query.currency,
                total_amount=query.total_amount,
            )

        ok, err_msg = await asyncio.wait_for(_check(), timeout=7.0)
        await query.answer(ok=ok, error_message=None if ok else err_msg)
    except asyncio.TimeoutError:
        logger.warning("stars_pre_checkout timeout order=%s", query.invoice_payload)
        await query.answer(ok=False, error_message="Время проверки заказа истекло. Попробуйте ещё раз.")
    except Exception:
        logger.warning("stars_pre_checkout error order=%s", query.invoice_payload)
        await query.answer(ok=False, error_message="Ошибка проверки заказа.")


@student_router.message(F.successful_payment)
async def on_successful_payment(message: Message, sb: SupabaseRest) -> None:
    tg_user = message.from_user
    sp = message.successful_payment
    if not tg_user or not sp:
        return

    try:
        res = await sb.complete_stars_payment(
            merchant_trans_id=sp.invoice_payload,
            user_id=tg_user.id,
            total_stars=sp.total_amount,
            telegram_charge_id=sp.telegram_payment_charge_id,
        )
    except Exception:
        logger.warning("stars_complete failed order=%s", sp.invoice_payload)
        return

    if res.get("already_paid"):
        logger.info("stars_complete idempotent order=%s", sp.invoice_payload)
        return

    amount = int(res.get("xp_credited") or 0)
    new_balance = int(res.get("new_balance") or 0)
    logger.info("stars_complete paid order=%s xp=%s", sp.invoice_payload, amount)

    user = await sb.get_user(tg_user.id)
    lang = _norm_lang(user.get("language") if user else None)
    text = (
        f"🎉 Баланс пополнен на +{amount} 🧠! Текущий баланс: {new_balance} 🧠."
        if lang == "ru"
        else f"🎉 Balansingiz +{amount} 🧠 ga to'ldirildi! Joriy balans: {new_balance} 🧠."
    )
    await message.answer(text=text, parse_mode=ParseMode.HTML)


@student_router.message(F.refunded_payment)
async def on_refunded_payment(message: Message, sb: SupabaseRest) -> None:
    tg_user = message.from_user
    rp = message.refunded_payment
    if not tg_user or not rp:
        return

    try:
        res = await sb.refund_stars_payment(
            user_id=tg_user.id,
            total_stars=rp.total_amount,
            telegram_charge_id=rp.telegram_payment_charge_id,
        )
    except Exception:
        logger.warning("stars_refund failed payload=%s", rp.invoice_payload)
        return

    if res.get("already_refunded"):
        return

    deducted = int(res.get("xp_deducted") or 0)
    debt_added = int(res.get("debt_added") or 0)
    logger.info("stars_refund completed payload=%s xp_deduct=%s debt_added=%s", rp.invoice_payload, deducted, debt_added)
    extra = f" Зафиксирован долг: {debt_added} 🧠." if debt_added > 0 else ""
    await message.answer(f"↩️ Возврат по оплате выполнен. Списано {deducted} 🧠.{extra}")
