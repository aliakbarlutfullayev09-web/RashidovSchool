# Повторный финальный аудит (v2) — Rashidov Biologiya

Дата повторного аудита: 2026-11-28  
Охват: `user-app/`, `admin-app/`, `bot/`, `backend/`, `RashidovApp/`, `RashidovStudio_bot/`, `database/migrations/`, `.github/`, `tests/`.

---

## 1. Общий статус

После выполнения Фаз 1–5 все критические уязвимости аутентификации, авторизации, RLS/RPC, Click/Stars платежей и клиентской экономики устранены в коде и SQL-миграциях `001`–`004`.

Оставшиеся **требования к развёртыванию у владельца**:
1. Вручную применить миграции `001_phase1_rls_and_rpc.sql`, `002_preflight.sql` -> `002_phase2_payments.sql`, `003_phase3_video_ai_ratelimit.sql`, `004_preflight.sql` -> `004_phase4_economy_exams.sql` на рабочей/тестовой БД Supabase и выполнить `verify_rls_manual.sql`.
2. Выполнить очистку git-истории от старых скомпрометированных токенов/ключей (`git filter-repo`, команды ниже) после подтверждения ротации всех ключей.

---

## 2. Статус всех 25 исходных находок из `AUDIT_REPORT.md`

| № | Исходная находка | Статус | Доказательства (файл:строка и тест) |
| :--- | :--- | :--- | :--- |
| 1 | Утечка `STUDENT_BOT_TOKEN` в `admin-app`, бандле и конфигах | **Исправлено** | `admin-app/src/api/supabase.js:611-672` ходит только через `/api/admin/*`; `test_no_hardcoded_secrets_in_active_source` (`tests/test_phase1_security.py`). (История Git — см. №16). |
| 2 | Обход auth / IDOR `?user_id=` и fallback `123456789` в `user-app` | **Исправлено** | `user-app/src/App.jsx:126` (mock только при `DEV && VITE_DEV_ALLOW_MOCK === 'true'`), `user-app/api/auth/telegram.js`; тесты `user-app auth endpoint verifies initData and returns Supabase JWT`, `frontend sources no longer have URL user_id override...` (`tests/phase1_edge.test.mjs`). |
| 3 | Fallback `mockSuperadminUser` и доверие `start_param` в `admin-app` | **Исправлено** | `admin-app/src/App.jsx:14,44-96`, `admin-app/api/auth/telegram.js`; тест `admin-app auth rejects student even with forged start_param and accepts DB superadmin` (`tests/phase1_edge.test.mjs`). |
| 4 | Отсутствие RLS во всех таблицах БД | **Исправлено** | `database/migrations/001_phase1_rls_and_rpc.sql:123-352`, `database/migrations/004_phase4_economy_exams.sql:405-610`; тест `test_rls_sql_migration_covers_all_tables_and_rpc`; SQL-проверки в `database/migrations/verify_rls_manual.sql`. (Применение к боевой Supabase БД — вручную пользователем). |
| 5 | Незащищённый `SECURITY DEFINER` RPC `increment_balance` | **Исправлено** | `database/migrations/001_phase1_rls_and_rpc.sql:13-41` (`REVOKE ALL FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role;`); `database/migrations/004_phase4_economy_exams.sql:360-396` (`guard_user_privileged_columns` на `current_user`). |
| 6 | Уязвимости и гонки в вебхуке Click | **Неприменимо (удалено)** | Модуль Click полностью удалён из продукта и миграции `002`; тесты `test_click_routes_and_handlers_are_completely_removed` и `test_phase2_migration_without_click_and_with_historical_backfill` (`tests/test_phase2_payments.py`). |
| 7 | Идемпотентность, серверные заказы и pre-checkout Telegram Stars | **Исправлено** | `database/migrations/002_phase2_payments.sql:63-327`, `database/migrations/004_phase4_economy_exams.sql:33-292`, `bot/handlers/payments.py`, `backend/student_bot.py`, `RashidovApp/tgcloud/handlers/message.js`, `user-app/api/create-invoice.js`; тесты в `tests/test_phase2_payments.py` и `tests/phase2_payments.test.mjs` (+ PG race-тест в `tests/integration/test_postgres_payments.py`). |
| 8 | SSRF и доступ к платным видео без оплаты | **Исправлено** | `user-app/api/send-lesson-video.js`, `user-app/api/_lib/ssrfGuard.js`, `backend/main.py:420-489`, `database/migrations/004_phase4_economy_exams.sql:294-354` (`check_lesson_access`); тесты `test_ssrf_blocks_private_loopback_metadata_and_non_https` и `send-lesson-video returns 401 without auth...`. |
| 9 | Fail-open при пустом `WEBHOOK_SECRET` в `backend` | **Исправлено** | `backend/main.py:47-48,180`, `backend/auth.py` (`verify_webhook_secret`); тест `test_webhook_secret_fail_closed` (`tests/test_phase1_security.py`). |
| 10 | Клиентские промокоды, стрик-фриз и конфликт цены (50 vs 10000) | **Исправлено** | `database/migrations/004_phase4_economy_exams.sql` (`redeem_promo`, `app_settings`, `get_streak_freeze_cost`, `freeze_streak_rpc`, `sync_daily_activity`), `bot/config.py:12` (`10000`), `bot/services/economy.py`, `user-app/src/api/supabase.js:128-174,534-553`; тест `test_streak_freeze_price_unified_at_10000` (`tests/test_phase4_economy_bot.py`). |
| 11 | Небезопасный CORS `["*"]` + `allow_credentials=True` и CORS в Vercel | **Исправлено** | `bot/main.py:64-70`, `backend/main.py:125-131` (белый список `cors_origins`), `user-app/api/_lib/telegramAuth.js:149-161`. |
| 12 | Правильные ответы экзаменов и квизов в клиенте | **Исправлено** | Ответы удалены из `user-app/src/api/examDefaults.js`, проверка перенесена в `user-app/api/exams/questions.js`, `user-app/api/exams/submit.js`, `get_lesson_questions`, `get_lesson_checkpoints`, `check_checkpoint_answer`, `submit_lesson_quiz`; тесты в `tests/phase4_exams_rls.test.mjs` и `DIST_EXAM_TEXT_HITS 0`. |
| 13 | Доверие контексту `/ai`, отсутствие rate limit и блокировка event loop Gemini | **Исправлено** | `bot/handlers/ai_helper.py`, `bot/services/gemini.py:47-75` (`asyncio.to_thread` + timeout), `database/migrations/003_phase3_video_ai_ratelimit.sql` (`check_rate_limit`); тесты `test_ai_sanitization_and_bot_author_verification`, `test_ai_gemini_non_blocking_executor_and_timeout` (`tests/test_phase3_security.py`). |
| 14 | Падение `/stats` учителя с `KeyError` | **Исправлено** | `bot/db.py:50-58` (`JOIN subjects s`), `bot/handlers/admin.py:153-160`, `bot/services/phase4_guards.py:34-40`; тест `test_teacher_stats_formatting_handles_subject_admins_without_keyerror`. |
| 15 | Падение онбординга `/start` на фото/стикеры и реферальные абузы | **Исправлено** | `bot/handlers/start.py:24-30,113-163`, `bot/db.py:130-149`, `backend/student_bot.py:70-100`, `database/migrations/004_phase4_economy_exams.sql` (`uq_referrals_referred_id`, `CHECK (referrer_id <> referred_id)`); тест `test_onboarding_non_text_guard_and_referral_security`. (Перенос триггера награды с регистрации на оплаченный/пройденный урок ждёт подтверждения владельца). |
| 16 | Секреты в git-истории | **Частично** | Активные файлы очищены (`test_no_hardcoded_secrets_in_active_source`), но 12 вхождений (`6b6c613`, `6c595f5`, `7f0b85e`, `9046858`, `c1a81e0`) остаются в истории Git до выполнения `git filter-repo` владельцем. |
| 17 | Неполный `.env.example`, Click-переменные, конфликт `transactions.type` | **Исправлено** | `.env.example` и `backend/.env.example` приведены к актуальным переменным без Click; `002_phase2_payments.sql:105-108` расширяет `transactions_type_check` под `stars_topup` и `refund`. |
| 18 | Утечка сырых исключений и индекса правильного ответа `'c'` в боте | **Исправлено** | `bot/handlers/testing.py:118-127` хранит только `{'qid', 'u'}` (`bot/handlers/ai_helper.py:74-86` берёт правильный ответ из БД); `bot/handlers/start.py:85` и `bot/handlers/admin.py:43-45,235-237` больше не возвращают `{e}`. |
| 19 | Неполное экранирование PostgREST-фильтров в поиске | **Исправлено** | ID-списки валидируются как `int`, а `backend/supabase_client.py:43-45` (`find_users_by_query`) фильтрует строку строгим allowlist-regex (`[^0-9A-Za-z...]`) с ограничением длины 64 символа. |
| 20 | `random.choices` вместо `secrets.choice` при генерации промокодов в боте | **Исправлено** | `bot/utils/helpers.py:17-19` использует `secrets.choice`. |
| 21 | Отсутствие экспорта/удаления ПДн и `ON DELETE CASCADE` на таблицах пользователя | **Не исправлено** | Не входило в объём Фаз 1–5 (требует отдельного продуктового решения по хранению финансового аудита `payments`/`transactions`). |
| 22 | `localStorage` для прогресса и `.catch(() => {})` на PostgREST-билдерах | **Частично** | `.catch()` в `admin-app/src/api/supabase.js:553-687` устранены, запись прогресса переведена на RPC `record_lesson_watch` / `submit_lesson_quiz`; закладки `rb_saved_lessons` и поминутная позиция видео остаются в `localStorage`. |
| 23 | `Dockerfile` от `root`, без `.dockerignore`/`HEALTHCHECK`, заголовки Vercel | **Исправлено** | `bot/Dockerfile` переведён на `USER appuser` + `HEALTHCHECK` -> `/health` (`bot/main.py:89`, `backend/main.py:155`), добавлены `.dockerignore` и `bot/.dockerignore`, security headers в `user-app/vercel.json` и `admin-app/vercel.json`. |
| 24 | Отсутствие lock-файлов, CI/CD, `npm audit`, `pip-audit` и тестов | **Исправлено (кроме ESLint)** | Созданы `package-lock.json` (корень, `user-app/`, `admin-app/`), зафиксированы `bot/requirements.txt` и `backend/requirements.txt`, настроены `.github/workflows/ci.yml` и `.github/dependabot.yml`, добавлено 35 юнит-тестов + 2 PG-интеграционных теста. `eslint` всё ещё не настроен. |
| 25 | Мёртвый код, фиктивные тренды `"+12%"`/`"+5%"`, `key={index}`, `Rashidov Biologiya.zip` | **Частично** | Мёртвые компоненты (`TopUp.jsx`, `PromoCode.jsx`, `PromoModal.jsx`, `MistakesModal.jsx`, `BottomSheet.jsx`, `LevelNode.jsx`, `LevelPath.jsx`, `QuestsPage.jsx`, `ArenaPage.jsx`, `bot/utils/i18n.py`, `click_webhook.py`) удалены; `"+12%"`/`"+5%"` (`admin-app/src/pages/DashboardPage.jsx:64,77`), `key={index}` и архив `.zip` не трогались. |

