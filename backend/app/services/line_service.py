import httpx
import hmac
import hashlib
import base64
import json
from typing import List, Dict
from app.core.config import settings

LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply"


def verify_line_signature(body: bytes, signature: str) -> bool:
    """驗證 LINE Webhook 簽名"""
    expected = base64.b64encode(
        hmac.new(
            settings.LINE_CHANNEL_SECRET.encode("utf-8"),
            body,
            hashlib.sha256,
        ).digest()
    ).decode("utf-8")
    return hmac.compare_digest(expected, signature)


def build_today_flex_message(articles: List[Dict], site_url: str = "https://techbrief.tw") -> Dict:
    """建立今日快報 Flex Message（Carousel，最多 10 則）"""
    bubbles = []
    for article in articles[:10]:
        hero = {
            "type": "image",
            "url": article.get("image_url") or "https://techbrief.tw/og-image.png",
            "size": "full",
            "aspectRatio": "20:13",
            "aspectMode": "cover",
            "action": {
                "type": "uri",
                "uri": f"{site_url}/article/{article['slug']}",
            },
        }

        bubble = {
            "type": "bubble",
            "hero": hero,
            "body": {
                "type": "box",
                "layout": "vertical",
                "contents": [
                    {
                        "type": "text",
                        "text": article["title"],
                        "weight": "bold",
                        "size": "md",
                        "wrap": True,
                        "maxLines": 3,
                    },
                    {
                        "type": "box",
                        "layout": "vertical",
                        "margin": "lg",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "text",
                                "text": article["summary"][:80] + "...",
                                "color": "#aaaaaa",
                                "size": "sm",
                                "wrap": True,
                                "maxLines": 3,
                                "flex": 1,
                            }
                        ],
                    },
                ],
            },
            "footer": {
                "type": "box",
                "layout": "vertical",
                "spacing": "sm",
                "contents": [
                    {
                        "type": "button",
                        "style": "link",
                        "height": "sm",
                        "action": {
                            "type": "uri",
                            "label": "前往閱讀",
                            "uri": f"{site_url}/article/{article['slug']}",
                        },
                    }
                ],
                "flex": 0,
            },
        }
        bubbles.append(bubble)

    return {
        "type": "flex",
        "altText": "今日科技快訊",
        "contents": {
            "type": "carousel",
            "contents": bubbles,
        },
    }


def build_help_message() -> Dict:
    return {
        "type": "text",
        "text": "👋 您好！歡迎使用 TechBrief 科技快訊\n\n📰 輸入「今日快報」查看今日文章\n🤖 輸入「AI新聞」查看 AI 相關新聞\n📧 前往官網訂閱每日電子報",
    }


async def reply_to_line(reply_token: str, messages: List[Dict]) -> None:
    """回覆 LINE 訊息（被動，不主動推播）"""
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            LINE_REPLY_URL,
            headers={
                "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            },
            json={
                "replyToken": reply_token,
                "messages": messages,
            },
        )
        if resp.status_code != 200:
            print(f"[LINE] 回覆失敗: {resp.status_code} {resp.text}")
