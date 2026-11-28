# Phase 4 — Инструкции, доказательства и ручная проверка на тестовом проекте Supabase

> [!CAUTION]
> **ВАЖНО:** Файл `docker/postgres-init/00_supabase_compat.sql` предназначен **ТОЛЬКО для локального Docker** (`docker-compose.test.yml`)!
> **НИКОГДА не запускайте `00_supabase_compat.sql` в реальном или тестовом проекте Supabase** — в Supabase роли `anon`, `authenticated`, `service_role` и системная схема `auth` уже существуют и управляются самой платформой.

## 1. Доказательство безопасного удаления лишних компонентов (Доработка 2)
Команда проверки по всему `user-app/src/` и `admin-app/src/`:
```bash
git grep -n -w -E "PromoCode|PromoModal|MistakesModal|BottomSheet|LevelNode|LevelPath|QuestsPage|ArenaPage" user-app/src/ admin-app/src/
```
Результат: **0 совпадений** (нет статических импортов, `React.lazy`, динамических `import()` и строковых маршрутов).
Навигация в `user-app/src/App.jsx` (`activeTab`) и `user-app/src/components/TabBar.jsx` содержит только вкладки `lessons`, `tests`, `rating`, `ai`, `profile`.

**Где пользователь вводит промокод:**
Внутри `user-app/src/components/TopUpModal.jsx` (поле ввода промокода и кнопка активации вызывают `applyPromoCode` -> RPC `redeem_promo`).

---

## 2. Запуск интеграционных тестов: Docker и отдельный тестовый проект Supabase (Доработка 3)

### Вариант A: Локальный PostgreSQL с Supabase-совместимым слоем (Docker)
Файл `docker/postgres-init/00_supabase_compat.sql` создаёт роли `anon`, `authenticated`, `service_role`, схему `auth` и функции `auth.jwt()`, `auth.uid()`, `auth.role()`, читающие `request.jwt.claims`.

```bash
docker compose -f docker-compose.test.yml up -d --wait
TEST_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5439/rashidov_test" python -m pytest tests/integration/test_postgres_payments.py -v
docker compose -f docker-compose.test.yml down -v
```

### Вариант B: Отдельный тестовый проект / ветка Supabase (безопасно, без Docker)
Никогда не запускайте тесты против боевого проекта Supabase!
1. В панели Supabase создайте **отдельный тестовый проект** (или Staging Branch) и скопируйте его **Connection String (Direct / Transaction pooler)** вида `postgresql://postgres.<ref>:<TEST_DB_PASSWORD>@...supabase.com:5432/postgres?sslmode=require`.
2. Примените в SQL Editor тестового проекта последовательно:
   - `database/migrations/001_phase1_rls_and_rpc.sql`
   - `database/migrations/002_preflight.sql` -> `database/migrations/002_phase2_payments.sql`
   - `database/migrations/003_phase3_video_ai_ratelimit.sql`
   - `database/migrations/004_preflight.sql` -> `database/migrations/004_phase4_economy_exams.sql`
3. Запустите интеграционные тесты (начиная с `001`..`004` идемпотентно на тестовой БД):
```powershell
$env:TEST_DATABASE_URL="postgresql://postgres:<TEST_PASSWORD>@db.<TEST_REF>.supabase.co:5432/postgres?sslmode=require"
$env:TEST_DB_SKIP_BOOTSTRAP="1"   # если миграции 001-004 уже применены вручную
python -m pytest tests/integration/test_postgres_payments.py -v
```
*(Если `TEST_DB_SKIP_BOOTSTRAP` не задан, тест сам создаст базовые таблицы и применит 001–004 в пустой тестовой БД).*

---

## 3. Порядок применения миграции Фазы 4 на рабочей БД (вручную вами)
1. Выполните в Supabase SQL Editor файл `database/migrations/004_preflight.sql` и убедитесь, что все 4 запроса вернули **0 строк** (нет отрицательных балансов, дублей в `referrals`, саморефералов или дублей `promo_uses`).
2. Примените `database/migrations/004_phase4_economy_exams.sql`.
3. Для отката при необходимости используйте `database/migrations/004_rollback.sql`.

---

## 4. Ручная проверка RLS и экономики Фазы 4 (SQL Editor / тестовая БД)

```sql
-- 1. Клиент (роль authenticated, студент 1001) НЕ может напрямую изменить balance / xp / debt / streak
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"1001","telegram_id":1001}', true);
UPDATE public.users SET balance = 999999 WHERE telegram_id = 1001;
-- Ожидается ошибка: Forbidden: cannot modify protected user economy or privilege columns
ROLLBACK;

-- 2. Клиент НЕ может напрямую вставить строку в transactions / promo_uses / progress
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"1001","telegram_id":1001}', true);
INSERT INTO public.transactions (user_id, amount, type, description) VALUES (1001, 5000, 'promo', 'fake');
-- Ожидается ошибка RLS: new row violates row-level security policy
ROLLBACK;

-- 3. Клиент НЕ видит correct_option_index в questions через прямой SELECT
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"role":"authenticated","sub":"1001","telegram_id":1001}', true);
SELECT id, correct_option_index FROM public.questions LIMIT 5;
-- Ожидается 0 строк (direct SELECT открыт только для is_staff()); используйте RPC get_lesson_questions(lesson_id)
ROLLBACK;

-- 4. Проверка модели долга при возврате Stars
-- При balance = 200 и возврате заказа на 1250 XP: balance -> 0, debt -> 1050.
-- check_lesson_access(1001, free_lesson) -> allowed=true; check_lesson_access(1001, paid_lesson) -> allowed=false, debt_blocked=true.
-- Пополнение Stars на 25000 XP: debt -> 0, balance -> 23950.
```

---

## 5. Ручная проверка ботов и Mini App (тестовый режим)
1. **Онбординг фото/стикером (`/start`)**: на шаге ввода имени или класса отправьте фото или стикер вместо текста — бот повторно попросит текст и не упадёт.
2. **Статистика учителя (`/stats`)**: учитель с записью в `subject_admins` получает статистику по своим предметам без `KeyError`.
3. **Команда `/refund <charge_id>` от админа**:
   - Если `user.balance < xp_credited`, бот **не** вызывает `refundStarPayment` автоматически, а показывает предупреждение о переходе остатка в `debt` и кнопки подтверждения/отмены.
4. **Реферал**: переход по `ref_<свой_id>` или повторный `/start` от уже существующего/другого приглашённого даёт 0 повторных начислений; описание транзакции не содержит ФИО и других ПДн.
5. **Streak Freeze**: единая цена `10000` Нейронов и в боте, и в Mini App; повторная покупка в тот же день и покупка при `debt > 0` отклоняются.
6. **Экзамены (ДТМ / Сертификат)**: в Network (`GET /api/exams/questions`) в JSON ответов нет `correctIndex`/`correctAnswer`; итоговый балл рассчитывается только после `POST /api/exams/submit`, повторная отправка того же `attemptId` возвращает кэшированный результат (`alreadySubmitted: true`).
