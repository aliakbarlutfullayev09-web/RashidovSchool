-- Phase 3 Migration: Distributed Rate Limiting + Lesson Access Check RPC
-- Apply manually in Supabase SQL Editor after Phase 1 & 2 migrations.

-- 1. Rate limiting table (service_role only)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    rate_key          TEXT PRIMARY KEY,
    count             INTEGER NOT NULL DEFAULT 1,
    window_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- 2. Atomic rate limit counter RPC (works across Vercel serverless & multi-instance FastAPI)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_key            TEXT,
    p_limit          INTEGER,
    p_window_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_now          TIMESTAMPTZ := NOW();
    v_count        INTEGER;
    v_started_at   TIMESTAMPTZ;
    v_retry_after  INTEGER;
BEGIN
    IF p_key IS NULL OR length(trim(p_key)) = 0 OR p_limit <= 0 OR p_window_seconds <= 0 THEN
        RAISE EXCEPTION 'Invalid rate limit arguments';
    END IF;

    INSERT INTO public.rate_limits (rate_key, count, window_started_at)
    VALUES (p_key, 1, v_now)
    ON CONFLICT (rate_key) DO UPDATE
    SET count = CASE
            WHEN public.rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
                THEN 1
            ELSE public.rate_limits.count + 1
        END,
        window_started_at = CASE
            WHEN public.rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= v_now
                THEN v_now
            ELSE public.rate_limits.window_started_at
        END
    RETURNING count, window_started_at INTO v_count, v_started_at;

    v_retry_after := GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (v_started_at + make_interval(secs => p_window_seconds) - v_now)))::integer
    );

    RETURN jsonb_build_object(
        'allowed', v_count <= p_limit,
        'remaining', GREATEST(0, p_limit - v_count),
        'count', v_count,
        'retry_after', CASE WHEN v_count <= p_limit THEN 0 ELSE v_retry_after END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- 3. Authoritative server-side lesson access check
CREATE OR REPLACE FUNCTION public.check_lesson_access(
    p_user_id   BIGINT,
    p_lesson_id INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role     TEXT;
    v_lesson   RECORD;
    v_unlocked BOOLEAN := FALSE;
BEGIN
    SELECT role INTO v_role FROM public.users WHERE telegram_id = p_user_id;

    SELECT l.id, l.title, l.video_url, COALESCE(l.is_free, FALSE) AS is_free, COALESCE(c.price, 0) AS course_price
    INTO v_lesson
    FROM public.lessons l
    LEFT JOIN public.courses c ON c.id = l.course_id
    WHERE l.id = p_lesson_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('found', false, 'allowed', false);
    END IF;

    IF v_role IN ('teacher', 'admin', 'superadmin') OR v_lesson.is_free OR v_lesson.course_price <= 0 THEN
        v_unlocked := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1 FROM public.progress
            WHERE user_id = p_user_id AND lesson_id = p_lesson_id AND COALESCE(is_unlocked, FALSE) = TRUE
        ) INTO v_unlocked;
    END IF;

    RETURN jsonb_build_object(
        'found', true,
        'allowed', v_unlocked,
        'title', v_lesson.title,
        'video_url', CASE WHEN v_unlocked THEN v_lesson.video_url ELSE NULL END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_lesson_access(BIGINT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_lesson_access(BIGINT, INTEGER) TO service_role;
