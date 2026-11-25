from aiogram import Router, F
from aiogram.types import Message, LabeledPrice, PreCheckoutQuery
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from bot.db import update_user_balance, add_transaction

router = Router()
api_router = APIRouter()

STARS_PRICES = {
    5: 1250,
    100: 25000,
    400: 100000,
    600: 150000,
    1000: 250000,
    3500: 1000000
}

class CreateStarsInvoiceRequest(BaseModel):
    stars: int
    userId: int | None = None

@api_router.post("/api/payments/create-stars-invoice")
async def create_stars_invoice_link(req_data: CreateStarsInvoiceRequest, request: Request):
    if req_data.stars not in STARS_PRICES:
        raise HTTPException(status_code=400, detail="Invalid Stars package")
    neurons = STARS_PRICES[req_data.stars]
    formatted = f"{neurons:,}".replace(",", " ")
    bot = request.app.state.bot
    invoice_url = await bot.create_invoice_link(
        title=f"{formatted} Neyron",
        description=f"Rashidov School balansiga {formatted} Neyron darhol qo'shiladi.",
        payload=f"buy_neurons_{req_data.stars}",
        provider_token="",
        currency="XTR",
        prices=[LabeledPrice(label=f"{formatted} Neyron", amount=req_data.stars)]
    )
    return {"ok": True, "invoiceUrl": invoice_url}

async def send_stars_invoice(message: Message, stars: int):
    if stars not in STARS_PRICES:
        await message.answer('Invalid amount')
        return
    neurons = STARS_PRICES[stars]
    prices = [LabeledPrice(label=f'{neurons} Neurons', amount=stars)]
    await message.answer_invoice(
        title=f'{neurons} Neurons',
        description='Neurons will be credited instantly after payment.',
        payload=f'buy_neurons_{stars}',
        currency='XTR',
        prices=prices,
        provider_token=''
    )

@router.pre_checkout_query()
async def pre_checkout_handler(pre_checkout_query: PreCheckoutQuery):
    await pre_checkout_query.answer(ok=True)

@router.message(F.successful_payment)
async def successful_payment_handler(message: Message, pool):
    payload = message.successful_payment.invoice_payload
    if payload.startswith('buy_neurons_'):
        stars = int(payload.split('_')[2])
        neurons = STARS_PRICES.get(stars, stars * 250)
        user_id = message.from_user.id
        await update_user_balance(pool, user_id, neurons)
        await add_transaction(pool, user_id, neurons, 'topup', f'Purchase {stars} stars')
        await message.answer(f'Payment successful! You received {neurons} Neurons for {stars} stars.')
