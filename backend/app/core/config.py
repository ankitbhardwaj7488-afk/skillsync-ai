from functools import lru_cache
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "SkillSync AI"
    api_prefix: str = "/api/v1"
    secret_key: str = "change-me-in-production"
    access_token_minutes: int = 30
    refresh_token_days: int = 7
    database_url: str = "sqlite+aiosqlite:///./skillsync.db"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    frontend_url: str = "http://localhost:5173"
    max_resume_mb: int = 8
    secure_cookies: bool = False
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/oauth/google/callback"
    linkedin_client_id: str | None = None
    linkedin_client_secret: str | None = None
    linkedin_redirect_uri: str = "http://localhost:8000/api/v1/auth/oauth/linkedin/callback"
    linkedin_extra_scopes: str = ""
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    @field_validator("database_url")
    @classmethod
    def use_async_postgres_driver(cls, value: str) -> str:
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        if value.startswith("postgresql+psycopg2://"):
            return value.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
        sqlite_prefix = "sqlite+aiosqlite:///"
        if value.startswith(sqlite_prefix):
            db_path = value.removeprefix(sqlite_prefix)
            if db_path and db_path != ":memory:" and not Path(db_path).is_absolute():
                return f"{sqlite_prefix}{(BACKEND_DIR / db_path).resolve().as_posix()}"
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
