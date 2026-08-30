from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from bot.states.testing import TestStates
from bot.db import get_questions_by_lesson, get_lesson, set_progress
from bot.keyboards.inline import quiz_options_keyboard
from bot.utils.helpers import calculate_stars
from bot.utils.messages import msg, get_verdict
from bot.services.gifts import send_gift_if_perfect
from bot.services.streak import update_user_streak
import json
import time
import random

router = Router()


@router.message(F.web_app_data)
async def web_app_handler(message: Message, state: FSMContext, pool, db_user):
    data = json.loads(message.web_app_data.data)
    if data.get('action') != 'test_ready':
        return

    lesson_id = data.get('lesson_id')
    course_id = data.get('course_id')
    lang = db_user.get('language', 'ru') if db_user else 'ru'

    # Загрузить все вопросы из банка
    all_questions = await get_questions_by_lesson(pool, lesson_id)
    if not all_questions:
        await message.answer(msg('test_no_questions', lang))
        return

    questions = [dict(q) for q in all_questions]
    random.shuffle(questions)

    # ─── УЧИТЕЛЬ РЕШАЕТ СКОЛЬКО ВОПРОСОВ ───
    # Если в уроке задано test_question_count — берём только N случайных
    lesson = await get_lesson(pool, lesson_id)
    if lesson and lesson.get('test_question_count'):
        limit = lesson['test_question_count']
        questions = questions[:limit]

    total = len(questions)

    await state.update_data(
        questions=questions,
        current_index=0,
        correct_count=0,
        total=total,
        lesson_id=lesson_id,
        course_id=course_id,
        lang=lang,
        timestamps={}
    )
    await state.set_state(TestStates.active)

    await message.answer(msg('test_starting', lang, count=total))
    await send_question(message, state, await state.get_data())


async def send_question(message, state: FSMContext, data: dict):
    q_idx = data['current_index']
    question = data['questions'][q_idx]
    total = data['total']
    lang = data.get('lang', 'ru')

    options = json.loads(question['options']) if isinstance(question['options'], str) else question['options']
    keyboard = quiz_options_keyboard(options, q_idx)

    text = msg('test_question', lang, current=q_idx + 1, total=total, text=question['text'])
    
    if question.get('image_url'):
        await message.answer_photo(photo=question['image_url'], caption=text, reply_markup=keyboard)
    else:
        await message.answer(text, reply_markup=keyboard)

    data['timestamps'][str(q_idx)] = time.time()
    await state.update_data(timestamps=data['timestamps'])


@router.callback_query(F.data.startswith('answer_'), TestStates.active)
async def answer_handler(call: CallbackQuery, state: FSMContext, pool, db_user, bot: Bot):
    _, q_idx_str, opt_idx_str = call.data.split('_')
    q_idx = int(q_idx_str)
    opt_idx = int(opt_idx_str)

    data = await state.get_data()
    lang = data.get('lang', 'ru')

    if q_idx != data['current_index']:
        await call.answer("⏳")
        return

    question = data['questions'][q_idx]
    start_time = data['timestamps'].get(str(q_idx), 0)

    # ─── АНТИЧИТ: проверка времени ───
    is_time_up = (time.time() - start_time) > (question['time_limit'] + 2)
    is_correct = (opt_idx == question['correct_option_index']) and not is_time_up

    options = json.loads(question['options']) if isinstance(question['options'], str) else question['options']

    if is_correct:
        result_msg = f"{question['text']}\n\n{msg('test_correct', lang)}"
        if call.message.photo:
            await call.message.edit_caption(caption=result_msg)
        else:
            await call.message.edit_text(text=result_msg)
        data['correct_count'] += 1
    else:
        # Формируем сообщение об ошибке
        if is_time_up:
            error_text = msg('test_time_up', lang)
        else:
            error_text = msg('test_incorrect', lang)

        # Контекст для AI помощника (скрытый в сообщении)
        context = json.dumps({
            'q': question['text'],
            'o': options,
            'c': question['correct_option_index'],
            'u': opt_idx
        }, ensure_ascii=False)

        ai_hint = msg('test_ai_hint', lang)
        result_msg = f"{question['text']}\n\n{error_text}{ai_hint}\n<!-- {context} -->"
        if call.message.photo:
            await call.message.edit_caption(caption=result_msg)
        else:
            await call.message.edit_text(text=result_msg)

    data['current_index'] += 1
    await state.update_data(
        current_index=data['current_index'],
        correct_count=data['correct_count']
    )

    if data['current_index'] < data['total']:
        # Следующий вопрос
        await send_question(call.message, state, data)
    else:
        # ─── РЕЗУЛЬТАТЫ ───
        correct = data['correct_count']
        total = data['total']
        stars = calculate_stars(correct, total)
        verdict = get_verdict(stars, lang)

        await set_progress(pool, call.from_user.id, data['lesson_id'], stars, True)

        result_text = msg('test_result', lang,
                          correct=correct, total=total,
                          stars=stars, verdict=verdict)
        await call.message.answer(result_text)

        await update_user_streak(pool, call.from_user.id)

        if data.get('course_id'):
            await send_gift_if_perfect(bot, pool, call.from_user.id, data['course_id'])

        await state.clear()
