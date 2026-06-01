from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Badminton Fund API"
    database_url: str = "postgresql+psycopg://badminton:badminton@localhost:5433/badminton_fund"
    backend_cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    jwt_secret_key: str = "change-me-in-local-env"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    low_balance_threshold: int = 50000
    money_rounding_unit: int = 1000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
