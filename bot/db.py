import asyncpg
import json
from datetime import datetime

async def create_pool(dsn: str) -> asyncpg.Pool:
    return await asyncpg.create_pool(dsn)

async def close_pool(pool: asyncpg.Pool):
    await pool.close()

async def get_user(pool: asyncpg.Pool, telegram_id: int):
    return await pool.fetchrow("SELECT * FROM users WHERE telegram_id = $1", telegram_id)

async def create_user(pool: asyncpg.Pool, telegram_id: int, full_name: str, class_group: str, language: str):
    query = """
        INSERT INTO users (telegram_id, full_name, class_group, language, last_active_date)
        VALUES ($1, $2, $3, $4, CURRENT_DATE)
        RETURNING *
    """
    return await pool.fetchrow(query, telegram_id, full_name, class_group, language)

async def update_user_language(pool: asyncpg.Pool, telegram_id: int, language: str):
    await pool.execute("UPDATE users SET language = $1 WHERE telegram_id = $2", language, telegram_id)

async def update_user_balance(pool: asyncpg.Pool, telegram_id: int, amount: int):
    await pool.execute("UPDATE users SET balance = balance + $1 WHERE telegram_id = $2", amount, telegram_id)

async def get_user_balance(pool: asyncpg.Pool, telegram_id: int) -> int:
    val = await pool.fetchval("SELECT balance FROM users WHERE telegram_id = $1", telegram_id)
    return val if val is not None else 0

async def update_streak(pool: asyncpg.Pool, telegram_id: int, streak_days: int):
    await pool.execute("UPDATE users SET streak_days = $1 WHERE telegram_id = $2", streak_days, telegram_id)

async def update_last_active(pool: asyncpg.Pool, telegram_id: int):
    await pool.execute("UPDATE users SET last_active_date = CURRENT_DATE WHERE telegram_id = $1", telegram_id)

async def reset_inactive_streaks(pool: asyncpg.Pool):
    query = """
        UPDATE users 
        SET streak_days = 0 
        WHERE last_active_date < CURRENT_DATE - INTERVAL '1 day'
        AND (frozen_until IS NULL OR frozen_until < CURRENT_DATE)
    """
    await pool.execute(query)

async def get_subject_admin(pool: asyncpg.Pool, user_id: int, subject_id: int):
    return await pool.fetchrow("SELECT * FROM subject_admins WHERE user_id = $1 AND subject_id = $2", user_id, subject_id)

async def get_admin_subjects(pool: asyncpg.Pool, user_id: int):
    return await pool.fetch("SELECT * FROM subject_admins WHERE user_id = $1", user_id)

async def get_courses_by_subject(pool: asyncpg.Pool, subject_id: int):
    return await pool.fetch("SELECT * FROM courses WHERE subject_id = $1 ORDER BY order_index", subject_id)

async def get_lessons_by_course(pool: asyncpg.Pool, course_id: int):
    return await pool.fetch("SELECT * FROM lessons WHERE course_id = $1 ORDER BY order_index", course_id)

async def get_lesson(pool: asyncpg.Pool, lesson_id: int):
    return await pool.fetchrow("SELECT * FROM lessons WHERE id = $1", lesson_id)

async def get_questions_by_lesson(pool: asyncpg.Pool, lesson_id: int):
    return await pool.fetch("SELECT * FROM questions WHERE lesson_id = $1", lesson_id)

async def get_progress(pool: asyncpg.Pool, user_id: int, lesson_id: int):
    return await pool.fetchrow("SELECT * FROM progress WHERE user_id = $1 AND lesson_id = $2", user_id, lesson_id)

async def set_progress(pool: asyncpg.Pool, user_id: int, lesson_id: int, stars: int, is_unlocked: bool):
    query = """
        INSERT INTO progress (user_id, lesson_id, stars, is_unlocked)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, lesson_id) DO UPDATE SET
        stars = GREATEST(progress.stars, EXCLUDED.stars),
        is_unlocked = EXCLUDED.is_unlocked
    """
    await pool.execute(query, user_id, lesson_id, stars, is_unlocked)

