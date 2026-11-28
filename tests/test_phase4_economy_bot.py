from pathlib import Path
import asyncio
import sys
import types

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from bot.services.payment_logic import assess_refund_risk  # noqa: E402
from bot.services.phase4_guards import (  # noqa: E402
    evaluate_admin_refund_prompt,
    extract_clean_text,
    format_teacher_stats_entry,
    handle_dispatcher_error,
    parse_referrer_id,
    sanitize_referral_tx_description,
)


def test_phase4_migration_and_preflight_structure():
    preflight = (ROOT / "database" / "migrations" / "004_preflight.sql").read_text(encoding="utf-8")
    assert "WHERE COALESCE(balance, 0) < 0" in preflight
    assert "GROUP BY referred_id" in preflight
    assert "WHERE referrer_id = referred_id" in preflight

    sql004 = (ROOT / "database" / "migrations" / "004_phase4_economy_exams.sql").read_text(encoding="utf-8")
    # Debt & refund model
    assert "ADD COLUMN IF NOT EXISTS debt BIGINT NOT NULL DEFAULT 0" in sql004
    assert "CHECK (debt >= 0)" in sql004
    assert "CHECK (balance >= 0)" in sql004
    assert "LEAST(v_balance, v_xp_credited)" in sql004
    assert "v_debt_repaid := LEAST(v_debt, v_credited)" in sql004
    assert "debt_blocked" in sql004
    # Protected user columns & revoked direct writes
    for col in ("NEW.balance", "NEW.xp", "NEW.debt", "NEW.streak_days", "NEW.last_active_date", "NEW.frozen_until"):
        assert col in sql004
    # Guard trigger MUST use Postgres current_user (NOT JWT auth.role()) and be SECURITY INVOKER
    guard_block = sql004.split("CREATE OR REPLACE FUNCTION public.guard_user_privileged_columns()")[1].split("CREATE OR REPLACE FUNCTION public.can_manage_subject")[0]
    assert "current_user" in guard_block
    assert "auth.role()" not in guard_block
    assert "SECURITY DEFINER" not in guard_block
    # Scoped teacher RLS helpers & app_settings single price source
    assert "CREATE OR REPLACE FUNCTION public.can_manage_subject" in sql004
    assert "CREATE OR REPLACE FUNCTION public.teacher_has_permission" in sql004
    assert "CREATE OR REPLACE FUNCTION public.admin_gift_balance" in sql004
    assert "CREATE TABLE IF NOT EXISTS public.app_settings" in sql004
    assert "CREATE OR REPLACE FUNCTION public.get_streak_freeze_cost()" in sql004
    assert "transactions_insert_superadmin_only" in sql004
    assert "promo_uses_insert_superadmin_only" in sql004
    assert "progress_manage_staff" in sql004
    assert "questions_select_staff" in sql004
    # Unified streak freeze reads cost from get_streak_freeze_cost(), promos, exams, referrals
    assert "public.get_streak_freeze_cost()" in sql004
    assert "CREATE OR REPLACE FUNCTION public.freeze_streak_rpc()" in sql004
    assert "CREATE OR REPLACE FUNCTION public.freeze_streak_service(p_user_id BIGINT)" in sql004
    assert "CREATE OR REPLACE FUNCTION public.get_lessons_catalog" in sql004
    assert "lessons_select_staff" in sql004
    assert "SET search_path = public, pg_temp" in sql004
    assert "CREATE OR REPLACE FUNCTION public.redeem_promo" in sql004
    assert "expires_at" in sql004
    assert "CREATE TABLE IF NOT EXISTS public.exam_attempts" in sql004
    assert "uq_referrals_referred_id" in sql004
    assert "CHECK (referrer_id <> referred_id)" in sql004

    user_pkg = (ROOT / "user-app" / "package.json").read_text(encoding="utf-8")
    assert '"sharp"' not in user_pkg


def test_refund_precheck_with_insufficient_balance_requires_admin_confirmation():
    payment = {
        "user_id": 777,
        "merchant_trans_id": "stars_777_abc",
        "telegram_payment_charge_id": "tg_chg_1",
        "amount_minor": 100,
        "xp_credited": 25000,
        "status": "paid",
    }
    low_balance_user = {"telegram_id": 777, "balance": 1200, "debt": 0}
    prompt_info = evaluate_admin_refund_prompt(payment, low_balance_user)
    assert prompt_info["ok"] is True
    assert prompt_info["requires_debt_confirmation"] is True
    assert prompt_info["deducted"] == 1200
    assert prompt_info["shortfall"] == 23800
    assert prompt_info["projected_balance"] == 0
    assert prompt_info["projected_debt"] == 23800
    assert "Автоматический возврат НЕ выполнен" in prompt_info["prompt_text"]

    full_balance_user = {"telegram_id": 777, "balance": 30000, "debt": 0}
    ok_info = assess_refund_risk(payment, full_balance_user)
    assert ok_info["requires_debt_confirmation"] is False
    assert ok_info["deducted"] == 25000
    assert ok_info["shortfall"] == 0
    assert ok_info["projected_balance"] == 5000


