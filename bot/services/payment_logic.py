import uuid
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class StarsProduct:
    product_id: str
    stars: int
    neurons: int
    title: str


STARS_PRODUCTS: dict[str, StarsProduct] = {
    "stars_5": StarsProduct("stars_5", 5, 1250, "1 250 Neyron"),
    "stars_100": StarsProduct("stars_100", 100, 25000, "25 000 Neyron"),
    "stars_400": StarsProduct("stars_400", 400, 100000, "100 000 Neyron"),
    "stars_600": StarsProduct("stars_600", 600, 150000, "150 000 Neyron"),
    "stars_1000": StarsProduct("stars_1000", 1000, 250000, "250 000 Neyron"),
    "stars_3500": StarsProduct("stars_3500", 3500, 1000000, "1 000 000 Neyron"),
}

VALID_PAYMENT_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"pending", "paid", "failed", "cancelled"},
    "paid": {"refunded"},
    "failed": set(),
    "cancelled": set(),
    "refunded": set(),
}


def can_transition_payment_status(old_status: str, new_status: str) -> bool:
    if old_status == new_status:
        return True
    return new_status in VALID_PAYMENT_TRANSITIONS.get(old_status, set())


def generate_merchant_trans_id(prefix: str, user_id: int) -> str:
    return f"{prefix}_{int(user_id)}_{uuid.uuid4().hex[:16]}"


def validate_stars_pre_checkout(
    payment: dict[str, Any] | None,
    *,
    caller_user_id: int,
    currency: str,
    total_amount: int,
) -> tuple[bool, str | None]:
    if not payment:
        return False, "Заказ не найден. Создайте счёт заново."
    if payment.get("provider") != "stars" or payment.get("currency") != "XTR":
        return False, "Неверный тип заказа."
    if payment.get("status") != "pending":
        return False, "Счёт уже оплачен или отменён."
    if int(payment.get("user_id") or 0) != int(caller_user_id):
        return False, "Этот счёт принадлежит другому пользователю."
    if str(currency) != "XTR":
        return False, "Неверная валюта платежа."
    expected_stars = int(
        payment.get("amount_minor") if payment.get("amount_minor") is not None else payment.get("amount") or 0
    )
    if int(total_amount) != expected_stars or expected_stars <= 0:
        return False, "Сумма платежа не совпадает с заказом."
    return True, None


def assess_refund_risk(
    payment: dict[str, Any] | None,
    user: dict[str, Any] | None,
) -> dict[str, Any]:
    """Check whether refunding a paid Stars order requires creating debt before calling Bot API."""
    if not payment:
        return {"ok": False, "reason": "not_found"}
    status = str(payment.get("status") or "")
    if status == "refunded":
        return {"ok": False, "reason": "already_refunded"}
    if status not in ("paid", "completed"):
        return {"ok": False, "reason": "invalid_status", "status": status}
    charge_id = str(payment.get("telegram_payment_charge_id") or "").strip()
    if not charge_id:
        return {"ok": False, "reason": "missing_charge_id"}

    xp_credited = max(0, int(payment.get("xp_credited") or 0))
    balance = max(0, int((user or {}).get("balance") or 0))
    debt = max(0, int((user or {}).get("debt") or 0))
    total_stars = int(
        payment.get("amount_minor") if payment.get("amount_minor") is not None else payment.get("amount") or 0
    )
    deducted = min(balance, xp_credited)
    shortfall = max(0, xp_credited - deducted)
    return {
        "ok": True,
        "user_id": int(payment["user_id"]),
        "merchant_trans_id": payment.get("merchant_trans_id"),
        "telegram_payment_charge_id": charge_id,
        "total_stars": total_stars,
        "xp_credited": xp_credited,
        "balance": balance,
        "debt": debt,
        "deducted": deducted,
        "shortfall": shortfall,
        "requires_debt_confirmation": shortfall > 0,
        "projected_balance": balance - deducted,
        "projected_debt": debt + shortfall,
    }
