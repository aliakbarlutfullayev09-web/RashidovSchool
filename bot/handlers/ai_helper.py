from aiogram import Router, F
from aiogram.types import Message
from bot.services.gemini import get_ai_explanation
from bot.utils.messages import msg
from bot.config import config
import json
import logging

logger = logging.getLogger(__name__)

router = Router()


@router.message(F.text.startswith('/ai') & F.reply_to_message)
async def ai_helper_handler(message: Message, db_user):
    """
    Ученик делает Reply на сообщение с ❌ и пишет /ai.
    Бот извлекает контекст вопроса и отправляет в Gemini API.
    """
    lang = db_user.get('language', 'ru') if db_user else 'ru'
    replied = message.reply_to_message

    if not replied or not replied.text or '❌' not in replied.text:
        return

    if '<!--' not in replied.text:
        return

    try:
        # Извлечь скрытый контекст из HTML-комментария
        context_str = replied.text.split('<!--')[1].split('-->')[0].strip()
        context = json.loads(context_str)

        explanation = await get_ai_explanation(
            question_text=context['q'],
            options=context['o'],
            correct_index=context['c'],
            user_answer_index=context['u'],
            api_key=config.GEMINI_API_KEY
        )

        await message.answer(msg('ai_explanation', lang, text=explanation))

    except (json.JSONDecodeError, KeyError, IndexError) as e:
        logger.error(f"AI helper parse error: {e}")
        await message.answer(msg('ai_error', lang))
    except Exception as e:
        logger.error(f"AI helper error: {e}")
        await message.answer(msg('ai_error', lang))
