from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import CommandStart, CommandObject
from aiogram.fsm.context import FSMContext
from bot.states.onboarding import OnboardingStates
from bot.db import create_user, create_referral
from bot.keyboards.inline import language_keyboard, main_menu_keyboard
from bot.utils.messages import msg
from bot.config import config

router = Router()


@router.message(CommandStart())
async def start_handler(message: Message, command: CommandObject, db_user: dict, pool, state: FSMContext):
    # Сохранить реферальный ID если есть
    ref_args = command.args
    if ref_args and ref_args.startswith("ref_"):
        try:
            await state.update_data(referrer_id=int(ref_args[4:]))
        except ValueError:
            pass

    if db_user:
        # Уже зарегистрирован — приветствие
        lang = db_user.get('language', 'ru')
        await message.answer(
            msg('welcome_back', lang, name=db_user['full_name']),
            reply_markup=main_menu_keyboard(config.USER_APP_URL)
        )
    else:
        # Новый юзер — первый шаг: выбор языка
        await message.answer(
            msg('choose_language'),
            reply_markup=language_keyboard()
        )
        await state.set_state(OnboardingStates.choosing_language)


@router.callback_query(F.data.startswith('lang_'), OnboardingStates.choosing_language)
async def lang_chosen(call: CallbackQuery, state: FSMContext):
    lang = call.data.split('_')[1]  # 'ru' or 'uz'
    await state.update_data(language=lang)
    await call.message.edit_text(msg('enter_name', lang))
    await state.set_state(OnboardingStates.entering_name)
    await call.answer()


@router.message(OnboardingStates.entering_name)
async def name_entered(message: Message, state: FSMContext):
    await state.update_data(full_name=message.text.strip())
    data = await state.get_data()
    lang = data.get('language', 'ru')
    await message.answer(msg('enter_class', lang))
    await state.set_state(OnboardingStates.entering_class)


@router.message(OnboardingStates.entering_class)
async def class_entered(message: Message, state: FSMContext, pool):
    class_group = message.text.strip()
    data = await state.get_data()
    lang = data.get('language', 'ru')
    full_name = data.get('full_name')
    referrer_id = data.get('referrer_id')

    # Создать юзера в БД
    await create_user(pool, message.from_user.id, full_name, class_group, lang)

    # Реферальный бонус обоим
    if referrer_id:
        await create_referral(pool, referrer_id, message.from_user.id)
        from bot.services.economy import add_neurons
        await add_neurons(pool, referrer_id, config.REFERRAL_BONUS, 'referral',
                          f'Реферал: {full_name}')
        await add_neurons(pool, message.from_user.id, config.REFERRAL_BONUS, 'referral',
                          'Бонус за регистрацию по реферальной ссылке')

    await message.answer(
        msg('registered', lang),
        reply_markup=main_menu_keyboard(config.USER_APP_URL)
    )
    await state.clear()
