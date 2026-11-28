-- Rollback script for 004_phase4_economy_exams.sql (use carefully only if reverting Phase 4)

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_no_self_referral;
DROP INDEX IF EXISTS public.uq_referrals_referred_id;
DROP INDEX IF EXISTS public.uq_promo_uses_user_promo;

DROP FUNCTION IF EXISTS public.submit_lesson_quiz(UUID, INTEGER, JSONB);
DROP FUNCTION IF EXISTS public.record_lesson_watch(INTEGER);
DROP FUNCTION IF EXISTS public.sync_daily_activity();
DROP FUNCTION IF EXISTS public.freeze_streak_service(BIGINT);
DROP FUNCTION IF EXISTS public.freeze_streak_rpc();
DROP FUNCTION IF EXISTS public._execute_freeze_streak(BIGINT);
DROP FUNCTION IF EXISTS public.get_streak_freeze_cost();
DROP TABLE IF EXISTS public.app_settings;
DROP FUNCTION IF EXISTS public.redeem_promo(TEXT);
DROP FUNCTION IF EXISTS public.check_checkpoint_answer(BIGINT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.get_lesson_checkpoints(INTEGER);
DROP FUNCTION IF EXISTS public.get_lesson_questions(INTEGER);
DROP FUNCTION IF EXISTS public.get_lessons_catalog(INTEGER[], INTEGER);
DROP FUNCTION IF EXISTS public.get_public_subjects();
DROP FUNCTION IF EXISTS public.admin_gift_balance(BIGINT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.teacher_has_permission(TEXT);
DROP FUNCTION IF EXISTS public.can_manage_subject(BIGINT);
DROP TABLE IF EXISTS public.exam_attempts;

-- Restore Phase 1 trigger definition without economy column locks
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
