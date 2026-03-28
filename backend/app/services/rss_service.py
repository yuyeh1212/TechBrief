import re
import time
import feedparser
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Dict


RSS_SOURCES = [
    # 台灣科技媒體
    {"name": "自由時報科技", "url": "https://news.ltn.com.tw/rss/tech.xml", "category": "tech"},
    {"name": "數位時代", "url": "https://www.bnext.com.tw/rss", "category": "tech"},
    {"name": "科技新報", "url": "https://technews.tw/feed/", "category": "tech"},
    {"name": "科技報橘", "url": "https://buzzorange.com/techorange/feed/", "category": "tech"},
    {"name": "iThome", "url": "https://www.ithome.com.tw/rss", "category": "tech"},
    {"name": "電腦王阿達", "url": "https://www.koc.com.tw/archives/feed", "category": "tech"},
    {"name": "新聞雲 AI", "url": "https://ai.ettoday.net/news/rss2.xml", "category": "ai"},
    {"name": "動腦新聞科技", "url": "https://www.brain.com.tw/rss", "category": "tech"},

    # 國際 AI 媒體
    {"name": "TechCrunch AI", "url": "https://techcrunch.com/category/artificial-intelligence/feed/", "category": "ai"},
    {"name": "The Verge AI", "url": "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml", "category": "ai"},
    {"name": "VentureBeat AI", "url": "https://venturebeat.com/category/ai/feed/", "category": "ai"},
    {"name": "MIT Technology Review", "url": "https://www.technologyreview.com/feed/", "category": "ai"},
    {"name": "Wired AI", "url": "https://www.wired.com/feed/tag/artificial-intelligence/latest/rss", "category": "ai"},

    # GPT / OpenAI 相關
    {"name": "OpenAI Blog", "url": "https://openai.com/blog/rss.xml", "category": "gpt"},

    # Gemini / Google 相關
    {"name": "Google AI Blog", "url": "https://blog.google/technology/ai/rss/", "category": "gemini"},

    # Claude / Anthropic 相關
    {"name": "Anthropic Blog", "url": "https://www.anthropic.com/rss.xml", "category": "claude"},
]

CATEGORY_KEYWORDS = {
    "gpt": ["gpt", "chatgpt", "openai", "gpt-4", "gpt4", "o1", "o3", "sora", "dall-e", "whisper"],
    "gemini": ["gemini", "google ai", "bard", "google deepmind", "gemma", "notebooklm", "vertex ai"],
    "claude": ["claude", "anthropic", "openclaw", "龍蝦ai", "龍蝦 ai", "claw ai"],
    "ai": ["ai", "人工智慧", "機器學習", "深度學習", "llm", "大型語言模型", "生成式", "神經網路",
           "artificial intelligence", "machine learning", "deep learning", "transformer", "diffusion"],
    "collaboration": ["自動化", "workflow", "n8n", "zapier", "make.com", "整合", "api", "automation",
                      "no-code", "low-code", "agent", "agentic"],
}


def detect_category(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    # 順序很重要：先比對細分類，再比對大類
    for cat in ["gpt", "gemini", "claude", "collaboration", "ai"]:
        if any(kw in text for kw in CATEGORY_KEYWORDS[cat]):
            return cat
    return "tech"


async def fetch_rss_articles(hours: int = 24) -> List[Dict]:
    """抓取所有 RSS 來源最近 N 小時的文章"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    articles = []

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
        for source in RSS_SOURCES:
            try:
                resp = await client.get(source["url"])
                feed = feedparser.parse(resp.text)

                for entry in feed.entries:
                    pub_time = None
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        pub_time = datetime.fromtimestamp(
                            time.mktime(entry.published_parsed), tz=timezone.utc
                        )

                    if pub_time and pub_time < cutoff:
                        continue

                    summary = getattr(entry, "summary", "")
                    if hasattr(entry, "content"):
                        summary = entry.content[0].value

                    summary_clean = re.sub(r"<[^>]+>", "", summary)[:500]

                    image_url = None
                    if hasattr(entry, "media_content") and entry.media_content:
                        image_url = entry.media_content[0].get("url")
                    elif hasattr(entry, "enclosures") and entry.enclosures:
                        for enc in entry.enclosures:
                            if enc.get("type", "").startswith("image"):
                                image_url = enc.get("href")
                                break

                    title = entry.get("title", "").strip()
                    url = entry.get("link", "").strip()
                    if not title or not url:
                        continue

                    # source 預設 category 優先，避免 tech 來源的 AI 文章被誤判
                    detected = detect_category(title, summary_clean)
                    # 如果 source 本身就是特定分類（gpt/gemini/claude），鎖定不被覆蓋
                    final_category = source["category"] if source["category"] in ("gpt", "gemini", "claude") else detected

                    articles.append({
                        "title": title,
                        "url": url,
                        "summary": summary_clean,
                        "image_url": image_url,
                        "source_name": source["name"],
                        "published_at": pub_time,
                        "category": final_category,
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

    print(f"[RSS] 共抓到 {len(unique)} 篇文章")
    return unique
