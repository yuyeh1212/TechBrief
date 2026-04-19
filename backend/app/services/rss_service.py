import re
import time
import feedparser
import httpx
from datetime import datetime, timezone, timedelta
from typing import List, Dict


RSS_SOURCES = [
    # 台灣科技媒體
    {"name": "自由時報科技", "url": "https://news.ltn.com.tw/rss/all.xml", "category": "tech"},
    {"name": "科技新報", "url": "https://technews.tw/feed/", "category": "tech"},
    {"name": "科技報橘", "url": "https://buzzorange.com/techorange/feed/", "category": "tech"},
    {"name": "iThome", "url": "https://www.ithome.com.tw/rss", "category": "tech"},
    {"name": "動腦新聞科技", "url": "https://www.brain.com.tw/rss", "category": "tech"},
    {"name": "Ars Technica AI", "url": "https://arstechnica.com/ai/feed/", "category": "ai"},

    # 國際 AI 媒體
    {"name": "TechCrunch AI", "url": "https://techcrunch.com/category/artificial-intelligence/feed/", "category": "ai"},
    {"name": "The Verge AI", "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", "category": "ai"},
    {"name": "VentureBeat AI", "url": "https://venturebeat.com/category/ai/feed/", "category": "ai"},
    {"name": "MIT Technology Review", "url": "https://www.technologyreview.com/feed/", "category": "ai"},
    {"name": "Wired AI", "url": "https://www.wired.com/feed/tag/ai/latest/rss", "category": "ai"},
    {"name": "The Guardian AI", "url": "https://www.theguardian.com/technology/artificialintelligenceai/rss", "category": "ai"},

    # 官方部落格
    {"name": "OpenAI Blog", "url": "https://openai.com/blog/rss.xml", "category": "gpt"},
    {"name": "Google AI Blog", "url": "https://blog.google/technology/ai/rss/", "category": "gemini"},
    {"name": "Anthropic Blog", "url": "https://www.anthropic.com/rss.xml", "category": "claude"},

    # 財經
    {"name": "經濟日報", "url": "https://money.udn.com/rssfeed/news/1001/5591", "category": "finance"},
    {"name": "工商時報", "url": "https://ctee.com.tw/feed", "category": "finance"},
    {"name": "MoneyDJ", "url": "https://www.moneydj.com/KMDJ/RssReader/RssReader.aspx?id=1", "category": "finance", "verify_ssl": False},
    {"name": "Yahoo Finance", "url": "https://finance.yahoo.com/news/rssindex", "category": "finance"},
    {"name": "Investing.com 財經", "url": "https://tw.investing.com/rss/news.rss", "category": "finance"},
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

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/rss+xml, application/xml, text/xml, */*",
}


def detect_category(title: str, summary: str) -> str:
    text = (title + " " + summary).lower()
    for cat in ["gpt", "gemini", "claude", "collaboration", "ai"]:
        if any(kw in text for kw in CATEGORY_KEYWORDS[cat]):
            return cat
    return "tech"


async def fetch_rss_articles_by_type(article_type: str, hours: int = 24) -> List[Dict]:
    """依類型抓取 RSS：article_type = 'tech' 或 'finance'"""
    if article_type == "finance":
        sources = [s for s in RSS_SOURCES if s["category"] == "finance"]
    else:
        sources = [s for s in RSS_SOURCES if s["category"] != "finance"]
    return await _fetch_from_sources(sources, hours)


async def fetch_rss_articles(hours: int = 24) -> List[Dict]:
    return await _fetch_from_sources(RSS_SOURCES, hours)


async def _fetch_from_sources(sources: List[Dict], hours: int = 24) -> List[Dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    articles = []

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=HEADERS) as client:
        for source in sources:
            try:
                verify = source.get("verify_ssl", True)
                if not verify:
                    # SSL 驗證失敗的來源使用獨立 client
                    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=HEADERS, verify=False) as ssl_client:
                        resp = await ssl_client.get(source["url"])
                else:
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

                    # finance 來源鎖定分類，不走 detect_category
                    if source["category"] == "finance":
                        final_category = "finance"
                    elif source["category"] in ("gpt", "gemini", "claude"):
                        final_category = source["category"]
                    else:
                        final_category = detect_category(title, summary_clean)

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

    seen = set()
    unique = []
    for a in articles:
        if a["url"] not in seen:
            seen.add(a["url"])
            unique.append(a)

    print(f"[RSS] 共抓到 {len(unique)} 篇文章")
    return unique