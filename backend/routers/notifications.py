from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models import User
from backend.models.notification import FCMDevice, Notification, NotificationPreference
from backend.schemas.notification import (
    FCMDeviceCreate,
    FCMDeviceRead,
    NotificationPreferenceRead,
    NotificationPreferenceUpdate,
    NotificationRead,
    SendNotificationRequest,
)
from backend.services.notification_service import (
    get_or_create_preferences,
    send_notification,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# Notifications CRUD
# ---------------------------------------------------------------------------


@router.get("/", response_model=list[NotificationRead])
def list_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List notifications for the authenticated user."""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)  # noqa: E712
    return query.order_by(Notification.created_at.desc()).all()


@router.get("/unread-count")
def unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the number of unread notifications."""
    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
        .count()
    )
    return {"unread_count": count}


@router.get("/{notification_id}", response_model=NotificationRead)
def get_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification


@router.patch("/{notification_id}/read", response_model=NotificationRead)
def mark_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/mark-all-read")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read for the authenticated user."""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False,  # noqa: E712
    ).update({"is_read": True})
    db.commit()
    return {"detail": "All notifications marked as read"}


@router.delete("/{notification_id}", status_code=204)
def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(notification)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Notification preferences
# ---------------------------------------------------------------------------


@router.get("/preferences/me", response_model=NotificationPreferenceRead)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get notification preferences for the authenticated user."""
    prefs = get_or_create_preferences(db, current_user.id)
    return prefs


@router.put("/preferences/me", response_model=NotificationPreferenceRead)
def update_preferences(
    data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update notification preferences for the authenticated user."""
    prefs = get_or_create_preferences(db, current_user.id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(prefs, key, value)
    db.commit()
    db.refresh(prefs)
    return prefs


# ---------------------------------------------------------------------------
# FCM device tokens
# ---------------------------------------------------------------------------


@router.get("/devices/me", response_model=list[FCMDeviceRead])
def list_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List registered FCM device tokens for the authenticated user."""
    return db.query(FCMDevice).filter(FCMDevice.user_id == current_user.id).all()


@router.post("/devices", response_model=FCMDeviceRead)
def register_device(
    data: FCMDeviceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a new FCM device token. Idempotent – if the token already
    exists for this user the existing record is returned."""
    existing = (
        db.query(FCMDevice)
        .filter(FCMDevice.token == data.token, FCMDevice.user_id == current_user.id)
        .first()
    )
    if existing:
        return existing

    device = FCMDevice(
        user_id=current_user.id,
        token=data.token,
        device_name=data.device_name,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.delete("/devices/{device_id}", status_code=204)
def remove_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove an FCM device token."""
    device = (
        db.query(FCMDevice)
        .filter(FCMDevice.id == device_id, FCMDevice.user_id == current_user.id)
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    db.delete(device)
    db.commit()
    return None


# ---------------------------------------------------------------------------
# Send notification (for internal / admin use)
# ---------------------------------------------------------------------------


@router.post("/send", response_model=NotificationRead)
def send(
    data: SendNotificationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a notification to a specific user via all enabled channels."""
    target_user = db.query(User).filter(User.id == data.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    notification = send_notification(
        db=db,
        user_id=data.user_id,
        title=data.title,
        body=data.body,
        notification_type=data.notification_type,
        data=data.data,
    )
    return notification
