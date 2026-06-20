from datetime import date, timedelta
from fastapi import APIRouter, HTTPException, Query
from app import gateway
from app.gateway import OdooGatewayError
from app.models.timesheet import TimesheetCreate, TimesheetUpdate

router = APIRouter(prefix="/api/timesheets", tags=["timesheets"])

FIELDS = ["id", "name", "date", "unit_amount", "employee_id", "project_id", "task_id"]


@router.get("/today")
async def get_today(employee_id: int = Query(...)):
    today = date.today().isoformat()
    return await gateway.search_read(
        "account.analytic.line",
        domain=[["employee_id", "=", employee_id], ["date", "=", today]],
        fields=FIELDS,
        order="date desc",
    )


@router.get("/week")
async def get_week(employee_id: int = Query(...), days: int = Query(7)):
    since = (date.today() - timedelta(days=days)).isoformat()
    return await gateway.search_read(
        "account.analytic.line",
        domain=[["employee_id", "=", employee_id], ["date", ">=", since]],
        fields=FIELDS,
        limit=200,
        order="date desc",
    )


@router.post("", status_code=201)
async def create_timesheet(body: TimesheetCreate):
    try:
        values = {
            "name": body.name,
            "employee_id": body.employee_id,
            "project_id": body.project_id,
            "date": body.date,
            "unit_amount": body.unit_amount,
        }
        if body.task_id:
            values["task_id"] = body.task_id
        record_id = await gateway.create("account.analytic.line", values)
        return {"id": record_id}
    except OdooGatewayError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{record_id}")
async def update_timesheet(record_id: int, body: TimesheetUpdate):
    values = {k: v for k, v in body.model_dump().items() if v is not None}
    if not values:
        raise HTTPException(status_code=400, detail="Aucune valeur à mettre à jour")
    try:
        await gateway.write("account.analytic.line", [record_id], values)
        return {"ok": True}
    except OdooGatewayError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{record_id}")
async def delete_timesheet(record_id: int):
    try:
        await gateway.unlink("account.analytic.line", [record_id])
        return {"ok": True}
    except OdooGatewayError as e:
        raise HTTPException(status_code=400, detail=str(e))
