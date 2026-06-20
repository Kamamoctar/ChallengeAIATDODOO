from pydantic import BaseModel
from typing import Optional


class TimesheetCreate(BaseModel):
    employee_id: int
    project_id: int
    task_id: Optional[int] = None
    name: str
    date: str  # YYYY-MM-DD
    unit_amount: float  # heures


class TimesheetUpdate(BaseModel):
    unit_amount: Optional[float] = None
    name: Optional[str] = None
    task_id: Optional[int] = None
