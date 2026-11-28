CREATE TABLE IF NOT EXISTS public.bot_states (
    user_id    BIGINT PRIMARY KEY,
    state      TEXT,
    data       JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS referred_by BIGINT;

ALTER TABLE public.transactions
    DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('topup', 'spend', 'gift', 'promo', 'referral', 'stars_topup', 'manual_gift', 'referral_bonus'));

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

REVOKE ALL ON FUNCTION public.increment_balance(BIGINT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_balance(BIGINT, INTEGER) TO service_role;
