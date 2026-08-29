# 🚀 Инструкция по деплою

## Содержание
1. [Подготовка](#подготовка)
2. [Деплой бота на Railway](#деплой-бота-на-railway)
3. [Деплой Mini Apps на Vercel](#деплой-mini-apps-на-vercel)
4. [Настройка бота в BotFather](#настройка-бота-в-botfather)
5. [Настройка Supabase](#настройка-supabase)

---

## Подготовка

Перед деплоем вам нужны:

| Сервис | Что нужно | Где получить |
|--------|-----------|-------------|
| Telegram | BOT_TOKEN | [@BotFather](https://t.me/BotFather) → `/newbot` |
| Supabase | URL + Keys | [supabase.com](https://supabase.com) → New Project |
| Gemini | API_KEY | [aistudio.google.com](https://aistudio.google.com/apikey) |
| Railway | Аккаунт | [railway.app](https://railway.app) |
| Vercel | Аккаунт | [vercel.com](https://vercel.com) |
| GitHub | Репозиторий | [github.com](https://github.com) |

---

## Деплой бота на Railway

### Шаг 1: Загрузить код на GitHub

```bash
cd "Rashidov Biologiya"
git init
git add .
git commit -m "Initial commit: LMS Platform"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Шаг 2: Создать проект в Railway

1. Зайдите на [railway.app](https://railway.app) и войдите через GitHub
2. Нажмите **"New Project"** → **"Deploy from GitHub repo"**
3. Выберите ваш репозиторий
4. Railway предложит настроить сервис:
   - **Root Directory**: `bot` (важно! указать папку бота)
   - Railway автоматически найдёт `Dockerfile`

### Шаг 3: Настроить переменные окружения

В Railway зайдите в ваш сервис → вкладка **"Variables"** → добавьте:

```
BOT_TOKEN=7123456789:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
USER_APP_URL=https://lms-user-app.vercel.app
ADMIN_APP_URL=https://lms-admin-app.vercel.app
ADMIN_USERNAME=mynus_lab
```

> ⚠️ **DATABASE_URL** берётся из Supabase → Settings → Database → Connection string (URI). 
> Используйте **Transaction pooler** строку (порт 6543) для лучшей производительности.

### Шаг 4: Деплой

- Railway автоматически задеплоит после добавления переменных
- Проверьте логи во вкладке **"Deployments"** — должно появиться `INFO:aiogram:Start polling`
- Если ошибка — проверьте логи, часто проблема в неверных credentials

### Шаг 5: Проверить бота

Откройте Telegram → найдите бота → отправьте `/start`

---

## Деплой Mini Apps на Vercel

### User App

#### Шаг 1: Деплой через Vercel CLI

```bash
cd user-app
npm install     # установить зависимости
npm run build   # проверить сборку

# Деплой
npx vercel --prod
```

Vercel спросит:
- **Set up and deploy?** → `Y`
- **Scope** → ваш аккаунт
- **Link to existing project?** → `N`
- **Project name** → `lms-user-app` (или ваше название)
- **Directory** → `./`
- **Override settings?** → `N`

#### Шаг 2: Настроить переменные окружения

В [vercel.com](https://vercel.com) → ваш проект → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

Нажмите **"Redeploy"** после добавления переменных.

#### Шаг 3: Запомнить URL

После деплоя Vercel даст URL вроде: `https://lms-user-app.vercel.app`
Этот URL нужно вставить в `USER_APP_URL` в Railway.

---

### Admin App (то же самое)

```bash
cd admin-app
npm install
npm run build
npx vercel --prod
```

Те же переменные окружения:
```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

URL → вставить в `ADMIN_APP_URL` в Railway.

---

### Альтернативный способ: через GitHub

1. Подключите GitHub репозиторий к Vercel
2. Vercel → **"Add New" → "Project" → Import Git Repository**
3. Укажите **Root Directory**: `user-app` (или `admin-app`)
4. **Framework Preset**: Vite
5. Добавьте Environment Variables
6. Нажмите **"Deploy"**

> 💡 При каждом `git push` Vercel автоматически пересоберёт приложение.

---

## Настройка бота в BotFather

Откройте [@BotFather](https://t.me/BotFather) и выполните:

### 1. Подключить Menu Button (Mini App)

```
/mybots → Выберите бота → Bot Settings → Menu Button
```
- **Menu Button URL**: `https://lms-user-app.vercel.app`
- **Menu Button Text**: `🚀 Платформа`

### 2. Настроить описание

```
/setdescription
```
Текст:
```
🎓 Образовательная платформа
📚 Видеоуроки + тесты по биологии
🧠 Зарабатывай Нейроны за учёбу!
```

### 3. Настроить команды

```
/setcommands
```
```
start - Начать / Открыть платформу
admin - Панель управления (для учителей)
```

---

## Настройка Supabase

### Шаг 1: Создать проект

1. [supabase.com](https://supabase.com) → **"New Project"**
2. Введите название, пароль базы, регион (EU для СНГ)

### Шаг 2: Выполнить SQL-схему

1. Supabase Dashboard → **SQL Editor**
2. Скопируйте содержимое `database/schema.sql`
3. Нажмите **"Run"**

### Шаг 3: Получить credentials

В Dashboard → **Settings → API**:
- **URL** → это ваш `VITE_SUPABASE_URL`
- **anon public key** → это ваш `VITE_SUPABASE_ANON_KEY`

В Dashboard → **Settings → Database → Connection string**:
- **URI** → это ваш `DATABASE_URL` для Railway

### Шаг 4: Создать первого суперадмина

В **SQL Editor** выполните:

```sql
-- Замените 123456789 на ваш Telegram ID
UPDATE users SET role = 'superadmin' WHERE telegram_id = 123456789;
```

> 💡 Сначала зарегистрируйтесь через бота (`/start`), потом измените роль через SQL.

---

## Финальная проверка

| Шаг | Действие | Ожидание |
|-----|----------|----------|
| 1 | `/start` в боте | Выбор языка → Регистрация |
| 2 | Нажать "🚀 Открыть платформу" | Открывается User Mini App |
| 3 | Изменить роль на superadmin | `UPDATE users SET role = 'superadmin' ...` |
| 4 | `/admin` в боте | Кнопка "⚙️ Панель управления" |
| 5 | Открыть Admin App | Дашборд с полной статистикой |
| 6 | Добавить курс → урок → тест | Конструктор работает |
| 7 | Пройти тест как ученик | Бот присылает вопросы, считает звёзды |

---

## Обновление после изменений

### Бот (Railway)
```bash
git add .
git commit -m "fix: ..."
git push origin main
```
Railway автоматически пересоберёт и задеплоит.

### Mini Apps (Vercel)
```bash
git push origin main
```
Vercel автоматически пересоберёт.

### Или ручной деплой:
```bash
cd user-app && npx vercel --prod
cd admin-app && npx vercel --prod
```
