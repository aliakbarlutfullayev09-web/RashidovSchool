import hashlib
import hmac
import json
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.auth import (  # noqa: E402
    sign_supabase_jwt,
    verify_bearer_jwt,
    verify_telegram_init_data,
    verify_webhook_secret,
)
from bot.auth import (  # noqa: E402
    sign_supabase_jwt as bot_sign_jwt,
    verify_telegram_init_data as bot_verify_init_data,
)


def make_init_data(user_obj: dict, bot_token: str, auth_date: int | None = None, extra: dict | None = None) -> str:
    ts = int(time.time()) if auth_date is None else int(auth_date)
    fields = {
        "auth_date": str(ts),
        "query_id": "AAHdF6IQAAAAAN0XohDhrOrc",
        "user": json.dumps(user_obj, separators=(",", ":")),
    }
    if extra:
        fields.update(extra)
    data_check_string = "\n".join(f"{k}={fields[k]}" for k in sorted(fields))
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    fields["hash"] = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    return urlencode(fields)


def test_webhook_secret_fail_closed():
    assert verify_webhook_secret("anything", "") is False
    assert verify_webhook_secret("", "") is False
    assert verify_webhook_secret(None, "real-secret") is False
    assert verify_webhook_secret("wrong-secret", "real-secret") is False
    assert verify_webhook_secret("real-secret", "real-secret") is True


def test_telegram_init_data_hmac_valid_and_tampered():
    token = "123456:TEST_BOT_TOKEN"
    user = {"id": 99887766, "first_name": "Dilnoza", "language_code": "uz"}
    now_ts = 1_700_000_000
    init_data = make_init_data(user, token, auth_date=now_ts - 30)

    parsed = verify_telegram_init_data(init_data, [token], max_age_seconds=3600, now_ts=now_ts)
    assert parsed["telegram_id"] == 99887766
    assert parsed["tg_user"]["first_name"] == "Dilnoza"

    bot_parsed = bot_verify_init_data(init_data, [token], max_age_seconds=3600, now_ts=now_ts)
    assert bot_parsed["telegram_id"] == 99887766

    # Wrong token rejected
    with pytest.raises(ValueError, match="Invalid initData signature"):
        verify_telegram_init_data(init_data, ["999999:OTHER_TOKEN"], now_ts=now_ts)

    # Tampered user id rejected
    tampered = init_data.replace("99887766", "11111111")
    with pytest.raises(ValueError, match="Invalid initData signature"):
        verify_telegram_init_data(tampered, [token], now_ts=now_ts)

    # Expired auth_date rejected (> 1 hour)
    with pytest.raises(ValueError, match="Expired initData"):
        verify_telegram_init_data(init_data, [token], max_age_seconds=10, now_ts=now_ts)

    old_init_data = make_init_data(user, token, auth_date=now_ts - 3601)
    with pytest.raises(ValueError, match="Expired initData"):
        verify_telegram_init_data(old_init_data, [token], max_age_seconds=86400, now_ts=now_ts)


def test_supabase_jwt_sign_and_verify():
    now_ts = 1_700_000_000
    secret = "test-super-secret-jwt-key-32-chars-min"
    token = sign_supabase_jwt(telegram_id=4242, app_role="teacher", jwt_secret=secret, ttl_seconds=600, now_ts=now_ts)
    claims = verify_bearer_jwt(token, secret, now_ts=now_ts + 100)
    assert claims["role"] == "authenticated"
    assert claims["telegram_id"] == 4242
    assert claims["app_role"] == "teacher"
    assert claims["exp"] - claims["iat"] <= 3600

    capped_token = sign_supabase_jwt(telegram_id=4242, app_role="student", jwt_secret=secret, ttl_seconds=86400, now_ts=now_ts)
    capped_claims = verify_bearer_jwt(capped_token, secret, now_ts=now_ts)
    assert capped_claims["exp"] - capped_claims["iat"] == 3600

    assert bot_sign_jwt(4242, "teacher", secret, 600, now_ts=now_ts) == token

    # Tampered token rejected
    parts = token.split(".")
    bad_token = f"{parts[0]}.{parts[1]}.tampered"
    with pytest.raises(ValueError, match="Invalid JWT signature"):
        verify_bearer_jwt(bad_token, secret, now_ts=now_ts + 100)

    # Expired token rejected
    with pytest.raises(ValueError, match="Expired JWT"):
        verify_bearer_jwt(token, secret, now_ts=now_ts + 700)


def test_rls_sql_migration_covers_all_tables_and_rpc():
    sql = (ROOT / "database" / "migrations" / "001_phase1_rls_and_rpc.sql").read_text(encoding="utf-8")
    expected_tables = [
        "users",
        "subjects",
        "subject_admins",
        "courses",
        "lessons",
        "questions",
        "progress",
        "transactions",
        "promo_codes",
        "promo_uses",
        "referrals",
        "video_checkpoints",
        "payments",
        "duel_rooms",
        "daily_quests",
        "bot_states",
    ]
    for tbl in expected_tables:
        assert f"ALTER TABLE public.{tbl} ENABLE ROW LEVEL SECURITY;" in sql

    assert "REVOKE ALL ON FUNCTION public.increment_balance(BIGINT, INTEGER) FROM PUBLIC;" in sql
    assert "REVOKE ALL ON FUNCTION public.increment_balance(BIGINT, INTEGER) FROM anon;" in sql
    assert "REVOKE ALL ON FUNCTION public.increment_balance(BIGINT, INTEGER) FROM authenticated;" in sql
    assert "GRANT EXECUTE ON FUNCTION public.increment_balance(BIGINT, INTEGER) TO service_role;" in sql
    assert "trg_guard_user_privileged_columns" in sql


def test_no_hardcoded_secrets_in_active_source():
    scan_roots = [
        ROOT / "user-app" / "src",
        ROOT / "admin-app" / "src",
        ROOT / "RashidovApp" / "tgcloud",
        ROOT / "RashidovStudio_bot" / "tgcloud",
        ROOT / "backend",
        ROOT / "bot",
    ]
    forbidden = ["8656707475", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjcGJlcGNk"]
    for directory in scan_roots:
        for path in directory.rglob("*"):
            if not path.is_file() or "__pycache__" in path.parts:
                continue
            if path.suffix not in {".js", ".jsx", ".py"}:
                continue
            content = path.read_text(encoding="utf-8", errors="ignore")
            for needle in forbidden:
                assert needle not in content, f"Hardcoded secret found in {path}"
