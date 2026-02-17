from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models.setting import SystemSetting
from backend.schemas.setting import SettingCreate, SettingRead, SettingUpdate

router = APIRouter()

DEFAULTS = [
    {
        "key": "day_start_hour",
        "value": "8",
        "label": "Work Day Start Hour",
        "description": "The hour the work day begins (24h format).",
        "setting_type": "number",
    },
    {
        "key": "day_end_hour",
        "value": "16",
        "label": "Work Day End Hour",
        "description": "The hour the work day ends (24h format).",
        "setting_type": "number",
    },
    {
        "key": "day_hours",
        "value": "8",
        "label": "Work Day Length (hours)",
        "description": "Total working hours in a standard day.",
        "setting_type": "number",
    },
    {
        "key": "company_name",
        "value": "Our Team",
        "label": "Company / Team Name",
        "description": "Displayed in the team schedule header.",
        "setting_type": "string",
    },
    {
        "key": "week_start",
        "value": "monday",
        "label": "Week Starts On",
        "description": "First day of the working week.",
        "setting_type": "select:monday,tuesday,wednesday,thursday,friday,saturday,sunday",
    },
]


def seed_defaults(db: Session) -> None:
    """Insert default settings that don't already exist."""
    existing = {s.key for s in db.query(SystemSetting.key).all()}
    for d in DEFAULTS:
        if d["key"] not in existing:
            db.add(SystemSetting(**d))
    db.commit()


@router.get("/", response_model=list[SettingRead])
def list_settings(db: Session = Depends(get_db)):
    return db.query(SystemSetting).order_by(SystemSetting.key).all()


@router.get("/{key}", response_model=SettingRead)
def get_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting


@router.put("/{key}", response_model=SettingRead)
def update_setting(key: str, data: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    setting.value = data.value
    db.commit()
    db.refresh(setting)
    return setting


@router.post("/", response_model=SettingRead, status_code=201)
def create_setting(data: SettingCreate, db: Session = Depends(get_db)):
    existing = db.query(SystemSetting).filter(SystemSetting.key == data.key).first()
    if existing:
        raise HTTPException(status_code=409, detail="Setting already exists")
    setting = SystemSetting(**data.model_dump())
    db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


@router.delete("/{key}", status_code=204)
def delete_setting(key: str, db: Session = Depends(get_db)):
    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    db.delete(setting)
    db.commit()
    return None
