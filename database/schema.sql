-- Tables:
CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    role VARCHAR DEFAULT 'student' CHECK(role IN ('student','teacher','superadmin')),
    full_name VARCHAR,
    class_group VARCHAR,
    balance INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    last_active_date DATE,
    language VARCHAR(2) DEFAULT 'ru' CHECK(language IN ('ru','uz')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT
);

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
    test_question_count INTEGER DEFAULT NULL,  -- сколько вопросов дать ученику (NULL = все)
    order_index INTEGER DEFAULT 0
);

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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_progress_user_id ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson_id ON progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_lesson_id ON questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject_id ON courses(subject_id);
