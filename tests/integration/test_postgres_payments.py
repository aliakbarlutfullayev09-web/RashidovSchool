import asyncio
import json
import os
from pathlib import Path

import asyncpg
import pytest

ROOT = Path(__file__).resolve().parents[2]
TEST_DB_URL = os.getenv("TEST_DATABASE_URL")

pytestmark = pytest.mark.skipif(
    not TEST_DB_URL,
    reason="Set TEST_DATABASE_URL (e.g. from docker-compose.test.yml or Supabase test branch) to run Postgres integration tests",
)


async def _bootstrap_supabase_roles(conn: asyncpg.Connection) -> None:
    await conn.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
        END $$;
        CREATE SCHEMA IF NOT EXISTS auth;
        CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
            SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
        $$;
        CREATE OR REPLACE FUNCTION auth.uid() RETURNS text LANGUAGE sql STABLE AS $$
            SELECT COALESCE(NULLIF(auth.jwt() ->> 'sub', ''), NULLIF(auth.jwt() ->> 'telegram_id', ''));
        $$;
        CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
            SELECT auth.jwt() ->> 'role';
        $$;
        """
    )


async def _apply_migrations(conn: asyncpg.Connection) -> None:
    if os.getenv("TEST_DB_SKIP_BOOTSTRAP") == "1":
        return
    await _bootstrap_supabase_roles(conn)
    for rel in [
        "database/schema.sql",
        "backend/schema.sql",
        "database/migrations/001_phase1_rls_and_rpc.sql",
        "database/migrations/002_phase2_payments.sql",
        "database/migrations/003_phase3_video_ai_ratelimit.sql",
        "database/migrations/004_phase4_economy_exams.sql",
    ]:
        await conn.execute((ROOT / rel).read_text(encoding="utf-8"))


@pytest.mark.asyncio
async def test_postgres_concurrent_stars_idempotency_and_pre_checkout():
    pool = await asyncpg.create_pool(TEST_DB_URL, min_size=2, max_size=5)
    try:
        async with pool.acquire() as conn:
            await _apply_migrations(conn)
            await conn.execute(
                """
                INSERT INTO public.users (telegram_id, role, full_name, balance)
                VALUES (991001, 'student', 'PG Test User', 100)
                ON CONFLICT (telegram_id) DO UPDATE SET balance = 100;
                """
            )
            await conn.execute("DELETE FROM public.transactions WHERE user_id = 991001;")
            await conn.execute("DELETE FROM public.payments WHERE user_id = 991001;")

            await conn.execute(
                """
                INSERT INTO public.payments (user_id, merchant_trans_id, provider, product_id, currency, amount, amount_minor, xp_credited, status)
                VALUES (991001, 'stars_991001_pg1', 'stars', 'stars_5', 'XTR', 5, 5, 1250, 'pending');
                """
            )

            # Repeat pre_checkout lookup while pending succeeds twice cleanly
            row1 = dict(await conn.fetchrow("SELECT * FROM public.payments WHERE merchant_trans_id = 'stars_991001_pg1'"))
            row2 = dict(await conn.fetchrow("SELECT * FROM public.payments WHERE merchant_trans_id = 'stars_991001_pg1'"))
            assert row1["status"] == "pending" and row2["status"] == "pending"

        async def run_stars():
            async with pool.acquire() as c:
                async with c.transaction():
                    raw = await c.fetchval(
                        "SELECT public.complete_stars_payment('stars_991001_pg1', 991001, 5, 'tg_charge_pg_001')"
                    )
                    return json.loads(raw)

        s1, s2 = await asyncio.gather(run_stars(), run_stars())
        assert sorted([bool(s1["already_paid"]), bool(s2["already_paid"])]) == [False, True]

        async with pool.acquire() as conn:
            bal = await conn.fetchval("SELECT balance FROM public.users WHERE telegram_id = 991001")
            stars_tx_cnt = await conn.fetchval(
                "SELECT COUNT(*) FROM public.transactions WHERE user_id = 991001 AND description LIKE 'Telegram Stars order stars_991001_pg1%'"
            )
            pay_status = await conn.fetchval("SELECT status FROM public.payments WHERE merchant_trans_id = 'stars_991001_pg1'")
            assert bal == 100 + 1250
            assert stars_tx_cnt == 1
            assert pay_status == "paid"
    finally:
        await pool.close()


@pytest.mark.asyncio
async def test_postgres_phase4_rls_debt_and_promo_race():
    pool = await asyncpg.create_pool(TEST_DB_URL, min_size=2, max_size=5)
    try:
        async with pool.acquire() as conn:
            await _apply_migrations(conn)
            await conn.execute(
                """
                INSERT INTO public.users (telegram_id, role, full_name, balance, debt)
                VALUES (991002, 'student', 'Phase4 PG User', 200, 0)
                ON CONFLICT (telegram_id) DO UPDATE SET balance = 200, debt = 0;
                """
            )
            await conn.execute("DELETE FROM public.transactions WHERE user_id = 991002;")
            await conn.execute("DELETE FROM public.payments WHERE user_id = 991002;")
            await conn.execute("DELETE FROM public.promo_uses WHERE user_id = 991002;")

            # 1. Negative RLS test: client cannot update balance directly
            async with conn.transaction():
                await conn.execute("SET LOCAL ROLE authenticated")
                await conn.execute(
                    "SELECT set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"sub\":\"991002\",\"telegram_id\":991002}', true)"
                )
                with pytest.raises(Exception):
                    await conn.execute("UPDATE public.users SET balance = 999999 WHERE telegram_id = 991002")

            # 2. Refund at balance < xp_credited splits into balance=0 + debt=1050, blocks paid lessons, allows free lessons
            await conn.execute(
                """
                INSERT INTO public.payments (user_id, merchant_trans_id, provider, product_id, currency, amount, amount_minor, xp_credited, status, telegram_payment_charge_id)
                VALUES (991002, 'stars_991002_r1', 'stars', 'stars_5', 'XTR', 5, 5, 1250, 'paid', 'tg_chg_pg_r1');
                """
            )
            r_raw = await conn.fetchval("SELECT public.refund_stars_payment(991002, 5, 'tg_chg_pg_r1')")
            r_res = json.loads(r_raw)
            assert r_res["balance_deducted"] == 200
            assert r_res["debt_added"] == 1050
            assert r_res["new_balance"] == 0
            assert r_res["new_debt"] == 1050

            # Top-up pays off debt first, remainder to balance
            await conn.execute(
                """
                INSERT INTO public.payments (user_id, merchant_trans_id, provider, product_id, currency, amount, amount_minor, xp_credited, status)
                VALUES (991002, 'stars_991002_t2', 'stars', 'stars_5', 'XTR', 5, 5, 1250, 'pending');
                """
            )
            t_raw = await conn.fetchval(
                "SELECT public.complete_stars_payment('stars_991002_t2', 991002, 5, 'tg_chg_pg_t2')"
            )
            t_res = json.loads(t_raw)
            assert t_res["debt_repaid"] == 1050
            assert t_res["balance_added"] == 200
            assert t_res["new_debt"] == 0
            assert t_res["new_balance"] == 200

            # 3. Promo code race test
            await conn.execute(
                """
                INSERT INTO public.promo_codes (code, bonus_amount, max_uses, current_uses)
                VALUES ('RACEPG100', 100, 10, 0)
                ON CONFLICT (code) DO UPDATE SET bonus_amount = 100, max_uses = 10, current_uses = 0;
                """
            )

        async def run_promo():
            async with pool.acquire() as c:
                async with c.transaction():
                    await c.execute("SET LOCAL ROLE authenticated")
                    await c.execute(
                        "SELECT set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"sub\":\"991002\",\"telegram_id\":991002}', true)"
                    )
                    raw = await c.fetchval("SELECT public.redeem_promo('RACEPG100')")
                    return json.loads(raw)

        p1, p2 = await asyncio.gather(run_promo(), run_promo())
        assert sorted([bool(p1["ok"]), bool(p2["ok"])]) == [False, True]

        # 4. Scoped teacher RLS & student read restrictions on promo_codes and questions
        async with pool.acquire() as conn:
            await conn.execute("INSERT INTO public.subjects (id, name) VALUES (9951, 'Subj Bio'), (9952, 'Subj Chem') ON CONFLICT (id) DO NOTHING")
            await conn.execute("INSERT INTO public.courses (id, subject_id, title, price) VALUES (9951, 9951, 'C1', 100), (9952, 9952, 'C2', 100) ON CONFLICT (id) DO NOTHING")
            await conn.execute("INSERT INTO public.lessons (id, course_id, title, is_free) VALUES (9951, 9951, 'L1', true), (9952, 9952, 'L2', false) ON CONFLICT (id) DO NOTHING")
            await conn.execute("INSERT INTO public.questions (id, lesson_id, text, options, correct_option_index, time_limit) VALUES (9951, 9951, 'Q Bio', '[\"A\",\"B\"]'::jsonb, 0, 30) ON CONFLICT (id) DO NOTHING")
            await conn.execute(
                """
                INSERT INTO public.users (telegram_id, role, full_name, assigned_subject_id)
                VALUES (991003, 'teacher', 'Bio Teacher PG', 9951)
                ON CONFLICT (telegram_id) DO UPDATE SET role = 'teacher', assigned_subject_id = 9951
                """
            )
            await conn.execute(
                "INSERT INTO public.subject_admins (user_id, subject_id, permissions) VALUES (991003, 9951, '{\"can_promo\": true}'::jsonb) ON CONFLICT (user_id, subject_id) DO NOTHING"
            )

            await conn.execute("UPDATE public.lessons SET video_url = 'https://cdn.example.test/paid.mp4' WHERE id = 9952")

            # Student sees 0 promo_codes, 0 questions, 0 lessons direct, gets video_url=None on paid lesson, and cannot call service RPCs
            async with conn.transaction():
                await conn.execute("SET LOCAL ROLE authenticated")
                await conn.execute(
                    "SELECT set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"sub\":\"991002\",\"telegram_id\":991002}', true)"
                )
                assert await conn.fetchval("SELECT COUNT(*) FROM public.promo_codes") == 0
                assert await conn.fetchval("SELECT COUNT(*) FROM public.questions") == 0
                assert await conn.fetchval("SELECT COUNT(*) FROM public.lessons") == 0
                cat = json.loads(await conn.fetchval("SELECT public.get_lessons_catalog(ARRAY[9952], NULL)"))
                assert cat and cat[0]["video_url"] is None
                with pytest.raises(Exception):
                    await conn.fetchval("SELECT public.complete_stars_payment('x', 991002, 5, 'c')")

            # Teacher edits own subject question (9951) -> OK, foreign subject (9952) -> RLS exception, role escalation -> rejected
            async with conn.transaction():
                await conn.execute("SET LOCAL ROLE authenticated")
                await conn.execute(
                    "SELECT set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"sub\":\"991003\",\"telegram_id\":991003}', true)"
                )
                await conn.execute("UPDATE public.questions SET text = 'Q Bio Edited' WHERE id = 9951")
                with pytest.raises(Exception):
                    await conn.execute(
                        "INSERT INTO public.questions (lesson_id, text, options, correct_option_index, time_limit) VALUES (9952, 'Evil', '[\"A\",\"B\"]'::jsonb, 0, 30)"
                    )
                with pytest.raises(Exception):
                    await conn.execute("UPDATE public.users SET role = 'superadmin' WHERE telegram_id = 991002")

            # Superadmin CAN change user role cleanly
            await conn.execute(
                "INSERT INTO public.users (telegram_id, role, full_name) VALUES (991004, 'superadmin', 'Super PG') ON CONFLICT (telegram_id) DO UPDATE SET role = 'superadmin'"
            )
            async with conn.transaction():
                await conn.execute("SET LOCAL ROLE authenticated")
                await conn.execute(
                    "SELECT set_config('request.jwt.claims', '{\"role\":\"authenticated\",\"sub\":\"991004\",\"telegram_id\":991004}', true)"
                )
                await conn.execute("UPDATE public.users SET role = 'teacher', assigned_subject_id = 9952 WHERE telegram_id = 991002")
                assert await conn.fetchval("SELECT role FROM public.users WHERE telegram_id = 991002") == "teacher"
    finally:
        await pool.close()
