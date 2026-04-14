from sqlalchemy import String, DateTime, Enum, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, timezone
from app.core.database import Base
import enum


class OrderStatus(str, enum.Enum):
    PENDING = "pending"      # 建立訂單，等待付款
    PAID = "paid"            # 付款成功
    FAILED = "failed"        # 付款失敗
    CANCELLED = "cancelled"  # 取消


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    # 唯一訂單編號（送給 ECPay 的 MerchantTradeNo）
    trade_no: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    # 對應使用者
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    # 購買的方案
    plan: Mapped[str] = mapped_column(String(20), nullable=False)
    # 金額（NT$）
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    # 訂單狀態
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False
    )
    # ECPay 回傳的交易編號
    ecpay_trade_no: Mapped[str] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
