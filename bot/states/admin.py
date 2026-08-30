from aiogram.fsm.state import State, StatesGroup

class AdminStates(StatesGroup):
    waiting_for_message = State()
    confirming_message = State()
