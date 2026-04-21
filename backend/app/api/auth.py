from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_current_user
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


def _admin_emails() -> list[str]:
    return [e.strip() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]


def _effective_plan(user: "User") -> str:
    """白名單帳號永遠回傳 max 方案"""
    if user.email in _admin_emails():
        return "max"
    return user.plan


class GoogleLoginRequest(BaseModel):
    credential: str  # Google ID token


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    picture: str | None
    plan: str
    plan_expires_at: datetime | None = None
    is_admin: bool = False

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


@router.post("/google", response_model=AuthResponse)
async def google_login(body: GoogleLoginRequest, db: AsyncSession = Depends(get_db)):
    """接收 Google ID token，驗證後回傳 JWT"""
    try:
        id_info = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Google token 驗證失敗: {e}")

    google_id = id_info["sub"]
    email = id_info.get("email", "")
    name = id_info.get("name", "")
    picture = id_info.get("picture", "")

    # 查找或建立使用者
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        user = User(google_id=google_id, email=email, name=name, picture=picture)
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # 更新名稱和頭像（可能有變更）
        user.name = name
        user.picture = picture
        await db.commit()
        await db.refresh(user)

    token = create_access_token(user.id)
    user_data = UserResponse.model_validate(user)
    user_data.plan = _effective_plan(user)
    user_data.is_admin = user.email in _admin_emails()
    return AuthResponse(access_token=token, user=user_data)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """取得目前登入使用者資訊"""
    user_data = UserResponse.model_validate(current_user)
    user_data.plan = _effective_plan(current_user)
    user_data.is_admin = current_user.email in _admin_emails()
    return user_data
