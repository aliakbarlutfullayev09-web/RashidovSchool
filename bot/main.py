import asyncio
import logging
from aiogram import Bot, Dispatcher
from bot.config import config
from bot.db import create_pool
from bot.middlewares.auth import AuthMiddleware
from bot.handlers import start, testing, admin, ai_helper, payments
from bot.services.streak import setup_streak_scheduler

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from bot.handlers.click_webhook import router as click_router

logging.basicConfig(level=logging.INFO)

async def main():
    pool = await create_pool(config.DATABASE_URL)
    
    bot = Bot(token=config.BOT_TOKEN)
    dp = Dispatcher()
    
    # Apply auth middleware to messages and callback queries
    auth_middleware = AuthMiddleware()
    dp.message.middleware(auth_middleware)
    dp.callback_query.middleware(auth_middleware)
    
    # Quick middleware to inject pool
    @dp.update.outer_middleware()
    async def inject_pool(handler, event, data):
        data['pool'] = pool
        return await handler(event, data)
        
    dp.include_router(start.router)
    dp.include_router(testing.router)
    dp.include_router(admin.router)
    dp.include_router(ai_helper.router)
    dp.include_router(payments.router)
    
    setup_streak_scheduler(pool)
    
    # Setup FastAPI
    app = FastAPI(title="Rashidov Biologiya API")
    app.state.pool = pool
    app.state.bot = bot
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    app.include_router(click_router)
    
    uvicorn_config = uvicorn.Config(app, host="0.0.0.0", port=config.FASTAPI_PORT, log_level="info")
    server = uvicorn.Server(uvicorn_config)
    
    try:
        await asyncio.gather(
            dp.start_polling(bot),
            server.serve()
        )
    finally:
        await pool.close()

if __name__ == '__main__':
    asyncio.run(main())
