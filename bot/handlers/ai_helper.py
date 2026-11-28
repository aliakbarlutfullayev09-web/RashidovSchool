import json
import logging

from aiogram import Bot, F, Router
from aiogram.types import Message

from bot.config import config
from bot.services.gemini import MAX_OPTIONS_COUNT, MAX_QUESTION_LEN, get_ai_explanation
from bot.utils.messages import msg

logger = logging.getLogger("bot.ai_helper")
router = Router()


async def _check_ai_limits(pool, user_id: int) -> tuple[bool, str | None]:
    """Enforce per-minute burst limit and daily quota atomically in Postgres."""
    async with pool.acquire() as conn:
        short_raw = await conn.fetchval(
            "SELECT public.check_rate_limit($1, $2, $3)",
            f"ai:min:{user_id}",
            config.AI_MINUTE_LIMIT,
            60,
        )
        short = json.loads(short_raw) if isinstance(short_raw, str) else dict(short_raw)
        if not short.get("allowed"):
            return False, "⏳ Слишком много запросов к AI. Подождите минуту."

        daily_raw = await conn.fetchval(
            "SELECT public.check_rate_limit($1, $2, $3)",
            f"ai:day:{user_id}",
            config.AI_DAILY_LIMIT,
            86400,
        )
        daily = json.loads(daily_raw) if isinstance(daily_raw, str) else dict(daily_raw)
        if not daily.get("allowed"):
            return False, "🚫 Дневной лимит обращений к AI-помощнику исчерпан. Попробуйте завтра."
    return True, None


@router.message(F.text.startswith("/ai") & F.reply_to_message)
async def ai_helper_handler(message: Message, db_user, pool, bot: Bot):
    """Explain wrong quiz answer via Gemini only for authentic bot-authored messages."""
    if not message.from_user or not db_user:
        return

    cmd_text = (message.text or "").strip()
    if len(cmd_text) > 100:
        return

    lang = db_user.get("language", "ru") if db_user else "ru"
    replied = message.reply_to_message
    if not replied or not replied.from_user or replied.from_user.id != bot.id:
        await message.answer("⚠️ Используйте /ai только ответом (Reply) на сообщение бота с ошибкой ❌.")
        return

    text_to_search = replied.text or replied.caption or ""
    if "❌" not in text_to_search or "<!--" not in text_to_search or "-->" not in text_to_search:
        return

    try:
        allowed, limit_msg = await _check_ai_limits(pool, message.from_user.id)
        if not allowed:
            await message.answer(limit_msg or "⏳ Слишком много запросов.")
            return

        context_str = text_to_search.split("<!--", 1)[1].split("-->", 1)[0].strip()
        if len(context_str) > 4000:
            await message.answer(msg("ai_error", lang))
            return

        context = json.loads(context_str)
        if not isinstance(context, dict):
            raise ValueError("Invalid context object")
        qid = int(context["qid"])
        u_idx = int(context["u"])

        async with pool.acquire() as conn:
            q_row = await conn.fetchrow(
                "SELECT text, options, correct_option_index FROM questions WHERE id = $1 LIMIT 1",
                qid,
            )
        if not q_row:
            await message.answer(msg("ai_error", lang))
            return

        q_text = str(q_row["text"])[:MAX_QUESTION_LEN]
        raw_opts = json.loads(q_row["options"]) if isinstance(q_row["options"], str) else list(q_row["options"])
        opts = raw_opts[:MAX_OPTIONS_COUNT]
        c_idx = int(q_row["correct_option_index"])

        explanation = await get_ai_explanation(
            question_text=q_text,
            options=opts,
            correct_index=c_idx,
            user_answer_index=u_idx,
            api_key=config.GEMINI_API_KEY,
            lang=lang,
        )
        await message.answer(msg("ai_explanation", lang, text=explanation))
    except (json.JSONDecodeError, KeyError, IndexError, TypeError, ValueError):
        logger.warning("ai_helper invalid_context uid=%s", message.from_user.id)
        await message.answer(msg("ai_error", lang))
    except Exception:
        logger.warning("ai_helper service_error uid=%s", message.from_user.id)
        await message.answer(msg("ai_error", lang))
