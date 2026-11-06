from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "convert-platform"
    api_prefix: str = "/v1"
    database_url: str = "sqlite:///./data/app.db"
    redis_url: str = "redis://localhost:6379/0"
    data_dir: Path = Path("./data/storage")
    default_ttl_seconds: int = 3600
    max_upload_bytes: int = 200 * 1024 * 1024
    celery_task_always_eager: bool = False
    job_timeout_seconds: int = 120

    @property
    def sync_database_url(self) -> str:
        url = self.database_url
        if url.startswith("sqlite+aiosqlite"):
            return url.replace("sqlite+aiosqlite", "sqlite", 1)
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
