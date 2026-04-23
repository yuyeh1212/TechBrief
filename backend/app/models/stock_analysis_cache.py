from sqlalchemy import String, Text, DateTime, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from app.core.database import Base


class StockAnalysisCache(Base):
    __tablename__ = "stock_analysis_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(200), nullable=True)
    sentiment: Mapped[str] = mapped_column(String(20), nullable=True)
    sentiment_label: Mapped[str] = mapped_column(String(20), nullable=True)
    overview: Mapped[str] = mapped_column(Text, nullable=True)
    key_points: Mapped[str] = mapped_column(Text, nullable=True)   # JSON 字串
    conclusion: Mapped[str] = mapped_column(Text, nullable=True)
    has_articles: Mapped[bool] = mapped_column(Boolean, default=False)
    related_articles: Mapped[str] = mapped_column(Text, nullable=True)  # JSON 字串
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
