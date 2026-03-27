import re
import random
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from datetime import datetime, timezone

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.article import Article
from app.models.subscriber import Subscriber
from app.services.rss_service import fetch_rss_articles
from app.services.ai_service import generate_article
from app.services.email_service import send_newsletter


scheduler = AsyncIOScheduler(timezone="Asia/Taipei")


def slugify(title: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", title.lower())
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    timestamp = int(datetime.now(timezone.utc).timestamp())
    return f"{slug[:80]}-{timestamp}"


async def daily_news_job():
    """每天早上 10 點執行：抓新聞 → AI 生成 → 存 DB → 發送電子報"""
    print(f"[Scheduler] 開始每日任務 {datetime.now(timezone.utc).isoformat()}")

    # 1. 抓 RSS
    raw_articles = await fetch_rss_articles(hours=24)
    if not raw_articles:
        print("[Scheduler] 沒有新文章")
        return

    # 隨機挑選，避免每次都是同樣的來源
    random.shuffle(raw_articles)
    target = raw_articles[:settings.ARTICLES_PER_RUN * 2]  # 多抓一些備用

    saved_articles = []
    async with AsyncSessionLocal() as db:
        count = 0
        for raw in target:
            if count >= settings.ARTICLES_PER_RUN:
                break

            # 2. AI 生成
            generated = await generate_article(raw)
            if not generated:
                continue
            print(f"[Scheduler] generated keys: {list(generated.keys())}")

            slug = slugify(generated.get("title", raw["title"]))
            article = Article(
                title=generated["title"],
                slug=slug,
                summary=generated["summary"],
                content=generated["content"],
                category=generated.get("category", raw["category"]),
                image_url=raw.get("image_url"),
                source_url=raw["url"],
                source_name=raw["source_name"],
            )
            db.add(article)
            await db.flush()

            saved_articles.append({
                "title": article.title,
                "summary": article.summary,
                "slug": article.slug,
                "image_url": article.image_url,
                "category": article.category,
            })
            count += 1
            print(f"[Scheduler] 已生成: {article.title}")

        try:
            await db.commit()
            print(f"[Scheduler] DB commit 成功")
        except Exception as e:
            print(f"[Scheduler] DB commit 失敗: {e}")
            await db.rollback()

    print(f"[Scheduler] 共生成 {len(saved_articles)} 篇文章")

    # 3. 寄送電子報
    if saved_articles:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Subscriber).where(Subscriber.is_active == True)
            )
            subscribers = result.scalars().all()
            emails = [s.email for s in subscribers]

        if emails:
            stats = await send_newsletter(emails, saved_articles)
            print(f"[Scheduler] 電子報發送完成: {stats}")
        else:
            print("[Scheduler] 沒有訂閱者，跳過電子報")


def start_scheduler():
    scheduler.add_job(
        daily_news_job,
        trigger=CronTrigger(
            hour=settings.NEWS_FETCH_HOUR,
            minute=settings.NEWS_FETCH_MINUTE,
            timezone="Asia/Taipei",
        ),
        id="daily_news",
        replace_existing=True,
    )
    scheduler.start()
    print(f"[Scheduler] 已啟動，每天 {settings.NEWS_FETCH_HOUR:02d}:{settings.NEWS_FETCH_MINUTE:02d} 執行")
