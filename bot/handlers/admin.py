from aiogram import Router, F
from aiogram.types import Message
from aiogram.filters import Command
from bot.keyboards.inline import admin_menu_keyboard
from bot.config import config
from bot.db import get_subject_students, get_subject_stats, get_admin_subjects
from bot.services.economy import add_neurons
from bot.utils.messages import msg
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

router = Router()


@router.message(Command("admin"))
async def admin_handler(message: Message, db_user):
    """Команда /admin — только для teacher и superadmin."""
    if not db_user or db_user['role'] not in ('teacher', 'superadmin'):
        return  # Для student — полное игнорирование

    lang = db_user.get('language', 'ru')
    await message.answer(
        msg('btn_admin_panel', lang),
        reply_markup=admin_menu_keyboard(config.ADMIN_APP_URL)
    )


@router.message(Command("gift"))
async def gift_handler(message: Message, db_user, pool, bot):
    """
    /gift [Telegram ID] [Сумма]
    Проверка: superadmin ИЛИ teacher с can_gift.
    """
    if not db_user or db_user['role'] == 'student':
        return

    lang = db_user.get('language', 'ru')

    # Проверка прав для teacher
    if db_user['role'] == 'teacher':
        subjects = await get_admin_subjects(pool, db_user['telegram_id'])
        has_gift_permission = False
        for s in subjects:
            perms = s['permissions'] if isinstance(s['permissions'], dict) else json.loads(s['permissions'])
            if perms.get('can_gift'):
                has_gift_permission = True
                break
        if not has_gift_permission:
            await message.answer(msg('no_permission', lang))
            return

    parts = message.text.split()
    if len(parts) != 3:
        await message.answer(msg('admin_gift_usage', lang))
        return

    try:
        target_id = int(parts[1])
        amount = int(parts[2])
        if amount <= 0:
            raise ValueError
    except ValueError:
        await message.answer(msg('admin_gift_error', lang))
        return

    await add_neurons(pool, target_id, amount, 'gift',
                      f'Подарок от {db_user["full_name"]}')

    await message.answer(msg('admin_gift_sent', lang, amount=amount, user_id=target_id))

    # Уведомить получателя
    try:
        await bot.send_message(target_id, msg('admin_gift_received', lang, amount=amount))
    except Exception:
        pass


@router.message(Command("send"))
async def send_handler(message: Message, db_user, pool, bot):
    """
    /send [Текст] — Массовая рассылка.
    Проверка: superadmin ИЛИ teacher с can_send.
    Рассылается ученикам по предмету этого учителя.
    """
    if not db_user or db_user['role'] == 'student':
        return

    lang = db_user.get('language', 'ru')

    # Получить предметы учителя
    subjects = await get_admin_subjects(pool, db_user['telegram_id'])

    if db_user['role'] == 'teacher':
        has_send_permission = False
        for s in subjects:
            perms = s['permissions'] if isinstance(s['permissions'], dict) else json.loads(s['permissions'])
            if perms.get('can_send'):
                has_send_permission = True
                break
        if not has_send_permission:
            await message.answer(msg('no_permission', lang))
            return

    # Извлечь текст рассылки
    text = message.text[len("/send "):].strip() if len(message.text) > 5 else ""
    if not text:
        await message.answer(msg('admin_broadcast_empty', lang))
        return

    # Собрать всех учеников по предметам учителя
    all_students = set()
    for s in subjects:
        students = await get_subject_students(pool, s['subject_id'])
        for st in students:
            all_students.add(st['telegram_id'])

    # Для superadmin без привязки — пока рассылка по subject_id=1
    if db_user['role'] == 'superadmin' and not subjects:
        students = await get_subject_students(pool, 1)
        for st in students:
            all_students.add(st['telegram_id'])

    sent_count = 0

    async def send_to_user(user_id):
        nonlocal sent_count
        try:
            await bot.send_message(user_id, text)
            sent_count += 1
        except Exception as e:
            logger.warning(f"Failed to send to {user_id}: {e}")

    await asyncio.gather(*(send_to_user(uid) for uid in all_students))
    await message.answer(msg('admin_broadcast_sent', lang, count=sent_count))


@router.message(Command("subscribers"))
async def subscribers_handler(message: Message, db_user, pool):
    """
    /subscribers — Сводка по предмету учителя.
    """
    if not db_user or db_user['role'] == 'student':
        return

    lang = db_user.get('language', 'ru')
    subjects = await get_admin_subjects(pool, db_user['telegram_id'])

    if not subjects and db_user['role'] != 'superadmin':
        await message.answer(msg('no_permission', lang))
        return

    # Если superadmin без привязки — показать по первому предмету
    subject_id = subjects[0]['subject_id'] if subjects else 1

    stats = await get_subject_stats(pool, subject_id)
    await message.answer(msg('admin_subscribers', lang,
                             students=stats.get('student_count', 0),
                             tests=stats.get('test_count', 0),
                             avg=float(stats.get('avg_score', 0) or 0)))
