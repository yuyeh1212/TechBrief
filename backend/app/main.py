from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.tasks.scheduler import start_scheduler
from app.api import articles, subscribers, line_webhook, admin, auth, payment
from app.models import user as _user_model   # 確保 User table 被 Base 掃到
from app.models import order as _order_model  # 確保 Order table 被 Base 掃到


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    start_scheduler()
    yield
    # Shutdown（scheduler 會自動停止）


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(articles.router, prefix="/api")
app.include_router(subscribers.router, prefix="/api")
app.include_router(line_webhook.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(payment.router)


@app.get("/")
async def root():
    return {"message": "TechBrief API", "version": "1.0.0"}
