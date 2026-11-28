# Инструкции по проверке RLS, плану по `tgcloud` и ручной проверке платежей (Фазы 1–2)

## 1. Ручная проверка RLS на тестовой БД Supabase

1. Сначала примените миграцию [database/migrations/001_phase1_rls_and_rpc.sql](file:///c:/Users/hp/OneDrive/%D0%A0%D0%B0%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D0%BE%D0%BB/downloads/Rashidov%20Biologiya/database/migrations/001_phase1_rls_and_rpc.sql) в SQL Editor тестового проекта Supabase.
2. Запустите готовый проверочный SQL-скрипт [database/migrations/verify_rls_manual.sql](file:///c:/Users/hp/OneDrive/%D0%A0%D0%B0%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D0%BE%D0%BB/downloads/Rashidov%20Biologiya/database/migrations/verify_rls_manual.sql) (обёрнут в `BEGIN ... ROLLBACK`, не оставляет тестовых записей).
3. Ожидаемые результаты:
   - Под ролью `anon` (`SET LOCAL ROLE anon`): `SELECT count(*)` из `users`, `transactions`, `payments`, `bot_states` возвращает `0`.
   - Под ролью `authenticated` от лица студента A (`telegram_id = 990000111`):
     - свой профиль в `users` — `1` строка;
     - строки студента B (`990000222`) в `users`, `transactions`, `payments` — `0`;
     - `UPDATE public.users ... WHERE telegram_id = 990000222` — `UPDATE 0`.
   - При раскомментировании запрещённых операций:
     - `UPDATE public.users SET role = 'superadmin'` — исключение `Forbidden: cannot modify privileged user columns`;
     - `INSERT INTO public.payments` или `transactions (type = 'topup')` — нарушение RLS (`new row violates row-level security policy`);
     - `SELECT public.increment_balance(...)` — `permission denied for function increment_balance`.

---

## 2. План по `tgcloud`-воркерам (`RashidovApp/` и `RashidovStudio_bot/`)

### Что фактически известно о среде `@tgcloud/cli`
По локальным манифестам платформы ([RashidovApp/.tgcloud/capabilities.json](file:///c:/Users/hp/OneDrive/%D0%A0%D0%B0%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D0%BE%D0%BB/downloads/Rashidov%20Biologiya/RashidovApp/.tgcloud/capabilities.json)):
- В V8-изоляте доступны только `sdk` (`db`, `api`, `fetch`, `console`) и локальные модули внутри `tgcloud/`.
- В проверенных командах `@tgcloud/cli` (`add`, `deploy`, `diff`, `fetch`, `init`, `login`, `migrate`, `pull`, `reset`, `run`, `status`, `upgrade`, `webhook`) нет CLI-команд управления секретами или `.env`.

### Варианты решения
- **Вариант A (рекомендуемый — перенос логики в `backend/`):**
  - Модули [backend/student_bot.py](file:///c:/Users/hp/OneDrive/%D0%A0%D0%B0%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D0%BE%D0%BB/downloads/Rashidov%20Biologiya/backend/student_bot.py) и [backend/admin_bot.py](file:///c:/Users/hp/OneDrive/%D0%A0%D0%B0%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D0%BE%D0%BB/downloads/Rashidov%20Biologiya/backend/admin_bot.py) уже повторяют команды `RashidovApp/` (`/start`, `/lang`, `/support`, Stars, `video_*`) и `RashidovStudio_bot/` (`/start`, `/user`, `/gift`, `/send`, `/help`, `quick_gift`, `broadcast`) и работают в обычном Python-окружении с полноценными переменными окружения.
  - Пошаговый перенос:
    1. Развернуть `backend/` на хостинге (Railway/VPS) с заданными env-переменными (`STUDENT_BOT_TOKEN`, `ADMIN_BOT_TOKEN`, `WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`).
    2. Проверить перенос rich-виджетов (`RashidovApp/tgcloud/lib/widgets.js` -> уже есть аналоги в `backend/widgets.py`) и переключить Telegram webhook обоих ботов на `/webhook/student` и `/webhook/admin` через `backend/setup_webhooks.py`.
    3. После переключения трафика архивировать/отключить `RashidovApp/` и `RashidovStudio_bot/`.
- **Вариант B (если нужно оставить `tgcloud`-воркеры активными):**
  - В `RashidovStudio_bot/` вынести операции с `STUDENT_BOT_TOKEN` и `SUPABASE_SERVICE_ROLE_KEY` на защищённый серверный шлюз в `backend/`, чтобы `tgcloud`-код не хранил токен студенческого бота или `service_role`-ключ в открытом исходнике.

### Что нужно уточнить у вас перед удалением/переносом `tgcloud`
1. Есть ли в веб-кабинете платформы `tgcloud` (вне CLI) отдельный раздел переменных окружения / секретов, который пробрасывается в `globalThis.process.env`?
2. На какой домен сейчас фактически направлены Telegram webhook'и обоих ботов (на `tgcloud.ai` или уже на Python `backend/`)?

---

## 3. Что проверить вручную в тестовых кабинетах Click и Telegram (после Фазы 2)

### Тестовый кабинет Click Merchant
1. Включён **тестовый режим** Click (и используются только тестовые `CLICK_MERCHANT_ID`, `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY`).
2. Callback URL Prepare/Complete указывает на ваш HTTPS-эндпоинт `/api/payments/click` (оба URL должны отдавать `200 OK` JSON с кодами Click API `error` / `error_note`).
3. Провести тестовый прогон оплаты:
   - Успешная оплата: в таблице `payments` статус `pending` -> `paid`, `merchant_prepare_id` заполнен, `click_trans_id` уникален, баланс пользователя увеличен на `xp_credited`, в `transactions` 1 запись `topup`.
   - Повторный Complete с тем же `click_trans_id`: Click получает `error = -4` (`Already paid`), баланс второй раз не увеличивается.
   - Отмена платежа (входной `error < 0` от Click на шаге Complete): статус `payments` -> `cancelled`, баланс не меняется.

### Telegram Stars (тестовый режим / минимальный тестовый пакет)
1. Применить миграцию [database/migrations/002_phase2_payments.sql](file:///c:/Users/hp/OneDrive/%D0%A0%D0%B0%D0%B1%D0%BE%D1%87%D0%B8%D0%B9%20%D1%81%D1%82%D0%BE%D0%BB/downloads/Rashidov%20Biologiya/database/migrations/002_phase2_payments.sql) на тестовую БД.
2. Проверить в Mini App под авторизованной сессией (`Authorization: Bearer <jwt>`):
   - Создание счёта передаёт на сервер только `{ productId: "stars_5" }`, сервер создаёт запись `payments` со статусом `pending` и `payload = merchant_trans_id`.
   - `pre_checkout_query` отвечает в пределах < 10 секунд; при несовпадении пользователя/суммы/статуса отклоняет оплату (`ok=False`).
   - После тестовой оплаты `successful_payment` зачисляет нейроны 1 раз и записывает `telegram_payment_charge_id`.
   - При возврате (`refundStarPayment` / `refunded_payment`) статус переходит в `refunded`, нейроны списываются обратно, в `transactions` пишется `refund`.
