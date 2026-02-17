from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Shift
from backend.schemas.shift import ShiftCreate, ShiftRead, ShiftUpdate

router = APIRouter()


@router.get("/", response_model=list[ShiftRead])
def list_shifts(
    user_id: int | None = Query(None),
    date: date | None = Query(None, alias="date"),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Shift)
    if user_id is not None:
        query = query.filter(Shift.user_id == user_id)
    if date is not None:
        day_start = datetime.combine(date, time.min)
        day_end = datetime.combine(date, time.max)
        query = query.filter(Shift.start_time >= day_start, Shift.start_time <= day_end)
    elif date_from is not None and date_to is not None:
        range_start = datetime.combine(date_from, time.min)
        range_end = datetime.combine(date_to, time.max)
        query = query.filter(Shift.start_time >= range_start, Shift.start_time <= range_end)
    return query.order_by(Shift.start_time).all()


@router.get("/{shift_id}", response_model=ShiftRead)
def get_shift(shift_id: int, db: Session = Depends(get_db)):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return shift


@router.post("/", response_model=ShiftRead)
def create_shift(data: ShiftCreate, db: Session = Depends(get_db)):
    shift = Shift(
        start_time=data.start_time,
        end_time=data.end_time,
        user_id=data.user_id,
        project_id=data.project_id,
    )
    db.add(shift)
    db.commit()
    db.refresh(shift)
    return shift


@router.patch("/{shift_id}", response_model=ShiftRead)
def update_shift(shift_id: int, data: ShiftUpdate, db: Session = Depends(get_db)):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(shift, key, value)
    db.commit()
    db.refresh(shift)
    return shift


@router.delete("/{shift_id}", status_code=204)
def delete_shift(shift_id: int, db: Session = Depends(get_db)):
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    db.delete(shift)
    db.commit()
    return None