def test_onboarding_non_text_guard_and_referral_security():
    # Photo / sticker / voice -> message.text is None
    assert extract_clean_text(None) is None
    assert extract_clean_text("   ") is None
    assert extract_clean_text("  Ali Valiyev  ") == "Ali Valiyev"

    # Self-referral and invalid args blocked
    assert parse_referrer_id("ref_1001", caller_user_id=1001) is None
    assert parse_referrer_id("ref_abc", caller_user_id=1001) is None
    assert parse_referrer_id("buy_100", caller_user_id=1001) is None
    assert parse_referrer_id("ref_999", caller_user_id=1001) == 999

    # Referral tx description leaks zero PII (no name / username / id)
    desc_r = sanitize_referral_tx_description(is_referrer=True)
    desc_u = sanitize_referral_tx_description(is_referrer=False)
    assert "{" not in desc_r and ":" not in desc_r
    assert "Реферальный бонус" == desc_r
    assert "Бонус" in desc_u


def test_teacher_stats_formatting_handles_subject_admins_without_keyerror():
    # Previously crashed with KeyError: 'name' / KeyError: 'id'
    formatted = format_teacher_stats_entry({"id": 2, "name": "Kimyo"}, {"student_count": 15, "test_count": 40, "avg_score": 2.75})
    assert "Kimyo" in formatted
    assert "15" in formatted
    assert "40" in formatted
    assert "2.8" in formatted

    fallback = format_teacher_stats_entry({"id": 9}, {})
    assert "Предмет #9" in fallback


def test_global_error_handler_isolates_failing_update():
    async def _run():
        fake_event = types.SimpleNamespace(
            update=types.SimpleNamespace(update_id=42),
            exception=RuntimeError("boom"),
        )
        handled = await handle_dispatcher_error(fake_event)
        assert handled is True

    asyncio.run(_run())


def test_streak_freeze_price_unified_at_10000():
    bot_cfg = (ROOT / "bot" / "config.py").read_text(encoding="utf-8")
    assert "STREAK_FREEZE_COST: int = 10000" in bot_cfg
    economy_py = (ROOT / "bot" / "services" / "economy.py").read_text(encoding="utf-8")
    assert "freeze_streak_service" in economy_py
    assert ", 50," not in economy_py

    start_py = (ROOT / "bot" / "handlers" / "start.py").read_text(encoding="utf-8")
    assert 'f"Ошибка: {e}"' not in start_py
    assert "create_referral" in start_py


def test_security_cleanup_helpers_testing_admin_supabase_and_tgcloud():
    helpers_py = (ROOT / "bot" / "utils" / "helpers.py").read_text(encoding="utf-8")
    assert "secrets.choice" in helpers_py
    assert "random.choices" not in helpers_py

    testing_py = (ROOT / "bot" / "handlers" / "testing.py").read_text(encoding="utf-8")
    assert "'c': question" not in testing_py
    assert "'qid'" in testing_py

    ai_helper_py = (ROOT / "bot" / "handlers" / "ai_helper.py").read_text(encoding="utf-8")
    assert "FROM questions WHERE id" in ai_helper_py

    admin_py = (ROOT / "bot" / "handlers" / "admin.py").read_text(encoding="utf-8")
    assert "({e})" not in admin_py
    assert ": {e}" not in admin_py

    sb_py = (ROOT / "backend" / "supabase_client.py").read_text(encoding="utf-8")
    assert "re.sub(" in sb_py

    for rel in ("RashidovApp/package.json", "RashidovStudio_bot/package.json"):
        pkg = (ROOT / rel).read_text(encoding="utf-8")
        assert '"@tgcloud/cli": "0.2.0"' in pkg
        assert '"latest"' not in pkg

    sql004 = (ROOT / "database" / "migrations" / "004_phase4_economy_exams.sql").read_text(encoding="utf-8")
    ct_block = sql004.split("CREATE OR REPLACE FUNCTION public.current_telegram_id()")[1].split("ALTER FUNCTION public.is_staff()")[0]
    assert "auth.jwt() ->> 'sub'" in ct_block
    assert "auth.uid()" not in ct_block
