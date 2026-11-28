-- Phase 2 Payments Migration: Telegram Stars hardening & unified atomic RPCs
-- Historical Click rows ('click' provider, 'completed' status) are preserved & backfilled.
-- Run 002_preflight.sql first. Apply manually in Supabase SQL Editor.

-- 1. Extend public.payments with server-side SKU, currency, minor units, and Telegram charge ID
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider VARCHAR NOT NULL DEFAULT 'stars';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS product_id VARCHAR;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency VARCHAR NOT NULL DEFAULT 'XTR';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount_minor BIGINT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS telegram_payment_charge_id TEXT;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Backfill existing historical rows ('click' & 'completed' -> 'paid')
UPDATE public.payments
SET provider = CASE
        WHEN click_trans_id IS NOT NULL OR COALESCE(merchant_trans_id, '') LIKE 'click_%' OR COALESCE(currency, '') = 'UZS'
            THEN 'click'
        WHEN COALESCE(currency, '') = 'XTR' OR COALESCE(merchant_trans_id, '') LIKE 'stars_%'
            THEN 'stars'
        ELSE COALESCE(NULLIF(provider, ''), 'click')
    END,
    currency = CASE
        WHEN COALESCE(currency, '') = 'XTR' OR COALESCE(merchant_trans_id, '') LIKE 'stars_%'
            THEN 'XTR'
        ELSE COALESCE(NULLIF(currency, ''), 'UZS')
    END,
    status = CASE
        WHEN status = 'completed' THEN 'paid'
        WHEN status IS NULL THEN 'pending'
        ELSE status
    END,
    amount_minor = COALESCE(
        amount_minor,
        ROUND(
            COALESCE(amount, 0) * CASE
                WHEN COALESCE(currency, '') = 'XTR' OR COALESCE(merchant_trans_id, '') LIKE 'stars_%' THEN 1
                ELSE 100
            END
        )::bigint
    ),
    updated_at = COALESCE(updated_at, NOW())
WHERE provider IS NULL
   OR currency IS NULL
   OR status = 'completed'
   OR status IS NULL
   OR amount_minor IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.payments ALTER COLUMN status SET DEFAULT 'pending';

-- Allow historical 'click' & 'completed' alongside current 'stars'/'paid'/'pending'/'failed'/'cancelled'/'refunded'
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments
    ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'paid', 'completed', 'failed', 'cancelled', 'refunded'));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_provider_check;
ALTER TABLE public.payments
    ADD CONSTRAINT payments_provider_check
    CHECK (provider IN ('click', 'stars'));

-- 3. Unique index on telegram_payment_charge_id for Stars idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_telegram_charge_id
    ON public.payments (telegram_payment_charge_id)
    WHERE telegram_payment_charge_id IS NOT NULL;

-- 4. Enforce valid payment status transitions
CREATE OR REPLACE FUNCTION public.enforce_payment_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status NOT IN ('pending', 'paid', 'failed', 'cancelled', 'refunded') THEN
            RAISE EXCEPTION 'Invalid initial payment status: %', NEW.status;
        END IF;
        RETURN NEW;
    END IF;

    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    IF OLD.status = 'pending' AND NEW.status IN ('paid', 'failed', 'cancelled') THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    ELSIF OLD.status IN ('paid', 'completed') AND NEW.status = 'refunded' THEN
        NEW.updated_at := NOW();
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid payment status transition: % -> %', OLD.status, NEW.status;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_payment_status_transition ON public.payments;
CREATE TRIGGER trg_enforce_payment_status_transition
    BEFORE INSERT OR UPDATE OF status ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_payment_status_transition();

-- 5. Ensure transactions.type supports both stars_topup and refund
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('topup', 'spend', 'gift', 'promo', 'referral', 'stars_topup', 'manual_gift', 'referral_bonus', 'refund'));

-- 6. Unified atomic Stars RPCs (strictly service_role only)

