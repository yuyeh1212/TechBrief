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

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 168  # 7 天

    # Scheduler
    NEWS_FETCH_HOUR: int = 10
    NEWS_FETCH_MINUTE: int = 0
    ARTICLES_PER_RUN: int = 10

    # ECPay 綠界金流（測試環境預設值）
    ECPAY_MERCHANT_ID: str = "2000132"
    ECPAY_HASH_KEY: str = "5294y06JbISpM5x9"
    ECPAY_HASH_IV: str = "v77hoKGq4kWxNNIS"
    ECPAY_API_URL: str = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5"
    # 正式環境改為: https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5
    FRONTEND_URL: str = "https://techbrief.zeabur.app"
    BACKEND_URL: str = "https://api-techbrief.zeabur.app"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()