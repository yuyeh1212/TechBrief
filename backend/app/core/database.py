from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text
from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=settings.DEBUG, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    from app.models import article, subscriber  # noqa: F401
    async with engine.begin() as conn:
        # create_all 不會刪除已存在的表，只建立新的
        await conn.run_sync(Base.metadata.create_all)
        # 新欄位用 ALTER 方式加，不影響現有資料
        await conn.execute(text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS card_summary TEXT"))
        await conn.execute(text("ALTER TABLE articles ADD COLUMN IF NOT EXISTS related_stocks VARCHAR(500)"))
        # youtube_processed 建在正確的 DB
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS youtube_processed (
                video_id VARCHAR(20) PRIMARY KEY,
                processed_at TIMESTAMP DEFAULT NOW()
            )
        """))