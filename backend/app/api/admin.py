import os
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from app.tasks.scheduler import daily_news_job

router = APIRouter(prefix="/admin", tags=["admin"])


def verify_admin(x_admin_token: str = Header(...)):
    admin_token = os.environ.get("ADMIN_TOKEN", "")
    if not admin_token or x_admin_token != admin_token:
        raise HTTPException(status_code=403, detail="Unauthorized")


@router.post("/trigger-news")
async def trigger_news(background_tasks: BackgroundTasks, x_admin_token: str = Header(...)):
    """手動觸發每日新聞任務"""
    verify_admin(x_admin_token)
    background_tasks.add_task(daily_news_job)
    return {"message": "任務已在背景啟動"}


@router.get("/health")
async def health():
    return {"status": "ok", "service": "TechBrief API"}
