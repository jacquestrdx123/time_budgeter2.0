"""
Shift-reminder scheduler.

Uses APScheduler to run a periodic job that looks for shifts starting within
the configured reminder window (default 5 minutes) and sends push/email
notifications to the assigned users.
"""

import logging
from datetime import datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from backend import config
from backend.database import SessionLocal
from backend.models.shift import Shift

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def check_upcoming_shifts():
    """
    Query for shifts starting within SHIFT_REMINDER_MINUTES that have not yet
    had a reminder sent, then dispatch a notification for each one.
    """
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        window_end = now + timedelta(minutes=config.SHIFT_REMINDER_MINUTES)

        upcoming = (
            db.query(Shift)
            .filter(
                Shift.start_time > now,
                Shift.start_time <= window_end,
                Shift.reminder_sent == False,  # noqa: E712
            )
            .all()
        )

        if not upcoming:
            return

        logger.info(
            "Found %d shift(s) starting within %d minutes",
            len(upcoming),
            config.SHIFT_REMINDER_MINUTES,
        )

        from backend.services.notification_service import send_notification

        for shift in upcoming:
            project_name = shift.project.name if shift.project else "Unknown project"
            start_str = shift.start_time.strftime("%H:%M")

            title = "Shift starting soon"
            body = (
                f"Your shift on {project_name} starts at {start_str} "
                f"(in ~{config.SHIFT_REMINDER_MINUTES} min)."
            )

            try:
                send_notification(
                    db=db,
                    user_id=shift.user_id,
                    title=title,
                    body=body,
                    notification_type="shift_reminder",
                    data={
                        "shift_id": shift.id,
                        "project_id": shift.project_id,
                        "start_time": shift.start_time.isoformat(),
                    },
                )
                shift.reminder_sent = True
                db.commit()
                logger.info(
                    "Reminder sent for shift %d (user %d, project %s at %s)",
                    shift.id,
                    shift.user_id,
                    project_name,
                    start_str,
                )
            except Exception as exc:
                db.rollback()
                logger.error("Failed to send reminder for shift %d: %s", shift.id, exc)

    except Exception as exc:
        logger.error("Shift reminder check failed: %s", exc)
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler with the shift-reminder job."""
    if not config.SCHEDULER_ENABLED:
        logger.info("Scheduler disabled via SCHEDULER_ENABLED=false")
        return

    scheduler.add_job(
        check_upcoming_shifts,
        trigger=IntervalTrigger(seconds=config.SCHEDULER_CHECK_INTERVAL_SECONDS),
        id="shift_reminder_check",
        name="Check for upcoming shifts and send reminders",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        "Shift reminder scheduler started (checking every %ds, reminder window %d min)",
        config.SCHEDULER_CHECK_INTERVAL_SECONDS,
        config.SHIFT_REMINDER_MINUTES,
    )


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler shut down")
