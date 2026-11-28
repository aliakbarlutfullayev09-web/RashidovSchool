import asyncio
import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Any

import asyncpg
from aiogram import F, Router
from aiogram.types import LabeledPrice, Message, PreCheckoutQuery
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel

from bot.auth import verify_telegram_init_data
from bot.config import config
from bot.services.payment_logic import (
    STARS_PRODUCTS,
    generate_merchant_trans_id,
    validate_stars_pre_checkout,
)

logger = logging.getLogger("payments.stars")
router = Router()
api_router = APIRouter()


class CreateStarsInvoiceRequest(BaseModel):
    productId: str


def _resolve_caller_id(authorization: str | None, x_telegram_init_data: str | None) -> int:
    if authorization and authorization.startswith("Bearer ") and config.SUPABASE_JWT_SECRET:
        token = authorization[7:].strip()
        parts = token.split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=401, detail="Invalid token")
        h_b64, p_b64, s_b64 = parts
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(
                config.SUPABASE_JWT_SECRET.encode("utf-8"),
                f"{h_b64}.{p_b64}".encode("ascii"),
                hashlib.sha256,
            ).digest()
        ).rstrip(b"=").decode("ascii")
        if not hmac.compare_digest(expected_sig, s_b64):
            raise HTTPException(status_code=401, detail="Invalid token")
        pad = "=" * (-len(p_b64) % 4)
        claims = json.loads(base64.urlsafe_b64decode(p_b64 + pad).decode("utf-8"))
        if int(claims.get("exp", 0)) < int(time.time()):
            raise HTTPException(status_code=401, detail="Expired token")
        return int(claims.get("telegram_id") or claims["sub"])

    if x_telegram_init_data:
        try:
            verified = verify_telegram_init_data(
                x_telegram_init_data,
                [config.BOT_TOKEN],
                max_age_seconds=config.INIT_DATA_MAX_AGE_SECONDS,
            )
            return int(verified["telegram_id"])
        except ValueError as exc:
            raise HTTPException(status_code=401, detail="Invalid initData") from exc

    raise HTTPException(status_code=401, detail="Authentication required")


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@api_router.post("/api/payments/create-stars-invoice")
async def create_stars_invoice_link(
    req_data: CreateStarsInvoiceRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    x_telegram_init_data: str | None = Header(default=None),
) -> dict[str, Any]:
    caller_id = _resolve_caller_id(authorization, x_telegram_init_data)
    ip = _client_ip(request)
    pool: asyncpg.Pool = request.app.state.pool
    async with pool.acquire() as conn:
        for key, limit in ((f"invoice:user:{caller_id}", 10), (f"invoice:ip:{ip}", 20)):
            rl_raw = await conn.fetchval("SELECT public.check_rate_limit($1, $2, $3)", key, limit, 60)
            rl = json.loads(rl_raw) if isinstance(rl_raw, str) else dict(rl_raw)
            if not rl.get("allowed"):
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests",
                    headers={"Retry-After": str(max(1, int(rl.get("retry_after") or 60)))},
                )

    product = STARS_PRODUCTS.get(req_data.productId)
    if not product:
        raise HTTPException(status_code=400, detail="Invalid Stars package")

    merchant_trans_id = generate_merchant_trans_id("stars", caller_id)
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO payments (user_id, merchant_trans_id, provider, product_id, currency, amount, amount_minor, xp_credited, status)
            VALUES ($1, $2, 'stars', $3, 'XTR', $4, $5, $6, 'pending')
            """,
            caller_id,
            merchant_trans_id,
            product.product_id,
            product.stars,
            product.stars,
            product.neurons,
        )

    bot = request.app.state.bot
    try:
        invoice_url = await bot.create_invoice_link(
            title=product.title,
            description=f"Rashidov School balansiga {product.title} darhol qo'shiladi.",
            payload=merchant_trans_id,
            provider_token="",
            currency="XTR",
            prices=[LabeledPrice(label=product.title, amount=product.stars)],
        )
    except Exception:
        async with pool.acquire() as conn:
            await conn.execute(
                "SELECT public.fail_pending_payment($1, 'failed')",
                merchant_trans_id,
            )
        logger.warning("stars_invoice failed order=%s product=%s", merchant_trans_id, product.product_id)
        raise HTTPException(status_code=502, detail="Failed to create Stars invoice")

    logger.info("stars_invoice created order=%s product=%s", merchant_trans_id, product.product_id)
    return {"ok": True, "invoiceUrl": invoice_url, "orderId": merchant_trans_id}


async def send_stars_invoice(message: Message, pool: asyncpg.Pool, product_id: str) -> None:
    if not message.from_user:
        return
    product = STARS_PRODUCTS.get(product_id)
    if not product:
        await message.answer("Invalid Stars package")
        return

    merchant_trans_id = generate_merchant_trans_id("stars", message.from_user.id)
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO payments (user_id, merchant_trans_id, provider, product_id, currency, amount, amount_minor, xp_credited, status)
            VALUES ($1, $2, 'stars', $3, 'XTR', $4, $5, $6, 'pending')
            """,
            message.from_user.id,
            merchant_trans_id,
            product.product_id,
            product.stars,
            product.stars,
            product.neurons,
        )

    await message.answer_invoice(
        title=product.title,
        description="Neurons will be credited instantly after payment.",
        payload=merchant_trans_id,
        currency="XTR",
        prices=[LabeledPrice(label=product.title, amount=product.stars)],
        provider_token="",
    )


