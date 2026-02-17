from datetime import datetime

from pydantic import BaseModel


# --- Notification schemas ---


class NotificationCreate(BaseModel):
    user_id: int
    title: str
    body: str
    notification_type: str = "general"
    channel: str = "all"


class NotificationRead(BaseModel):
    id: int
    user_id: int
    title: str
    body: str
    notification_type: str
    channel: str
    is_read: bool
    sent_push: bool
    sent_email: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationUpdate(BaseModel):
    is_read: bool | None = None


# --- Notification Preference schemas ---


class NotificationPreferenceRead(BaseModel):
    id: int
    user_id: int
    push_enabled: bool
    email_enabled: bool
    task_assigned: bool
    task_updated: bool
    shift_reminder: bool
    project_updated: bool

    model_config = {"from_attributes": True}


class NotificationPreferenceUpdate(BaseModel):
    push_enabled: bool | None = None
    email_enabled: bool | None = None
    task_assigned: bool | None = None
    task_updated: bool | None = None
    shift_reminder: bool | None = None
    project_updated: bool | None = None


# --- FCM Device schemas ---


class FCMDeviceCreate(BaseModel):
    token: str
    device_name: str | None = None


class FCMDeviceRead(BaseModel):
    id: int
    user_id: int
    token: str
    device_name: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Send notification request (internal/admin) ---


class SendNotificationRequest(BaseModel):
    user_id: int
    title: str
    body: str
    notification_type: str = "general"
    data: dict | None = None
