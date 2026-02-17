from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    notification_type: Mapped[str] = mapped_column(
        String(64), nullable=False, default="general"
    )
    channel: Mapped[str] = mapped_column(
        String(32), nullable=False, default="all"
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sent_push: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sent_email: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="notifications")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False
    )
    push_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    task_assigned: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    task_updated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    shift_reminder: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    project_updated: Mapped[bool] = mapped_column(
        Boolean, default=True, nullable=False
    )

    user = relationship("User", back_populates="notification_preference")


class FCMDevice(Base):
    __tablename__ = "fcm_devices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    token: Mapped[str] = mapped_column(String(512), unique=True, nullable=False)
    device_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    user = relationship("User", back_populates="fcm_devices")
