from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    STUDENT_BOT_TOKEN: str
    ADMIN_BOT_TOKEN: str
    WEBHOOK_SECRET: str
    BASE_WEBHOOK_URL: str = ""

    SUPABASE_URL: str
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    STUDENT_WEBAPP_URL: str
    ADMIN_WEBAPP_URL: str
    ALLOWED_ORIGINS: str = ""
    VIDEO_ALLOWED_HOSTS: str = ""
    INIT_DATA_MAX_AGE_SECONDS: int = 3600
    SESSION_JWT_TTL_SECONDS: int = 3600

    @property
    def supabase_server_key(self) -> str:
        return self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_KEY

    @property
    def jwt_signing_secret(self) -> str:
        return self.SUPABASE_JWT_SECRET or self.WEBHOOK_SECRET

    @property
    def cors_origins(self) -> list[str]:
        origins = [
            o.strip().rstrip("/")
            for o in (self.ALLOWED_ORIGINS or "").split(",")
            if o.strip()
        ]
        for url in (self.STUDENT_WEBAPP_URL, self.ADMIN_WEBAPP_URL):
            clean = (url or "").strip().rstrip("/")
            if clean and clean not in origins:
                origins.append(clean)
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
