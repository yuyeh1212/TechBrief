import re
import random
import asyncio
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, text
from datetime import datetime, timezone

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.article import Article
from app.models.subscriber import Subscriber
from app.models.user import User, UserPlan
from app.services.rss_service import fetch_rss_articles, fetch_rss_articles_by_type
from app.services.ai_service import generate_article, generate_card_summary, generate_article_from_youtube
from app.services.email_service import send_newsletter, send_expiry_reminder
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


async def _generate_articles_batch(raw_list: list, quota: int, label: str) -> list:
    """從 raw_list 中生成最多 quota 篇文章，回傳已存入 DB 的文章摘要列表"""
    random.shuffle(raw_list)
    candidates = raw_list[:quota * 3]  # 多抓幾篇備用（有些會被 AI 跳過）
    saved = []

    async with AsyncSessionLocal() as db:
        count = 0
        for raw in candidates:
            if count >= quota:
                break

            generated = await generate_article(raw)
            if not generated:
                continue

            card_summary = await generate_card_summary(generated["title"], generated["content"])
            related_stocks = ",".join(generated.get("related_stocks", []))
            slug = slugify(generated.get("title", raw["title"]))

            # finance 來源鎖定分類，其他由 AI 決定
            if raw["category"] == "finance":
                category = "finance"
            elif raw["category"] in ("gpt", "gemini", "claude"):
                category = raw["category"]
            else:
                category = generated.get("category", "tech")

            article = Article(
                title=generated["title"],
                slug=slug,
                summary=generated["summary"],
                card_summary=card_summary,
                content=generated["content"],
                category=category,
                image_url=raw.get("image_url"),
                source_url=raw["url"],
                source_name=raw["source_name"],
                related_stocks=related_stocks,
            )
            db.add(article)
            try:
                await db.flush()
            except Exception as e:
                print(f"[Scheduler] flush 失敗，跳過此篇: {e}")
                await db.rollback()
                continue

            saved.append({
                "title": article.title,
                "summary": article.summary,
                "slug": article.slug,
                "image_url": article.image_url,
                "category": article.category,
            })
            count += 1
            print(f"[Scheduler][{label}] 已生成: {article.title}")

        try:
            await db.commit()
            print(f"[Scheduler][{label}] DB commit 成功，共 {count} 篇")
        except Exception as e:
            print(f"[Scheduler][{label}] DB commit 失敗: {e}")
            await db.rollback()

    return saved


async def daily_news_job():
    """每天早上 10 點執行：科技 10 篇 + 財經 5 篇 → 存 DB → 發送電子報"""
    print(f"[Scheduler] 開始每日任務 {datetime.now(timezone.utc).isoformat()}")

    # 分別抓取科技和財經 RSS
    tech_raw, finance_raw = await asyncio.gather(
        fetch_rss_articles_by_type("tech", hours=24),
        fetch_rss_articles_by_type("finance", hours=24),
    )

    if not tech_raw and not finance_raw:
        print("[Scheduler] 沒有新文章")
        return

    print(f"[Scheduler] 科技來源: {len(tech_raw)} 篇，財經來源: {len(finance_raw)} 篇")

    # 依序生成（避免 API 同時大量請求）
    tech_saved = await _generate_articles_batch(tech_raw, settings.TECH_ARTICLES_PER_RUN, "科技")
    finance_saved = await _generate_articles_batch(finance_raw, settings.FINANCE_ARTICLES_PER_RUN, "財經")

    saved_articles = tech_saved + finance_saved
    print(f"[Scheduler] 共生成 {len(saved_articles)} 篇文章（科技 {len(tech_saved)} + 財經 {len(finance_saved)}）")

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


async def subscription_expiry_job():
    """每天早上 9:00 執行：到期前 3 天發提醒信 + 到期後降回 Free"""
    print(f"[Expiry] 開始訂閱到期檢查 {datetime.now(timezone.utc).isoformat()}")
    now = datetime.now(timezone.utc)
    reminder_start = now + timedelta(days=3)
    reminder_end = now + timedelta(days=4)

    async with AsyncSessionLocal() as db:
        # 到期前 3 天：發提醒信
        result = await db.execute(
            select(User).where(
                User.plan_expires_at >= reminder_start,
                User.plan_expires_at < reminder_end,
                User.plan != UserPlan.FREE,
            )
        )
        remind_users = result.scalars().all()
        for user in remind_users:
            days_left = (user.plan_expires_at - now).days + 1
            expires_str = user.plan_expires_at.strftime("%Y/%m/%d")
            try:
                await send_expiry_reminder(
                    email=user.email,
                    name=user.name,
                    plan=user.plan.value,
                    days_left=days_left,
                    expires_at=expires_str,
                )
                print(f"[Expiry] 提醒信已發送：{user.email}（剩 {days_left} 天）")
            except Exception as e:
                print(f"[Expiry] 提醒信發送失敗 {user.email}: {e}")

        # 已到期：降回 Free
        result = await db.execute(
            select(User).where(
                User.plan_expires_at < now,
                User.plan != UserPlan.FREE,
            )
        )
        expired_users = result.scalars().all()
        for user in expired_users:
            print(f"[Expiry] 訂閱到期，降回 Free：{user.email}")
            user.plan = UserPlan.FREE
            user.plan_expires_at = None

        try:
            await db.commit()
            print(f"[Expiry] 完成：提醒 {len(remind_users)} 人，到期降級 {len(expired_users)} 人")
        except Exception as e:
            print(f"[Expiry] commit 失敗: {e}")
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
    scheduler.add_job(
        subscription_expiry_job,
        trigger=CronTrigger(hour=9, minute=0, timezone="Asia/Taipei"),
        id="subscription_expiry",
        replace_existing=True,
    )
    scheduler.start()
    print(f"[Scheduler] 已啟動，每天 {settings.NEWS_FETCH_HOUR:02d}:{settings.NEWS_FETCH_MINUTE:02d} 執行")