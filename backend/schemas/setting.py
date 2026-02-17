from datetime import datetime

from pydantic import BaseModel


class SettingRead(BaseModel):
    key: str
    value: str
    label: str
    description: str | None = None
    setting_type: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class SettingUpdate(BaseModel):
    value: str


class SettingCreate(BaseModel):
    key: str
    value: str
    label: str
    description: str | None = None
    setting_type: str = "string"
