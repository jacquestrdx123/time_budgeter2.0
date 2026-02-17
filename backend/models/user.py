from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    tasks = relationship("Task", back_populates="user")
    shifts = relationship("Shift", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    notification_preference = relationship(
        "NotificationPreference", back_populates="user", uselist=False
    )
    fcm_devices = relationship("FCMDevice", back_populates="user")
