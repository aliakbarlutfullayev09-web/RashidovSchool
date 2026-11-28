"""Pure-Python Phase 4 guards for bot onboarding, referrals, /stats formatting, and dispatcher errors."""

from __future__ import annotations

import logging
from typing import Any

from bot.services.payment_logic import assess_refund_risk


def extract_clean_text(text: str | None) -> str | None:
    """Safely extract stripped text from a Telegram message; returns None for photos/stickers/voice."""
    if not isinstance(text, str):
        return None
    cleaned = text.strip()
    return cleaned if cleaned else None


def parse_referrer_id(raw_args: str | None, caller_user_id: int) -> int | None:
    """Parse ref_<id> argument while strictly blocking self-referral and non-numeric inputs."""
    if not isinstance(raw_args, str) or not raw_args.startswith("ref_"):
        return None
    candidate = raw_args[4:].strip()
    if not candidate.isdigit():
        return None
    ref_id = int(candidate)
    if ref_id <= 0 or ref_id == int(caller_user_id):
        return None
    return ref_id


def sanitize_referral_tx_description(is_referrer: bool) -> str:
    """Return an opaque transaction description without leaking any full_name/phone/username PII."""
    return "Реферальный бонус" if is_referrer else "Бонус за регистрацию по реферальной ссылке"


def format_teacher_stats_entry(subject_row: dict[str, Any], stats: dict[str, Any]) -> str:
    """Format a teacher subject stats block safely using dict-like access."""
    subject_name = subject_row.get("name") or f"Предмет #{subject_row.get('id', '?')}"
    students = int(stats.get("student_count") or 0)
    tests = int(stats.get("test_count") or 0)
    avg = float(stats.get("avg_score") or 0.0)
    return f"📚 {subject_name}\n👥 Учеников: {students}\n📝 Тестов пройдено: {tests}\n⭐ Средний балл: {avg:.1f}"


def evaluate_admin_refund_prompt(payment: dict[str, Any] | None, user: dict[str, Any] | None) -> dict[str, Any]:
    """Evaluate /refund request and return safe admin decision summary before calling refundStarPayment."""
    risk = assess_refund_risk(payment, user)
    if not risk.get("ok"):
        return risk
    if risk["requires_debt_confirmation"]:
        summary = (
            f"⚠️ Внимание: у пользователя {risk['balance']} 🧠, а по заказу начислено {risk['xp_credited']} 🧠.\n"
            f"Автоматический возврат НЕ выполнен.\n"
            f"При возврате спишется {risk['deducted']} 🧠, а остаток {risk['shortfall']} 🧠 запишется в долг (debt={risk['projected_debt']}).\n"
            "Подтвердить возврат с долгом?"
        )
    else:
        summary = (
            f"↩️ Возврат {risk['total_stars']} ⭐ для заказа {risk.get('merchant_trans_id') or risk['telegram_payment_charge_id']}.\n"
            f"С баланса пользователя ({risk['balance']} 🧠) спишется {risk['deducted']} 🧠, долг останется {risk['projected_debt']} 🧠.\n"
            "Подтвердить возврат?"
        )
    return {**risk, "prompt_text": summary}


async def handle_dispatcher_error(event: Any, *, logger_obj: logging.Logger | None = None) -> bool:
    """Global aiogram error handler helper: logs safely and swallows to keep polling/webhook alive."""
    log = logger_obj or logging.getLogger("bot.errors")
    exc = getattr(event, "exception", None)
    update = getattr(event, "update", None)
    update_id = getattr(update, "update_id", None)
    log.error("Unhandled update error update_id=%s err_type=%s", update_id, type(exc).__name__ if exc else "Unknown")
    return True
