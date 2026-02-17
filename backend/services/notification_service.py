import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from sqlalchemy.orm import Session

from backend import config
from backend.models.notification import FCMDevice, Notification, NotificationPreference

logger = logging.getLogger(__name__)

# Firebase is initialised lazily so the app still starts when the SDK
# is not configured.
_firebase_app = None


def _init_firebase():
    """Initialise the Firebase Admin SDK once."""
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(config.FIREBASE_CREDENTIALS_PATH)
        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialised")
    except Exception as exc:
        logger.warning("Firebase Admin SDK failed to initialise: %s", exc)
        _firebase_app = None

    return _firebase_app


# ---------------------------------------------------------------------------
# Push notifications via Firebase Cloud Messaging
# ---------------------------------------------------------------------------


def send_push_notification(
    token: str, title: str, body: str, data: dict | None = None
) -> bool:
    """Send a push notification to a single FCM device token."""
    if not config.FIREBASE_ENABLED:
        logger.debug("Firebase disabled – skipping push for token %s", token[:20])
        return False

    _init_firebase()
    if _firebase_app is None:
        return False

    try:
        from firebase_admin import messaging

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
            token=token,
        )
        messaging.send(message)
        logger.info("Push sent to token %s…", token[:20])
        return True
    except Exception as exc:
        logger.error("Push send failed: %s", exc)
        return False


def send_push_to_user(
    db: Session, user_id: int, title: str, body: str, data: dict | None = None
) -> bool:
    """Send push notifications to every device registered by a user."""
    devices = db.query(FCMDevice).filter(FCMDevice.user_id == user_id).all()
    any_sent = False
    for device in devices:
        if send_push_notification(device.token, title, body, data):
            any_sent = True
    return any_sent


# ---------------------------------------------------------------------------
# Email notifications
# ---------------------------------------------------------------------------


def send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP."""
    if not config.EMAIL_ENABLED:
        logger.debug("Email disabled – skipping email to %s", to_email)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = f"{config.SMTP_FROM_NAME} <{config.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        plain_text = html_body.replace("<br>", "\n").replace("<br/>", "\n")
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        if config.SMTP_USE_TLS:
            server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT)
            server.starttls()
        else:
            server = smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT)

        if config.SMTP_USERNAME:
            server.login(config.SMTP_USERNAME, config.SMTP_PASSWORD)

        server.sendmail(config.SMTP_FROM_EMAIL, to_email, msg.as_string())
        server.quit()
        logger.info("Email sent to %s", to_email)
        return True
    except Exception as exc:
        logger.error("Email send failed: %s", exc)
        return False


def _build_notification_html(title: str, body: str) -> str:
    """Build a simple HTML email template."""
    return f"""
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #4f46e5; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0;">TimeBudget</h2>
        </div>
        <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h3 style="color: #1f2937;">{title}</h3>
            <p style="color: #4b5563; line-height: 1.6;">{body}</p>
        </div>
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 16px;">
            You received this email from TimeBudget notifications.
        </p>
    </body>
    </html>
    """


# ---------------------------------------------------------------------------
# High-level dispatch
# ---------------------------------------------------------------------------


def get_or_create_preferences(db: Session, user_id: int) -> NotificationPreference:
    """Return the user's notification preferences, creating defaults if needed."""
    prefs = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == user_id)
        .first()
    )
    if prefs is None:
        prefs = NotificationPreference(user_id=user_id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


def _is_type_enabled(prefs: NotificationPreference, notification_type: str) -> bool:
    """Check whether a notification type is enabled in user preferences."""
    type_map = {
        "task_assigned": prefs.task_assigned,
        "task_updated": prefs.task_updated,
        "shift_reminder": prefs.shift_reminder,
        "project_updated": prefs.project_updated,
    }
    return type_map.get(notification_type, True)


def send_notification(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    notification_type: str = "general",
    data: dict | None = None,
) -> Notification:
    """
    Create a notification record and dispatch it through the enabled channels
    (push and/or email) based on the user's preferences.
    """
    from backend.models import User

    prefs = get_or_create_preferences(db, user_id)

    if not _is_type_enabled(prefs, notification_type):
        logger.debug(
            "Notification type '%s' disabled for user %d", notification_type, user_id
        )

    # Determine which channels to use
    channel = "all"
    sent_push = False
    sent_email = False

    # --- Push ---
    if prefs.push_enabled and _is_type_enabled(prefs, notification_type):
        sent_push = send_push_to_user(db, user_id, title, body, data)

    # --- Email ---
    if prefs.email_enabled and _is_type_enabled(prefs, notification_type):
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            html = _build_notification_html(title, body)
            sent_email = send_email(user.email, title, html)

    if sent_push and not sent_email:
        channel = "push"
    elif sent_email and not sent_push:
        channel = "email"
    elif sent_push and sent_email:
        channel = "all"
    else:
        channel = "none"

    # Persist the notification record
    notification = Notification(
        user_id=user_id,
        title=title,
        body=body,
        notification_type=notification_type,
        channel=channel,
        sent_push=sent_push,
        sent_email=sent_email,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification
