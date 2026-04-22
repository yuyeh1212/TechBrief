"""
補跑財經文章情緒標籤（sentiment backfill）

使用方式（在 backend/ 目錄下執行）：
    python scripts/backfill_sentiment.py

只處理 category='finance' 且 sentiment IS NULL 的文章。
使用 Gemini Flash Lite，只傳標題 + 摘要，成本極低。
"""

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, update
from app.core.database import AsyncSessionLocal
from app.core.config import settings
from app.models.article import Article, ArticleCategory
from app.services.ai_service import _call_openrouter, _parse_json

SENTIMENT_PROMPT = """你是財經新聞情緒分析師。根據以下財經文章的標題與摘要，判斷這篇文章對市場的情緒傾向。

只回傳以下三個英文單字之一，不要有任何其他文字：
- positive（利多，對市場或相關股票有正面影響）
- neutral（中立，無明顯多空傾向）
- negative（利空，對市場或相關股票有負面影響）"""


async def analyze_sentiment(title: str, summary: str) -> str | None:
    user_prompt = f"標題：{title}\n摘要：{summary}"
    raw = await _call_openrouter(
        messages=[
            {"role": "system", "content": SENTIMENT_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        model=settings.OPENROUTER_FLASH_MODEL,
        max_tokens=10,
        retry=1,
    )
    if not raw:
        return None
    result = raw.strip().lower()
    return result if result in ("positive", "neutral", "negative") else None


async def main():
    async with AsyncSessionLocal() as db:
        # 查詢所有 finance 且 sentiment 為 null 的文章
        result = await db.execute(
            select(Article).where(
                Article.category == ArticleCategory.FINANCE,
                Article.sentiment == None,  # noqa: E711
                Article.is_published == True,
            ).order_by(Article.created_at.desc())
        )
        articles = result.scalars().all()

    print(f"找到 {len(articles)} 篇財經文章需要補跑 sentiment\n")

    if not articles:
        print("無需補跑，結束。")
        return

    success = 0
    failed = 0

    for i, article in enumerate(articles, 1):
        print(f"[{i}/{len(articles)}] {article.title[:40]}...", end=" ", flush=True)

        sentiment = await analyze_sentiment(article.title, article.summary)

        if sentiment:
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(Article)
                    .where(Article.id == article.id)
                    .values(sentiment=sentiment)
                )
                await db.commit()
            print(f"→ {sentiment} ✓")
            success += 1
        else:
            print("→ 失敗，跳過")
            failed += 1

        # 避免速率限制
        await asyncio.sleep(0.5)

    print(f"\n完成！成功 {success} 篇，失敗 {failed} 篇。")


if __name__ == "__main__":
    asyncio.run(main())
