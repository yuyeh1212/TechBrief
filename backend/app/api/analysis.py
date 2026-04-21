from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserPlan
from app.models.article import Article
from app.services.ai_service import generate_stock_analysis

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/stock")
async def get_stock_analysis(
    ticker: str = Query(..., min_length=1, max_length=20, description="股票代號，例如 NVDA 或 2330.TW"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI 個股簡評（Pro 以上方案限定）"""
    # 白名單 (ADMIN_EMAILS) 的用戶 plan 由 auth 回傳 max，但 DB 可能存 free
    # 這裡透過 UserPlan 比對，支援 admin 測試
    from app.core.config import settings
    admin_emails = [e.strip() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]
    is_admin = current_user.email in admin_emails
    is_pro_or_above = current_user.plan in (UserPlan.PRO, UserPlan.MAX, "pro", "max")

    if not is_admin and not is_pro_or_above:
        raise HTTPException(status_code=403, detail="需要 Pro 方案才能使用個股簡評")

    ticker_upper = ticker.strip().upper()

    # 查詢 DB 中 30 天內含該 ticker 的文章
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

    print(f"[Analysis] 股票 {ticker_upper}，找到 {len(articles)} 篇相關文章")

    analysis = await generate_stock_analysis(ticker_upper, articles_data)
    if not analysis:
        raise HTTPException(status_code=500, detail="AI 分析暫時失敗，請稍後再試")

    return {
        **analysis,
        "ticker": ticker_upper,
        "related_articles": [
            {"title": a.title, "slug": a.slug}
            for a in articles
        ],
    }
