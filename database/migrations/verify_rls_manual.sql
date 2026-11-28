-- Ручная проверка RLS, прав на функции (pg_proc), защиты lessons.video_url и ролей на ТЕСТОВОЙ БД.
-- ВАЖНО: ВЕСЬ блок обёрнут в BEGIN ... ROLLBACK, чтобы не оставлять тестовых строк.

-- =====================================================================
-- 0. Аудит всех функций в схеме public через pg_proc (anon/authenticated/SECURITY DEFINER/search_path)
-- =====================================================================
SELECT
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS args,
    p.prosecdef AS is_security_definer,
    p.proconfig AS function_config,
    has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
    has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_execute,
    has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_can_execute
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;

BEGIN;

-- Подготовка тестовых пользователей, двух предметов, курсов, уроков, вопросов и промокода
INSERT INTO public.subjects (id, name)
VALUES
    (9901, 'Test Subject Bio'),
    (9902, 'Test Subject Chem')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.courses (id, subject_id, title, price)
VALUES
    (9901, 9901, 'Bio Course Free', 0),
    (9902, 9902, 'Chem Course Paid', 500)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.lessons (id, course_id, title, video_url, is_free)
VALUES
    (9901, 9901, 'Bio Lesson Free', 'https://cdn.example.test/free.mp4', true),
    (9902, 9902, 'Chem Lesson Paid', 'https://cdn.example.test/secret_paid.mp4', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.questions (id, lesson_id, text, options, correct_option_index, time_limit)
VALUES
    (9901, 9901, 'Bio Q1', '["A","B","C","D"]'::jsonb, 1, 30),
    (9902, 9902, 'Chem Q1', '["A","B","C","D"]'::jsonb, 2, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (telegram_id, role, full_name, balance, debt, assigned_subject_id)
VALUES
    (990000111, 'student', 'RLS Test Student A', 100, 0, NULL),
    (990000222, 'student', 'RLS Test Student B', 500, 0, NULL),
    (990000333, 'teacher', 'RLS Test Bio Teacher', 0, 0, 9901),
    (990000444, 'superadmin', 'RLS Test Superadmin', 0, 0, NULL)
ON CONFLICT (telegram_id) DO UPDATE
SET role = EXCLUDED.role,
    balance = EXCLUDED.balance,
    debt = EXCLUDED.debt,
    assigned_subject_id = EXCLUDED.assigned_subject_id;

INSERT INTO public.subject_admins (user_id, subject_id, permissions)
VALUES (990000333, 9901, '{"can_promo": true, "can_gift": false, "can_send": true}'::jsonb)
ON CONFLICT (user_id, subject_id) DO NOTHING;

INSERT INTO public.promo_codes (code, bonus_amount, max_uses, current_uses)
VALUES ('VERIFYPHASE4', 250, 10, 0)
ON CONFLICT (code) DO UPDATE SET bonus_amount = 250, max_uses = 10, current_uses = 0;

INSERT INTO public.transactions (user_id, amount, type, description)
VALUES
    (990000111, 100, 'topup', 'RLS test A'),
    (990000222, 500, 'topup', 'RLS test B');

INSERT INTO public.payments (user_id, merchant_trans_id, amount, status)
VALUES
    (990000111, 'rls_test_order_a', 100, 'pending'),
    (990000222, 'rls_test_order_b', 500, 'pending')
ON CONFLICT (merchant_trans_id) DO NOTHING;

-- =====================================================================
-- 1. Проверка под ролью anon (0 строк и permission denied на ВСЕХ служебных функциях)
-- =====================================================================
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{}', true);

SELECT count(*) AS anon_users_visible FROM public.users;
SELECT count(*) AS anon_transactions_visible FROM public.transactions;
SELECT count(*) AS anon_payments_visible FROM public.payments;
SELECT count(*) AS anon_promo_codes_visible FROM public.promo_codes;
SELECT count(*) AS anon_questions_visible FROM public.questions;
SELECT count(*) AS anon_lessons_visible FROM public.lessons;
SELECT count(*) AS anon_bot_states_visible FROM public.bot_states;

DO $$
BEGIN
    IF has_function_privilege('anon', 'public.complete_stars_payment(text,bigint,integer,text)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.refund_stars_payment(bigint,integer,text)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.fail_pending_payment(text,text)', 'EXECUTE')
       OR has_function_privilege('anon', 'public.increment_balance(bigint,integer)', 'EXECUTE') THEN
        RAISE EXCEPTION 'SECURITY FAILURE: anon has EXECUTE on service payment/balance RPC!';
    END IF;
    BEGIN
        PERFORM public.increment_balance(990000111, 1000);
        RAISE EXCEPTION 'SECURITY FAILURE: anon called increment_balance!';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END $$;

RESET ROLE;

-- =====================================================================
-- 2. Проверка под ролью authenticated как Студент A (990000111)
-- =====================================================================
SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claims',
    json_build_object(
        'aud', 'authenticated',
        'role', 'authenticated',
        'sub', '990000111',
        'telegram_id', 990000111
    )::text,
    true
);

-- 2.1. Изоляция и запрет прямого чтения promo_codes / questions / lessons
SELECT count(*) AS student_a_own_user FROM public.users WHERE telegram_id = 990000111;
SELECT count(*) AS student_a_sees_b_user FROM public.users WHERE telegram_id = 990000222;
SELECT count(*) AS student_a_sees_promo_codes FROM public.promo_codes;
SELECT count(*) AS student_a_sees_questions FROM public.questions;
SELECT count(*) AS student_a_sees_lessons_direct FROM public.lessons;

-- 2.2. Служебные функции недоступны authenticated, прямой UPDATE balance отклоняется, redeem_promo работает,
--      а get_lessons_catalog скрывает video_url платного урока (9902)
DO $$
DECLARE
    v_failed      BOOLEAN := FALSE;
    v_res         JSONB;
    v_bal         BIGINT;
    v_lessons     JSONB;
    v_paid_video  TEXT;
BEGIN
    BEGIN
        PERFORM public.complete_stars_payment('rls_test_order_a', 990000111, 5, 'x');
        RAISE EXCEPTION 'SECURITY FAILURE: authenticated called complete_stars_payment!';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.refund_stars_payment(990000111, 5, 'x');
        RAISE EXCEPTION 'SECURITY FAILURE: authenticated called refund_stars_payment!';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.fail_pending_payment('rls_test_order_a', 'failed');
        RAISE EXCEPTION 'SECURITY FAILURE: authenticated called fail_pending_payment!';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
    BEGIN
        PERFORM public.increment_balance(990000111, 999);
        RAISE EXCEPTION 'SECURITY FAILURE: authenticated called increment_balance!';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;

    BEGIN
        UPDATE public.users SET balance = 999999 WHERE telegram_id = 990000111;
    EXCEPTION WHEN OTHERS THEN
        v_failed := TRUE;
    END;
    IF NOT v_failed THEN
        RAISE EXCEPTION 'SECURITY FAILURE: direct client UPDATE balance was not rejected!';
    END IF;

    v_res := public.redeem_promo('VERIFYPHASE4');
    IF NOT COALESCE((v_res ->> 'ok')::boolean, FALSE) THEN
        RAISE EXCEPTION 'redeem_promo failed unexpectedly: %', v_res;
    END IF;
    SELECT balance INTO v_bal FROM public.users WHERE telegram_id = 990000111;
    IF v_bal <> 350 THEN
        RAISE EXCEPTION 'Expected balance=350 after promo +250, got %', v_bal;
    END IF;

    v_lessons := public.get_lessons_catalog(ARRAY[9902], NULL);
    v_paid_video := v_lessons -> 0 ->> 'video_url';
    IF v_paid_video IS NOT NULL THEN
        RAISE EXCEPTION 'SECURITY FAILURE: paid lesson video_url leaked: %', v_paid_video;
    END IF;
END $$;

RESET ROLE;

-- =====================================================================
-- 3. Проверка под ролью authenticated как Учитель Биологии (990000333, subject_id=9901)
-- =====================================================================
SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claims',
    json_build_object(
        'aud', 'authenticated',
        'role', 'authenticated',
        'sub', '990000333',
        'telegram_id', 990000333
    )::text,
    true
);

