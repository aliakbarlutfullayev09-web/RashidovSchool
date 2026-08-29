from asyncpg import Pool
from bot.db import update_user_balance, add_transaction, get_user_balance, update_last_active
from datetime import datetime

async def add_neurons(pool: Pool, user_id: int, amount: int, tx_type: str, description: str):
    await update_user_balance(pool, user_id, amount)
    await add_transaction(pool, user_id, amount, tx_type, description)

async def spend_neurons(pool: Pool, user_id: int, amount: int, tx_type: str, description: str) -> bool:
    balance = await get_user_balance(pool, user_id)
    if balance >= amount:
        await update_user_balance(pool, user_id, -amount)
        await add_transaction(pool, user_id, -amount, tx_type, description)
        return True
    return False

async def freeze_streak(pool: Pool, user_id: int) -> bool:
    success = await spend_neurons(pool, user_id, 50, 'spend', 'Streak freeze')
    if success:
        await update_last_active(pool, user_id)
    return success
