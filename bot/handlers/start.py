from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import CommandStart, CommandObject
from aiogram.fsm.context import FSMContext
from bot.states.onboarding import OnboardingStates
from bot.db import create_user, create_referral, get_user
from bot.keyboards.inline import language_keyboard
from bot.keyboards.reply import main_menu_reply_keyboard
from bot.utils.messages import msg
from bot.config import config
from bot.services.phase4_guards import (
    extract_clean_text,
    parse_referrer_id,
    sanitize_referral_tx_description,
)

router = Router()


from bot.handlers.payments import send_stars_invoice

@router.message(CommandStart())
async def start_handler(message: Message, command: CommandObject, db_user: dict, pool, state: FSMContext):
    # Сохранить реферальный ID если есть
    args = command.args
    if args:
        if args.startswith("ref_") and message.from_user:
            parsed_ref = parse_referrer_id(args, message.from_user.id)
            if parsed_ref:
                await state.update_data(referrer_id=parsed_ref)
        elif args.startswith("buy_"):
            try:
                stars = int(args[4:])
                await send_stars_invoice(message, pool, f"stars_{stars}")
                return
            except ValueError:
                pass
        elif args.startswith("video_"):
            try:
                lesson_id = int(args[6:])
                user_id = message.from_user.id if message.from_user else 0
                async with pool.acquire() as conn:
                    raw = await conn.fetchval(
                        "SELECT public.check_lesson_access($1, $2)",
                        user_id,
                        lesson_id,
                    )
                    import json as _json

                    access = _json.loads(raw) if isinstance(raw, str) else dict(raw)
                    if not access.get("found"):
                        await message.answer("Видео не найдено.")
                    elif not access.get("allowed"):
                        await message.answer("⛔ Ushbu video dars faqat sotib olingan yoki ochilgan kurslar uchun.")
                    elif access.get("video_url"):
                        await message.answer("🔄 Загрузка видео...")
                        try:
                            await message.answer_video(
                                access["video_url"],
                                caption=access.get("title") or "Video dars",
                                supports_streaming=True,
                                protect_content=True,
                            )
                        except Exception:
                            await message.answer("Video faylini yuklab bo'lmadi. Iltimos, platformada tomosha qiling.", protect_content=True)
                    else:
                        await message.answer("Видео не найдено.")
                return
            except Exception:
                pass
        elif args.startswith("msg_"):
            try:
                target_id = int(args[4:])
                if db_user and db_user.get('role') in ['teacher', 'superadmin', 'admin']:
                    await state.update_data(target_user_id=target_id)
                    await message.answer("✍️ Отправьте сообщение, которое хотите переслать этому пользователю (можно с фото, видео, кружочком, текстом и т.д.):")
                    from bot.states.admin import AdminStates
                    await state.set_state(AdminStates.waiting_for_message)
                else:
                    await message.answer("У вас нет прав для отправки сообщений.")
                return
            except Exception as e:
                import logging
                logging.error("Error in msg_ deep link: %s", type(e).__name__)
                await message.answer("❌ Не удалось открыть диалог.")
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
    data = await state.get_data()
    lang = data.get('language', 'ru')
    full_name = extract_clean_text(getattr(message, 'text', None))
    if not full_name:
        await message.answer(msg('enter_name', lang))
        return
    await state.update_data(full_name=full_name[:120])
    await message.answer(msg('enter_class', lang))
    await state.set_state(OnboardingStates.entering_class)


@router.message(OnboardingStates.entering_class)
async def class_entered(message: Message, state: FSMContext, pool):
    data = await state.get_data()
    lang = data.get('language', 'ru')
    class_group = extract_clean_text(getattr(message, 'text', None))
    if not class_group:
        await message.answer(msg('enter_class', lang))
        return

    full_name = data.get('full_name') or 'Student'
    referrer_id = data.get('referrer_id')
    user_id = message.from_user.id

    existing = await get_user(pool, user_id)
    is_new_user = existing is None
    if is_new_user:
        await create_user(pool, user_id, full_name, class_group[:60], lang)

    # Реферальный бонус строго 1 раз для нового пользователя и без самореферала / PII
    if is_new_user and referrer_id and int(referrer_id) != int(user_id):
        created_ref = await create_referral(pool, int(referrer_id), user_id)
        if created_ref:
            from bot.services.economy import add_neurons
            await add_neurons(
                pool,
                int(referrer_id),
                config.REFERRAL_BONUS,
                'referral',
                sanitize_referral_tx_description(is_referrer=True),
            )
            await add_neurons(
                pool,
                user_id,
                config.REFERRAL_BONUS,
                'referral',
                sanitize_referral_tx_description(is_referrer=False),
            )

    await message.answer(
        msg('registered', lang),
        reply_markup=main_menu_reply_keyboard(config.USER_APP_URL, lang, message.from_user.id)
    )
    await state.clear()