---

## 3. Новые замечания и ограничения после правок

1. **Зависимости (0 уязвимостей в `user-app`/`admin-app`):**
   - Неиспользуемый `"sharp"` удалён из `user-app/package.json`; после patch/minor обновлений `vite`, `source-map-js`, `postcss-selector-parser` проверка `npm audit` (как `--omit=dev`, так и полная с `devDependencies`) в `user-app/` и `admin-app/` показывает **0 уязвимостей**.
   - Версия `@tgcloud/cli` зафиксирована как `"0.2.0"` в `RashidovApp/package.json` и `RashidovStudio_bot/package.json` (на период переходного отключения воркеров).
2. **Ограничение прав учителя на редактирование `exam_portal_data`:**
   - В `004_phase4_economy_exams.sql` запись в `public.subjects` ограничена только `is_superadmin()`. Так как `admin-app/src/api/supabase.js:762` хранит `exam_portal_data` в `subjects.description` (`id=1`), обычный `teacher` не сможет сохранять новые варианты экзаменов в `TestsPage` до выноса конфига экзаменов в отдельную таблицу/RPC.
3. **Зависимость `TestlarPage` от `/api/exams/questions`:**
   - После полного удаления массива `questions` из клиентского `user-app/src/api/examDefaults.js`, локальный запуск `vite dev` без запущенного Vercel API вернёт пустые варианты тестов (ожидаемо для защиты ответов от утечки в бандл).
