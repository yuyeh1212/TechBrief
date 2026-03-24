import resend
from typing import List, Dict
from app.core.config import settings

resend.api_key = settings.RESEND_API_KEY


def build_newsletter_html(articles: List[Dict], site_url: str = "https://techbrief.tw") -> str:
    articles_html = ""
    for article in articles[:10]:
        img_tag = ""
        if article.get("image_url"):
            img_tag = f'<img src="{article["image_url"]}" style="width:100%;border-radius:8px;margin-bottom:12px;" />'

        articles_html += f"""
        <div style="margin-bottom:32px;padding-bottom:32px;border-bottom:1px solid #1a1a2b;">
            {img_tag}
            <span style="font-size:11px;color:#00d4ff;text-transform:uppercase;letter-spacing:1px;">
                {article.get("category", "tech").upper()}
            </span>
            <h2 style="font-size:20px;color:#e3e0f9;margin:8px 0 12px;line-height:1.4;">
                {article["title"]}
            </h2>
            <p style="font-size:14px;color:#bbc9cf;line-height:1.7;margin:0 0 16px;">
                {article["summary"]}
            </p>
            <a href="{site_url}/article/{article['slug']}"
               style="display:inline-block;padding:8px 20px;background:linear-gradient(135deg,#a8e8ff,#00d4ff);
                      color:#003642;font-weight:600;border-radius:6px;text-decoration:none;font-size:13px;">
                閱讀全文
            </a>
        </div>
        """

    return f"""
    <!DOCTYPE html>
    <html lang="zh-Hant">
    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#121223;font-family:'Inter',sans-serif;">
        <div style="max-width:640px;margin:0 auto;padding:40px 20px;">
            <div style="text-align:center;margin-bottom:40px;">
                <div style="font-size:24px;font-weight:700;background:linear-gradient(135deg,#a8e8ff,#00d4ff);
                            -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                    TechBrief
                </div>
                <p style="color:#bbc9cf;font-size:13px;margin-top:8px;">即時掌握 AI 與科技趨勢</p>
            </div>

            <div style="background:#1a1a2b;border-radius:12px;padding:32px;">
                <h1 style="font-size:22px;color:#e3e0f9;margin:0 0 8px;">今日科技快訊</h1>
                <p style="color:#bbc9cf;font-size:13px;margin:0 0 32px;">為您精選 AI 與科技領域最新動態</p>
                {articles_html}
            </div>

            <div style="text-align:center;margin-top:32px;">
                <p style="color:#859398;font-size:12px;">
                    您收到此郵件是因為訂閱了 TechBrief 電子報<br>
                    <a href="{site_url}/unsubscribe?email={{email}}" style="color:#00d4ff;">取消訂閱</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """


async def send_newsletter(subscribers: List[str], articles: List[Dict]) -> Dict:
    """批次發送電子報給訂閱者"""
    html = build_newsletter_html(articles)
    success_count = 0
    fail_count = 0

    # Resend 免費版一次最多 100 個收件人，分批送
    batch_size = 50
    for i in range(0, len(subscribers), batch_size):
        batch = subscribers[i:i + batch_size]
        for email in batch:
            try:
                personalized_html = html.replace("{email}", email)
                resend.Emails.send({
                    "from": settings.RESEND_FROM_EMAIL,
                    "to": [email],
                    "subject": "📡 今日科技快訊 | TechBrief Daily",
                    "html": personalized_html,
                })
                success_count += 1
            except Exception as e:
                print(f"[Email] 發送給 {email} 失敗: {e}")
                fail_count += 1

    return {"success": success_count, "failed": fail_count}


async def send_subscription_confirm(email: str) -> None:
    """發送訂閱確認信"""
    resend.Emails.send({
        "from": settings.RESEND_FROM_EMAIL,
        "to": [email],
        "subject": "歡迎訂閱 TechBrief 科技快訊 🎉",
        "html": f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px;background:#121223;color:#e3e0f9;">
            <h1 style="color:#00d4ff;">訂閱成功！</h1>
            <p>感謝您訂閱 <strong>TechBrief 科技快訊</strong>。</p>
            <p>每天早上 10 點，我們會將精選 AI 與科技新聞寄送到您的信箱。</p>
            <p style="color:#bbc9cf;font-size:13px;">如果您未訂閱此服務，請忽略這封郵件。</p>
        </div>
        """,
    })
