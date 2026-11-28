# Runbook выката в production — Rashidov Biologiya

> Соблюдайте строгий порядок шагов. Миграции `001`–`004` применяются вручную в Supabase SQL Editor после резервной копии БД.

---

## 1. Подготовка и бэкап (ДО изменений)
1. **Бэкап БД:**
   - В панели Supabase → **Database → Backups**: создайте ручной snapshot (или `pg_dump "$DIRECT_DATABASE_URL" --format=custom --file=backup_pre_rollout_$(date +%Y%m%d).dump`).
2. **Проверьте ротацию секретов:**
   - Убедитесь, что старый `STUDENT_BOT_TOKEN` отозван в `@BotFather`, и на руках только актуальные ключи (`BOT_TOKEN` / `STUDENT_BOT_TOKEN`, `ADMIN_BOT_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `WEBHOOK_SECRET`, `GEMINI_API_KEY`).

---

## 2. Настройка переменных окружения на хостингах

### Vercel (`user-app` и `admin-app`)
Проверьте в настройках **оба** проекта (`Environment Variables` для Production и Preview):
- `VITE_SUPABASE_URL` — URL проекта Supabase (`https://<ref>.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — публичный `anon` ключ
- `VITE_API_URL` — **пусто** или URL бэкенда, если `/api/*` на том же Vercel, не указывать секреты с `VITE_`!
- **Только server-side (без префикса `VITE_`!)** для `user-app/api/*` и `admin-app/api/*`:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (никогда не попадает в клиентский бандл!)
  - `SUPABASE_JWT_SECRET` (JWT Secret из Supabase → Settings → API)
  - `STUDENT_BOT_TOKEN` (и `BOT_TOKEN`) / `ADMIN_BOT_TOKEN` (для `admin-app`)
  - `ALLOWED_ORIGINS` (`https://<user-app>.vercel.app,https://<admin-app>.vercel.app`)
  - `VIDEO_ALLOWED_HOSTS` (домены Supabase Storage / CDN видео, например `<ref>.supabase.co`)
  - `INIT_DATA_MAX_AGE_SECONDS=3600`, `SESSION_JWT_TTL_SECONDS=3600`

### Railway / VPS (`bot/` и/или `backend/`)
- Обязательно задайте: `BOT_TOKEN` / `STUDENT_BOT_TOKEN` / `ADMIN_BOT_TOKEN`, `DATABASE_URL` / `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `WEBHOOK_SECRET` (обязателен — `backend` не запустится без него), `GEMINI_API_KEY`, `USER_APP_URL`, `ADMIN_APP_URL`, `ALLOWED_ORIGINS`, `VIDEO_ALLOWED_HOSTS`.
- `STREAK_FREEZE_COST=10000` (актуальная цена дополнительно читается из таблицы `app_settings`).

---

## 3. Порядок деплоя кода и миграций БД (Zero-Downtime порядок)

> Важно: **сначала примените миграции в БД**? Нет — обратите внимание на совместимость!
> - Старый клиент (`user-app` до обновления) ходил напрямую в `.from('questions')`, `.from('lessons')`, `.from('promo_codes')` и обновлял `users.streak_days` напрямую. Если вы включите жёсткий RLS Фазы 4 **раньше** выката нового кода `user-app`/`admin-app`/ботов, пользователи получат ошибки уже при первом запросе.
> - **Рекомендуемый порядок:**
>   1. Поставьте краткое тех-окно (2–5 минут).
>   2. Сначала примените миграции `001` → `004` на БД (ниже), затем сразу выкатите обновлённый код `bot/`, `backend/`, `user-app/` и `admin-app/`.

### Последовательность SQL-миграций в Supabase SQL Editor
> **Никогда не применяйте `docker/postgres-init/00_supabase_compat.sql` в Supabase!**

1. `database/migrations/001_phase1_rls_and_rpc.sql` (RLS + `current_telegram_id`, `is_staff`, `is_superadmin`, `increment_balance`).
2. `database/migrations/002_preflight.sql` → убедитесь, что все запросы вернули **0 строк** (или очистите дубли/некорректные статусы).
3. `database/migrations/002_phase2_payments.sql` (Stars RPC `complete_stars_payment`, `refund_stars_payment`, `fail_pending_payment`, бэкфилл исторических `'click'` / `'completed'`).
4. `database/migrations/003_phase3_video_ai_ratelimit.sql` (`rate_limits`, `check_rate_limit`, `check_lesson_access`).
5. `database/migrations/004_preflight.sql` → убедитесь, что вернул **0 строк** (нет отрицательных балансов, дублей в `referrals`, саморефералов, дублей `promo_uses`).
6. `database/migrations/004_phase4_economy_exams.sql` (модель `debt`, `guard_user_privileged_columns` на `current_user`, скоупинг учителей по `subject_admins`, `lessons` + `get_lessons_catalog`, `redeem_promo`, `app_settings`, `freeze_streak_rpc` / `freeze_streak_service`, `sync_daily_activity`, `exam_attempts`, `SET search_path = public, pg_temp`).
7. Выполните `database/migrations/verify_rls_manual.sql` целиком (`BEGIN ... ROLLBACK`) и убедитесь, что все `assert`-блоки завершились без исключений, а в таблице `pg_proc` все служебные функции имеют `anon_can_execute = false` и `auth_can_execute = false`.

---

## 4. Деплой сервисов и внешний Smoke-тест

1. Задеплойте `bot/` (Railway Docker build с непривилегированным `appuser` и `/health`), `backend/` (webhook `/webhook/student`, `/webhook/admin` + `setup_webhooks.py` с новым `WEBHOOK_SECRET`), `user-app/` и `admin-app/` на Vercel.
2. Запустите внешний анонимный smoke-тест (и при наличии тестовых `JWT_A`/`JWT_B` или `INIT_DATA_A`/`INIT_DATA_B` — проверку изоляции пользователей A/B):
   ```bash
   # Анонимный режим:
   node scripts/smoke_rls.mjs --url https://<REF>.supabase.co --key <ANON_KEY>

   # Расширенный режим (изоляция A/B + защита balance/video_url/service RPC):
   node scripts/smoke_rls.mjs --url https://<REF>.supabase.co --key <ANON_KEY> --jwt-a "<JWT_A>" --jwt-b "<JWT_B>" --paid-lesson-id <ID>
   ```
   Ожидается **0 failed**.

### Проверка совместимости JWT и `SUPABASE_JWT_SECRET`
Эндпоинт `/api/auth/telegram` (`user-app`, `admin-app`, `bot`, `backend`) подписывает HS256-токен с claims:
`role: "authenticated"`, `aud: "authenticated"`, `sub: "<telegram_id>"`, `telegram_id: <int>`, `app_role: "<db_role>"`, `iat`, `exp` (≤ 3600 с).
1. Убедитесь, что `SUPABASE_JWT_SECRET` на Vercel и в `bot/`/`backend/` **побайтно совпадает** с **JWT Secret** в Supabase (`Project Settings → API → JWT Settings`).
2. Проверьте, что Supabase принимает токен (не возвращает `401 JWSError` / `Invalid signature`):
   ```bash
   # 1. Получите JWT через /api/auth/telegram и подставьте в TOKEN:
   curl -i -s "https://<REF>.supabase.co/rest/v1/users?select=telegram_id,role" \
     -H "apikey: <ANON_KEY>" \
     -H "Authorization: Bearer <TOKEN>"
   # Ожидается: HTTP 200 и строка только текущего telegram_id (если 401 Invalid JWT — секрет не совпадает).

   # 2. Проверка резолва ID внутри Postgres:
   curl -s -X POST "https://<REF>.supabase.co/rest/v1/rpc/sync_daily_activity" \
     -H "apikey: <ANON_KEY>" \
     -H "Authorization: Bearer <TOKEN>" \
     -H "Content-Type: application/json" -d '{}'
   # Ожидается: {"ok": true, "user": {...}} без ошибок UUID (sub читается через auth.jwt() ->> 'sub', а не auth.uid()).
   ```

---

## 5. Ручной чек-лист сразу после выката

1. **Вход в `user-app`:** откройте Mini App в Telegram → убедитесь, что вызван `/api/auth/telegram`, баланс/серия загрузились; в DevTools URL `?user_id=...` больше не подменяет профиль.
2. **Тестовый платёж `stars_5`:** создайте счёт на `5 ⭐` через кнопку пополнения → оплатите в Telegram (тестовый режим / или проверьте создание `pending` заказа в `payments` и прохождение `pre_checkout_query`) → проверьте, что баланс пополнился ровно 1 раз и в `transactions` появилась 1 запись `stars_topup`.
3. **Урок платный vs бесплатный:**
   - Бесплатный урок открывается и воспроизводится (`get_lessons_catalog` отдал `video_url`).
   - Неоплаченный платный урок в Network (`get_lessons_catalog`) имеет `video_url: null` и `is_locked: true`; запрос `/api/send-lesson-video` возвращает `403`.
4. **Промокод:** введите промокод в `TopUpModal` → сработал через `redeem_promo`, повторный ввод даёт «уже использован».
5. **Админка и боты:**
   - Суперадмин входит в `admin-app`, добавляет/снимает учителя и меняет предмет.
   - Учитель открывает `/stats` в боте → нет `KeyError`; редактирует свой вопрос в `admin-app` → успешно; начисление через `UserList` работает через `admin_gift_balance`.
   - Тест `/refund <charge_id>` на тестовом заказе при балансе меньше `xp_credited` → бот НЕ возвращает автоматически и показывает предупреждение с кнопкой подтверждения.

---

## 6. Ожидаемые ошибки у пользователей со старым кэшем
Пока клиент не переоткроет Telegram Mini App / не сбросится кэш браузера, у пользователей со старым JS-бандлом возможны:
- `401/403` или пустые списки уроков/вопросов (старый бандл обращается напрямую к `.from('lessons')` / `.from('questions')` вместо RPC `get_lessons_catalog` / `get_lesson_questions`).
- Ошибка обновления стрика при открытии (`Forbidden: cannot directly modify protected user economy or streak columns`) — старый `syncUserSession` делал прямой `UPDATE users`.
- **Действие:** заголовок `Cache-Control: no-store` на `/api/*` и новые хэши бандлов Vite (`index-*.js`) обновят клиент при следующем открытии Mini App (при необходимости напишите в канал кнопку «Перезагрузить платформу»).

---

## 7. План отката по каждой миграции

1. **Откат Фазы 4 (`004`):** выполните `database/migrations/004_rollback.sql` (удаляет Phase 4 RPC, `app_settings`, `exam_attempts`, возвращает триггер Phase 1; колонка `users.debt` сохраняется или удаляется вручную при необходимости) и переключите код на предыдущий релиз.
2. **Откат Фазы 3 (`003`):**
   ```sql
   DROP FUNCTION IF EXISTS public.check_lesson_access(BIGINT, INTEGER);
   DROP FUNCTION IF EXISTS public.check_rate_limit(TEXT, INTEGER, INTEGER);
   DROP TABLE IF EXISTS public.rate_limits;
   ```
3. **Откат Фазы 2 (`002`):** выполните `database/migrations/002_rollback.sql` (удаляет Stars RPC, триггер статусов, уникальный индекс; исторические строки `payments` и `transactions` сохраняются).
4. **Откат Фазы 1 (`001`):** крайне не рекомендуется отключать RLS на живой БД; при экстренном откате восстановите БД из pre-rollout snapshot шага 1, либо точечно скорректируйте политику без `DISABLE ROW LEVEL SECURITY`.
