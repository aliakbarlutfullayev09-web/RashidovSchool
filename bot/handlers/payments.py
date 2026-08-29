from aiogram import Router, F, Bot
from aiogram.types import Message, LabeledPrice, PreCheckoutQuery
from bot.db import update_user_balance, add_transaction

router = Router()

async def send_stars_invoice(message: Message, stars: int):
    neurons = stars * 250
    prices = [LabeledPrice(label=f'{neurons} Нейронов', amount=stars)]
    await message.answer_invoice(
        title=f'Покупка {neurons} Нейронов',
        description='Нейроны будут начислены моментально после оплаты.',
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
        neurons = stars * 250
        user_id = message.from_user.id
        
        await update_user_balance(pool, user_id, neurons)
        await add_transaction(pool, user_id, neurons, 'buy_stars', f'Покупка за {stars} ⭐️')
        
        await message.answer(f'🎉 Оплата успешно прошла! Вы получили <b>{neurons} Нейронов</b> за {stars} ⭐️.', parse_mode='HTML')
