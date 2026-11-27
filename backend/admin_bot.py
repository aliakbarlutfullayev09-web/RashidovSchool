import asyncio
import html
import logging
from dataclasses import dataclass
from typing import Any

from aiogram import Bot, F, Router
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramForbiddenError
from aiogram.filters import BaseFilter, Command, CommandObject, CommandStart
from aiogram.types import (
    BufferedInputFile,
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

from config import Settings
from supabase_client import SupabaseRest

logger = logging.getLogger(__name__)
admin_router = Router(name="admin")


@dataclass
class AdminContext:
    user: dict[str, Any]
    role: str
    is_superadmin: bool
    can_send: bool
    can_gift: bool
    subject_ids: list[int] | None
    subject_names: list[str]


async def _get_admin_context(sb: SupabaseRest, telegram_id: int) -> AdminContext | None:
    user = await sb.get_user(telegram_id)
    if not user:
        return None

    role = user.get("role")
    if role in ("superadmin", "admin"):
        return AdminContext(
            user=user,
            role=role,
            is_superadmin=True,
            can_send=True,
            can_gift=True,
            subject_ids=None,
            subject_names=["Все предметы"],
        )
    if role != "teacher":
        return None

    assignments = await sb.get_admin_assignments(telegram_id)
    user_perms = user.get("permissions") or {}

    if assignments:
        can_send = any(bool((row.get("permissions") or {}).get("can_send")) for row in assignments) or bool(user_perms.get("can_send"))
        can_gift = any(bool((row.get("permissions") or {}).get("can_gift")) for row in assignments) or bool(user_perms.get("can_gift"))
        subject_ids = sorted({int(row["subject_id"]) for row in assignments})
    else:
        assigned_id = user.get("assigned_subject_id")
        subject_ids = [int(assigned_id)] if assigned_id else []
        can_send = bool(user_perms.get("can_send"))
        can_gift = bool(user_perms.get("can_gift"))

    subjects = await sb.get_subjects_by_ids(subject_ids)
    subject_names = [
        str(s.get("name") or s.get("title") or f"#{s['id']}")
        for s in subjects
    ]

    return AdminContext(
        user=user,
        role=role,
        is_superadmin=False,
        can_send=can_send,
        can_gift=can_gift,
        subject_ids=subject_ids,
        subject_names=subject_names,
    )


class DraftStateFilter(BaseFilter):
    def __init__(self, expected_state: str) -> None:
        self.expected_state = expected_state

    async def __call__(self, message: Message, sb: SupabaseRest) -> bool:
        if not message.from_user:
            return False
        if message.text and message.text.startswith("/"):
            return False
        st = await sb.get_bot_state(message.from_user.id)
        return bool(st and st.get("state") == self.expected_state)


async def _send_student_profile_card(
    message: Message,
    student: dict[str, Any],
    ctx: AdminContext,
    student_bot: Bot,
) -> None:
    uid = int(student["telegram_id"])
    username = ""
    tg_name = ""
    try:
        tg_chat = await student_bot.get_chat(uid)
        username = (tg_chat.username or "").strip()
        tg_name = " ".join(p for p in (tg_chat.first_name, tg_chat.last_name) if p)
    except Exception:
        pass

    display_name = student.get("full_name") or tg_name or f"ID {uid}"
    safe_name = html.escape(display_name)
    username_line = f"🔗 <b>Username:</b> @{html.escape(username)}\n" if username else ""
    no_username_line = (
        f"🔗 <b>Чат без username:</b> <code>tg://openmessage?user_id={uid}</code>\n"
        if not username
        else ""
    )
    balance = f"{int(student.get('balance') or 0):,}".replace(",", " ")

    rows: list[list[InlineKeyboardButton]] = []
    if username:
        rows.append([InlineKeyboardButton(text=f"👤 Открыть @{username}", url=f"https://t.me/{username}")])
    rows.append([InlineKeyboardButton(text="✉️ Написать ученику", callback_data=f"quick_msg:{uid}")])
    if ctx.is_superadmin or ctx.can_gift:
        rows.append(
            [
                InlineKeyboardButton(text="🎁 +100 🧠", callback_data=f"quick_gift:{uid}:100"),
                InlineKeyboardButton(text="🎁 +500 🧠", callback_data=f"quick_gift:{uid}:500"),
            ]
        )

    await message.answer(
        text=(
            f"👤 <b>Ученик:</b> {safe_name}\n"
            f"{username_line}"
            f"🆔 <b>Telegram ID:</b> <code>{uid}</code>\n"
            f"{no_username_line}"
            f"🎓 <b>Класс:</b> {html.escape(str(student.get('class_group') or 'Abituriyent'))}\n"
            f"🛡 <b>Роль:</b> <code>{html.escape(str(student.get('role') or 'student'))}</code>\n"
            f"🧠 <b>Баланс:</b> {balance}\n"
            f"🔥 <b>Streak:</b> {int(student.get('streak_days') or 0)} дн.\n"
            f"📅 <b>Активность:</b> {html.escape(str(student.get('last_active_date') or '—'))}"
        ),
        parse_mode=ParseMode.HTML,
        reply_markup=InlineKeyboardMarkup(inline_keyboard=rows),
    )


@admin_router.message(CommandStart())
async def admin_start(
    message: Message,
    command: CommandObject,
    sb: SupabaseRest,
    settings: Settings,
    student_bot: Bot,
) -> None:
    if not message.from_user:
        return
    ctx = await _get_admin_context(sb, message.from_user.id)
    if not ctx:
        await message.answer("⛔ Доступ запрещён.", parse_mode=ParseMode.HTML)
        return

    arg = (command.args or "").strip()
    if arg.startswith("user_") and arg[5:].isdigit():
        target = await sb.get_user(int(arg[5:]))
        if target:
            await _send_student_profile_card(message, target, ctx, student_bot)
            return

    name = html.escape(ctx.user.get("full_name") or message.from_user.full_name or "Admin")
    subjects_str = ", ".join(html.escape(s) for s in ctx.subject_names) or "Не привязан"

    markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="⚙️ Панель управления",
                    web_app=WebAppInfo(url=settings.ADMIN_WEBAPP_URL),
                )
            ]
        ]
    )
    text = (
        f"👤 <b>Имя:</b> {name}\n"
        f"🛡 <b>Роль:</b> <code>{html.escape(ctx.role)}</code>\n"
        f"📚 <b>Предмет:</b> {subjects_str}"
    )
    await message.answer(text=text, parse_mode=ParseMode.HTML, reply_markup=markup)


