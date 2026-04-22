from sqlalchemy import String, Text, DateTime, Date, Integer
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone, date
from app.core.database import Base


class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    week_start: Mapped[date] = mapped_column(Date, nullable=False, unique=True)  # 該週一日期
    market_overview: Mapped[str] = mapped_column(Text, nullable=False)           # 本週市場總覽
    picks: Mapped[str] = mapped_column(Text, nullable=False)                      # JSON 字串，看好標的清單
    disclaimer: Mapped[str] = mapped_column(Text, nullable=True)                  # 免責聲明
    article_count: Mapped[int] = mapped_column(Integer, default=0)               # 本週正面財經文章數
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
