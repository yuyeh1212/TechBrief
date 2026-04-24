from sqlalchemy import String, DateTime, Integer, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from app.core.database import Base


class StockQueryLog(Base):
    __tablename__ = "stock_query_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    was_cached: Mapped[bool] = mapped_column(Boolean, default=False)  # 是否快取命中
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