@admin_router.message(Command("user", "profile"))
async def cmd_user(
    message: Message,
    command: CommandObject,
    sb: SupabaseRest,
    student_bot: Bot,
) -> None:
    if not message.from_user:
        return
    ctx = await _get_admin_context(sb, message.from_user.id)
    if not ctx:
        await message.answer("⛔ Доступ запрещён.", parse_mode=ParseMode.HTML)
        return

    query = (command.args or "").strip().lstrip("@")
    if not query:
        await message.answer(
            "❗️ Укажите Telegram ID или имя ученика:\n<code>/user 123456789</code>\n<code>/user Алишер</code>",
            parse_mode=ParseMode.HTML,
        )
        return

    matches = await sb.find_users_by_query(query)
    if not matches and not query.isdigit():
        try:
            tg_chat = await student_bot.get_chat(f"@{query}")
            if tg_chat and tg_chat.id:
                by_id = await sb.get_user(tg_chat.id)
                if by_id:
                    matches = [by_id]
        except Exception:
            pass

    if not matches:
        await message.answer(
            f"❗️ Ученик по запросу <code>{html.escape(query)}</code> не найден.",
            parse_mode=ParseMode.HTML,
        )
        return

    if len(matches) == 1:
        await _send_student_profile_card(message, matches[0], ctx, student_bot)
        return

    lines = [
        f"• <b>{html.escape(u.get('full_name') or str(u['telegram_id']))}</b>"
        f" — <code>{u['telegram_id']}</code> (🧠 {int(u.get('balance') or 0)})"
        for u in matches[:8]
    ]
    await message.answer(
        f"🔎 <b>Найдено учеников: {len(matches)}</b>\n\n"
        + "\n".join(lines)
        + "\n\nОтправьте <code>/user ID</code> для подробного профиля.",
        parse_mode=ParseMode.HTML,
    )


