import httpx
import json
import re
from typing import Dict, List
from app.core.config import settings

OPENROUTER_BASE = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_HEADERS = {
    "HTTP-Referer": "https://techbrief.tw",
    "X-Title": "TechBrief",
}

VALID_CATEGORIES = {"ai", "gpt", "gemini", "claude", "tech", "collaboration", "finance"}

SYSTEM_PROMPT = """你是科技快訊 TechBrief 的專業編輯，擅長將科技新聞改寫成深入淺出的繁體中文文章。

撰寫規範：
1. 語言：繁體中文，風格精準、簡潔、有見解
2. 標題：吸引人，20字以內，不使用聳動標題
3. 摘要：3句話總結重點，適合社群媒體分享
4. 正文：600-1000字，包含背景、重點、影響分析
5. 分類：從以下選一個 [ai, gpt, gemini, claude, tech, collaboration, finance]
6. 相關股票：列出文章中提到或相關的股票代碼，台股格式如 2330.TW，美股如 NVDA，最多5個，沒有則空陣列
7. 如果文章與 AI、科技、金融科技完全無關（例如體育、娛樂、動物、政治），請回傳 {"skip": true}

必須以合法 JSON 格式回應，不要加 markdown code block：
{
  "title": "文章標題",
  "summary": "三句摘要",
  "content": "完整 HTML 格式正文（使用 <p>, <h3>, <strong> 等標籤）",
  "category": "分類英文代碼",
  "related_stocks": ["NVDA", "2330.TW"]
}"""

YOUTUBE_SYSTEM_PROMPT = """你是科技快訊 TechBrief 的專業編輯，擅長將 YouTube 影片字幕內容改寫成深入淺出的繁體中文文章。

撰寫規範：
1. 語言：繁體中文，風格精準、簡潔、有見解
2. 標題：吸引人，20字以內，不使用聳動標題
3. 摘要：3句話總結重點，適合社群媒體分享
4. 正文：600-1000字，包含背景、重點、影響分析
5. 分類：從以下選一個 [ai, gpt, gemini, claude, tech, collaboration]
6. 相關股票：列出文章中提到或相關的股票代碼，最多5個，沒有則空陣列
7. 如果字幕內容與 AI 或科技無關，回傳 {"skip": true}

必須以合法 JSON 格式回應，不要加 markdown code block：
{
  "title": "文章標題",
  "summary": "三句摘要",
  "content": "完整 HTML 格式正文（使用 <p>, <h3>, <strong> 等標籤）",
  "category": "分類英文代碼",
  "related_stocks": []
}"""


async def _call_openrouter(messages: List[Dict], model: str, max_tokens: int = 4000, retry: int = 2) -> str | None:
    for attempt in range(retry + 1):
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                resp = await client.post(
                    OPENROUTER_BASE,
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                        **OPENROUTER_HEADERS,
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": max_tokens,
                    },
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"[AI] API 呼叫失敗 (attempt {attempt + 1}/{retry + 1}): {e}")
            if attempt == retry:
                return None


def _parse_json(raw: str) -> Dict | None:
    try:
        cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        cleaned = re.sub(r"\s*```$", "", cleaned).strip()
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"[AI] JSON 解析失敗: {e}, content={raw[:200]}")
        return None


async def generate_article(raw_article: Dict) -> Dict | None:
    """Gemini Pro：RSS 文章 → 完整文章"""
    user_prompt = f"""請根據以下新聞資訊，撰寫一篇完整的科技文章：

來源：{raw_article['source_name']}
原始標題：{raw_article['title']}
原始摘要：{raw_article['summary']}
原始連結：{raw_article['url']}

請記得在文章最後加上來源出處，並回傳 JSON 格式。"""

    raw = await _call_openrouter(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        model=settings.OPENROUTER_MODEL,
        max_tokens=4000,
    )
    if not raw:
        return None
    result = _parse_json(raw)
    if not result:
        return None
    # AI 判斷文章與科技無關，跳過
    if result.get("skip"):
        print(f"[AI] 非科技內容，跳過：{raw_article['title']}")
        return None
    # 確保 category 合法，避免 DB 欄位錯誤
    if result.get("category") not in VALID_CATEGORIES:
        print(f"[AI] category 無效 ({result.get('category')})，fallback 到 tech")
        result["category"] = "tech"
    return result


async def generate_card_summary(title: str, content: str) -> str | None:
    """Gemini Flash：文章 → 卡片短摘要（2-3句）"""
    prompt = f"""請用繁體中文為以下文章寫一段卡片摘要，2-3句話，簡潔有力，適合在新聞卡片上顯示：

標題：{title}
內容：{content[:1000]}

只回傳摘要文字，不要其他格式。"""

    return await _call_openrouter(
        messages=[{"role": "user", "content": prompt}],
        model=settings.OPENROUTER_FLASH_MODEL,
        max_tokens=200,
    )


async def generate_article_from_youtube(video_title: str, transcript: str, channel_name: str, video_url: str) -> Dict | None:
    """Gemini Pro：YouTube 字幕 → 完整文章"""
    user_prompt = f"""請根據以下 YouTube 影片字幕內容，撰寫一篇完整的科技文章：

頻道：{channel_name}
影片標題：{video_title}
影片連結：{video_url}
字幕內容：{transcript[:3000]}

請記得在文章最後加上來源出處（頻道名稱與影片連結），並回傳 JSON 格式。"""

    raw = await _call_openrouter(
        messages=[
            {"role": "system", "content": YOUTUBE_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        model=settings.OPENROUTER_MODEL,
        max_tokens=4000,
    )
    if not raw:
        return None
    result = _parse_json(raw)
    if result and result.get("skip"):
        print(f"[AI] YouTube 影片非 AI/科技內容，跳過：{video_title}")
        return None
    return result


async def generate_daily_digest(articles: List[Dict]) -> str:
    """生成今日快報摘要（給 LINE 用）"""
    titles = "\n".join([f"- {a['title']}" for a in articles[:10]])
    prompt = f"""以下是今日科技快訊的文章標題，請用繁體中文寫一段 100 字以內的今日快報導言：

{titles}

只回傳導言文字，不要其他格式。"""

    result = await _call_openrouter(
        messages=[{"role": "user", "content": prompt}],
        model=settings.OPENROUTER_MODEL,
        max_tokens=300,
    )
    return result or "今日科技快訊為您帶來最新 AI 與科技資訊。"