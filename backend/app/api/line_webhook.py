from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.core.database import get_db
from app.models.article import Article
from app.services.line_service import (
    verify_line_signature,
    build_today_flex_message,
    build_help_message,
    reply_to_line,
)

router = APIRouter(prefix="/line", tags=["line"])

TRIGGER_TODAY = ["今日快報", "今日新聞", "快報", "今天", "今日"]
TRIGGER_AI = ["ai新聞", "ai 新聞", "人工智慧", "ai文章"]
TRIGGER_HELP = ["help", "說明", "幫助", "?", "？"]


async def get_today_articles(db: AsyncSession, category: str = None, limit: int = 10):
    from datetime import datetime, timezone, timedelta
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    query = (
        select(Article)
        .where(Article.is_published == True)
        .where(Article.created_at >= cutoff)
        .order_by(Article.created_at.desc())
        .limit(limit)
    )
    if category:
        from app.models.article import ArticleCategory
        try:
            query = query.where(Article.category == ArticleCategory(category))
        except ValueError:
            pass

    result = await db.execute(query)
    articles = result.scalars().all()

    # 轉成 dict
    return [
        {
            "title": a.title,
            "summary": a.summary,
            "slug": a.slug,
            "image_url": a.image_url,
            "category": a.category,
        }
        for a in articles
    ]


@router.post("/webhook")
async def line_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Line-Signature", "")

    # 驗簽
    if not verify_line_signature(body, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    payload = json.loads(body)

    for event in payload.get("events", []):
        if event.get("type") != "message":
            continue
        if event["message"].get("type") != "text":
            continue

        reply_token = event.get("replyToken")
        user_text = event["message"]["text"].strip().lower()

        if any(t in user_text for t in TRIGGER_TODAY):
            articles = await get_today_articles(db)
            if articles:
                await reply_to_line(reply_token, [build_today_flex_message(articles)])
            else:
                await reply_to_line(reply_token, [{
                    "type": "text",
                    "text": "今天還沒有新文章，請稍後再試 🙏"
                }])

        elif any(t in user_text for t in TRIGGER_AI):
            articles = await get_today_articles(db, category="ai")
            if articles:
                await reply_to_line(reply_token, [build_today_flex_message(articles)])
            else:
                await reply_to_line(reply_token, [{
                    "type": "text",
                    "text": "目前沒有最新 AI 新聞 🤖"
                }])

        elif any(t in user_text for t in TRIGGER_HELP):
            await reply_to_line(reply_token, [build_help_message()])

        else:
            await reply_to_line(reply_token, [build_help_message()])

    return {"status": "ok"}