@admin_router.message(Command("help"))
async def cmd_help(message: Message, sb: SupabaseRest) -> None:
    if not message.from_user:
        return
    ctx = await _get_admin_context(sb, message.from_user.id)
    if not ctx:
        await message.answer("⛔ Доступ запрещён.", parse_mode=ParseMode.HTML)
        return

    cmds = [
        "• <code>/start</code> — Профиль и панель управления",
        "• <code>/user &lt;ID или имя&gt;</code> — Профиль ученика и быстрые действия",
    ]
    if ctx.is_superadmin or ctx.can_gift:
        cmds.append("• <code>/gift &lt;ID&gt; &lt;сумма&gt;</code> — Начислить Нейроны ученику")
    if ctx.is_superadmin or ctx.can_send:
        cmds.append("• <code>/send</code> — Рассылка по ученикам")
    cmds.append("• <code>/help</code> — Список команд")
    await message.answer(
        "⚙️ <b>Команды Rashidov Studio Bot</b>\n\n" + "\n".join(cmds),
        parse_mode=ParseMode.HTML,
    )


@admin_router.callback_query(F.data.startswith("quick_gift:"))
async def cb_quick_gift(
    callback: CallbackQuery,
    sb: SupabaseRest,
    student_bot: Bot,
) -> None:
    if not callback.from_user or not callback.data:
        return
    ctx = await _get_admin_context(sb, callback.from_user.id)
    if not ctx or not (ctx.is_superadmin or ctx.can_gift):
        await callback.answer("⛔ Нет права can_gift", show_alert=True)
        return

    parts = callback.data.split(":")
    if len(parts) != 3 or not parts[1].isdigit() or not parts[2].isdigit():
        await callback.answer("Неверные параметры", show_alert=True)
        return

    uid = int(parts[1])
    amount = int(parts[2])
    target = await sb.get_user(uid)
    if not target or amount <= 0:
        await callback.answer("Пользователь не найден", show_alert=True)
        return

    new_balance = await sb.increment_balance(uid, amount)
    await sb.log_transaction(
        user_id=uid,
        amount=amount,
        tx_type="manual_gift",
        description=f"Quick gift by admin {callback.from_user.id}",
    )
    await callback.answer(f"✅ +{amount} 🧠 (Баланс: {new_balance})", show_alert=True)

    target_lang = "ru" if target.get("language") == "ru" else "uz"
    push_text = (
        f"🎁 Администратор начислил тебе +{amount} 🧠! Текущий баланс: {new_balance} 🧠."
        if target_lang == "ru"
        else f"🎁 Administrator sizga +{amount} 🧠 taqdim etdi! Joriy balans: {new_balance} 🧠."
    )
    try:
        await student_bot.send_message(chat_id=uid, text=push_text, parse_mode=ParseMode.HTML)
    except Exception:
        pass