DO $$
DECLARE
    v_foreign_blocked BOOLEAN := FALSE;
    v_role_blocked    BOOLEAN := FALSE;
    v_updated_own     INTEGER := 0;
BEGIN
    UPDATE public.questions SET text = 'Bio Q1 updated by Bio teacher' WHERE id = 9901;
    GET DIAGNOSTICS v_updated_own = ROW_COUNT;
    IF v_updated_own <> 1 THEN
        RAISE EXCEPTION 'Teacher failed to update own subject question';
    END IF;

    BEGIN
        INSERT INTO public.questions (lesson_id, text, options, correct_option_index, time_limit)
        VALUES (9902, 'Hacked Chem Q', '["1","2"]'::jsonb, 0, 30);
    EXCEPTION WHEN OTHERS THEN
        v_foreign_blocked := TRUE;
    END;
    IF NOT v_foreign_blocked THEN
        RAISE EXCEPTION 'SECURITY FAILURE: teacher inserted question into foreign subject!';
    END IF;

    BEGIN
        UPDATE public.users SET role = 'superadmin' WHERE telegram_id = 990000111;
    EXCEPTION WHEN OTHERS THEN
        v_role_blocked := TRUE;
    END;
    IF NOT v_role_blocked THEN
        RAISE EXCEPTION 'SECURITY FAILURE: teacher escalated student role!';
    END IF;
END $$;

RESET ROLE;

-- =====================================================================
-- 4. Проверка под ролью authenticated как Суперадмин (990000444) -> смена роли разрешена
-- =====================================================================
SET LOCAL ROLE authenticated;
SELECT set_config(
    'request.jwt.claims',
    json_build_object(
        'aud', 'authenticated',
        'role', 'authenticated',
        'sub', '990000444',
        'telegram_id', 990000444
    )::text,
    true
);

DO $$
DECLARE
    v_new_role TEXT;
BEGIN
    UPDATE public.users
    SET role = 'teacher', assigned_subject_id = 9902
    WHERE telegram_id = 990000222;

    SELECT role INTO v_new_role FROM public.users WHERE telegram_id = 990000222;
    IF v_new_role <> 'teacher' THEN
        RAISE EXCEPTION 'Superadmin failed to promote user to teacher';
    END IF;
END $$;

RESET ROLE;

ROLLBACK;
