from aiogram.fsm.state import State, StatesGroup

class AdminStates(StatesGroup):
    # Унаследованные от deep link 💬 Написать
    waiting_for_message = State()
    confirming_message = State()

    # Для команды /send
    waiting_for_broadcast_msg = State()
    confirming_broadcast = State()

    # Для команды /gift
    waiting_for_gift_target = State()
    waiting_for_gift_comment = State()
    waiting_for_gift_id = State()
    confirming_gift = State()
