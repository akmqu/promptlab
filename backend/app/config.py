from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "PromptLab API"
    database_url: str = "sqlite:///./promptlab.db"
    secret_key: str = "dev-only-change-me-promptlab-secret"
    session_cookie_name: str = "promptlab_session"
    session_max_age_seconds: int = 60 * 60 * 24 * 14
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.8-flash"
    max_prompt_length: int = 2000
    ai_timeout_seconds: float = 45.0

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
