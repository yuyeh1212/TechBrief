import feedparser
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Dict


RSS_SOURCES = [
    {"name": "自由時報科技", "url": "https://news.ltn.com.tw/rss/tech.xml", "category": "tech"},
    {"name": "數位時代", "url": "https://www.bnext.com.tw/rss", "category": "tech"},
    {"name": "科技新報", "url": "https://technews.tw/feed/", "category": "tech"},
    {"name": "科技報橘", "url": "https://buzzorange.com/techorange/feed/", "category": "tech"},
    {"name": "iThome", "url": "https://www.ithome.com.tw/rss", "category": "tech"},
    {"name": "電腦王阿達", "url": "https://www.koc.com.tw/archives/feed", "category": "tech"},
    {"name": "新聞雲 AI", "url": "https://ai.ettoday.net/news/rss2.xml", "category": "ai"},
    # AI郵報 / 學不完 / 商業週刊 無標準 RSS feed，改以下替代
    {"name": "動腦新聞科技", "url": "https://www.brain.com.tw/rss", "category": "tech"},
    {"name": "TechCrunch AI", "url": "https://techcrunch.com/category/artificial-intelligence/feed/", "category": "ai"},
    {"name": "The Verge AI", "url": "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml", "category": "ai"},
]

CATEGORY_KEYWORDS = {
    "gpt": ["gpt", "chatgpt", "openai", "gpt-4", "gpt4"],
    "gemini": ["gemini", "google ai", "bard", "google deepmind"],
    "claude": ["claude", "anthropic"],
    "ai": ["ai", "人工智慧", "機器學習", "深度學習", "llm", "大型語言模型", "生成式"],
    "collaboration": ["自動化", "workflow", "n8n", "zapier", "make.com", "整合", "api"],
}


def detect_category(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    for cat, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return cat
    return "tech"


async def fetch_rss_articles(hours: int = 24) -> List[Dict]:
    """抓取所有 RSS 來源最近 N 小時的文章"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    articles = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        for source in RSS_SOURCES:
            try:
                resp = await client.get(source["url"])
                feed = feedparser.parse(resp.text)

                for entry in feed.entries:
                    pub_time = None
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        import time
                        pub_time = datetime.fromtimestamp(
                            time.mktime(entry.published_parsed), tz=timezone.utc
                        )

                    # 只要 24 小時內
                    if pub_time and pub_time < cutoff:
                        continue

                    summary = getattr(entry, "summary", "")
                    if hasattr(entry, "content"):
                        summary = entry.content[0].value

                    # 清理 HTML tag
                    import re
                    summary_clean = re.sub(r"<[^>]+>", "", summary)[:500]

                    image_url = None
                    if hasattr(entry, "media_content") and entry.media_content:
                        image_url = entry.media_content[0].get("url")
                    elif hasattr(entry, "enclosures") and entry.enclosures:
                        image_url = entry.enclosures[0].get("href")

                    articles.append({
                        "title": entry.get("title", ""),
                        "url": entry.get("link", ""),
                        "summary": summary_clean,
                        "image_url": image_url,
                        "source_name": source["name"],
                        "published_at": pub_time,
                        "category": detect_category(entry.get("title", ""), summary_clean),
                    })

            except Exception as e:
                print(f"[RSS] {source['name']} 抓取失敗: {e}")
                continue

    # 去重（同 URL）
    seen = set()
    unique = []
    for a in articles:
        if a["url"] not in seen:
            seen.add(a["url"])
            unique.append(a)

    return unique
