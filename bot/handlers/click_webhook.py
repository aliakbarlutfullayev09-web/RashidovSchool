import hashlib
from typing import Optional
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from bot.config import config

router = APIRouter()

class ClickRequest(BaseModel):
    click_trans_id: int
    service_id: int
    click_paydoc_id: int
    merchant_trans_id: str
    amount: float
    action: int
    error: int
    error_note: str
    sign_time: str
    sign_string: str
    merchant_prepare_id: Optional[int] = None

@router.post("/api/payments/click")
async def click_webhook(req_data: ClickRequest, request: Request):
    pool = request.app.state.pool
    
    # 0 = Prepare, 1 = Complete
    if req_data.action not in [0, 1]:
        return {"error": -3, "error_note": "Action not found"}

    if req_data.action == 0:
        # Prepare
        sign_str = f"{req_data.click_trans_id}{req_data.service_id}{config.CLICK_SECRET_KEY}{req_data.merchant_trans_id}{req_data.amount}{req_data.action}{req_data.sign_time}"
        sign_hash = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
        
        if sign_hash != req_data.sign_string:
            return {"error": -1, "error_note": "SIGN_CHECK_FAILED"}
            
        try:
            telegram_id = int(req_data.merchant_trans_id)
        except ValueError:
            return {"error": -5, "error_note": "USER_NOT_FOUND"}
            
        async with pool.acquire() as conn:
            user = await conn.fetchrow("SELECT telegram_id FROM users WHERE telegram_id = $1", telegram_id)
            if not user:
                return {"error": -5, "error_note": "USER_NOT_FOUND"}
                
            payment = await conn.fetchrow(
                "SELECT status FROM payments WHERE merchant_trans_id = $1", 
                req_data.merchant_trans_id
            )
            
            if payment:
                if payment['status'] == 'completed':
                    return {"error": -4, "error_note": "ALREADY_PAID"}
                return {"error": -9, "error_note": "TRANSACTION_CANCELLED"}
                
            row = await conn.fetchrow(
                """
                INSERT INTO payments (user_id, merchant_trans_id, click_trans_id, amount, status)
                VALUES ($1, $2, $3, $4, 'pending') RETURNING id
                """,
                telegram_id, req_data.merchant_trans_id, req_data.click_trans_id, req_data.amount
            )
            # return string ID as int or keep as string since we use UUID. Wait, click requires int
            # merchant_prepare_id must be integer. So let's use a hashed int for id or a separate serial column for click
            # Since click requires integer, we'll hash the UUID or we should have used SERIAL for payments.
            # Assuming click accepts string for merchant_prepare_id if returned as string, but their spec says BIGINT.
            # Let's return a simple hash of uuid.
            return {
                "click_trans_id": req_data.click_trans_id,
                "merchant_trans_id": req_data.merchant_trans_id,
                "merchant_prepare_id": hash(str(row['id'])) % 1000000000, 
                "error": 0,
                "error_note": "Success"
            }

    elif req_data.action == 1:
        # Complete
        prepare_id = req_data.merchant_prepare_id or ""
        sign_str = f"{req_data.click_trans_id}{req_data.service_id}{config.CLICK_SECRET_KEY}{req_data.merchant_trans_id}{prepare_id}{req_data.amount}{req_data.action}{req_data.sign_time}"
        sign_hash = hashlib.md5(sign_str.encode('utf-8')).hexdigest()
        
        if sign_hash != req_data.sign_string:
            return {"error": -1, "error_note": "SIGN_CHECK_FAILED"}
            
        async with pool.acquire() as conn:
            payment = await conn.fetchrow(
                "SELECT * FROM payments WHERE merchant_trans_id = $1", 
                req_data.merchant_trans_id
            )
            
            if not payment:
                return {"error": -9, "error_note": "TRANSACTION_NOT_FOUND"}
                
            if payment['status'] == 'completed':
                return {"error": -4, "error_note": "ALREADY_PAID"}
                
            xp_to_credit = int(req_data.amount)
            
            async with conn.transaction():
                await conn.execute(
                    "UPDATE payments SET status = 'completed', xp_credited = $1 WHERE merchant_trans_id = $2",
                    xp_to_credit, req_data.merchant_trans_id
                )
                
                await conn.execute(
                    "UPDATE users SET balance = balance + $1 WHERE telegram_id = $2",
                    xp_to_credit, payment['user_id']
                )
                
                await conn.execute(
                    """
                    INSERT INTO transactions (user_id, amount, type, description)
                    VALUES ($1, $2, 'topup', 'Click payment')
                    """,
                    payment['user_id'], xp_to_credit
                )
                
            return {
                "click_trans_id": req_data.click_trans_id,
                "merchant_trans_id": req_data.merchant_trans_id,
                "merchant_confirm_id": prepare_id,
                "error": 0,
                "error_note": "Success"
            }
