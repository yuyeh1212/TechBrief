from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "TechBrief API"
    DEBUG: bool = False
    CORS_ORIGINS: str = "http://localhost:5173"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return v
        return v

    # Database
    DATABASE_URL: str

    # OpenRouter
    OPENROUTER_API_KEY: str
    OPENROUTER_MODEL: str = "google/gemini-2.5-pro-preview"
    OPENROUTER_FLASH_MODEL: str = "google/gemini-2.0-flash-lite-001"

    # Resend
    RESEND_API_KEY: str
    RESEND_FROM_EMAIL: str = "noreply@techbrief.tw"

    # LINE
    LINE_CHANNEL_ACCESS_TOKEN: str
    LINE_CHANNEL_SECRET: str

    # Unsplash
    UNSPLASH_ACCESS_KEY: str = ""

    # Scheduler
    NEWS_FETCH_HOUR: int = 10
    NEWS_FETCH_MINUTE: int = 0
    ARTICLES_PER_RUN: int = 10

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()