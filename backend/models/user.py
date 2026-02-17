from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )

    tasks = relationship("Task", back_populates="user")
    shifts = relationship("Shift", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    notification_preference = relationship(
        "NotificationPreference", back_populates="user", uselist=False
    )
    fcm_devices = relationship("FCMDevice", back_populates="user")