CREATE OR REPLACE FUNCTION public.fail_pending_payment(
    p_merchant_trans_id TEXT,
    p_target_status     TEXT DEFAULT 'failed'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_target_status NOT IN ('failed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid failure status: %', p_target_status;
    END IF;

    UPDATE public.payments
    SET status = p_target_status,
        updated_at = NOW()
    WHERE merchant_trans_id = p_merchant_trans_id
      AND status = 'pending';

    RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.fail_pending_payment(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_pending_payment(TEXT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_stars_payment(
    p_merchant_trans_id  TEXT,
    p_user_id            BIGINT,
    p_total_stars        INTEGER,
    p_telegram_charge_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing RECORD;
    v_payment  RECORD;
    v_balance  INTEGER;
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
        SELECT COALESCE(balance, 0) INTO v_balance FROM public.users WHERE telegram_id = p_user_id;
        RETURN jsonb_build_object(
            'ok', true,
            'already_paid', true,
            'xp_credited', COALESCE(v_existing.xp_credited, 0),
            'new_balance', COALESCE(v_balance, 0)
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
        SELECT COALESCE(balance, 0) INTO v_balance FROM public.users WHERE telegram_id = p_user_id;
        RETURN jsonb_build_object(
            'ok', true,
            'already_paid', true,
            'xp_credited', COALESCE(v_payment.xp_credited, 0),
            'new_balance', COALESCE(v_balance, 0)
        );
    END IF;

    IF v_payment.status <> 'pending' THEN
        RAISE EXCEPTION 'Invalid payment status: %', v_payment.status;
    END IF;

    UPDATE public.payments
    SET status = 'paid',
        telegram_payment_charge_id = p_telegram_charge_id,
        updated_at = NOW()
    WHERE id = v_payment.id;

    UPDATE public.users
    SET balance = COALESCE(balance, 0) + COALESCE(v_payment.xp_credited, 0)
    WHERE telegram_id = p_user_id
    RETURNING balance INTO v_balance;

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (
        p_user_id,
        COALESCE(v_payment.xp_credited, 0),
        'stars_topup',
        'Telegram Stars order ' || p_merchant_trans_id
    );

    RETURN jsonb_build_object(
        'ok', true,
        'already_paid', false,
        'xp_credited', COALESCE(v_payment.xp_credited, 0),
        'new_balance', v_balance
    );
END;
$$;

REVOKE ALL ON FUNCTION public.complete_stars_payment(TEXT, BIGINT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_stars_payment(TEXT, BIGINT, INTEGER, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.refund_stars_payment(
    p_user_id            BIGINT,
    p_total_stars        INTEGER,
    p_telegram_charge_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment RECORD;
    v_balance INTEGER;
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
        SELECT COALESCE(balance, 0) INTO v_balance FROM public.users WHERE telegram_id = p_user_id;
        RETURN jsonb_build_object(
            'ok', true,
            'already_refunded', true,
            'xp_deducted', 0,
            'new_balance', COALESCE(v_balance, 0)
        );
    END IF;

    IF v_payment.status <> 'paid' THEN
        RAISE EXCEPTION 'Cannot refund payment in status: %', v_payment.status;
    END IF;

    UPDATE public.payments
    SET status = 'refunded',
        updated_at = NOW()
    WHERE id = v_payment.id;

    UPDATE public.users
    SET balance = COALESCE(balance, 0) - COALESCE(v_payment.xp_credited, 0)
    WHERE telegram_id = p_user_id
    RETURNING balance INTO v_balance;

    INSERT INTO public.transactions (user_id, amount, type, description)
    VALUES (
        p_user_id,
        -COALESCE(v_payment.xp_credited, 0),
        'refund',
        'Telegram Stars refund ' || COALESCE(v_payment.merchant_trans_id, p_telegram_charge_id)
    );

    RETURN jsonb_build_object(
        'ok', true,
        'already_refunded', false,
        'xp_deducted', COALESCE(v_payment.xp_credited, 0),
        'new_balance', COALESCE(v_balance, 0)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.refund_stars_payment(BIGINT, INTEGER, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_stars_payment(BIGINT, INTEGER, TEXT) TO service_role;