async def get_course_progress(pool: asyncpg.Pool, user_id: int, course_id: int):
    query = """
        SELECT p.* FROM progress p
        JOIN lessons l ON p.lesson_id = l.id
        WHERE p.user_id = $1 AND l.course_id = $2
    """
    return await pool.fetch(query, user_id, course_id)

async def add_transaction(pool: asyncpg.Pool, user_id: int, amount: int, type: str, description: str):
    query = "INSERT INTO transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)"
    await pool.execute(query, user_id, amount, type, description)

async def create_promo(pool: asyncpg.Pool, code: str, bonus: int, max_uses: int, created_by: int):
    query = "INSERT INTO promo_codes (code, bonus_amount, max_uses, created_by) VALUES ($1, $2, $3, $4) RETURNING *"
    return await pool.fetchrow(query, code, bonus, max_uses, created_by)

async def use_promo(pool: asyncpg.Pool, code: str, user_id: int):
    async with pool.acquire() as conn:
        async with conn.transaction():
            promo = await conn.fetchrow("SELECT * FROM promo_codes WHERE code = $1 AND current_uses < max_uses FOR UPDATE", code)
            if not promo:
                return None
            try:
                await conn.execute("INSERT INTO promo_uses (promo_id, user_id) VALUES ($1, $2)", promo['id'], user_id)
                await conn.execute("UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = $1", promo['id'])
                return promo
            except asyncpg.UniqueViolationError:
                return None

async def create_referral(pool: asyncpg.Pool, referrer_id: int, referred_id: int):
    try:
        await pool.execute("INSERT INTO referrals (referrer_id, referred_id) VALUES ($1, $2)", referrer_id, referred_id)
    except asyncpg.UniqueViolationError:
        pass

async def get_subject_students(pool: asyncpg.Pool, subject_id: int):
    query = """
        SELECT DISTINCT u.* FROM users u
        JOIN progress p ON u.telegram_id = p.user_id
        JOIN lessons l ON p.lesson_id = l.id
        JOIN courses c ON l.course_id = c.id
        WHERE c.subject_id = $1
    """
    return await pool.fetch(query, subject_id)

async def get_subject_stats(pool: asyncpg.Pool, subject_id: int):
    query = """
        SELECT COUNT(DISTINCT u.telegram_id) as student_count,
        COUNT(p.*) as test_count,
        AVG(p.stars) as avg_score
        FROM users u
        JOIN progress p ON u.telegram_id = p.user_id
        JOIN lessons l ON p.lesson_id = l.id
        JOIN courses c ON l.course_id = c.id
        WHERE c.subject_id = $1
    """
    return dict(await pool.fetchrow(query, subject_id))

async def add_teacher(pool: asyncpg.Pool, telegram_id: int, subject_id: int, permissions: dict):
    query = "INSERT INTO subject_admins (user_id, subject_id, permissions) VALUES ($1, $2, $3) RETURNING *"
    return await pool.fetchrow(query, telegram_id, subject_id, json.dumps(permissions))

async def create_course(pool: asyncpg.Pool, subject_id: int, title: str, price: int):
    query = "INSERT INTO courses (subject_id, title, price) VALUES ($1, $2, $3) RETURNING *"
    return await pool.fetchrow(query, subject_id, title, price)

async def create_lesson(pool: asyncpg.Pool, course_id: int, title: str, video_url: str, test_question_count: int = None):
    query = "INSERT INTO lessons (course_id, title, video_url, test_question_count) VALUES ($1, $2, $3, $4) RETURNING *"
    return await pool.fetchrow(query, course_id, title, video_url, test_question_count)

async def create_question(pool: asyncpg.Pool, lesson_id: int, text: str, options: list, correct_option_index: int, time_limit: int):
    query = "INSERT INTO questions (lesson_id, text, options, correct_option_index, time_limit) VALUES ($1, $2, $3, $4, $5) RETURNING *"
    return await pool.fetchrow(query, lesson_id, text, json.dumps(options), correct_option_index, time_limit)