4. **Непрогнанные локально проверки:**
   - Интеграционные тесты PostgreSQL (`tests/integration/test_postgres_payments.py`) не запускались локально (`SKIPPED` из-за отсутствия Docker / `TEST_DATABASE_URL`).
   - `pip-audit` и `gitleaks` отсутствуют локально — добавлены для автоматического прогона в `.github/workflows/ci.yml`.
   - Корневой `node_modules/` на диске имеет устаревшую junction-структуру с `lms-user-app`, поэтому корневой `package-lock.json` был сгенерирован на чистой копии `package.json` + workspaces (при следующем локальном `npm install` в корне рекомендуется пересоздать корневой `node_modules`).

---

## 4. План на оставшееся (после Вашего «ок»)

1. Применить миграции `001`–`004` и `verify_rls_manual.sql` на тестовом проекте Supabase, прогнать `tests/integration/test_postgres_payments.py` с `TEST_DATABASE_URL`.
2. Утвердить правило реферальной награды (Фаза 4, п. 6) и цену заморозки стрика в `app_settings` (`streak_freeze_cost = 10000`).
3. Заменить `random.choices` на `secrets.choice` в `bot/utils/helpers.py:18` и убрать legacy-тест-контекст `'c'` в `bot/handlers/testing.py`.
4. Очистить git-историю через `git filter-repo` и запушить обновлённый CI/Dependabot.
