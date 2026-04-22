from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db, AsyncSessionLocal
from app.models.article import Article, ArticleCategory

router = APIRouter(prefix="/articles", tags=["articles"])


class ArticleOut(BaseModel):
    id: int
    title: str
    slug: str
    summary: str
    content: str
    category: str
    image_url: Optional[str]
    source_url: Optional[str]
    source_name: Optional[str]
    card_summary: Optional[str]
    related_stocks: Optional[str]
    view_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class ArticleListOut(BaseModel):
    id: int
    title: str
    slug: str
    summary: str
    category: str
    card_summary: Optional[str]
    image_url: Optional[str]
    source_name: Optional[str]
    sentiment: Optional[str]
    view_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedArticles(BaseModel):
    items: List[ArticleListOut]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("", response_model=PaginatedArticles)
async def list_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    category: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Article).where(Article.is_published == True)

    if category and category != "all":
        try:
            cat = ArticleCategory(category)
            query = query.where(Article.category == cat)
        except ValueError:
            pass

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar_one()

    query = query.order_by(Article.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return PaginatedArticles(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/latest", response_model=List[ArticleListOut])
async def get_latest_articles(
    limit: int = Query(10, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Article)
        .where(Article.is_published == True)
        .order_by(Article.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/today-hot", response_model=Optional[ArticleListOut])
async def get_today_hot_article(
    db: AsyncSession = Depends(get_db),
):
    """取得今日（台灣時間 UTC+8）瀏覽量最高的文章"""
    from datetime import timezone, timedelta
    tz_taipei = timezone(timedelta(hours=8))
    now_taipei = datetime.now(tz_taipei)
    today_start = now_taipei.replace(hour=0, minute=0, second=0, microsecond=0)
    # 轉換為 UTC 存入 DB 的起始時間（naive）
    today_start_utc = today_start.astimezone(timezone.utc).replace(tzinfo=None)

    result = await db.execute(
        select(Article)
        .where(
            Article.is_published == True,
            Article.created_at >= today_start_utc,
        )
        .order_by(Article.view_count.desc(), Article.created_at.desc())
        .limit(1)
    )
    article = result.scalar_one_or_none()
    return article

@router.get("/search", response_model=PaginatedArticles)
async def search_articles(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(9, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import or_
    keyword = f"%{q}%"
    query = select(Article).where(
        Article.is_published == True,
        or_(
            Article.title.ilike(keyword),
            Article.summary.ilike(keyword),
            Article.source_name.ilike(keyword),
        )
    )

    total_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_query)).scalar_one()

    query = query.order_by(Article.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return PaginatedArticles(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )

@router.get("/{slug}", response_model=ArticleOut)
async def get_article(slug: str, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Article).where(Article.slug == slug))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="文章不存在")

    background_tasks.add_task(_increment_view, slug)
    return article


async def _increment_view(slug: str):
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(Article).where(Article.slug == slug).values(view_count=Article.view_count + 1)
        )
        await db.commit()
