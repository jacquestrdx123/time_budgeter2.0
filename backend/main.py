import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import Base, SessionLocal, engine
from backend.models import (  # noqa: F401 - register models
    FCMDevice,
    Notification,
    NotificationPreference,
    Project,
    Shift,
    SystemSetting,
    Task,
    User,
)
from backend.routers import auth, notifications, projects, settings, shifts, tasks, users
from backend.services.scheduler import start_scheduler, stop_scheduler

logger = logging.getLogger(__name__)


async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        settings.seed_defaults(db)
    finally:
        db.close()

    start_scheduler()
    logger.info("Shift reminder scheduler started")

    yield

    stop_scheduler()
    logger.info("Shift reminder scheduler stopped")


app = FastAPI(title="TimeBudget API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:5173",
        "https://proxy.heartbeatnetworks.com",
        "https://time_budgeter20-0aprwuxe.on-forge.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
app.include_router(shifts.router, prefix="/shifts", tags=["shifts"])
app.include_router(
    notifications.router, prefix="/notifications", tags=["notifications"]
)
app.include_router(settings.router, prefix="/settings", tags=["settings"])
