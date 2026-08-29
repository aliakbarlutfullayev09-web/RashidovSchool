from aiogram.fsm.state import State, StatesGroup

class OnboardingStates(StatesGroup):
    choosing_language = State()
    entering_name = State()
    entering_class = State()
