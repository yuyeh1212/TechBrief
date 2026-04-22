import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.user import User, UserPlan
from app.models.article import Article
from app.tasks.scheduler import daily_news_job, subscription_expiry_job, weekly_report_job


router = APIRouter(prefix="/admin", tags=["admin"])


# ── 驗證：ADMIN_TOKEN header（給舊版腳本用）
def verify_admin_token(x_admin_token: str = Header(...)):
    admin_token = os.environ.get("ADMIN_TOKEN", "")
    if not admin_token or x_admin_token != admin_token:
        raise HTTPException(status_code=403, detail="Unauthorized")


# ── 驗證：JWT + ADMIN_EMAILS（給前端管理後台用）
def _admin_emails() -> list[str]:
    return [e.strip() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]


async def verify_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.email not in _admin_emails():
        raise HTTPException(status_code=403, detail="需要管理員權限")
    return current_user


# ─────────────────────── 舊版路由（保留相容性）───────────────────────

@router.post("/trigger-news")
async def trigger_news(background_tasks: BackgroundTasks, x_admin_token: str = Header(...)):
    """手動觸發每日新聞任務"""
    verify_admin_token(x_admin_token)
    background_tasks.add_task(daily_news_job)
    return {"message": "任務已在背景啟動"}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "TechBrief API"}


# ─────────────────────── 管理後台 API ───────────────────────

@router.get("/stats")
async def get_stats(
    _: User = Depends(verify_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """統計數據：用戶數、文章數、付費用戶"""
    total_users = (await db.execute(select(func.count(User.id)))).scalar()
    paid_users = (await db.execute(
        select(func.count(User.id)).where(User.plan != UserPlan.FREE)
    )).scalar()
    total_articles = (await db.execute(select(func.count(Article.id)))).scalar()
    today_articles = (await db.execute(
        select(func.count(Article.id)).where(
            Article.created_at >= datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        )
    )).scalar()
    plan_counts = {}
    for plan in UserPlan:
        cnt = (await db.execute(
            select(func.count(User.id)).where(User.plan == plan)
        )).scalar()
        plan_counts[plan.value] = cnt

    return {
        "total_users": total_users,
        "paid_users": paid_users,
        "total_articles": total_articles,
        "today_articles": today_articles,
        "plan_counts": plan_counts,
    }


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    plan: Optional[str] = Query(None),
    _: User = Depends(verify_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """列出用戶（支援 plan 篩選）"""
    q = select(User)
    if plan:
        q = q.where(User.plan == plan)
    q = q.order_by(User.created_at.desc())

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.offset((page - 1) * page_size).limit(page_size))
    users = result.scalars().all()

    admin_emails = _admin_emails()
    return {
        "total": total,
        "page": page,
        "total_pages": (total + page_size - 1) // page_size,
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "plan": u.plan.value,
                "is_admin": u.email in admin_emails,
                "is_active": u.is_active,
                "plan_expires_at": u.plan_expires_at.isoformat() if u.plan_expires_at else None,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
    }


class UpdatePlanRequest(BaseModel):
    plan: str
    expires_days: Optional[int] = 30  # 升級方案時的有效天數


@router.patch("/users/{user_id}/plan")
async def update_user_plan(
    user_id: int,
    body: UpdatePlanRequest,
    _: User = Depends(verify_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """修改用戶方案"""
    if body.plan not in [p.value for p in UserPlan]:
        raise HTTPException(status_code=400, detail=f"無效的方案：{body.plan}")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="用戶不存在")

    new_plan = UserPlan(body.plan)
    user.plan = new_plan
    if new_plan != UserPlan.FREE and body.expires_days:
        user.plan_expires_at = datetime.now(timezone.utc) + timedelta(days=body.expires_days)
    elif new_plan == UserPlan.FREE:
        user.plan_expires_at = None

    await db.commit()
    return {
        "id": user.id,
        "email": user.email,
        "plan": user.plan.value,
        "plan_expires_at": user.plan_expires_at.isoformat() if user.plan_expires_at else None,
    }


@router.get("/articles")
async def list_articles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None),
    _: User = Depends(verify_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """列出文章（支援分類篩選）"""
    q = select(Article)
    if category:
        q = q.where(Article.category == category)
    q = q.order_by(Article.created_at.desc())

    total = (await db.execute(select(func.count()).select_from(q.subquery()))).scalar()
    result = await db.execute(q.offset((page - 1) * page_size).limit(page_size))
    articles = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "total_pages": (total + page_size - 1) // page_size,
        "items": [
            {
                "id": a.id,
                "title": a.title,
                "slug": a.slug,
                "category": a.category.value if hasattr(a.category, "value") else a.category,
                "source_name": a.source_name,
                "view_count": a.view_count,
                "is_published": a.is_published,
                "created_at": a.created_at.isoformat(),
            }
            for a in articles
        ],
    }


@router.delete("/articles/{article_id}")
async def delete_article(
    article_id: int,
    _: User = Depends(verify_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """刪除文章"""
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="文章不存在")

    await db.delete(article)
    await db.commit()
    return {"message": f"文章 {article_id} 已刪除"}


@router.post("/trigger-news-jwt")
async def trigger_news_jwt(
    background_tasks: BackgroundTasks,
    _: User = Depends(verify_admin_user),
):
    """手動觸發每日新聞任務（JWT 版）"""
    background_tasks.add_task(daily_news_job)
    return {"message": "新聞任務已在背景啟動"}


@router.post("/trigger-expiry-jwt")
async def trigger_expiry_jwt(
    background_tasks: BackgroundTasks,
    _: User = Depends(verify_admin_user),
):
    """手動觸發到期檢查任務（JWT 版）"""
    background_tasks.add_task(subscription_expiry_job)
    return {"message": "到期檢查任務已在背景啟動"}


@router.post("/trigger-weekly-jwt")
async def trigger_weekly_jwt(
    background_tasks: BackgroundTasks,
    _: User = Depends(verify_admin_user),
):
    """手動觸發每週精選週報任務（JWT 版）"""
    background_tasks.add_task(weekly_report_job)
    return {"message": "週報任務已在背景啟動"}
