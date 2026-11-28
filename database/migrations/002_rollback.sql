-- Rollback for 002_phase2_payments.sql
-- Используйте только на тестовой БД или при откате до запуска Stars Phase 2.

DROP TRIGGER IF EXISTS trg_enforce_payment_status_transition ON public.payments;
DROP FUNCTION IF EXISTS public.enforce_payment_status_transition();

DROP FUNCTION IF EXISTS public.fail_pending_payment(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.complete_stars_payment(TEXT, BIGINT, INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.refund_stars_payment(BIGINT, INTEGER, TEXT);

DROP INDEX IF EXISTS public.uq_payments_telegram_charge_id;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_provider_check;

ALTER TABLE public.payments DROP COLUMN IF EXISTS provider;
ALTER TABLE public.payments DROP COLUMN IF EXISTS product_id;
ALTER TABLE public.payments DROP COLUMN IF EXISTS currency;
ALTER TABLE public.payments DROP COLUMN IF EXISTS amount_minor;
ALTER TABLE public.payments DROP COLUMN IF EXISTS telegram_payment_charge_id;
ALTER TABLE public.payments DROP COLUMN IF EXISTS updated_at;
