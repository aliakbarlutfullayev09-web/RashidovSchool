-- Preflight checks BEFORE applying 002_phase2_payments.sql (Read-only SELECTs)
-- Все запросы ниже должны вернуть 0 строк, иначе очистите дубли/невалидные строки до миграции.

-- 1. Дублирующиеся telegram_payment_charge_id (если колонка уже существует в таблице)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'payments'
          AND column_name = 'telegram_payment_charge_id'
    ) THEN
        PERFORM 1;
    END IF;
END $$;

-- Запустите вручную при повторном прогоне, если колонка telegram_payment_charge_id уже существует:
-- SELECT telegram_payment_charge_id, COUNT(*) AS cnt
-- FROM public.payments
-- WHERE telegram_payment_charge_id IS NOT NULL
-- GROUP BY telegram_payment_charge_id
-- HAVING COUNT(*) > 1;

-- 2. Строки с недопустимыми статусами (не входят в pending/paid/completed/failed/cancelled/refunded/NULL)
SELECT id, merchant_trans_id, status, amount, created_at
FROM public.payments
WHERE status IS NOT NULL
  AND status NOT IN ('pending', 'paid', 'completed', 'failed', 'cancelled', 'refunded');

-- 3. Строки без пользователя или с некорректной суммой
SELECT p.id, p.user_id, p.merchant_trans_id, p.amount, p.status
FROM public.payments p
LEFT JOIN public.users u ON u.telegram_id = p.user_id
WHERE u.telegram_id IS NULL
   OR p.amount IS NULL
   OR p.amount <= 0;

-- 4. Пользователи с отрицательным балансом (требует исправления до CHECK (balance >= 0) в Фазе 4)
SELECT telegram_id, balance, role
FROM public.users
WHERE balance < 0;
