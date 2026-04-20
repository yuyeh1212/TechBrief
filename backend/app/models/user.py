from sqlalchemy import String, DateTime, Enum, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from app.core.database import Base
import enum


class UserPlan(str, enum.Enum):
    FREE = "free"
    MINI = "mini"
    PRO = "pro"
    MAX = "max"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    google_id: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    picture: Mapped[str] = mapped_column(String(500), nullable=True)
    plan: Mapped[UserPlan] = mapped_column(Enum(UserPlan), default=UserPlan.FREE, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    plan_expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
