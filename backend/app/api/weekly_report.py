import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime

from app.core.database import get_db
from app.models.weekly_report import WeeklyReport
from app.api.auth import get_current_user
from app.models.user import User, UserPlan

router = APIRouter(prefix="/weekly-report", tags=["weekly-report"])


class WeeklyReportOut(BaseModel):
    id: int
    week_start: date
    market_overview: str
    picks: list          # 解析後的 JSON
    disclaimer: Optional[str]
    article_count: int
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/latest", response_model=Optional[WeeklyReportOut])
async def get_latest_weekly_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """取得最新一期週報（需 Pro 或 Max 方案）"""
    if current_user.plan not in (UserPlan.PRO, UserPlan.MAX):
        raise HTTPException(status_code=403, detail="需要 Pro 或 Max 方案才能查看週報")

    result = await db.execute(
        select(WeeklyReport).order_by(WeeklyReport.week_start.desc()).limit(1)
    )
    report = result.scalar_one_or_none()
    if not report:
        return None

    # 將 picks JSON 字串解析為 list
    try:
        picks_list = json.loads(report.picks)
    except Exception:
        picks_list = []

    return WeeklyReportOut(
        id=report.id,
        week_start=report.week_start,
        market_overview=report.market_overview,
        picks=picks_list,
        disclaimer=report.disclaimer,
        article_count=report.article_count,
        created_at=report.created_at,
    )