@admin_router.message(Command("gift"))
async def cmd_gift(
    message: Message,
    command: CommandObject,
    sb: SupabaseRest,
    student_bot: Bot,
) -> None:
    if not message.from_user:
        return
    ctx = await _get_admin_context(sb, message.from_user.id)
    if not ctx or not (ctx.is_superadmin or ctx.can_gift):
        await message.answer("⛔ У вас нет права <code>can_gift</code>.", parse_mode=ParseMode.HTML)
        return

    parts = (command.args or "").split()
    if len(parts) != 2 or not parts[0].lstrip("-").isdigit() or not parts[1].isdigit():
        await message.answer(
            "❗️ Используйте: <code>/gift 123456789 500</code>",
            parse_mode=ParseMode.HTML,
        )
        return

    target_user_id = int(parts[0])
    amount = int(parts[1])
    if amount <= 0:
        await message.answer(
            "❗️ Сумма должна быть больше 0: <code>/gift 123456789 500</code>",
            parse_mode=ParseMode.HTML,
        )
        return

    target_user = await sb.get_user(target_user_id)
    if not target_user:
        await message.answer(
            f"❗️ Пользователь <code>{target_user_id}</code> не найден.",
            parse_mode=ParseMode.HTML,
        )
        return

    new_balance = await sb.increment_balance(target_user_id, amount)
    await sb.log_transaction(
        user_id=target_user_id,
        amount=amount,
        tx_type="manual_gift",
        description=f"Manual gift by admin {message.from_user.id}",
    )

    await message.answer(
        f"✅ Начислено +{amount} 🧠 пользователю {target_user_id}. Новый баланс: {new_balance} 🧠.",
        parse_mode=ParseMode.HTML,
    )

    target_lang = "ru" if target_user.get("language") == "ru" else "uz"
    push_text = (
        f"🎁 Администратор начислил тебе +{amount} 🧠! Текущий баланс: {new_balance} 🧠."
        if target_lang == "ru"
        else f"🎁 Administrator sizga +{amount} 🧠 taqdim etdi! Joriy balans: {new_balance} 🧠."
    )
    try:
        await student_bot.send_message(
            chat_id=target_user_id,
            text=push_text,
            parse_mode=ParseMode.HTML,
        )
    except Exception as exc:
        logger.warning("Cross-delivery gift push failed for %s: %s", target_user_id, exc)


@admin_router.message(Command("send"))
async def cmd_send(message: Message, sb: SupabaseRest) -> None:
    if not message.from_user:
        return
    ctx = await _get_admin_context(sb, message.from_user.id)
    if not ctx or not (ctx.is_superadmin or ctx.can_send):
        await message.answer("⛔ У вас нет права <code>can_send</code>.", parse_mode=ParseMode.HTML)
        return

    await sb.set_bot_state(
        user_id=message.from_user.id,
        state="waiting_broadcast_content",
        data={"subject_ids": ctx.subject_ids},
    )

    markup = InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="❌ Отмена", callback_data="broadcast:cancel")]]
    )
    await message.answer(
        "✉️ Пришлите текст или фото с подписью для рассылки:",
        parse_mode=ParseMode.HTML,
        reply_markup=markup,
    )


@admin_router.message(DraftStateFilter("waiting_broadcast_content"))
async def handle_broadcast_content(message: Message, sb: SupabaseRest) -> None:
    if not message.from_user:
        return

    photo_file_id = message.photo[-1].file_id if message.photo else None
    has_text = bool(message.text or message.caption)
    content_html = message.html_text if has_text else ""

    if not photo_file_id and not content_html:
        await message.answer(
            "❗️ Пришлите текст или фото с подписью.",
            parse_mode=ParseMode.HTML,
        )
        return

    st = await sb.get_bot_state(message.from_user.id)
    subject_ids = (st or {}).get("data", {}).get("subject_ids")
    recipient_ids = await sb.get_student_ids_for_broadcast(subject_ids)
    count = len(recipient_ids)

    await sb.set_bot_state(
        user_id=message.from_user.id,
        state="waiting_broadcast_confirm",
        data={
            "text": content_html,
            "photo_file_id": photo_file_id,
            "recipient_ids": recipient_ids,
        },
    )

    markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text=f"✅ Отправить ({count})", callback_data="broadcast:confirm")],
            [InlineKeyboardButton(text="❌ Отмена", callback_data="broadcast:cancel")],
        ]
    )

    if photo_file_id:
        await message.answer_photo(
            photo=photo_file_id,
            caption=content_html or None,
            parse_mode=ParseMode.HTML,
            reply_markup=markup,
        )
    else:
        await message.answer(
            text=content_html,
            parse_mode=ParseMode.HTML,
            reply_markup=markup,
        )


