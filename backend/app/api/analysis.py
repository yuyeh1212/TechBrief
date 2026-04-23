import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserPlan
from app.models.article import Article
from app.models.stock_analysis_cache import StockAnalysisCache
from app.services.ai_service import generate_stock_analysis

router = APIRouter(prefix="/analysis", tags=["analysis"])

CACHE_TTL_HOURS_WITH_ARTICLES = 24   # 有 DB 文章支撐 → 每天刷新
CACHE_TTL_HOURS_NO_ARTICLES  = 168  # 無 DB 文章（純 AI 知識）→ 7 天刷新


@router.get("/stock")
async def get_stock_analysis(
    ticker: str = Query(..., min_length=1, max_length=20, description="股票代號，例如 NVDA 或 2330.TW"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI 個股簡評（Pro 以上方案限定，結果快取 24 小時）"""
    from app.core.config import settings
    admin_emails = [e.strip() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]
    is_admin = current_user.email in admin_emails
    is_pro_or_above = current_user.plan in (UserPlan.PRO, UserPlan.MAX, "pro", "max")

    if not is_admin and not is_pro_or_above:
        raise HTTPException(status_code=403, detail="需要 Pro 方案才能使用個股簡評")

    ticker_upper = ticker.strip().upper()
    now = datetime.now(timezone.utc)
    # 快取 TTL：有文章支撐用 24h，純 AI 知識用 7d
    cache_cutoff = min(
        now - timedelta(hours=CACHE_TTL_HOURS_WITH_ARTICLES),
        now - timedelta(hours=CACHE_TTL_HOURS_NO_ARTICLES),
    )
    # 實際查詢時依 has_articles 動態判斷
    cache_cutoff_with    = now - timedelta(hours=CACHE_TTL_HOURS_WITH_ARTICLES)
    cache_cutoff_without = now - timedelta(hours=CACHE_TTL_HOURS_NO_ARTICLES)

    # ── 1. 查快取（依 has_articles 套用不同 TTL）
    from sqlalchemy import or_, and_
    cache_result = await db.execute(
        select(StockAnalysisCache)
        .where(
            StockAnalysisCache.ticker == ticker_upper,
            or_(
                # 有文章 → 24 小時內有效
                and_(StockAnalysisCache.has_articles == True,  StockAnalysisCache.created_at >= cache_cutoff_with),
                # 無文章 → 7 天內有效
                and_(StockAnalysisCache.has_articles == False, StockAnalysisCache.created_at >= cache_cutoff_without),
            ),
        )
        .order_by(StockAnalysisCache.created_at.desc())
        .limit(1)
    )
    cached = cache_result.scalar_one_or_none()

    if cached:
        print(f"[Analysis] 快取命中：{ticker_upper}（{cached.created_at.strftime('%Y-%m-%d %H:%M')} UTC）")
        try:
            key_points = json.loads(cached.key_points or "[]")
            related_articles = json.loads(cached.related_articles or "[]")
        except Exception:
            key_points = []
            related_articles = []

        return {
            "ticker": ticker_upper,
            "company_name": cached.company_name,
            "sentiment": cached.sentiment,
            "sentiment_label": cached.sentiment_label,
            "overview": cached.overview,
            "key_points": key_points,
            "conclusion": cached.conclusion,
            "has_articles": cached.has_articles,
            "related_articles": related_articles,
            "cached": True,
        }

    # ── 2. 快取未命中，呼叫 AI
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    result = await db.execute(
        select(Article)
        .where(
            Article.related_stocks.ilike(f"%{ticker_upper}%"),
            Article.created_at >= cutoff,
        )
        .order_by(Article.created_at.desc())
        .limit(5)
    )
    articles = result.scalars().all()
    articles_data = [
        {"title": a.title, "summary": a.summary, "slug": a.slug}
        for a in articles
    ]

    print(f"[Analysis] 快取未命中：{ticker_upper}，找到 {len(articles)} 篇相關文章，呼叫 AI...")

    analysis = await generate_stock_analysis(ticker_upper, articles_data)
    if not analysis:
        raise HTTPException(status_code=500, detail="AI 分析暫時失敗，請稍後再試")

    related_articles_list = [{"title": a.title, "slug": a.slug} for a in articles]

    # ── 3. 存入快取
    new_cache = StockAnalysisCache(
        ticker=ticker_upper,
        company_name=analysis.get("company_name"),
        sentiment=analysis.get("sentiment"),
        sentiment_label=analysis.get("sentiment_label"),
        overview=analysis.get("overview"),
        key_points=json.dumps(analysis.get("key_points", []), ensure_ascii=False),
        conclusion=analysis.get("conclusion"),
        has_articles=analysis.get("has_articles", False),
        related_articles=json.dumps(related_articles_list, ensure_ascii=False),
    )
    db.add(new_cache)
    try:
        await db.flush()
        print(f"[Analysis] 已快取：{ticker_upper}")
    except Exception as e:
        print(f"[Analysis] 快取儲存失敗（不影響回傳）：{e}")
        await db.rollback()

    return {
        **analysis,
        "ticker": ticker_upper,
        "related_articles": related_articles_list,
        "cached": False,
    }
