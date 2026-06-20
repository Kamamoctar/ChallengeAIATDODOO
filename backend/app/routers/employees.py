from fastapi import APIRouter
from app.config import settings

router = APIRouter(prefix="/api/employees", tags=["employees"])


@router.get("")
async def get_employees():
    return [
        {"id": settings.employee_a_id, "name": settings.employee_a_name, "label": "A"},
        {"id": settings.employee_b_id, "name": settings.employee_b_name, "label": "B"},
    ]
