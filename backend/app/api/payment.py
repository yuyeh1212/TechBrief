import hashlib
import urllib.parse
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User, UserPlan
from app.models.order import Order, OrderStatus

router = APIRouter(prefix="/api/payment", tags=["payment"])

# ── 方案設定 ──────────────────────────────────────────
PLANS = {
    "mini": {"name": "TechBrief Mini 月訂閱", "amount": 33},
    "pro":  {"name": "TechBrief Pro 月訂閱",  "amount": 99},
}

PLAN_ENUM = {
    "mini": UserPlan.MINI,
    "pro":  UserPlan.PRO,
}

# ── ECPay 工具函式 ────────────────────────────────────

def _generate_check_mac_value(params: dict) -> str:
    """產生 ECPay CheckMacValue（SHA256）"""
    sorted_params = sorted(params.items(), key=lambda x: x[0].lower())
    raw = "&".join(f"{k}={v}" for k, v in sorted_params)
    raw = f"HashKey={settings.ECPAY_HASH_KEY}&{raw}&HashIV={settings.ECPAY_HASH_IV}"
    encoded = urllib.parse.quote_plus(raw).lower()
    # 修正 ECPay 特定字元
    encoded = encoded.replace("%2d", "-").replace("%5f", "_").replace("%2e", ".").replace("%21", "!")
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest().upper()


def _generate_trade_no(user_id: int) -> str:
    """產生唯一訂單編號（最多 20 字元）"""
    ts = datetime.now(timezone.utc).strftime("%y%m%d%H%M%S")
    return f"TB{ts}{user_id:04d}"


def _build_ecpay_form(params: dict) -> str:
    """產生自動提交的 HTML Form"""
    inputs = "\n".join(
        f'<input type="hidden" name="{k}" value="{v}" />'
        for k, v in params.items()
    )
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>跳轉至付款頁面...</title></head>
<body>
<p style="font-family:sans-serif;text-align:center;padding:40px;color:#666">
  正在跳轉至綠界付款頁面，請稍候...
</p>
<form id="ecpay-form" method="POST" action="{settings.ECPAY_API_URL}">
{inputs}
</form>
<script>document.getElementById('ecpay-form').submit();</script>
</body></html>"""


# ── API ───────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    plan: str  # "mini" or "pro"


@router.post("/create-order")
async def create_order(
    body: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """建立訂單並回傳 ECPay 表單 HTML"""
    plan_key = body.plan.lower()
    if plan_key not in PLANS:
        raise HTTPException(status_code=400, detail="無效的方案")

    plan_info = PLANS[plan_key]
    trade_no = _generate_trade_no(current_user.id)

    # 寫入訂單
    order = Order(
        trade_no=trade_no,
        user_id=current_user.id,
        plan=plan_key,
        amount=plan_info["amount"],
        status=OrderStatus.PENDING,
    )
    db.add(order)
    db.commit()

    # 組 ECPay 參數
    params = {
        "MerchantID":        settings.ECPAY_MERCHANT_ID,
        "MerchantTradeNo":   trade_no,
        "MerchantTradeDate": datetime.now().strftime("%Y/%m/%d %H:%M:%S"),
        "PaymentType":       "aio",
        "TotalAmount":       str(plan_info["amount"]),
        "TradeDesc":         urllib.parse.quote(plan_info["name"]),
        "ItemName":          plan_info["name"],
        "ReturnURL":         f"{settings.FRONTEND_URL}/api/payment/notify",
        "ClientBackURL":     f"{settings.FRONTEND_URL}/payment/result",
        "OrderResultURL":    f"{settings.FRONTEND_URL}/api/payment/return",
        "ChoosePayment":     "Credit",
        "EncryptType":       "1",
    }
    params["CheckMacValue"] = _generate_check_mac_value(params)

    return {"html": _build_ecpay_form(params), "trade_no": trade_no}


@router.post("/notify")
async def ecpay_notify(request: Request, db: Session = Depends(get_db)):
    """ECPay 伺服器端 callback（付款結果通知）"""
    form = await request.form()
    data = dict(form)

    # 取出並移除 CheckMacValue 驗證
    received_mac = data.pop("CheckMacValue", "")
    expected_mac = _generate_check_mac_value(data)

    if received_mac.upper() != expected_mac:
        return HTMLResponse("0|Error", status_code=200)

    trade_no = data.get("MerchantTradeNo", "")
    rtn_code = data.get("RtnCode", "0")
    ecpay_trade_no = data.get("TradeNo", "")

    order = db.query(Order).filter(Order.trade_no == trade_no).first()
    if not order:
        return HTMLResponse("0|OrderNotFound", status_code=200)

    if rtn_code == "1":  # 付款成功
        order.status = OrderStatus.PAID
        order.ecpay_trade_no = ecpay_trade_no
        order.paid_at = datetime.now(timezone.utc)

        # 更新用戶方案
        user = db.query(User).filter(User.id == order.user_id).first()
        if user:
            user.plan = PLAN_ENUM.get(order.plan, UserPlan.FREE)

        db.commit()
    else:
        order.status = OrderStatus.FAILED
        db.commit()

    return HTMLResponse("1|OK", status_code=200)


@router.post("/return")
async def ecpay_return(request: Request):
    """ECPay 付款完成後瀏覽器端跳轉（OrderResultURL）
    接收 ECPay POST 表單，重新導向前端付款結果頁。
    """
    form = await request.form()
    data = dict(form)
    trade_no = data.get("MerchantTradeNo", "")
    rtn_code = data.get("RtnCode", "0")
    success = "1" if rtn_code == "1" else "0"
    return RedirectResponse(
        url=f"{settings.FRONTEND_URL}/payment/result?trade_no={trade_no}&success={success}",
        status_code=302,
    )


@router.get("/order/{trade_no}")
async def get_order_status(
    trade_no: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """查詢訂單狀態（前端付款結果頁使用）"""
    order = db.query(Order).filter(
        Order.trade_no == trade_no,
        Order.user_id == current_user.id,
    ).first()

    if not order:
        raise HTTPException(status_code=404, detail="訂單不存在")

    return {
        "trade_no": order.trade_no,
        "plan": order.plan,
        "amount": order.amount,
        "status": order.status,
        "paid_at": order.paid_at,
    }
