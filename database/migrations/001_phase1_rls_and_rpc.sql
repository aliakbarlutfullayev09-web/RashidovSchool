-- Phase 1 Security Migration: RLS on all tables, privilege escalation guard, and increment_balance RPC hardening
-- Apply manually in Supabase SQL Editor after reviewing.

-- 1. Ensure bot_states exists (also defined in backend/schema.sql)
CREATE TABLE IF NOT EXISTS public.bot_states (
    user_id    BIGINT PRIMARY KEY,
    state      TEXT,
    data       JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Harden public.increment_balance RPC (SECURITY DEFINER + strict EXECUTE restriction)
CREATE OR REPLACE FUNCTION public.increment_balance(
    p_user_id BIGINT,
    p_delta   INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    UPDATE public.users
    SET balance = COALESCE(balance, 0) + p_delta
    WHERE telegram_id = p_user_id
    RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NULL THEN
        RAISE EXCEPTION 'User % not found', p_user_id;
    END IF;

    RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_balance(BIGINT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_balance(BIGINT, INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.increment_balance(BIGINT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.increment_balance(BIGINT, INTEGER) TO service_role;

-- 3. Auth/RLS helper functions
CREATE OR REPLACE FUNCTION public.current_telegram_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT CASE
        WHEN COALESCE(auth.jwt() ->> 'telegram_id', auth.jwt() ->> 'sub', '') ~ '^[0-9]+$'
            THEN COALESCE(auth.jwt() ->> 'telegram_id', auth.jwt() ->> 'sub')::bigint
        ELSE NULL
    END;
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.telegram_id = public.current_telegram_id()
          AND u.role IN ('teacher', 'admin', 'superadmin')
    );
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.telegram_id = public.current_telegram_id()
          AND u.role IN ('admin', 'superadmin')
    );
$$;

REVOKE ALL ON FUNCTION public.current_telegram_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_telegram_id() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO anon, authenticated, service_role;

-- 4. Prevent client-side privilege escalation on public.users
CREATE OR REPLACE FUNCTION public.guard_user_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF COALESCE(auth.role(), current_user) <> 'service_role' AND NOT public.is_superadmin() THEN
        IF NEW.telegram_id IS DISTINCT FROM OLD.telegram_id
           OR NEW.role IS DISTINCT FROM OLD.role
           OR NEW.permissions IS DISTINCT FROM OLD.permissions
           OR NEW.assigned_subject_id IS DISTINCT FROM OLD.assigned_subject_id THEN
            RAISE EXCEPTION 'Forbidden: cannot modify privileged user columns';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_user_privileged_columns ON public.users;
CREATE TRIGGER trg_guard_user_privileged_columns
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_user_privileged_columns();

-- 5. Enable Row Level Security on all 16 tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_states ENABLE ROW LEVEL SECURITY;

-- 6. Policies

-- users
DROP POLICY IF EXISTS users_select_own_or_staff ON public.users;
CREATE POLICY users_select_own_or_staff ON public.users
    FOR SELECT TO authenticated
    USING (telegram_id = public.current_telegram_id() OR public.is_staff());

DROP POLICY IF EXISTS users_update_own_or_superadmin ON public.users;
CREATE POLICY users_update_own_or_superadmin ON public.users
    FOR UPDATE TO authenticated
    USING (telegram_id = public.current_telegram_id() OR public.is_superadmin())
    WITH CHECK (telegram_id = public.current_telegram_id() OR public.is_superadmin());

DROP POLICY IF EXISTS users_insert_superadmin ON public.users;
CREATE POLICY users_insert_superadmin ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS users_delete_superadmin ON public.users;
CREATE POLICY users_delete_superadmin ON public.users
    FOR DELETE TO authenticated
    USING (public.is_superadmin());

-- subjects
DROP POLICY IF EXISTS subjects_select_auth ON public.subjects;
CREATE POLICY subjects_select_auth ON public.subjects
    FOR SELECT TO authenticated
    USING (public.current_telegram_id() IS NOT NULL);

DROP POLICY IF EXISTS subjects_manage_staff ON public.subjects;
CREATE POLICY subjects_manage_staff ON public.subjects
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- subject_admins
DROP POLICY IF EXISTS subject_admins_select_own_or_staff ON public.subject_admins;
CREATE POLICY subject_admins_select_own_or_staff ON public.subject_admins
    FOR SELECT TO authenticated
    USING (user_id = public.current_telegram_id() OR public.is_staff());

DROP POLICY IF EXISTS subject_admins_manage_superadmin ON public.subject_admins;
CREATE POLICY subject_admins_manage_superadmin ON public.subject_admins
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

-- courses
DROP POLICY IF EXISTS courses_select_auth ON public.courses;
CREATE POLICY courses_select_auth ON public.courses
    FOR SELECT TO authenticated
    USING (public.current_telegram_id() IS NOT NULL);

DROP POLICY IF EXISTS courses_manage_staff ON public.courses;
CREATE POLICY courses_manage_staff ON public.courses
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- lessons
DROP POLICY IF EXISTS lessons_select_auth ON public.lessons;
CREATE POLICY lessons_select_auth ON public.lessons
    FOR SELECT TO authenticated
    USING (public.current_telegram_id() IS NOT NULL);

DROP POLICY IF EXISTS lessons_manage_staff ON public.lessons;
CREATE POLICY lessons_manage_staff ON public.lessons
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- questions
DROP POLICY IF EXISTS questions_select_auth ON public.questions;
CREATE POLICY questions_select_auth ON public.questions
    FOR SELECT TO authenticated
    USING (public.current_telegram_id() IS NOT NULL);

DROP POLICY IF EXISTS questions_manage_staff ON public.questions;
CREATE POLICY questions_manage_staff ON public.questions
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- video_checkpoints
DROP POLICY IF EXISTS video_checkpoints_select_auth ON public.video_checkpoints;
CREATE POLICY video_checkpoints_select_auth ON public.video_checkpoints
    FOR SELECT TO authenticated
    USING (public.current_telegram_id() IS NOT NULL);

DROP POLICY IF EXISTS video_checkpoints_manage_staff ON public.video_checkpoints;
CREATE POLICY video_checkpoints_manage_staff ON public.video_checkpoints
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- progress
DROP POLICY IF EXISTS progress_select_own_or_staff ON public.progress;
CREATE POLICY progress_select_own_or_staff ON public.progress
    FOR SELECT TO authenticated
    USING (user_id = public.current_telegram_id() OR public.is_staff());

DROP POLICY IF EXISTS progress_write_own_or_staff ON public.progress;
CREATE POLICY progress_write_own_or_staff ON public.progress
    FOR INSERT TO authenticated
    WITH CHECK (user_id = public.current_telegram_id() OR public.is_staff());

DROP POLICY IF EXISTS progress_update_own_or_staff ON public.progress;
CREATE POLICY progress_update_own_or_staff ON public.progress
    FOR UPDATE TO authenticated
    USING (user_id = public.current_telegram_id() OR public.is_staff())
    WITH CHECK (user_id = public.current_telegram_id() OR public.is_staff());

DROP POLICY IF EXISTS progress_delete_superadmin ON public.progress;
CREATE POLICY progress_delete_superadmin ON public.progress
    FOR DELETE TO authenticated
    USING (public.is_superadmin());

-- transactions (block forged topup/referral rows from client role)
DROP POLICY IF EXISTS transactions_select_own_or_staff ON public.transactions;
CREATE POLICY transactions_select_own_or_staff ON public.transactions
    FOR SELECT TO authenticated
    USING (user_id = public.current_telegram_id() OR public.is_staff());

DROP POLICY IF EXISTS transactions_insert_restricted ON public.transactions;
CREATE POLICY transactions_insert_restricted ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_superadmin()
        OR (user_id = public.current_telegram_id() AND type IN ('spend', 'promo', 'gift'))
    );

-- promo_codes
DROP POLICY IF EXISTS promo_codes_select_auth ON public.promo_codes;
CREATE POLICY promo_codes_select_auth ON public.promo_codes
    FOR SELECT TO authenticated
    USING (public.current_telegram_id() IS NOT NULL);

DROP POLICY IF EXISTS promo_codes_manage_staff ON public.promo_codes;
CREATE POLICY promo_codes_manage_staff ON public.promo_codes
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- promo_uses
DROP POLICY IF EXISTS promo_uses_select_own_or_staff ON public.promo_uses;
CREATE POLICY promo_uses_select_own_or_staff ON public.promo_uses
    FOR SELECT TO authenticated
    USING (user_id = public.current_telegram_id() OR public.is_staff());

DROP POLICY IF EXISTS promo_uses_insert_own_or_staff ON public.promo_uses;
CREATE POLICY promo_uses_insert_own_or_staff ON public.promo_uses
    FOR INSERT TO authenticated
    WITH CHECK (user_id = public.current_telegram_id() OR public.is_staff());

-- referrals (server/service_role writes only)
DROP POLICY IF EXISTS referrals_select_own_or_staff ON public.referrals;
CREATE POLICY referrals_select_own_or_staff ON public.referrals
    FOR SELECT TO authenticated
    USING (
        referrer_id = public.current_telegram_id()
        OR referred_id = public.current_telegram_id()
        OR public.is_staff()
    );

-- payments (server/service_role writes only)
DROP POLICY IF EXISTS payments_select_own_or_staff ON public.payments;
CREATE POLICY payments_select_own_or_staff ON public.payments
    FOR SELECT TO authenticated
    USING (user_id = public.current_telegram_id() OR public.is_staff());

-- duel_rooms
DROP POLICY IF EXISTS duel_rooms_select_participant_or_staff ON public.duel_rooms;
CREATE POLICY duel_rooms_select_participant_or_staff ON public.duel_rooms
    FOR SELECT TO authenticated
    USING (
        player1_id = public.current_telegram_id()
        OR player2_id = public.current_telegram_id()
        OR public.is_staff()
    );

DROP POLICY IF EXISTS duel_rooms_write_participant_or_staff ON public.duel_rooms;
CREATE POLICY duel_rooms_write_participant_or_staff ON public.duel_rooms
    FOR ALL TO authenticated
    USING (
        player1_id = public.current_telegram_id()
        OR player2_id = public.current_telegram_id()
        OR public.is_staff()
    )
    WITH CHECK (
        player1_id = public.current_telegram_id()
        OR player2_id = public.current_telegram_id()
        OR public.is_staff()
    );

-- daily_quests
DROP POLICY IF EXISTS daily_quests_select_own_or_staff ON public.daily_quests;
CREATE POLICY daily_quests_select_own_or_staff ON public.daily_quests
    FOR SELECT TO authenticated
    USING (user_id = public.current_telegram_id() OR public.is_staff());

DROP POLICY IF EXISTS daily_quests_write_own_or_staff ON public.daily_quests;
CREATE POLICY daily_quests_write_own_or_staff ON public.daily_quests
    FOR INSERT TO authenticated
    WITH CHECK (user_id = public.current_telegram_id() OR public.is_staff());

DROP POLICY IF EXISTS daily_quests_update_own_or_staff ON public.daily_quests;
CREATE POLICY daily_quests_update_own_or_staff ON public.daily_quests
    FOR UPDATE TO authenticated
    USING (user_id = public.current_telegram_id() OR public.is_staff())
    WITH CHECK (user_id = public.current_telegram_id() OR public.is_staff());

-- bot_states: RLS enabled, no policies for anon/authenticated (service_role only)
