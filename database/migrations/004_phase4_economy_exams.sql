-- Phase 4 Migration: Stars Refund Debt Model, Server-Side Economy, Answerless Exams/Quizzes, Referral Uniqueness
-- Run 004_preflight.sql first. Apply manually in Supabase SQL Editor after Phases 1-3.

-- ============================================================================
-- PART A: STARS REFUNDS & DEBT ACCOUNTING
-- ============================================================================

-- 1. Add debt column and non-negative balance/debt constraints on public.users
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS debt BIGINT NOT NULL DEFAULT 0;

UPDATE public.users
SET balance = 0
WHERE balance IS NULL;

UPDATE public.users
SET debt = 0
WHERE debt IS NULL;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_debt_nonnegative;
ALTER TABLE public.users
    ADD CONSTRAINT users_debt_nonnegative CHECK (debt >= 0);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_balance_nonnegative;
ALTER TABLE public.users
    ADD CONSTRAINT users_balance_nonnegative CHECK (balance >= 0);

-- 1.1 Enforce SET search_path = public, pg_temp and revoke anon from Phase 1/2/3 helpers & service RPCs
ALTER FUNCTION public.increment_balance(BIGINT, INTEGER) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.increment_balance(BIGINT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_balance(BIGINT, INTEGER) TO service_role;

ALTER FUNCTION public.fail_pending_payment(TEXT, TEXT) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.fail_pending_payment(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_pending_payment(TEXT, TEXT) TO service_role;

ALTER FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.current_telegram_id()
RETURNS BIGINT
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT CASE
        WHEN COALESCE(NULLIF(auth.jwt() ->> 'telegram_id', ''), NULLIF(auth.jwt() ->> 'sub', ''), '') ~ '^[0-9]+$'
            THEN COALESCE(NULLIF(auth.jwt() ->> 'telegram_id', ''), NULLIF(auth.jwt() ->> 'sub', ''))::bigint
        ELSE NULL
    END;
$$;

ALTER FUNCTION public.is_staff() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_superadmin() SET search_path = public, pg_temp;
REVOKE ALL ON FUNCTION public.current_telegram_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_telegram_id() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_superadmin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, service_role;

-- 2. Replace refund_stars_payment: never allows negative balance; spills unpaid deficit into debt
CREATE OR REPLACE FUNCTION public.refund_stars_payment(
    p_user_id            BIGINT,
    p_total_stars        INTEGER,
    p_telegram_charge_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_payment             RECORD;
    v_balance             BIGINT;
    v_debt                BIGINT;
    v_xp_credited         BIGINT;
    v_deduct_from_balance BIGINT;
    v_debt_added          BIGINT;
    v_new_balance         BIGINT;
    v_new_debt            BIGINT;
BEGIN
    IF p_telegram_charge_id IS NULL OR length(trim(p_telegram_charge_id)) = 0 THEN
        RAISE EXCEPTION 'Missing telegram_payment_charge_id';
    END IF;

    SELECT *
    INTO v_payment
    FROM public.payments
    WHERE telegram_payment_charge_id = p_telegram_charge_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found for refund';
    END IF;

    IF v_payment.user_id <> p_user_id THEN
        RAISE EXCEPTION 'Refund user mismatch';
    END IF;

    IF COALESCE(v_payment.amount_minor, ROUND(COALESCE(v_payment.amount, 0))::bigint) <> p_total_stars THEN
        RAISE EXCEPTION 'Refund amount mismatch';
    END IF;

    IF v_payment.status = 'refunded' THEN
        SELECT COALESCE(balance, 0), COALESCE(debt, 0)
        INTO v_balance, v_debt
        FROM public.users
        WHERE telegram_id = p_user_id;

        RETURN jsonb_build_object(
            'ok', true,
            'already_refunded', true,
            'xp_deducted', 0,
            'balance_deducted', 0,
            'debt_added', 0,
            'new_balance', COALESCE(v_balance, 0),
            'new_debt', COALESCE(v_debt, 0)
        );
    END IF;

    IF v_payment.status NOT IN ('paid', 'completed') THEN
        RAISE EXCEPTION 'Cannot refund payment in status: %', v_payment.status;
    END IF;

    SELECT COALESCE(balance, 0), COALESCE(debt, 0)
    INTO v_balance, v_debt
    FROM public.users
    WHERE telegram_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    v_xp_credited := GREATEST(0, COALESCE(v_payment.xp_credited, 0));
    v_deduct_from_balance := LEAST(v_balance, v_xp_credited);
    v_debt_added := v_xp_credited - v_deduct_from_balance;

    UPDATE public.payments
    SET status = 'refunded',
        updated_at = NOW()
    WHERE id = v_payment.id;

    UPDATE public.users
    SET balance = v_balance - v_deduct_from_balance,
        debt = v_debt + v_debt_added
    WHERE telegram_id = p_user_id
    RETURNING balance, debt INTO v_new_balance, v_new_debt;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (
        p_user_id,
        -v_deduct_from_balance::integer,
        'refund',
        'Telegram Stars refund '
            || COALESCE(v_payment.merchant_trans_id, p_telegram_charge_id)
            || ' (balance_deducted=' || v_deduct_from_balance
            || ', debt_added=' || v_debt_added || ')'
    );

    RETURN jsonb_build_object(
        'ok', true,
        'already_refunded', false,
        'xp_deducted', v_deduct_from_balance,
        'balance_deducted', v_deduct_from_balance,
        'debt_added', v_debt_added,
        'new_balance', v_new_balance,
        'new_debt', v_new_debt
    );
END;
$$;

REVOKE ALL ON FUNCTION public.refund_stars_payment(BIGINT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_stars_payment(BIGINT, INTEGER, TEXT) TO service_role;

-- 3. Replace complete_stars_payment: purchased Stars top-up repays debt first, remainder credits balance
CREATE OR REPLACE FUNCTION public.complete_stars_payment(
    p_merchant_trans_id  TEXT,
    p_user_id            BIGINT,
    p_total_stars        INTEGER,
    p_telegram_charge_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_existing      RECORD;
    v_payment       RECORD;
    v_balance       BIGINT;
    v_debt          BIGINT;
    v_credited      BIGINT;
    v_debt_repaid   BIGINT;
    v_balance_added BIGINT;
    v_new_balance   BIGINT;
    v_new_debt      BIGINT;
BEGIN
    IF p_telegram_charge_id IS NULL OR length(trim(p_telegram_charge_id)) = 0 THEN
        RAISE EXCEPTION 'Missing telegram_payment_charge_id';
    END IF;

    SELECT id, merchant_trans_id, user_id, xp_credited, status
    INTO v_existing
    FROM public.payments
    WHERE telegram_payment_charge_id = p_telegram_charge_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing.merchant_trans_id <> p_merchant_trans_id OR v_existing.user_id <> p_user_id THEN
            RAISE EXCEPTION 'Duplicate telegram_payment_charge_id for mismatched order';
        END IF;
        SELECT COALESCE(balance, 0), COALESCE(debt, 0)
        INTO v_balance, v_debt
        FROM public.users
        WHERE telegram_id = p_user_id;

        RETURN jsonb_build_object(
            'ok', true,
            'already_paid', true,
            'xp_credited', COALESCE(v_existing.xp_credited, 0),
            'debt_repaid', 0,
            'balance_added', 0,
            'new_balance', COALESCE(v_balance, 0),
            'new_debt', COALESCE(v_debt, 0)
        );
    END IF;

    SELECT *
    INTO v_payment
    FROM public.payments
    WHERE merchant_trans_id = p_merchant_trans_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment order not found';
    END IF;

    IF v_payment.provider <> 'stars' OR v_payment.currency <> 'XTR' THEN
        RAISE EXCEPTION 'Invalid payment provider or currency';
    END IF;

    IF v_payment.user_id <> p_user_id THEN
        RAISE EXCEPTION 'Payment order does not belong to user';
    END IF;

    IF COALESCE(v_payment.amount_minor, ROUND(COALESCE(v_payment.amount, 0))::bigint) <> p_total_stars THEN
        RAISE EXCEPTION 'Payment amount mismatch';
    END IF;

    IF v_payment.status = 'paid' THEN
        SELECT COALESCE(balance, 0), COALESCE(debt, 0)
        INTO v_balance, v_debt
        FROM public.users
        WHERE telegram_id = p_user_id;

        RETURN jsonb_build_object(
            'ok', true,
            'already_paid', true,
            'xp_credited', COALESCE(v_payment.xp_credited, 0),
            'debt_repaid', 0,
            'balance_added', 0,
            'new_balance', COALESCE(v_balance, 0),
            'new_debt', COALESCE(v_debt, 0)
        );
    END IF;

    IF v_payment.status <> 'pending' THEN
        RAISE EXCEPTION 'Invalid payment status: %', v_payment.status;
    END IF;

    SELECT COALESCE(balance, 0), COALESCE(debt, 0)
    INTO v_balance, v_debt
    FROM public.users
    WHERE telegram_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    v_credited := GREATEST(0, COALESCE(v_payment.xp_credited, 0));
    v_debt_repaid := LEAST(v_debt, v_credited);
    v_balance_added := v_credited - v_debt_repaid;

    UPDATE public.payments
    SET status = 'paid',
        telegram_payment_charge_id = p_telegram_charge_id,
        updated_at = NOW()
    WHERE id = v_payment.id;

    UPDATE public.users
    SET debt = v_debt - v_debt_repaid,
        balance = v_balance + v_balance_added
    WHERE telegram_id = p_user_id
    RETURNING balance, debt INTO v_new_balance, v_new_debt;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (
        p_user_id,
        v_credited::integer,
        'stars_topup',
        'Telegram Stars order ' || p_merchant_trans_id
            || CASE
                WHEN v_debt_repaid > 0
                    THEN ' (debt_repaid=' || v_debt_repaid || ', balance_added=' || v_balance_added || ')'
                ELSE ''
            END
    );

    RETURN jsonb_build_object(
        'ok', true,
        'already_paid', false,
        'xp_credited', v_credited,
        'debt_repaid', v_debt_repaid,
        'balance_added', v_balance_added,
        'new_balance', v_new_balance,
        'new_debt', v_new_debt
    );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_stars_payment(TEXT, BIGINT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stars_payment(TEXT, BIGINT, INTEGER, TEXT) TO service_role;

-- 4. Update check_lesson_access: free content remains allowed under debt > 0; paid lessons blocked while debt > 0
CREATE OR REPLACE FUNCTION public.check_lesson_access(
    p_user_id   BIGINT,
    p_lesson_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role         TEXT;
    v_debt         BIGINT := 0;
    v_lesson       RECORD;
    v_is_free      BOOLEAN := FALSE;
    v_unlocked     BOOLEAN := FALSE;
    v_debt_blocked BOOLEAN := FALSE;
BEGIN
    SELECT role, COALESCE(debt, 0)
    INTO v_role, v_debt
    FROM public.users
    WHERE telegram_id = p_user_id;

    SELECT l.id, l.title, l.video_url, COALESCE(l.is_free, FALSE) AS is_free, COALESCE(c.price, 0) AS course_price
    INTO v_lesson
    FROM public.lessons l
    LEFT JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = p_lesson_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false, 'allowed', false, 'debt_blocked', false);
    END IF;

    v_is_free := (v_lesson.is_free OR v_lesson.course_price <= 0);

    IF v_role IN ('teacher', 'admin', 'superadmin') OR v_is_free THEN
        v_unlocked := TRUE;
    ELSIF v_debt > 0 THEN
        v_unlocked := FALSE;
        v_debt_blocked := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.progress
            WHERE user_id = p_user_id AND lesson_id = p_lesson_id AND COALESCE(is_unlocked, FALSE) = TRUE
        ) INTO v_unlocked;
    END IF;

    RETURN jsonb_build_object(
        'found', true,
        'allowed', v_unlocked,
        'is_free', v_is_free,
        'debt_blocked', v_debt_blocked,
        'debt', v_debt,
        'title', v_lesson.title,
        'video_url', CASE WHEN v_unlocked THEN v_lesson.video_url ELSE NULL END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_lesson_access(BIGINT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_lesson_access(BIGINT, INTEGER) TO service_role;

-- ============================================================================
-- PART B: STRICT RLS + PRIVILEGED ECONOMY GUARDS + SERVER-SIDE RPCS + EXAMS
-- ============================================================================

-- 5. Privileged & economy column guard (SECURITY INVOKER — inspects Postgres current_user, NOT JWT auth.role())
-- Direct client calls via PostgREST run as current_user IN ('anon', 'authenticated') and cannot spoof current_user.
-- SECURITY DEFINER RPCs owned by postgres run with current_user = 'postgres' and bypass the guard safely.
CREATE OR REPLACE FUNCTION public.guard_user_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_is_trusted_db_role BOOLEAN := current_user IN ('service_role', 'postgres', 'supabase_admin');
    v_is_superadmin      BOOLEAN := FALSE;
BEGIN
    IF v_is_trusted_db_role THEN
        RETURN NEW;
    END IF;

    v_is_superadmin := public.is_superadmin();

    IF NOT v_is_superadmin THEN
        IF NEW.telegram_id IS DISTINCT FROM OLD.telegram_id
           OR NEW.role IS DISTINCT FROM OLD.role
           OR NEW.permissions IS DISTINCT FROM OLD.permissions
           OR NEW.assigned_subject_id IS DISTINCT FROM OLD.assigned_subject_id THEN
            RAISE EXCEPTION 'Forbidden: cannot modify privileged user columns';
        END IF;
    END IF;

    IF NEW.balance IS DISTINCT FROM OLD.balance
       OR NEW.xp IS DISTINCT FROM OLD.xp
       OR NEW.debt IS DISTINCT FROM OLD.debt
       OR NEW.streak_days IS DISTINCT FROM OLD.streak_days
       OR NEW.last_active_date IS DISTINCT FROM OLD.last_active_date
       OR NEW.frozen_until IS DISTINCT FROM OLD.frozen_until THEN
        RAISE EXCEPTION 'Forbidden: cannot directly modify protected user economy or streak columns';
    END IF;

    RETURN NEW;
END;
$$;

-- 5.1 Scoped authorization helpers for teachers vs superadmins (checks DB subject_admins / users, never JWT claims)
CREATE OR REPLACE FUNCTION public.can_manage_subject(p_subject_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_superadmin()
        OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.telegram_id = public.current_telegram_id()
              AND u.role = 'teacher'
              AND (
                  u.assigned_subject_id = p_subject_id
                  OR EXISTS (
                      SELECT 1
                      FROM public.subject_admins sa
                      WHERE sa.user_id = u.telegram_id
                        AND sa.subject_id = p_subject_id
                  )
              )
        );
$$;

CREATE OR REPLACE FUNCTION public.teacher_has_permission(p_perm TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.is_superadmin()
        OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.telegram_id = public.current_telegram_id()
              AND u.role = 'teacher'
              AND (
                  COALESCE((u.permissions ->> p_perm)::boolean, FALSE)
                  OR EXISTS (
                      SELECT 1
                      FROM public.subject_admins sa
                      WHERE sa.user_id = u.telegram_id
                        AND COALESCE((sa.permissions ->> p_perm)::boolean, FALSE)
                  )
              )
        );
$$;

REVOKE ALL ON FUNCTION public.can_manage_subject(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_subject(BIGINT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.teacher_has_permission(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.teacher_has_permission(TEXT) TO authenticated, service_role;

-- 6. Revoke direct client writes on transactions, promo_uses, progress; scope teacher writes strictly by subject_admins
DROP POLICY IF EXISTS transactions_insert_restricted ON public.transactions;
DROP POLICY IF EXISTS transactions_insert_superadmin_only ON public.transactions;
CREATE POLICY transactions_insert_superadmin_only ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS promo_uses_insert_own_or_staff ON public.promo_uses;
DROP POLICY IF EXISTS promo_uses_insert_superadmin_only ON public.promo_uses;
CREATE POLICY promo_uses_insert_superadmin_only ON public.promo_uses
    FOR INSERT TO authenticated
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS promo_codes_select_auth ON public.promo_codes;
DROP POLICY IF EXISTS promo_codes_select_staff ON public.promo_codes;
DROP POLICY IF EXISTS promo_codes_manage_staff ON public.promo_codes;
CREATE POLICY promo_codes_select_staff ON public.promo_codes
    FOR SELECT TO authenticated
    USING (public.is_staff());
CREATE POLICY promo_codes_write_authorized_staff ON public.promo_codes
    FOR INSERT TO authenticated
    WITH CHECK (public.teacher_has_permission('can_promo'));
CREATE POLICY promo_codes_update_authorized_staff ON public.promo_codes
    FOR UPDATE TO authenticated
    USING (public.teacher_has_permission('can_promo'))
    WITH CHECK (public.teacher_has_permission('can_promo'));
CREATE POLICY promo_codes_delete_authorized_staff ON public.promo_codes
    FOR DELETE TO authenticated
    USING (public.teacher_has_permission('can_promo'));

DROP POLICY IF EXISTS progress_write_own_or_staff ON public.progress;
DROP POLICY IF EXISTS progress_update_own_or_staff ON public.progress;
DROP POLICY IF EXISTS progress_manage_staff ON public.progress;
CREATE POLICY progress_manage_staff ON public.progress
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS subjects_select_auth ON public.subjects;
DROP POLICY IF EXISTS subjects_select_staff ON public.subjects;
DROP POLICY IF EXISTS subjects_manage_staff ON public.subjects;
CREATE POLICY subjects_select_staff ON public.subjects
    FOR SELECT TO authenticated
    USING (public.is_staff());
CREATE POLICY subjects_manage_superadmin ON public.subjects
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

DROP POLICY IF EXISTS courses_manage_staff ON public.courses;
CREATE POLICY courses_manage_subject_staff ON public.courses
    FOR ALL TO authenticated
    USING (public.can_manage_subject(subject_id))
    WITH CHECK (public.can_manage_subject(subject_id));

DROP POLICY IF EXISTS lessons_select_auth ON public.lessons;
DROP POLICY IF EXISTS lessons_select_staff ON public.lessons;
DROP POLICY IF EXISTS lessons_manage_staff ON public.lessons;
CREATE POLICY lessons_select_staff ON public.lessons
    FOR SELECT TO authenticated
    USING (public.is_staff());
CREATE POLICY lessons_manage_subject_staff ON public.lessons
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_id AND public.can_manage_subject(c.subject_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = course_id AND public.can_manage_subject(c.subject_id)
        )
    );

-- 6.0 Safe student lesson catalog RPC: strips video_url & file_id from paid/locked/debt-blocked lessons
CREATE OR REPLACE FUNCTION public.get_lessons_catalog(
    p_course_ids INTEGER[] DEFAULT NULL,
    p_course_id  INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id  BIGINT := public.current_telegram_id();
    v_role     TEXT;
    v_debt     BIGINT := 0;
    v_is_staff BOOLEAN := FALSE;
    v_rows     JSONB := '[]'::jsonb;
    r          RECORD;
    v_unlocked BOOLEAN;
    v_obj      JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT role, COALESCE(debt, 0)
    INTO v_role, v_debt
    FROM public.users
    WHERE telegram_id = v_user_id;

    v_is_staff := v_role IN ('teacher', 'admin', 'superadmin');

    FOR r IN
        SELECT l.*,
               COALESCE(c.price, 0) AS course_price,
               c.title AS course_title,
               COALESCE(p.is_unlocked, FALSE) AS progress_unlocked
        FROM public.lessons l
        LEFT JOIN public.courses c ON c.id = l.course_id
        LEFT JOIN public.progress p ON p.lesson_id = l.id AND p.user_id = v_user_id
        WHERE (p_course_id IS NULL OR l.course_id = p_course_id)
          AND (p_course_ids IS NULL OR l.course_id = ANY(p_course_ids))
        ORDER BY l.order_index, l.id
    LOOP
        v_unlocked := v_is_staff
            OR COALESCE(r.is_free, FALSE)
            OR r.course_price <= 0
            OR (v_debt = 0 AND r.progress_unlocked);

        v_obj := to_jsonb(r) - 'video_url' - 'file_id' - 'course_price' - 'course_title' - 'progress_unlocked';
        v_obj := v_obj || jsonb_build_object(
            'has_video', (r.video_url IS NOT NULL AND length(trim(r.video_url)) > 0),
            'is_locked', (NOT v_unlocked),
            'video_url', CASE WHEN v_unlocked THEN r.video_url ELSE NULL END
        );
        v_rows := v_rows || jsonb_build_array(v_obj);
    END LOOP;

    RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lessons_catalog(INTEGER[], INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lessons_catalog(INTEGER[], INTEGER) TO authenticated, service_role;

DROP POLICY IF EXISTS questions_select_auth ON public.questions;
DROP POLICY IF EXISTS questions_select_staff ON public.questions;
DROP POLICY IF EXISTS questions_manage_staff ON public.questions;
CREATE POLICY questions_select_staff ON public.questions
    FOR SELECT TO authenticated
    USING (public.is_staff());
CREATE POLICY questions_write_subject_staff ON public.questions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = lesson_id AND public.can_manage_subject(c.subject_id)
        )
    );
CREATE POLICY questions_update_subject_staff ON public.questions
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = lesson_id AND public.can_manage_subject(c.subject_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = lesson_id AND public.can_manage_subject(c.subject_id)
        )
    );
CREATE POLICY questions_delete_subject_staff ON public.questions
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = lesson_id AND public.can_manage_subject(c.subject_id)
        )
    );

DROP POLICY IF EXISTS video_checkpoints_select_auth ON public.video_checkpoints;
DROP POLICY IF EXISTS video_checkpoints_select_staff ON public.video_checkpoints;
DROP POLICY IF EXISTS video_checkpoints_manage_staff ON public.video_checkpoints;
CREATE POLICY video_checkpoints_select_staff ON public.video_checkpoints
    FOR SELECT TO authenticated
    USING (public.is_staff());
CREATE POLICY video_checkpoints_manage_subject_staff ON public.video_checkpoints
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = lesson_id AND public.can_manage_subject(c.subject_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.lessons l
            JOIN public.courses c ON c.id = l.course_id
            WHERE l.id = lesson_id AND public.can_manage_subject(c.subject_id)
        )
    );

-- 6.1 Atomic admin/teacher gift RPC (allows authorized staff with can_gift to adjust student balance cleanly)
CREATE OR REPLACE FUNCTION public.admin_gift_balance(
    p_target_user_id BIGINT,
    p_delta          INTEGER,
    p_description    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_allowed     BOOLEAN := (current_user IN ('service_role', 'postgres', 'supabase_admin')) OR public.teacher_has_permission('can_gift');
    v_balance     BIGINT;
    v_new_balance BIGINT;
    v_user        RECORD;
BEGIN
    IF NOT v_allowed THEN
        RAISE EXCEPTION 'Forbidden: can_gift permission required';
    END IF;

    SELECT * INTO v_user FROM public.users WHERE telegram_id = p_target_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    v_balance := COALESCE(v_user.balance, 0);
    IF v_balance + p_delta < 0 THEN
        RAISE EXCEPTION 'Resulting balance cannot be negative';
    END IF;

    UPDATE public.users
    SET balance = v_balance + p_delta
    WHERE telegram_id = p_target_user_id
    RETURNING balance INTO v_new_balance;

    IF p_delta <> 0 THEN
        INSERT INTO public.transactions (user_id, amount, type, description)
        VALUES (
            p_target_user_id,
            p_delta,
            'gift',
            COALESCE(NULLIF(trim(p_description), ''), 'Admin gift balance adjustment')
        );
    END IF;

    RETURN jsonb_build_object('ok', true, 'telegram_id', p_target_user_id, 'new_balance', v_new_balance);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_gift_balance(BIGINT, INTEGER, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_gift_balance(BIGINT, INTEGER, TEXT) TO authenticated, service_role;

-- 7. Safe public metadata view RPC: returns subjects with exam_portal_data stripped
CREATE OR REPLACE FUNCTION public.get_public_subjects()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id BIGINT := public.current_telegram_id();
    v_rows    JSONB := '[]'::jsonb;
    r         RECORD;
    v_obj     JSONB;
    v_desc    JSONB;
BEGIN
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') AND v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    FOR r IN SELECT * FROM public.subjects ORDER BY id LOOP
        v_obj := to_jsonb(r);
        IF r.id = 1 AND r.description IS NOT NULL AND left(trim(r.description), 1) = '{' THEN
            BEGIN
                v_desc := r.description::jsonb - 'exam_portal_data';
                v_obj := jsonb_set(v_obj, '{description}', to_jsonb(v_desc::text));
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
        v_rows := v_rows || jsonb_build_array(v_obj);
    END LOOP;

    RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_subjects() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_subjects() TO authenticated, service_role;

-- 8. Safe answerless lesson questions & checkpoints RPCs + checkpoint grading RPC
CREATE OR REPLACE FUNCTION public.get_lesson_questions(
    p_lesson_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id BIGINT := public.current_telegram_id();
    v_access  JSONB;
    v_rows    JSONB := '[]'::jsonb;
    r         RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_access := public.check_lesson_access(v_user_id, p_lesson_id);
    IF NOT COALESCE((v_access ->> 'found')::boolean, FALSE) THEN
        RETURN '[]'::jsonb;
    END IF;
    IF NOT COALESCE((v_access ->> 'allowed')::boolean, FALSE) THEN
        RAISE EXCEPTION 'Lesson access denied';
    END IF;

    FOR r IN
        SELECT id, lesson_id, text, options, time_limit, image_url
        FROM public.questions
        WHERE lesson_id = p_lesson_id
          AND (image_url IS NULL OR image_url NOT LIKE 'cp_meta:%')
        ORDER BY id
    LOOP
        v_rows := v_rows || jsonb_build_array(
            jsonb_build_object(
                'id', r.id,
                'lesson_id', r.lesson_id,
                'text', r.text,
                'options', r.options,
                'time_limit', r.time_limit,
                'image_url', r.image_url
            )
        );
    END LOOP;

    RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_questions(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_questions(INTEGER) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_lesson_checkpoints(
    p_lesson_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id BIGINT := public.current_telegram_id();
    v_access  JSONB;
    v_rows    JSONB := '[]'::jsonb;
    r         RECORD;
    v_meta    JSONB;
    v_raw     JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_access := public.check_lesson_access(v_user_id, p_lesson_id);
    IF NOT COALESCE((v_access ->> 'found')::boolean, FALSE) THEN
        RETURN '[]'::jsonb;
    END IF;
    IF NOT COALESCE((v_access ->> 'allowed')::boolean, FALSE) THEN
        RAISE EXCEPTION 'Lesson access denied';
    END IF;

    BEGIN
        FOR r IN SELECT * FROM public.video_checkpoints WHERE lesson_id = p_lesson_id ORDER BY trigger_time_sec LOOP
            v_raw := to_jsonb(r) - 'correct_option' - 'correct_option_index';
            v_rows := v_rows || jsonb_build_array(v_raw);
        END LOOP;
    EXCEPTION WHEN undefined_table THEN
        v_rows := '[]'::jsonb;
    END;

    IF jsonb_array_length(v_rows) = 0 THEN
        FOR r IN
            SELECT id, lesson_id, text, options, image_url
            FROM public.questions
            WHERE lesson_id = p_lesson_id AND image_url LIKE 'cp_meta:%'
            ORDER BY id
        LOOP
            BEGIN
                v_meta := substring(r.image_url FROM 9)::jsonb;
            EXCEPTION WHEN OTHERS THEN
                v_meta := '{}'::jsonb;
            END;
            v_rows := v_rows || jsonb_build_array(
                jsonb_build_object(
                    'id', r.id,
                    'lesson_id', r.lesson_id,
                    'trigger_time_sec', COALESCE((v_meta ->> 'trigger_time_sec')::integer, 0),
                    'rewind_time_sec', COALESCE((v_meta ->> 'rewind_time_sec')::integer, 0),
                    'question', r.text,
                    'question_text', r.text,
                    'options', r.options
                )
            );
        END LOOP;
    END IF;

    RETURN v_rows;
END;
$$;

REVOKE ALL ON FUNCTION public.get_lesson_checkpoints(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_checkpoints(INTEGER) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_checkpoint_answer(
    p_checkpoint_id  BIGINT,
    p_selected_index INTEGER,
    p_lesson_id      INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id      BIGINT := public.current_telegram_id();
    v_correct_idx  INTEGER;
    v_lesson_id    INTEGER;
    v_raw          JSONB;
    r              RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    BEGIN
        SELECT * INTO r FROM public.video_checkpoints WHERE id = p_checkpoint_id;
        IF FOUND THEN
            v_raw := to_jsonb(r);
            v_lesson_id := (v_raw ->> 'lesson_id')::integer;
            v_correct_idx := COALESCE(
                NULLIF(v_raw ->> 'correct_option_index', '')::integer,
                NULLIF(v_raw ->> 'correct_option', '')::integer
            );
            RETURN jsonb_build_object(
                'ok', true,
                'found', true,
                'is_correct', (v_correct_idx IS NOT NULL AND p_selected_index = v_correct_idx)
            );
        END IF;
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;

    SELECT lesson_id, correct_option_index
    INTO v_lesson_id, v_correct_idx
    FROM public.questions
    WHERE id = p_checkpoint_id
      AND (p_lesson_id IS NULL OR lesson_id = p_lesson_id);

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'found', false, 'is_correct', false);
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'found', true,
        'is_correct', (v_correct_idx IS NOT NULL AND p_selected_index = v_correct_idx)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_checkpoint_answer(BIGINT, INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_checkpoint_answer(BIGINT, INTEGER, INTEGER) TO authenticated, service_role;

-- 9. Promocodes hardening: expires_at + unique (user_id, promo_id) + rate-limited redeem_promo RPC
ALTER TABLE public.promo_codes
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_promo_uses_user_promo
    ON public.promo_uses (user_id, promo_id);

CREATE OR REPLACE FUNCTION public.redeem_promo(
    p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id     BIGINT := public.current_telegram_id();
    v_code        TEXT := UPPER(TRIM(COALESCE(p_code, '')));
    v_rl          JSONB;
    v_promo       RECORD;
    v_inserted_id BIGINT;
    v_new_balance BIGINT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF length(v_code) = 0 OR length(v_code) > 64 THEN
        RETURN jsonb_build_object('ok', false, 'code', 'INVALID_CODE', 'message', 'Введите корректный промокод');
    END IF;

    v_rl := public.check_rate_limit('promo:user:' || v_user_id::text, 10, 300);
    IF NOT COALESCE((v_rl ->> 'allowed')::boolean, FALSE) THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'RATE_LIMIT_EXCEEDED',
            'retry_after', COALESCE((v_rl ->> 'retry_after')::integer, 60),
            'message', 'Слишком много попыток ввода промокода. Подождите немного.'
        );
    END IF;

    SELECT *
    INTO v_promo
    FROM public.promo_codes
    WHERE UPPER(TRIM(code)) = v_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND', 'message', 'Промокод не найден');
    END IF;

    IF v_promo.expires_at IS NOT NULL AND v_promo.expires_at <= NOW() THEN
        RETURN jsonb_build_object('ok', false, 'code', 'EXPIRED', 'message', 'Срок действия промокода истёк');
    END IF;

    IF COALESCE(v_promo.current_uses, 0) >= COALESCE(v_promo.max_uses, 0) THEN
        RETURN jsonb_build_object('ok', false, 'code', 'LIMIT_REACHED', 'message', 'Лимит активаций исчерпан');
    END IF;

    INSERT INTO public.promo_uses (promo_id, user_id)
    VALUES (v_promo.id, v_user_id)
    ON CONFLICT (user_id, promo_id) DO NOTHING
    RETURNING id INTO v_inserted_id;

    IF v_inserted_id IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'code', 'ALREADY_USED', 'message', 'Вы уже использовали этот промокод');
    END IF;

    UPDATE public.promo_codes
    SET current_uses = COALESCE(current_uses, 0) + 1
    WHERE id = v_promo.id;

    -- Lock user row and credit balance (activity/promo never clears Stars refund debt)
    UPDATE public.users
    SET balance = COALESCE(balance, 0) + GREATEST(0, COALESCE(v_promo.bonus_amount, 0))
    WHERE telegram_id = v_user_id
    RETURNING balance INTO v_new_balance;

    IF v_new_balance IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (
        v_user_id,
        GREATEST(0, COALESCE(v_promo.bonus_amount, 0)),
        'promo',
        'Promo-kod faollashtirildi: ' || v_promo.code
    );

    RETURN jsonb_build_object(
        'ok', true,
        'bonus', GREATEST(0, COALESCE(v_promo.bonus_amount, 0)),
        'new_balance', v_new_balance,
        'code', v_promo.code
    );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_promo(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_promo(TEXT) TO authenticated, service_role;

-- 10. Centralized app_settings + Streak Freeze RPC (reads cost from app_settings; seeded as 10000 pending user confirmation)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key        TEXT PRIMARY KEY,
    value_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_settings_select_auth ON public.app_settings;
CREATE POLICY app_settings_select_auth ON public.app_settings
    FOR SELECT TO authenticated
    USING (TRUE);

DROP POLICY IF EXISTS app_settings_manage_superadmin ON public.app_settings;
CREATE POLICY app_settings_manage_superadmin ON public.app_settings
    FOR ALL TO authenticated
    USING (public.is_superadmin())
    WITH CHECK (public.is_superadmin());

INSERT INTO public.app_settings (key, value_json)
VALUES ('streak_freeze_cost', '10000'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_streak_freeze_cost()
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT GREATEST(
        0,
        COALESCE(
            (SELECT (value_json)::bigint FROM public.app_settings WHERE key = 'streak_freeze_cost' LIMIT 1),
            10000
        )
    );
$$;

REVOKE ALL ON FUNCTION public.get_streak_freeze_cost() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_streak_freeze_cost() TO authenticated, service_role;

-- Internal helper for freeze logic (called both by 0-arg client RPC and service_role wrapper)
CREATE OR REPLACE FUNCTION public._execute_freeze_streak(p_target_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user        RECORD;
    v_cost        BIGINT := public.get_streak_freeze_cost();
    v_tomorrow    DATE := CURRENT_DATE + 1;
    v_new_balance BIGINT;
BEGIN
    IF p_target_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT telegram_id, COALESCE(balance, 0) AS balance, COALESCE(debt, 0) AS debt, frozen_until
    INTO v_user
    FROM public.users
    WHERE telegram_id = p_target_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'code', 'USER_NOT_FOUND', 'error', 'User not found');
    END IF;

    IF v_user.debt > 0 THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'DEBT_BLOCKED',
            'debt', v_user.debt,
            'error', 'Недоступно при наличии долга по возврату Stars'
        );
    END IF;

    IF v_user.frozen_until IS NOT NULL AND v_user.frozen_until >= v_tomorrow THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'ALREADY_FROZEN',
            'frozen_until', v_user.frozen_until,
            'error', 'Заморозка серии уже активна на завтра'
        );
    END IF;

    IF v_user.balance < v_cost THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', 'INSUFFICIENT_BALANCE',
            'required', v_cost,
            'balance', v_user.balance,
            'error', 'Недостаточно нейронов'
        );
    END IF;

    UPDATE public.users
    SET balance = v_user.balance - v_cost,
        frozen_until = v_tomorrow
    WHERE telegram_id = p_target_id
    RETURNING balance INTO v_new_balance;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (
        p_target_id,
        -v_cost::integer,
        'spend',
        'Muzlatish (Streak Freeze ' || v_cost::text || ')'
    );

    RETURN jsonb_build_object(
        'ok', true,
        'cost', v_cost,
        'new_balance', v_new_balance,
        'frozen_until', v_tomorrow
    );
END;
$$;

REVOKE ALL ON FUNCTION public._execute_freeze_streak(BIGINT) FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.freeze_streak_rpc(BIGINT);

-- Client RPC: takes NO user_id argument; caller is ALWAYS derived from auth.uid()/JWT
CREATE OR REPLACE FUNCTION public.freeze_streak_rpc()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public._execute_freeze_streak(public.current_telegram_id());
END;
$$;

REVOKE ALL ON FUNCTION public.freeze_streak_rpc() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.freeze_streak_rpc() TO authenticated, service_role;

-- Service RPC for Telegram Bot backend only
CREATE OR REPLACE FUNCTION public.freeze_streak_service(p_user_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public._execute_freeze_streak(p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.freeze_streak_service(BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.freeze_streak_service(BIGINT) TO service_role;

-- 11. Safe server-side daily streak sync RPC (replaces direct client UPDATE users)
CREATE OR REPLACE FUNCTION public.sync_daily_activity()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id    BIGINT := public.current_telegram_id();
    v_user       RECORD;
    v_today      DATE := CURRENT_DATE;
    v_new_streak INTEGER;
    v_diff       INTEGER;
    v_updated    RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT *
    INTO v_user
    FROM public.users
    WHERE telegram_id = v_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'User not found');
    END IF;

    v_new_streak := COALESCE(v_user.streak_days, 0);
    IF v_user.last_active_date IS NULL THEN
        v_new_streak := 1;
    ELSIF v_user.last_active_date < v_today THEN
        v_diff := (v_today - v_user.last_active_date);
        IF v_diff = 1 THEN
            v_new_streak := GREATEST(1, v_new_streak + 1);
        ELSIF v_user.frozen_until IS NULL OR v_user.frozen_until < v_today THEN
            v_new_streak := 1;
        END IF;
    END IF;

    IF v_user.last_active_date IS DISTINCT FROM v_today OR v_new_streak IS DISTINCT FROM v_user.streak_days THEN
        UPDATE public.users
        SET last_active_date = v_today,
            streak_days = v_new_streak
        WHERE telegram_id = v_user_id
        RETURNING * INTO v_updated;
        RETURN jsonb_build_object('ok', true, 'user', to_jsonb(v_updated));
    END IF;

    RETURN jsonb_build_object('ok', true, 'user', to_jsonb(v_user));
END;
$$;

REVOKE ALL ON FUNCTION public.sync_daily_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_daily_activity() TO authenticated, service_role;

-- 12. Idempotent exam attempts log & server-side lesson quiz/watch RPCs
CREATE TABLE IF NOT EXISTS public.exam_attempts (
    attempt_id       UUID PRIMARY KEY,
    user_id          BIGINT NOT NULL,
    exam_scope       TEXT NOT NULL CHECK (exam_scope IN ('portal_exam', 'lesson_quiz')),
    subject_key      TEXT,
    mode             TEXT,
    test_id          TEXT,
    lesson_id        INTEGER,
    answers          JSONB NOT NULL DEFAULT '{}'::jsonb,
    correct_count    INTEGER NOT NULL DEFAULT 0,
    total_questions  INTEGER NOT NULL DEFAULT 0,
    numeric_score    NUMERIC(6, 2) NOT NULL DEFAULT 0,
    percentage       INTEGER NOT NULL DEFAULT 0,
    cert_grade       TEXT,
    reward_neurons   INTEGER NOT NULL DEFAULT 0,
    result_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_test_created
    ON public.exam_attempts (user_id, test_id, created_at DESC);

ALTER TABLE public.exam_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exam_attempts_select_own_or_staff ON public.exam_attempts;
CREATE POLICY exam_attempts_select_own_or_staff ON public.exam_attempts
    FOR SELECT TO authenticated
    USING (user_id = public.current_telegram_id() OR public.is_staff());

CREATE OR REPLACE FUNCTION public.record_lesson_watch(
    p_lesson_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id BIGINT := public.current_telegram_id();
    v_access  JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    v_access := public.check_lesson_access(v_user_id, p_lesson_id);
    IF NOT COALESCE((v_access ->> 'found')::boolean, FALSE) THEN
        RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
    END IF;
    IF NOT COALESCE((v_access ->> 'allowed')::boolean, FALSE) THEN
        RETURN jsonb_build_object(
            'ok', false,
            'code', CASE WHEN COALESCE((v_access ->> 'debt_blocked')::boolean, FALSE) THEN 'DEBT_BLOCKED' ELSE 'ACCESS_DENIED' END
        );
    END IF;

    INSERT INTO public.progress (user_id, lesson_id, stars, is_unlocked)
    VALUES (v_user_id, p_lesson_id, 0, true)
    ON CONFLICT (user_id, lesson_id) DO NOTHING;

    RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.record_lesson_watch(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_lesson_watch(INTEGER) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_lesson_quiz(
    p_attempt_id UUID,
    p_lesson_id  INTEGER,
    p_answers    JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id   BIGINT := public.current_telegram_id();
    v_existing  RECORD;
    v_access    JSONB;
    v_total     INTEGER := 0;
    v_correct   INTEGER := 0;
    v_pct       INTEGER := 0;
    v_stars     INTEGER := 1;
    v_results   JSONB := '[]'::jsonb;
    v_sel       TEXT;
    v_is_ok     BOOLEAN;
    r           RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT * INTO v_existing
    FROM public.exam_attempts
    WHERE attempt_id = p_attempt_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing.user_id <> v_user_id THEN
            RAISE EXCEPTION 'Attempt belongs to another user';
        END IF;
        RETURN v_existing.result_payload || jsonb_build_object('already_submitted', true);
    END IF;

    v_access := public.check_lesson_access(v_user_id, p_lesson_id);
    IF NOT COALESCE((v_access ->> 'allowed')::boolean, FALSE) THEN
        RAISE EXCEPTION 'Lesson access denied';
    END IF;

    FOR r IN
        SELECT id, correct_option_index
        FROM public.questions
        WHERE lesson_id = p_lesson_id
          AND (image_url IS NULL OR image_url NOT LIKE 'cp_meta:%')
        ORDER BY id
    LOOP
        v_sel := p_answers ->> (r.id::text);
        IF v_sel IS NULL THEN
            v_sel := p_answers ->> (v_total::text);
        END IF;
        v_is_ok := (v_sel IS NOT NULL AND v_sel ~ '^-?[0-9]+$' AND v_sel::integer = r.correct_option_index);
        IF v_is_ok THEN
            v_correct := v_correct + 1;
        END IF;
        v_results := v_results || jsonb_build_array(
            jsonb_build_object(
                'id', r.id,
                'correct_option_index', r.correct_option_index,
                'is_correct', v_is_ok
            )
        );
        v_total := v_total + 1;
    END LOOP;

    IF v_total > 0 THEN
        v_pct := ROUND((v_correct::numeric / v_total::numeric) * 100)::integer;
        IF (v_correct::numeric / v_total::numeric) >= 0.8 THEN
            v_stars := 3;
        ELSIF (v_correct::numeric / v_total::numeric) >= 0.5 THEN
            v_stars := 2;
        ELSE
            v_stars := 1;
        END IF;
    END IF;

    INSERT INTO public.progress (user_id, lesson_id, stars, is_unlocked)
    VALUES (v_user_id, p_lesson_id, v_stars, true)
    ON CONFLICT (user_id, lesson_id) DO UPDATE
    SET stars = GREATEST(public.progress.stars, EXCLUDED.stars),
        is_unlocked = true;

    PERFORM 1;
    INSERT INTO public.exam_attempts (
        attempt_id, user_id, exam_scope, lesson_id, answers,
        correct_count, total_questions, numeric_score, percentage,
        reward_neurons, result_payload
    ) VALUES (
        p_attempt_id, v_user_id, 'lesson_quiz', p_lesson_id, COALESCE(p_answers, '{}'::jsonb),
        v_correct, v_total, v_pct, v_pct, 0,
        jsonb_build_object(
            'ok', true,
            'already_submitted', false,
            'correct_count', v_correct,
            'total_questions', v_total,
            'pct', v_pct,
            'stars', v_stars,
            'reward_neurons', 0,
            'question_results', v_results
        )
    );

    RETURN jsonb_build_object(
        'ok', true,
        'already_submitted', false,
        'correct_count', v_correct,
        'total_questions', v_total,
        'pct', v_pct,
        'stars', v_stars,
        'reward_neurons', 0,
        'question_results', v_results
    );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_lesson_quiz(UUID, INTEGER, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_lesson_quiz(UUID, INTEGER, JSONB) TO authenticated, service_role;

ALTER FUNCTION public.can_manage_subject(BIGINT) SET search_path = public, pg_temp;
ALTER FUNCTION public.teacher_has_permission(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_gift_balance(BIGINT, INTEGER, TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_public_subjects() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_lessons_catalog(INTEGER[], INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_lesson_questions(INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_lesson_checkpoints(INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_checkpoint_answer(BIGINT, INTEGER, INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.redeem_promo(TEXT) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_daily_activity() SET search_path = public, pg_temp;
ALTER FUNCTION public.record_lesson_watch(INTEGER) SET search_path = public, pg_temp;
ALTER FUNCTION public.submit_lesson_quiz(UUID, INTEGER, JSONB) SET search_path = public, pg_temp;

-- ============================================================================
-- PART C: REFERRAL INTEGRITY (NO SELF-REFERRAL, 1 REWARD PER REFERRED USER)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_referrals_referred_id
    ON public.referrals (referred_id);

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_no_self_referral;
ALTER TABLE public.referrals
    ADD CONSTRAINT referrals_no_self_referral CHECK (referrer_id <> referred_id);
