from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.models.subscriber import Subscriber
from app.services.email_service import send_subscription_confirm

router = APIRouter(prefix="/subscribers", tags=["subscribers"])


class SubscribeRequest(BaseModel):
    email: EmailStr


@router.post("", status_code=201)
async def subscribe(req: SubscribeRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subscriber).where(Subscriber.email == req.email))
    existing = result.scalar_one_or_none()

    if existing:
        if existing.is_active:
            raise HTTPException(status_code=409, detail="此 Email 已訂閱")
        else:
            existing.is_active = True
            await db.commit()
            return {"message": "重新訂閱成功"}

    subscriber = Subscriber(email=req.email)
    db.add(subscriber)
    await db.commit()

    try:
        await send_subscription_confirm(req.email)
    except Exception as e:
        print(f"[Subscribe] 確認信發送失敗: {e}")

    return {"message": "訂閱成功，請查收確認信"}


@router.delete("")
async def unsubscribe(email: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Subscriber).where(Subscriber.email == email))
    subscriber = result.scalar_one_or_none()

    if not subscriber:
        raise HTTPException(status_code=404, detail="找不到此訂閱")

    subscriber.is_active = False
    await db.commit()
    return {"message": "已取消訂閱"}
