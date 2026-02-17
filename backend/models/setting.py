from datetime import datetime

from sqlalchemy import Column, DateTime, String, Text

from backend.database import Base


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(255), primary_key=True)
    value = Column(Text, nullable=False)
    label = Column(String(255), nullable=False)
    description = Column(String(1024), nullable=True)
    setting_type = Column(String(64), nullable=False, default="string")
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