@admin_router.callback_query(F.data == "broadcast:cancel")
async def cb_broadcast_cancel(callback: CallbackQuery, sb: SupabaseRest) -> None:
    if not callback.from_user:
        return
    await sb.clear_bot_state(callback.from_user.id)
    if callback.message:
        if callback.message.photo:
            await callback.message.edit_reply_markup(reply_markup=None)
            await callback.message.answer("❌ Рассылка отменена.", parse_mode=ParseMode.HTML)
        else:
            await callback.message.edit_text("❌ Рассылка отменена.", parse_mode=ParseMode.HTML)
    await callback.answer()


@admin_router.callback_query(F.data == "broadcast:confirm")
async def cb_broadcast_confirm(
    callback: CallbackQuery,
    bot: Bot,
    student_bot: Bot,
    sb: SupabaseRest,
) -> None:
    if not callback.from_user:
        return

    st = await sb.get_bot_state(callback.from_user.id)
    if not st or st.get("state") != "waiting_broadcast_confirm":
        await callback.answer("Черновик не найден.", show_alert=True)
        return

    data = st.get("data") or {}
    await sb.clear_bot_state(callback.from_user.id)

    if callback.message:
        await callback.message.edit_reply_markup(reply_markup=None)
    await callback.answer("Рассылка запущена...")

    recipient_ids: list[int] = [int(uid) for uid in data.get("recipient_ids") or []]
    text_html: str = data.get("text") or ""
    photo_file_id: str | None = data.get("photo_file_id")

    photo_bytes: bytes | None = None
    if photo_file_id:
        tg_file = await bot.get_file(photo_file_id)
        if tg_file.file_path:
            buf = await bot.download_file(tg_file.file_path)
            if buf is not None:
                photo_bytes = buf.read()

    sem = asyncio.Semaphore(20)
    sent = 0
    failed = 0
    cached_student_file_id: str | None = None
    upload_lock = asyncio.Lock()

    async def _deliver(uid: int) -> None:
        nonlocal sent, failed, cached_student_file_id
        async with sem:
            try:
                if photo_bytes is not None:
                    if cached_student_file_id:
                        await student_bot.send_photo(
                            chat_id=uid,
                            photo=cached_student_file_id,
                            caption=text_html or None,
                            parse_mode=ParseMode.HTML,
                        )
                    else:
                        async with upload_lock:
                            photo_input: str | BufferedInputFile = (
                                cached_student_file_id
                                if cached_student_file_id
                                else BufferedInputFile(photo_bytes, filename="broadcast.jpg")
                            )
                            msg = await student_bot.send_photo(
                                chat_id=uid,
                                photo=photo_input,
                                caption=text_html or None,
                                parse_mode=ParseMode.HTML,
                            )
                            if msg.photo and not cached_student_file_id:
                                cached_student_file_id = msg.photo[-1].file_id
                else:
                    await student_bot.send_message(
                        chat_id=uid,
                        text=text_html,
                        parse_mode=ParseMode.HTML,
                    )
                sent += 1
            except TelegramForbiddenError:
                failed += 1
            except Exception as exc:
                logger.warning("Broadcast error for %s: %s", uid, exc)
                failed += 1

    await asyncio.gather(*(_deliver(uid) for uid in recipient_ids))

    report = f"✅ Доставлено: {sent} | Заблокировали: {failed}"
    if callback.message:
        await callback.message.answer(report, parse_mode=ParseMode.HTML)
