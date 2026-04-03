import re
import random
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, text
from datetime import datetime, timezone

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.article import Article
from app.models.subscriber import Subscriber
from app.services.rss_service import fetch_rss_articles
from app.services.ai_service import generate_article, generate_card_summary, generate_article_from_youtube
from app.services.email_service import send_newsletter
from app.services.youtube_service import YOUTUBE_SOURCES, fetch_youtube_videos, fetch_transcript


scheduler = AsyncIOScheduler(timezone="Asia/Taipei")


async def fetch_unsplash_image(query: str) -> str | None:
    if not settings.UNSPLASH_ACCESS_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.unsplash.com/photos/random",
                params={"query": query, "orientation": "landscape"},
                headers={"Authorization": f"Client-ID {settings.UNSPLASH_ACCESS_KEY}"},
            )
            data = resp.json()
            return data["urls"]["regular"]
    except Exception:
        return None


def slugify(title: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", title.lower())
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")
    timestamp = int(datetime.now(timezone.utc).timestamp())
    return f"{slug[:80]}-{timestamp}"


async def daily_news_job():
    """每天早上 10 點執行：抓新聞 → AI 生成 → 存 DB → 發送電子報"""
    print(f"[Scheduler] 開始每日任務 {datetime.now(timezone.utc).isoformat()}")

    raw_articles = await fetch_rss_articles(hours=24)
    if not raw_articles:
        print("[Scheduler] 沒有新文章")
        return

    random.shuffle(raw_articles)
    target = raw_articles[:settings.ARTICLES_PER_RUN * 2]

    saved_articles = []
    async with AsyncSessionLocal() as db:
        count = 0
        for raw in target:
            if count >= settings.ARTICLES_PER_RUN:
                break

            generated = await generate_article(raw)
            if not generated:
                continue
            print(f"[Scheduler] generated keys: {list(generated.keys())}")

            card_summary = await generate_card_summary(generated["title"], generated["content"])
            related_stocks = ",".join(generated.get("related_stocks", []))

            slug = slugify(generated.get("title", raw["title"]))
            article = Article(
                title=generated["title"],
                slug=slug,
                summary=generated["summary"],
                card_summary=card_summary,
                content=generated["content"],
                category=raw["category"] if raw["category"] != "tech" else generated.get("category", "tech"),
                image_url=raw.get("image_url"),
                source_url=raw["url"],
                source_name=raw["source_name"],
                related_stocks=related_stocks,
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


async def youtube_news_job():
    """每天早上 10:05 執行：YouTube 影片 → 文章"""
    print(f"[YouTube] 開始 YouTube 任務 {datetime.now(timezone.utc).isoformat()}")

    async with AsyncSessionLocal() as db:
        for source in YOUTUBE_SOURCES:
            videos = await fetch_youtube_videos(source["channel_id"], max_results=5)
            generated_count = 0

            for video in videos:
                if generated_count >= 2:
                    break

                # 檢查是否已處理過
                result = await db.execute(
                    text("SELECT 1 FROM youtube_processed WHERE video_id = :vid"),
                    {"vid": video["video_id"]}
                )
                if result.fetchone():
                    print(f"[YouTube] 已處理過，跳過：{video['title']}")
                    continue

                transcript = await fetch_transcript(video["video_id"])
                if not transcript:
                    print(f"[YouTube] 無字幕，跳過：{video['title']}")
                    # 仍然記錄避免重複嘗試
                    await db.execute(
                        text("INSERT INTO youtube_processed (video_id, processed_at) VALUES (:vid, NOW()) ON CONFLICT DO NOTHING"),
                        {"vid": video["video_id"]}
                    )
                    continue

                generated = await generate_article_from_youtube(
                    video_title=video["title"],
                    transcript=transcript,
                    channel_name=source["channel_name"],
                    video_url=video["url"],
                )
                if not generated:
                    await db.execute(
                        text("INSERT INTO youtube_processed (video_id, processed_at) VALUES (:vid, NOW()) ON CONFLICT DO NOTHING"),
                        {"vid": video["video_id"]}
                    )
                    continue

                card_summary = await generate_card_summary(generated["title"], generated["content"])
                related_stocks = ",".join(generated.get("related_stocks", []))

                slug = slugify(generated["title"])
                article = Article(
                    title=generated["title"],
                    slug=slug,
                    summary=generated["summary"],
                    card_summary=card_summary,
                    content=generated["content"],
                    category=generated.get("category", "ai"),
                    image_url=video["thumbnail"],
                    source_url=video["url"],
                    source_name=source["channel_name"],
                    related_stocks=related_stocks,
                )
                db.add(article)

                await db.execute(
                    text("INSERT INTO youtube_processed (video_id, processed_at) VALUES (:vid, NOW()) ON CONFLICT DO NOTHING"),
                    {"vid": video["video_id"]}
                )
                await db.flush()
                generated_count += 1
                print(f"[YouTube] 已生成：{article.title}")

            try:
                await db.commit()
                print(f"[YouTube] {source['channel_name']} 完成，共生成 {generated_count} 篇")
            except Exception as e:
                print(f"[YouTube] commit 失敗: {e}")
                await db.rollback()


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
    scheduler.add_job(
        youtube_news_job,
        trigger=CronTrigger(
            hour=settings.NEWS_FETCH_HOUR,
            minute=settings.NEWS_FETCH_MINUTE + 5,
            timezone="Asia/Taipei",
        ),
        id="youtube_news",
        replace_existing=True,
    )
    scheduler.start()
    print(f"[Scheduler] 已啟動，每天 {settings.NEWS_FETCH_HOUR:02d}:{settings.NEWS_FETCH_MINUTE:02d} 執行")