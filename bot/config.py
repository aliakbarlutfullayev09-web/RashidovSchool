from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    BOT_TOKEN: str
    DATABASE_URL: str
    GEMINI_API_KEY: str
    USER_APP_URL: str = 'https://user-app.vercel.app'
    ADMIN_APP_URL: str = 'https://admin-app.vercel.app'
    ADMIN_USERNAME: str = 'mynus_lab'
    REFERRAL_BONUS: int = 500
    STREAK_FREEZE_COST: int = 50
    PERFECT_SCORE_GIFT_PROBABILITY: float = 0.3

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

config = Settings()
