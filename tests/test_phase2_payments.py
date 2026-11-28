from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from bot.services.payment_logic import (  # noqa: E402
    STARS_PRODUCTS,
    can_transition_payment_status,
    validate_stars_pre_checkout,
)
from backend.payment_logic import (  # noqa: E402
    STARS_PRODUCTS as BACKEND_STARS_PRODUCTS,
    validate_stars_pre_checkout as backend_validate_pre_checkout,
)


def test_stars_pre_checkout_validation_and_status_transitions():
    order = {
        "merchant_trans_id": "stars_101_abc",
        "provider": "stars",
        "currency": "XTR",
        "status": "pending",
        "user_id": 101,
        "amount_minor": 100,
    }
    assert validate_stars_pre_checkout(order, caller_user_id=101, currency="XTR", total_amount=100) == (True, None)
    assert backend_validate_pre_checkout(order, caller_user_id=101, currency="XTR", total_amount=100) == (True, None)

    # Foreign order
    ok_user, _ = validate_stars_pre_checkout(order, caller_user_id=999, currency="XTR", total_amount=100)
    assert ok_user is False

    # Wrong amount
    ok_amt, _ = validate_stars_pre_checkout(order, caller_user_id=101, currency="XTR", total_amount=5)
    assert ok_amt is False

    # Wrong currency
    ok_cur, _ = validate_stars_pre_checkout(order, caller_user_id=101, currency="USD", total_amount=100)
    assert ok_cur is False

    # Already paid
    ok_paid, _ = validate_stars_pre_checkout({**order, "status": "paid"}, caller_user_id=101, currency="XTR", total_amount=100)
    assert ok_paid is False

    # Status machine transitions
    assert can_transition_payment_status("pending", "paid") is True
    assert can_transition_payment_status("paid", "refunded") is True
    assert can_transition_payment_status("cancelled", "paid") is False
    assert can_transition_payment_status("refunded", "paid") is False
    assert set(STARS_PRODUCTS.keys()) == set(BACKEND_STARS_PRODUCTS.keys())


def test_phase2_migration_without_click_and_with_historical_backfill():
    sql002 = (ROOT / "database" / "migrations" / "002_phase2_payments.sql").read_text(encoding="utf-8")
    assert "uq_payments_telegram_charge_id" in sql002
    assert "trg_enforce_payment_status_transition" in sql002
    assert "complete_stars_payment" in sql002
    assert "refund_stars_payment" in sql002
    assert "fail_pending_payment" in sql002
    assert "FOR UPDATE" in sql002
    # 004_remove_click.sql was folded into 002 before any DB application
    assert not (ROOT / "database" / "migrations" / "004_remove_click.sql").exists()
    assert "click_prepare_payment" not in sql002
    assert "click_complete_payment" not in sql002
    assert "uq_payments_click_trans_id" not in sql002
    # Historical Click rows & 'completed' status remain supported & backfilled
    assert "'click'" in sql002
    assert "'completed'" in sql002


def test_all_stars_paths_use_unified_rpcs_without_direct_status_updates():
    bot_payments = (ROOT / "bot" / "handlers" / "payments.py").read_text(encoding="utf-8")
    backend_sb = (ROOT / "backend" / "supabase_client.py").read_text(encoding="utf-8")
    backend_bot = (ROOT / "backend" / "student_bot.py").read_text(encoding="utf-8")
    tgcloud_sb = (ROOT / "RashidovApp" / "tgcloud" / "lib" / "supabase.js").read_text(encoding="utf-8")
    tgcloud_msg = (ROOT / "RashidovApp" / "tgcloud" / "handlers" / "message.js").read_text(encoding="utf-8")
    vercel_inv = (ROOT / "user-app" / "api" / "create-invoice.js").read_text(encoding="utf-8")

    # All 3 stacks use complete_stars_payment & refund_stars_payment
    assert "complete_stars_payment" in bot_payments and "refund_stars_payment" in bot_payments
    assert "complete_stars_payment" in backend_sb and "refund_stars_payment" in backend_sb
    assert "complete_stars_payment" in backend_bot and "refund_stars_payment" in backend_bot
    assert "complete_stars_payment" in tgcloud_sb and "refund_stars_payment" in tgcloud_sb
    assert "completeStarsPayment" in tgcloud_msg and "refundStarsPayment" in tgcloud_msg

    # Failure rollback uses fail_pending_payment RPC
    assert "fail_pending_payment" in bot_payments
    assert "fail_pending_payment" in backend_sb
    assert "fail_pending_payment" in vercel_inv

    app_files = [
        ROOT / "bot" / "handlers" / "payments.py",
        ROOT / "backend" / "main.py",
        ROOT / "backend" / "student_bot.py",
        ROOT / "backend" / "supabase_client.py",
        ROOT / "RashidovApp" / "tgcloud" / "handlers" / "message.js",
        ROOT / "RashidovApp" / "tgcloud" / "lib" / "supabase.js",
        ROOT / "user-app" / "api" / "create-invoice.js",
    ]
    for path in app_files:
        txt = path.read_text(encoding="utf-8").lower()
        assert "update payments set status" not in txt, f"Direct payment status update found in {path}"
        assert "/payments?" not in txt or "select=" in txt, f"Direct PATCH on /payments found in {path}"


def test_click_routes_and_handlers_are_completely_removed():
    assert not (ROOT / "bot" / "handlers" / "click_webhook.py").exists()
    assert not (ROOT / "user-app" / "src" / "components" / "TopUp.jsx").exists()

    for rel in [
        "bot/main.py",
        "bot/config.py",
        "bot/services/payment_logic.py",
        "backend/main.py",
        ".env.example",
    ]:
        content = (ROOT / rel).read_text(encoding="utf-8")
        assert "/api/payments/click" not in content
        assert "create-click-order" not in content
        assert "CLICK_" not in content
        assert "click_webhook" not in content
