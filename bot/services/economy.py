import json
from asyncpg import Pool
from bot.config import config
from bot.db import update_user_balance, add_transaction, get_user_balance, update_last_active


async def add_neurons(pool: Pool, user_id: int, amount: int, tx_type: str, description: str):
    await update_user_balance(pool, user_id, amount)
    await add_transaction(pool, user_id, amount, tx_type, description)


async def spend_neurons(pool: Pool, user_id: int, amount: int, tx_type: str, description: str) -> bool:
    async with pool.acquire() as conn:
        async with conn.transaction():
            row = await conn.fetchrow(
                "SELECT COALESCE(balance, 0) AS balance, COALESCE(debt, 0) AS debt FROM users WHERE telegram_id = $1 FOR UPDATE",
                user_id,
            )
            if not row or int(row["debt"]) > 0 or int(row["balance"]) < amount:
                return False
            await conn.execute(
                "UPDATE users SET balance = COALESCE(balance, 0) - $1 WHERE telegram_id = $2",
                amount,
                user_id,
            )
            await conn.execute(
                "INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)",
                user_id,
                -amount,
                tx_type,
                description,
            )
            return True


async def get_streak_freeze_cost(pool: Pool) -> int:
    async with pool.acquire() as conn:
        try:
            cost = await conn.fetchval("SELECT public.get_streak_freeze_cost()")
            if cost is not None:
                return int(cost)
        except Exception:
            pass
    return int(config.STREAK_FREEZE_COST)


async def freeze_streak(pool: Pool, user_id: int) -> bool:
    cost = await get_streak_freeze_cost(pool)
    async with pool.acquire() as conn:
        async with conn.transaction():
            try:
                raw = await conn.fetchval("SELECT public.freeze_streak_service($1)", user_id)
                res = json.loads(raw) if isinstance(raw, str) else dict(raw)
                return bool(res.get("ok"))
            except Exception:
                # Fallback only if RPC is not deployed yet
                row = await conn.fetchrow(
                    "SELECT COALESCE(balance, 0) AS balance, COALESCE(debt, 0) AS debt FROM users WHERE telegram_id = $1 FOR UPDATE",
                    user_id,
                )
                if not row or int(row["debt"]) > 0 or int(row["balance"]) < cost:
                    return False
                await conn.execute(
                    "UPDATE users SET balance = balance - $1, frozen_until = CURRENT_DATE + INTERVAL '1 day' WHERE telegram_id = $2",
                    cost,
                    user_id,
                )
                await conn.execute(
                    "INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, 'spend', $3)",
                    user_id,
                    -cost,
                    f"Streak freeze ({cost})",
                )
                await update_last_active(pool, user_id)
                return True
