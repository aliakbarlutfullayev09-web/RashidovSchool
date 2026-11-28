-- Phase 4 Preflight Checks
-- Run manually in Supabase SQL Editor BEFORE applying 004_phase4_economy_exams.sql.
-- Every query below should return 0 rows before adding strict CHECK / UNIQUE constraints.

-- 1. Check for negative user balances before adding users_balance_nonnegative CHECK (balance >= 0)
SELECT telegram_id, balance, role
FROM public.users
WHERE COALESCE(balance, 0) < 0;

-- 2. Check for duplicate referrals for the same referred_id before creating UNIQUE index
SELECT referred_id, COUNT(*) AS cnt, ARRAY_AGG(id ORDER BY id) AS row_ids
FROM public.referrals
GROUP BY referred_id
HAVING COUNT(*) > 1;

-- 3. Check for self-referrals before adding CHECK (referrer_id <> referred_id)
SELECT id, referrer_id, referred_id
FROM public.referrals
WHERE referrer_id = referred_id;

-- 4. Check for duplicate promo redemptions before ensuring UNIQUE (user_id, promo_id)
SELECT user_id, promo_id, COUNT(*) AS cnt, ARRAY_AGG(id ORDER BY id) AS row_ids
FROM public.promo_uses
GROUP BY user_id, promo_id
HAVING COUNT(*) > 1;
