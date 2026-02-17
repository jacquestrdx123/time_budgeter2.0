from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from backend.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    notification_type = Column(String(64), nullable=False, default="general")
    channel = Column(String(32), nullable=False, default="all")
    is_read = Column(Boolean, default=False, nullable=False)
    sent_push = Column(Boolean, default=False, nullable=False)
    sent_email = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="notifications")


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(ForeignKey("users.id"), unique=True, nullable=False)
    push_enabled = Column(Boolean, default=True, nullable=False)
    email_enabled = Column(Boolean, default=True, nullable=False)
    task_assigned = Column(Boolean, default=True, nullable=False)
    task_updated = Column(Boolean, default=True, nullable=False)
    shift_reminder = Column(Boolean, default=True, nullable=False)
    project_updated = Column(Boolean, default=True, nullable=False)

    user = relationship("User", back_populates="notification_preference")


class FCMDevice(Base):
    __tablename__ = "fcm_devices"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(ForeignKey("users.id"), nullable=False)
    token = Column(String(512), unique=True, nullable=False)
    device_name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="fcm_devices")
