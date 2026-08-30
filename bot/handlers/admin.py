import asyncio
import json
import logging
from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.filters import Command
from bot.states.admin import AdminStates
from bot.utils.messages import msg
from bot.db import get_subject_stats, get_admin_subjects

router = Router()
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# 1. DEEP LINK: 💬 Написать (msg_ID)
# ─────────────────────────────────────────────
@router.message(AdminStates.waiting_for_message)
async def process_admin_message(message: Message, state: FSMContext):
    await state.update_data(msg_to_send=message.message_id)
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Отправить", callback_data="send_admin_msg")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_admin_msg")]
    ])
    await message.answer("Вы уверены, что хотите отправить это сообщение пользователю?", reply_markup=keyboard)
    await state.set_state(AdminStates.confirming_message)

@router.callback_query(AdminStates.confirming_message, F.data == "send_admin_msg")
async def send_message_confirm(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    target_id = data.get('target_user_id')
    msg_id = data.get('msg_to_send')
    
    if target_id and msg_id:
        try:
            await callback.bot.copy_message(chat_id=target_id, from_chat_id=callback.message.chat.id, message_id=msg_id)
            await callback.message.edit_text("✅ Сообщение успешно отправлено!")
        except Exception as e:
            await callback.message.edit_text(f"❌ Ошибка отправки: пользователь заблокировал бота или ID неверен. ({e})")
    else:
        await callback.message.edit_text("❌ Ошибка данных сессии.")
    await state.clear()

@router.callback_query(AdminStates.confirming_message, F.data == "cancel_admin_msg")
async def send_message_cancel(callback: CallbackQuery, state: FSMContext):
    await callback.message.edit_text("❌ Отправка отменена.")
    await state.clear()

# ─────────────────────────────────────────────
# 1.5. КОМАНДА: /admin (Панель управления)
# ─────────────────────────────────────────────
@router.message(Command("admin"))
async def cmd_admin(message: Message, db_user):
    if not db_user or db_user.get('role') not in ['teacher', 'superadmin', 'admin']:
        await message.answer(msg('no_permission'))
        return
        
    from aiogram.types import WebAppInfo
    from bot.config import config
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⚙️ Открыть Панель", web_app=WebAppInfo(url=config.ADMIN_APP_URL))]
    ])
    await message.answer("Вход в панель управления:", reply_markup=keyboard)


# ─────────────────────────────────────────────
# 2. КОМАНДА: /send (Рассылка всем)
# ─────────────────────────────────────────────
@router.message(Command("send"))
async def cmd_send(message: Message, db_user, state: FSMContext):
    if not db_user or db_user.get('role') not in ['teacher', 'superadmin', 'admin']:
        await message.answer(msg('no_permission'))
        return
    
    await message.answer("✍️ Отправьте сообщение для рассылки (поддерживаются любые медиа, видео-кружочки, премиум-эмодзи). Оно будет отправлено всем ученикам:")
    await state.set_state(AdminStates.waiting_for_broadcast_msg)

@router.message(AdminStates.waiting_for_broadcast_msg)
async def process_broadcast_message(message: Message, state: FSMContext):
    await state.update_data(broadcast_msg_id=message.message_id)
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Начать рассылку", callback_data="confirm_broadcast")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_broadcast")]
    ])
    await message.answer("📢 Предпросмотр получен. Начать массовую рассылку всем пользователям?", reply_markup=keyboard)
    await state.set_state(AdminStates.confirming_broadcast)

@router.callback_query(AdminStates.confirming_broadcast, F.data == "confirm_broadcast")
async def confirm_broadcast(callback: CallbackQuery, state: FSMContext, pool):
    data = await state.get_data()
    msg_id = data.get('broadcast_msg_id')
    
    await callback.message.edit_text("⏳ Рассылка запущена, ожидайте...")
    
    # Получаем всех пользователей (для простоты можно сделать запрос тут, либо через db.py)
    async with pool.acquire() as conn:
        users = await conn.fetch("SELECT telegram_id FROM users WHERE role = 'student'")
    
    success_count = 0
    for u in users:
        try:
            await callback.bot.copy_message(chat_id=u['telegram_id'], from_chat_id=callback.message.chat.id, message_id=msg_id)
            success_count += 1
            await asyncio.sleep(0.05)  # Во избежание FloodWait
        except Exception:
            pass
            
    await callback.message.edit_text(msg('admin_broadcast_sent', count=success_count))
    await state.clear()

@router.callback_query(AdminStates.confirming_broadcast, F.data == "cancel_broadcast")
async def cancel_broadcast(callback: CallbackQuery, state: FSMContext):
    await callback.message.edit_text("❌ Рассылка отменена.")
    await state.clear()


