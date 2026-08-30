from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import CommandStart, CommandObject
from aiogram.fsm.context import FSMContext
from bot.states.onboarding import OnboardingStates
from bot.db import create_user, create_referral
from bot.keyboards.inline import language_keyboard
from bot.keyboards.reply import main_menu_reply_keyboard
from bot.utils.messages import msg
from bot.config import config

router = Router()


from bot.handlers.payments import send_stars_invoice

@router.message(CommandStart())
async def start_handler(message: Message, command: CommandObject, db_user: dict, pool, state: FSMContext):
    # Сохранить реферальный ID если есть
    args = command.args
    if args:
        if args.startswith("ref_"):
            try:
                await state.update_data(referrer_id=int(args[4:]))
            except ValueError:
                pass
        elif args.startswith("buy_"):
            try:
                stars = int(args[4:])
                await send_stars_invoice(message, stars)
                return
            except ValueError:
                pass
        elif args.startswith("video_"):
            try:
                lesson_id = int(args[6:])
                async with pool.acquire() as conn:
                    lesson = await conn.fetchrow("SELECT title, video_url FROM lessons WHERE id = $1", lesson_id)
                    if lesson and lesson['video_url']:
                        await message.answer("🔄 Загрузка видео...")
                        try:
                            await message.answer_video(lesson['video_url'], caption=lesson['title'])
                        except Exception as e:
                            await message.answer(f"📹 {lesson['title']}\nСмотреть: {lesson['video_url']}")
                    else:
                        await message.answer("Видео не найдено.")
                return
            except Exception as e:
                pass
        elif args.startswith("msg_"):
            try:
                target_id = int(args[4:])
                if db_user and db_user.get('role') in ['teacher', 'superadmin']:
                    await state.update_data(target_user_id=target_id)
                    await message.answer("✍️ Отправьте сообщение, которое хотите переслать этому пользователю (можно с фото, видео, кружочком, текстом и т.д.):")
                    from bot.states.admin import AdminStates
                    await state.set_state(AdminStates.waiting_for_message)
                else:
                    await message.answer("У вас нет прав для отправки сообщений.")
                return
            except Exception as e:
                import logging
                logging.error(f"Error in msg_ deep link: {e}")
                await message.answer(f"Ошибка: {e}")
                return

    if db_user:
        # Уже зарегистрирован — приветствие
        lang = db_user.get('language', 'ru')
        await message.answer(
            msg('welcome_back', lang, name=db_user['full_name']),
            reply_markup=main_menu_reply_keyboard(config.USER_APP_URL, lang, message.from_user.id)
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
        reply_markup=main_menu_reply_keyboard(config.USER_APP_URL, lang)
    )
    await state.clear()
