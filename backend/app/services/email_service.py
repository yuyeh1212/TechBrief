import resend
from typing import List, Dict
from app.core.config import settings


def build_newsletter_html(articles: List[Dict], site_url: str = "https://techbrief.zeabur.app") -> str:
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
    resend.api_key = settings.RESEND_API_KEY
    html = build_newsletter_html(articles)
    success_count = 0
    fail_count = 0

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


async def send_expiry_reminder(email: str, name: str, plan: str, days_left: int, expires_at: str) -> None:
    """發送訂閱到期提醒信"""
    import asyncio
    resend.api_key = settings.RESEND_API_KEY
    plan_label = {"mini": "Mini", "pro": "Pro", "max": "Max"}.get(plan, plan.upper())
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: resend.Emails.send({
        "from": settings.RESEND_FROM_EMAIL,
        "to": [email],
        "subject": f"⏰ 您的 TechBrief {plan_label} 方案將於 {days_left} 天後到期",
        "html": f"""
        <!DOCTYPE html>
        <html lang="zh-Hant">
        <head><meta charset="UTF-8"></head>
        <body style="margin:0;padding:0;background:#121223;font-family:'Inter',sans-serif;">
            <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
                <div style="text-align:center;margin-bottom:32px;">
                    <div style="font-size:24px;font-weight:700;background:linear-gradient(135deg,#a8e8ff,#00d4ff);
                                -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                        TechBrief
                    </div>
                </div>
                <div style="background:#1a1a2b;border-radius:12px;padding:32px;border:1px solid #2a2a3b;">
                    <h2 style="color:#e3e0f9;margin:0 0 16px;">嗨，{name}！</h2>
                    <p style="color:#bbc9cf;line-height:1.7;margin:0 0 20px;">
                        您的 <strong style="color:#00d4ff;">TechBrief {plan_label}</strong> 方案將於
                        <strong style="color:#ffd700;">{days_left} 天後（{expires_at}）</strong>到期。
                    </p>
                    <p style="color:#bbc9cf;line-height:1.7;margin:0 0 28px;">
                        續訂後可繼續享有所有 {plan_label} 專屬功能，不中斷您的閱讀體驗。
                    </p>
                    <div style="text-align:center;">
                        <a href="{settings.FRONTEND_URL}/pricing"
                           style="display:inline-block;padding:12px 32px;
                                  background:linear-gradient(135deg,#a8e8ff,#00d4ff);
                                  color:#003642;font-weight:700;border-radius:8px;
                                  text-decoration:none;font-size:15px;">
                            立即續訂
                        </a>
                    </div>
                </div>
                <p style="text-align:center;color:#859398;font-size:12px;margin-top:24px;">
                    TechBrief Labs · 如有疑問請聯絡 contact@techbrief.app
                </p>
            </div>
        </body>
        </html>
        """,
    }))


async def send_weekly_report_notification(emails: List[str], week_start: str, picks: list) -> Dict:
    """發送週報上線通知給所有 Pro/Max 用戶"""
    import asyncio
    resend.api_key = settings.RESEND_API_KEY

    tickers = "、".join([p.get("ticker", "") for p in picks[:3]])
    picks_html = "".join([
        f"""
        <div style="padding:16px;background:#12122a;border-radius:8px;margin-bottom:12px;
                    border-left:3px solid #00d4ff;">
            <div style="font-size:13px;font-weight:700;color:#00d4ff;margin-bottom:4px;">
                {p.get('ticker', '')} · {p.get('company', '')}
            </div>
            <p style="color:#bbc9cf;font-size:13px;line-height:1.6;margin:0;">{p.get('reason', '')}</p>
        </div>
        """
        for p in picks[:3]
    ])

    html = f"""
    <!DOCTYPE html>
    <html lang="zh-Hant">
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#121223;font-family:'Inter',sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
            <div style="text-align:center;margin-bottom:32px;">
                <div style="font-size:24px;font-weight:700;background:linear-gradient(135deg,#a8e8ff,#00d4ff);
                            -webkit-background-clip:text;-webkit-text-fill-color:transparent;">
                    TechBrief
                </div>
                <p style="color:#bbc9cf;font-size:13px;margin-top:6px;">Pro 會員專屬週報</p>
            </div>
            <div style="background:#1a1a2b;border-radius:12px;padding:32px;border:1px solid #2a2a3b;">
                <p style="font-size:11px;color:#00d4ff;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px;">
                    WEEKLY PICKS · {week_start}
                </p>
                <h1 style="font-size:22px;color:#e3e0f9;margin:0 0 8px;">本週精選看好標的</h1>
                <p style="color:#bbc9cf;font-size:13px;margin:0 0 28px;">
                    本週精選：<strong style="color:#e3e0f9;">{tickers}</strong> 等 {len(picks)} 檔標的
                </p>
                {picks_html}
                <div style="text-align:center;margin-top:28px;">
                    <a href="{settings.FRONTEND_URL}/finance?tab=weekly"
                       style="display:inline-block;padding:12px 32px;
                              background:linear-gradient(135deg,#a8e8ff,#00d4ff);
                              color:#003642;font-weight:700;border-radius:8px;
                              text-decoration:none;font-size:14px;">
                        查看完整報告
                    </a>
                </div>
            </div>
            <p style="text-align:center;color:#859398;font-size:12px;margin-top:24px;">
                本報告由 AI 自動生成，僅供參考，不構成投資建議。<br>
                TechBrief Labs · <a href="{settings.FRONTEND_URL}/unsubscribe?email={{email}}" style="color:#00d4ff;">取消訂閱</a>
            </p>
        </div>
    </body>
    </html>
    """

    success_count = 0
    fail_count = 0
    loop = asyncio.get_event_loop()
    for email in emails:
        try:
            personalized_html = html.replace("{email}", email)
            await loop.run_in_executor(None, lambda h=personalized_html, e=email: resend.Emails.send({
                "from": settings.RESEND_FROM_EMAIL,
                "to": [e],
                "subject": f"📈 本週精選看好標的出爐！({week_start}) | TechBrief Pro",
                "html": h,
            }))
            success_count += 1
        except Exception as ex:
            print(f"[Email] 週報通知發送失敗 {email}: {ex}")
            fail_count += 1

    return {"success": success_count, "failed": fail_count}


async def send_subscription_confirm(email: str) -> None:
    """發送訂閱確認信"""
    import asyncio
    resend.api_key = settings.RESEND_API_KEY
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, lambda: resend.Emails.send({
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
    }))