# ─────────────────────────────────────────────
# 3. КОМАНДА: /stats (Статистика)
# ─────────────────────────────────────────────
@router.message(Command("stats"))
async def cmd_stats(message: Message, db_user, pool):
    if not db_user or db_user.get('role') not in ['teacher', 'superadmin', 'admin']:
        await message.answer(msg('no_permission'))
        return

    lang = db_user.get('language', 'ru')
    user_id = message.from_user.id
    
    if db_user['role'] == 'superadmin':
        async with pool.acquire() as conn:
            total_students = await conn.fetchval("SELECT COUNT(*) FROM users WHERE role = 'student'")
            total_tests = await conn.fetchval("SELECT COUNT(*) FROM progress")
            avg_stars = await conn.fetchval("SELECT AVG(stars) FROM progress WHERE stars > 0") or 0.0
        
        await message.answer(
            f"👑 Статистика всей школы:\n\n"
            f"👨‍🎓 Учеников: {total_students}\n"
            f"📝 Пройдено тестов: {total_tests}\n"
            f"📈 Средний балл: {avg_stars:.1f}/3"
        )
    else:
        subjects = await get_admin_subjects(pool, user_id)
        if not subjects:
            await message.answer("У вас нет прикрепленных предметов для просмотра статистики.")
            return
            
        text = ""
        for s in subjects:
            stats = await get_subject_stats(pool, s['id'])
            st_text = msg('admin_subscribers', lang, 
                          students=stats.get('student_count') or 0,
                          tests=stats.get('test_count') or 0,
                          avg=stats.get('avg_score') or 0.0)
            text += f"📚 {s['name']}\n{st_text}\n\n"
            
        await message.answer(text)


# ─────────────────────────────────────────────
# 4. КОМАНДА: /gift (Телеграм-подарки за Звезды)
# ─────────────────────────────────────────────
@router.message(Command("gift"))
async def cmd_gift(message: Message, db_user, state: FSMContext):
    if not db_user or db_user.get('role') not in ['teacher', 'superadmin', 'admin']:
        await message.answer(msg('no_permission'))
        return
        
    await message.answer("🎁 Выберите, кому отправить подарок. Введите Telegram ID получателя:")
    await state.set_state(AdminStates.waiting_for_gift_target)

@router.message(AdminStates.waiting_for_gift_target)
async def process_gift_target(message: Message, state: FSMContext):
    if not message.text.isdigit():
        await message.answer("❌ Ошибка: ID должен состоять только из цифр. Введите Telegram ID:")
        return
        
    await state.update_data(gift_target_id=int(message.text))
    await message.answer("✍️ Введите комментарий к подарку (или напишите '-', чтобы пропустить):")
    await state.set_state(AdminStates.waiting_for_gift_comment)

@router.message(AdminStates.waiting_for_gift_comment)
async def process_gift_comment(message: Message, state: FSMContext):
    comment = message.text.strip()
    if comment == "-":
        comment = ""
    await state.update_data(gift_comment=comment)
    
    await message.answer("🔗 Введите ID Telegram-подарка (например, '5378291'):")
    await state.set_state(AdminStates.waiting_for_gift_id)

@router.message(AdminStates.waiting_for_gift_id)
async def process_gift_id(message: Message, state: FSMContext):
    gift_id = message.text.strip()
    await state.update_data(gift_id=gift_id)
    
    data = await state.get_data()
    target_id = data.get('gift_target_id')
    comment = data.get('gift_comment', '')
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Отправить подарок", callback_data="confirm_tg_gift")],
        [InlineKeyboardButton(text="❌ Отмена", callback_data="cancel_tg_gift")]
    ])
    
    preview = f"🎁 Подтвердите отправку Telegram-подарка!\n\n"
    preview += f"👤 Кому (ID): {target_id}\n"
    preview += f"🆔 ID подарка: {gift_id}\n"
    preview += f"💬 Комментарий: {comment if comment else 'Без комментария'}\n\n"
    preview += "Внимание: Средства (Telegram Stars) будут списаны с баланса самого бота."
    
    await message.answer(preview, reply_markup=keyboard)
    await state.set_state(AdminStates.confirming_gift)

@router.callback_query(AdminStates.confirming_gift, F.data == "confirm_tg_gift")
async def confirm_tg_gift(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    target_id = data.get('gift_target_id')
    gift_id = data.get('gift_id')
    comment = data.get('gift_comment', '')
    
    await callback.message.edit_text("⏳ Отправляем подарок...")
    try:
        if hasattr(callback.bot, 'send_gift'):
            await callback.bot.send_gift(
                gift_id=gift_id,
                user_id=target_id,
                text=comment
            )
            await callback.message.edit_text(f"✅ Подарок ({gift_id}) успешно отправлен пользователю {target_id}!")
        else:
            await callback.message.edit_text("❌ Данная версия Aiogram еще не поддерживает send_gift. Обновите библиотеку.")
    except Exception as e:
        await callback.message.edit_text(f"❌ Ошибка отправки подарка: {e}\nВозможно, у бота недостаточно звёзд или ID неверен.")
        
    await state.clear()

@router.callback_query(AdminStates.confirming_gift, F.data == "cancel_tg_gift")
async def cancel_tg_gift(callback: CallbackQuery, state: FSMContext):
    await callback.message.edit_text("❌ Отправка подарка отменена.")
    await state.clear()
