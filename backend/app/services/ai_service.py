import httpx
import json
import re
from typing import Dict, List
from app.core.config import settings


SYSTEM_PROMPT = """你是科技快訊 TechBrief 的專業編輯，擅長將科技新聞改寫成深入淺出的繁體中文文章。

撰寫規範：
1. 語言：繁體中文，風格精準、簡潔、有見解
2. 標題：吸引人，20字以內，不使用聳動標題
3. 摘要：3句話總結重點，適合社群媒體分享
4. 正文：600-1000字，包含背景、重點、影響分析
5. 分類：從以下選一個 [ai, gpt, gemini, claude, tech, collaboration]

必須以合法 JSON 格式回應，不要加 markdown code block：
{
  "title": "文章標題",
  "summary": "三句摘要",
  "content": "完整 HTML 格式正文（使用 <p>, <h3>, <strong> 等標籤）",
  "category": "分類英文代碼"
}"""


async def generate_article(raw_article: Dict) -> Dict | None:
    """用 OpenRouter Gemini 把 RSS 文章改寫成完整文章"""
    user_prompt = f"""請根據以下新聞資訊，撰寫一篇完整的科技文章：

來源：{raw_article['source_name']}
原始標題：{raw_article['title']}
原始摘要：{raw_article['summary']}
原始連結：{raw_article['url']}

請記得在文章最後加上來源出處，並回傳 JSON 格式。"""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://techbrief.tw",
                    "X-Title": "TechBrief",
                },
                json={
                    "model": settings.OPENROUTER_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 2000,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            raw_content = data["choices"][0]["message"]["content"]

            # 清理可能的 markdown code block
            cleaned = re.sub(r"```(?:json)?\n?", "", raw_content).strip()
            result = json.loads(cleaned)
            return result

    except json.JSONDecodeError as e:
        print(f"[AI] JSON 解析失敗: {e}, content={raw_content[:200]}")
        return None
    except Exception as e:
        print(f"[AI] 生成失敗: {e}")
        return None


async def generate_daily_digest(articles: List[Dict]) -> str:
    """生成今日快報摘要（給 LINE 用）"""
    titles = "\n".join([f"- {a['title']}" for a in articles[:10]])
    prompt = f"""以下是今日科技快訊的文章標題，請用繁體中文寫一段 100 字以內的今日快報導言：

{titles}

只回傳導言文字，不要其他格式。"""

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                    "HTTP-Referer": "https://techbrief.tw",
                },
                json={
                    "model": settings.OPENROUTER_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 300,
                },
            )
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        print(f"[AI] 快報摘要生成失敗: {e}")
        return "今日科技快訊為您帶來最新 AI 與科技資訊。"
