from datetime import datetime

from pydantic import BaseModel


class TaskBase(BaseModel):
    title: str
    description: str | None = None
    status: str = "pending"
    project_id: int
    user_id: int | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    project_id: int | None = None
    user_id: int | None = None


class TaskRead(TaskBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
