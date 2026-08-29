import asyncio
import logging
from aiogram import Bot, Dispatcher
from bot.config import config
from bot.db import create_pool
from bot.middlewares.auth import AuthMiddleware
from bot.handlers import start, testing, admin, ai_helper
from bot.services.streak import setup_streak_scheduler

logging.basicConfig(level=logging.INFO)

async def main():
    pool = await create_pool(config.DATABASE_URL)
    
    bot = Bot(token=config.BOT_TOKEN)
    dp = Dispatcher()
    
    # Inject pool globally if needed, or via middleware
    dp.update.middleware(AuthMiddleware())
    
    # Quick middleware to inject pool
    @dp.update.outer_middleware()
    async def inject_pool(handler, event, data):
        data['pool'] = pool
        return await handler(event, data)
        
    dp.include_router(start.router)
    dp.include_router(testing.router)
    dp.include_router(admin.router)
    dp.include_router(ai_helper.router)
    
    setup_streak_scheduler(pool)
    
    try:
        await dp.start_polling(bot)
    finally:
        await pool.close()

if __name__ == '__main__':
    asyncio.run(main())
