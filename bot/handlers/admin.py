from aiogram import Router, F
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from bot.states.admin import AdminStates
from bot.database.supabase import SupabaseClient

router = Router()
db = SupabaseClient()

@router.message(AdminStates.waiting_for_message)
async def process_admin_message(message: Message, state: FSMContext):
    # Сохраняем message_id для пересылки
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
