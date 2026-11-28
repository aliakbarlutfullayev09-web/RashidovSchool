from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    BOT_TOKEN: str
    DATABASE_URL: str
    GEMINI_API_KEY: str
    USER_APP_URL: str = 'https://user-app.vercel.app'
    ADMIN_APP_URL: str = 'https://admin-app.vercel.app'
    ADMIN_USERNAME: str = 'mynus_lab'
    REFERRAL_BONUS: int = 500
    STREAK_FREEZE_COST: int = 10000
    PERFECT_SCORE_GIFT_PROBABILITY: float = 0.3

    WEBHOOK_HOST: str = ''
    FASTAPI_PORT: int = 8000

    SUPABASE_URL: str = ''
    SUPABASE_JWT_SECRET: str = ''
    ALLOWED_ORIGINS: str = ''
    VIDEO_ALLOWED_HOSTS: str = ''
    AI_DAILY_LIMIT: int = 20
    AI_MINUTE_LIMIT: int = 5
    INIT_DATA_MAX_AGE_SECONDS: int = 3600
    SESSION_JWT_TTL_SECONDS: int = 3600

    @property
    def cors_origins(self) -> list[str]:
        origins = [
            o.strip().rstrip('/')
            for o in (self.ALLOWED_ORIGINS or '').split(',')
            if o.strip()
        ]
        for url in (self.USER_APP_URL, self.ADMIN_APP_URL):
            clean = (url or '').strip().rstrip('/')
            if clean and clean not in origins:
                origins.append(clean)
        return origins

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


config = Settings()
