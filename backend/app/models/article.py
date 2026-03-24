from sqlalchemy import String, Text, DateTime, Enum, Boolean, Integer
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from app.core.database import Base
import enum


class ArticleCategory(str, enum.Enum):
    AI = "ai"
    GPT = "gpt"
    GEMINI = "gemini"
    CLAUDE = "claude"
    TECH = "tech"
    COLLABORATION = "collaboration"


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    slug: Mapped[str] = mapped_column(String(600), unique=True, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[ArticleCategory] = mapped_column(Enum(ArticleCategory), nullable=False)
    image_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    source_url: Mapped[str] = mapped_column(String(1000), nullable=True)
    source_name: Mapped[str] = mapped_column(String(200), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    view_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
