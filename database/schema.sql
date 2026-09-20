-- Tables:
CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    role VARCHAR DEFAULT 'student' CHECK(role IN ('student','teacher','superadmin')),
    full_name VARCHAR,
    class_group VARCHAR,
    balance INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_active_date DATE,
    language VARCHAR(2) DEFAULT 'uz' CHECK(language IN ('ru','uz')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    xp INTEGER DEFAULT 0
);

-- Add to existing users table:
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    name_uz TEXT,
    name_ru TEXT,
    icon TEXT DEFAULT '📚',
    channel_username TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Add columns to subjects:
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS name_uz TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS name_ru TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT '📚';
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS channel_username TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS subject_admins (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(telegram_id),
    subject_id INTEGER REFERENCES subjects(id),
    permissions JSONB DEFAULT '{"can_promo": false, "can_gift": false, "can_send": false}',
    UNIQUE(user_id, subject_id)
);

CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id),
    title VARCHAR NOT NULL,
    price INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR NOT NULL,
    video_url TEXT,
    test_question_count INTEGER DEFAULT NULL,
    order_index INTEGER DEFAULT 0,
    thumbnail_url TEXT,
    duration TEXT,
    is_free BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0
);

-- Add columns to lessons:
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option_index INTEGER NOT NULL CHECK(correct_option_index BETWEEN 0 AND 3),
    time_limit INTEGER DEFAULT 30
);

CREATE TABLE IF NOT EXISTS progress (
    user_id BIGINT REFERENCES users(telegram_id),
    lesson_id INTEGER REFERENCES lessons(id),
    stars INTEGER DEFAULT 0 CHECK(stars BETWEEN 0 AND 3),
    is_unlocked BOOLEAN DEFAULT FALSE,
    PRIMARY KEY(user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(telegram_id),
    amount INTEGER NOT NULL,
    type VARCHAR CHECK(type IN ('topup','spend','gift','promo','referral')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR UNIQUE NOT NULL,
    bonus_amount INTEGER NOT NULL,
    max_uses INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    created_by BIGINT REFERENCES users(telegram_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_uses (
    id SERIAL PRIMARY KEY,
    promo_id INTEGER REFERENCES promo_codes(id),
    user_id BIGINT REFERENCES users(telegram_id),
    used_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(promo_id, user_id)
);

CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_id BIGINT REFERENCES users(telegram_id),
    referred_id BIGINT REFERENCES users(telegram_id) UNIQUE,
    bonus_given BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
    trigger_time_sec INTEGER NOT NULL,
    rewind_time_sec INTEGER NOT NULL,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_option INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(telegram_id),
    merchant_trans_id TEXT UNIQUE,
    click_trans_id BIGINT,
    amount NUMERIC,
    xp_credited INTEGER,
    status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS duel_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player1_id BIGINT REFERENCES users(telegram_id),
    player2_id BIGINT REFERENCES users(telegram_id),
    status VARCHAR,
    scores JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_quests (
    id SERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(telegram_id),
    quest_type VARCHAR NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    xp_reward INTEGER NOT NULL,
    quest_date DATE DEFAULT CURRENT_DATE,
    UNIQUE(user_id, quest_type, quest_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_lesson_id ON questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject_id ON courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_video_checkpoints_lesson_id ON video_checkpoints(lesson_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_duel_rooms_players ON duel_rooms(player1_id, player2_id);
CREATE INDEX IF NOT EXISTS idx_daily_quests_user_date ON daily_quests(user_id, quest_date);
