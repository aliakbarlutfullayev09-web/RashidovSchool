import base64
import hashlib
import hmac
import json
import time
from typing import Any
from urllib.parse import parse_qsl


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def verify_telegram_init_data(
    init_data: str,
    bot_tokens: list[str],
    max_age_seconds: int = 3600,
    now_ts: int | None = None,
) -> dict[str, Any]:
    """Verify Telegram WebApp initData HMAC-SHA256 signature and return parsed user payload."""
    if not init_data or not isinstance(init_data, str):
        raise ValueError("Missing initData")

    tokens = [t for t in bot_tokens if t]
    if not tokens:
        raise ValueError("Bot token is not configured")

    effective_max_age = min(max(int(max_age_seconds), 1), 3600)

    pairs = parse_qsl(init_data, keep_blank_values=True)
    if not pairs:
        raise ValueError("Empty initData")

    params = dict(pairs)
    received_hash = params.get("hash", "")
    if not received_hash:
        raise ValueError("Missing initData hash")

    try:
        auth_date = int(params.get("auth_date", "0"))
    except ValueError as exc:
        raise ValueError("Invalid auth_date") from exc

    current_ts = int(time.time()) if now_ts is None else int(now_ts)
    if auth_date <= 0 or (current_ts - auth_date) > effective_max_age or (auth_date - current_ts) > 300:
        raise ValueError("Expired initData")

    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted((k, v) for k, v in pairs if k != "hash")
    )

    verified = False
    for token in tokens:
        secret_key = hmac.new(b"WebAppData", token.encode("utf-8"), hashlib.sha256).digest()
        computed_hash = hmac.new(
            secret_key, data_check_string.encode("utf-8"), hashlib.sha256
        ).hexdigest()
        if hmac.compare_digest(computed_hash, received_hash):
            verified = True
            break

    if not verified:
        raise ValueError("Invalid initData signature")

    raw_user = params.get("user")
    if not raw_user:
        raise ValueError("Missing user in initData")

    try:
        tg_user = json.loads(raw_user)
    except json.JSONDecodeError as exc:
        raise ValueError("Malformed user JSON in initData") from exc

    if not isinstance(tg_user, dict) or not tg_user.get("id"):
        raise ValueError("Missing user id in initData")

    return {
        "telegram_id": int(tg_user["id"]),
        "tg_user": tg_user,
        "auth_date": auth_date,
    }


def sign_supabase_jwt(
    telegram_id: int,
    app_role: str,
    jwt_secret: str,
    ttl_seconds: int = 3600,
    now_ts: int | None = None,
) -> str:
    """Create an HS256 JWT compatible with Supabase PostgREST RLS (max 1 hour lifetime)."""
    if not jwt_secret:
        raise ValueError("JWT secret is not configured")

    effective_ttl = min(max(int(ttl_seconds), 1), 3600)
    iat = int(time.time()) if now_ts is None else int(now_ts)
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "aud": "authenticated",
        "role": "authenticated",
        "sub": str(telegram_id),
        "telegram_id": int(telegram_id),
        "app_role": str(app_role or "student"),
        "iat": iat,
        "exp": iat + effective_ttl,
    }

    h_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h_b64}.{p_b64}".encode("ascii")
    sig = hmac.new(jwt_secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{h_b64}.{p_b64}.{_b64url_encode(sig)}"