@router.pre_checkout_query()
async def pre_checkout_handler(pre_checkout_query: PreCheckoutQuery, pool: asyncpg.Pool) -> None:
    try:
        async def _check() -> tuple[bool, str | None]:
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM payments WHERE merchant_trans_id = $1 LIMIT 1",
                    pre_checkout_query.invoice_payload,
                )
            return validate_stars_pre_checkout(
                dict(row) if row else None,
                caller_user_id=pre_checkout_query.from_user.id,
                currency=pre_checkout_query.currency,
                total_amount=pre_checkout_query.total_amount,
            )

        ok, err_msg = await asyncio.wait_for(_check(), timeout=7.0)
        await pre_checkout_query.answer(ok=ok, error_message=None if ok else err_msg)
    except asyncio.TimeoutError:
        logger.warning("stars_pre_checkout timeout order=%s", pre_checkout_query.invoice_payload)
        await pre_checkout_query.answer(
            ok=False,
            error_message="Время проверки заказа истекло. Попробуйте ещё раз.",
        )
    except Exception:
        logger.warning("stars_pre_checkout error order=%s", pre_checkout_query.invoice_payload)
        await pre_checkout_query.answer(
            ok=False,
            error_message="Ошибка проверки заказа. Попробуйте позже.",
        )


@router.message(F.successful_payment)
async def successful_payment_handler(message: Message, pool: asyncpg.Pool) -> None:
    sp = message.successful_payment
    if not sp or not message.from_user:
        return

    user_id = message.from_user.id
    order_id = sp.invoice_payload
    charge_id = sp.telegram_payment_charge_id

    if sp.currency != "XTR":
        logger.warning("stars_payment invalid_currency order=%s", order_id)
        return

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                raw = await conn.fetchval(
                    "SELECT public.complete_stars_payment($1, $2, $3, $4)",
                    order_id,
                    user_id,
                    int(sp.total_amount),
                    charge_id,
                )
        res = json.loads(raw) if isinstance(raw, str) else dict(raw)
    except Exception:
        logger.warning("stars_payment rpc_failed order=%s", order_id)
        return

    if res.get("already_paid"):
        logger.info("stars_payment idempotent order=%s", order_id)
        return

    neurons = int(res.get("xp_credited") or 0)
    logger.info("stars_payment paid order=%s xp=%s", order_id, neurons)
    await message.answer(
        f"🎉 Оплата прошла успешно! Начислено +{neurons:,} 🧠 ({sp.total_amount} ⭐).".replace(",", " ")
    )


@router.message(F.refunded_payment)
async def refunded_payment_handler(message: Message, pool: asyncpg.Pool) -> None:
    rp = message.refunded_payment
    if not rp or not message.from_user:
        return

    user_id = message.from_user.id
    charge_id = rp.telegram_payment_charge_id

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                raw = await conn.fetchval(
                    "SELECT public.refund_stars_payment($1, $2, $3)",
                    user_id,
                    int(rp.total_amount),
                    charge_id,
                )
        res = json.loads(raw) if isinstance(raw, str) else dict(raw)
    except Exception:
        logger.warning("stars_refund rpc_failed payload=%s", rp.invoice_payload)
        return

    if res.get("already_refunded"):
        return

    xp_deduct = int(res.get("xp_deducted") or 0)
    debt_added = int(res.get("debt_added") or 0)
    logger.info("stars_refund completed payload=%s xp_deduct=%s debt_added=%s", rp.invoice_payload, xp_deduct, debt_added)
    extra = f" Зафиксирован долг: {debt_added:,} 🧠.".replace(",", " ") if debt_added > 0 else ""
    await message.answer(f"↩️ Оплата возвращена. Списано {xp_deduct:,} 🧠.{extra}".replace(",", " "))
