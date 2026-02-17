import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the backend directory (or project root as fallback)
_backend_dir = Path(__file__).resolve().parent
_env_file = _backend_dir / ".env"
if not _env_file.exists():
    _env_file = _backend_dir.parent / ".env"
load_dotenv(_env_file)


# --- Application ---
SECRET_KEY = os.getenv("SECRET_KEY", "timebudget-dev-secret-change-in-production")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./timebudget.db")


# --- Firebase Cloud Messaging ---
FIREBASE_CREDENTIALS_PATH = os.getenv(
    "FIREBASE_CREDENTIALS_PATH", "firebase-service-account.json"
)
FIREBASE_ENABLED = os.getenv("FIREBASE_ENABLED", "false").lower() == "true"


# --- Email / SMTP ---
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "TimeBudget")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "false").lower() == "true"


# --- Shift Reminder Scheduler ---
SHIFT_REMINDER_MINUTES = int(os.getenv("SHIFT_REMINDER_MINUTES", "5"))
SCHEDULER_ENABLED = os.getenv("SCHEDULER_ENABLED", "true").lower() == "true"
SCHEDULER_CHECK_INTERVAL_SECONDS = int(
    os.getenv("SCHEDULER_CHECK_INTERVAL_SECONDS", "60")
)
