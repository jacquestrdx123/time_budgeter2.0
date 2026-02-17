from datetime import datetime

from pydantic import BaseModel


class ShiftBase(BaseModel):
    start_time: datetime
    end_time: datetime
    user_id: int
    project_id: int


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(BaseModel):
    start_time: datetime | None = None
    end_time: datetime | None = None
    user_id: int | None = None
    project_id: int | None = None


class ShiftRead(ShiftBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
