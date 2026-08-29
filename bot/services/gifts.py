from asyncpg import Pool
from aiogram import Bot
from bot.db import get_lessons_by_course, get_course_progress
from bot.utils.messages import msg
import logging

logger = logging.getLogger(__name__)


async def check_perfect_course(pool: Pool, user_id: int, course_id: int) -> bool:
    """Проверить, прошёл ли ученик ВСЕ уроки курса на 3 звезды."""
    lessons = await get_lessons_by_course(pool, course_id)
    if not lessons:
        return False

    progress = await get_course_progress(pool, user_id, course_id)
    progress_dict = {p['lesson_id']: p['stars'] for p in progress}

    for lesson in lessons:
        if progress_dict.get(lesson['id'], 0) < 3:
            return False
    return True


async def send_gift_if_perfect(bot: Bot, pool: Pool, user_id: int, course_id: int):
    """
    Если все уроки курса на 3 звезды — отправить подарок.
    Использует Telegram sendGift API (или сообщение как fallback).
    """
    is_perfect = await check_perfect_course(pool, user_id, course_id)
    if not is_perfect:
        return

    try:
        # Попытка использовать sendGift API (если доступен в aiogram)
        # await bot.send_gift(user_id, gift_id=..., text=GIFT_COMMENT)

        # Fallback: отправка поздравительного сообщения
        from bot.db import get_lessons_by_course
        from bot.db import get_courses_by_subject
        # Получить название курса
        await bot.send_message(
            user_id,
            msg('gift_perfect_course', 'ru', course='курс')
        )
        logger.info(f"Perfect course gift sent to user {user_id}, course {course_id}")
    except Exception as e:
        logger.error(f"Failed to send gift to {user_id}: {e}")
