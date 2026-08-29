from apscheduler.schedulers.asyncio import AsyncIOScheduler
from bot.db import reset_inactive_streaks, get_user, update_streak, update_last_active
from datetime import datetime, date

async def _reset_job(pool):
    await reset_inactive_streaks(pool)

def setup_streak_scheduler(pool):
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_reset_job, 'cron', hour=0, minute=5, args=[pool])
    scheduler.start()

async def update_user_streak(pool, user_id: int):
    user = await get_user(pool, user_id)
    if not user:
        return
        
    last_active = user['last_active_date']
    today = date.today()
    
    if last_active < today:
        if (today - last_active).days == 1:
            await update_streak(pool, user_id, user['streak_days'] + 1)
        else:
            await update_streak(pool, user_id, 1)
        await update_last_active(pool, user_id)
