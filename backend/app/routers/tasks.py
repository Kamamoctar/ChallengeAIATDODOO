from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from app import gateway
from app.gateway import OdooGatewayError

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

TASK_FIELDS = ["id", "name", "priority", "stage_id", "child_ids", "user_ids",
               "parent_id", "date_deadline", "description", "project_id", "sequence"]


class TaskCreate(BaseModel):
    name: str
    project_id: Optional[int] = None
    parent_id: Optional[int] = None
    user_ids: Optional[list[int]] = None
    date_deadline: Optional[str] = None
    priority: Optional[str] = "0"
    description: Optional[str] = None


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[str] = None
    stage_id: Optional[int] = None
    date_deadline: Optional[str] = None
    description: Optional[str] = None
    user_ids: Optional[list[int]] = None


@router.get("/mine")
async def get_my_tasks(user_id: int = Query(...)):
    return await gateway.search_read(
        "project.task",
        domain=[["user_ids", "in", [user_id]], ["parent_id", "=", False]],
        fields=TASK_FIELDS,
        limit=100,
        order="priority desc, date_deadline asc",
    )


@router.get("/independent")
async def get_independent_tasks(user_id: int = Query(...)):
    return await gateway.search_read(
        "project.task",
        domain=[["user_ids", "in", [user_id]], ["project_id", "=", False]],
        fields=TASK_FIELDS,
        limit=50,
    )


@router.get("/{task_id}")
async def get_task(task_id: int):
    results = await gateway.read("project.task", [task_id], TASK_FIELDS)
    if not results:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    return results[0]


@router.get("/{task_id}/subtasks")
async def get_subtasks(task_id: int):
    return await gateway.search_read(
        "project.task",
        domain=[["parent_id", "=", task_id]],
        fields=TASK_FIELDS,
        limit=100,
        order="sequence asc",
    )


@router.post("", status_code=201)
async def create_task(body: TaskCreate):
    try:
        values: dict = {"name": body.name, "priority": body.priority or "0"}
        if body.project_id:
            values["project_id"] = body.project_id
        if body.parent_id:
            values["parent_id"] = body.parent_id
        if body.user_ids:
            values["user_ids"] = [[6, 0, body.user_ids]]
        if body.date_deadline:
            values["date_deadline"] = body.date_deadline
        if body.description:
            values["description"] = body.description
        record_id = await gateway.create("project.task", values)
        return {"id": record_id}
    except OdooGatewayError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{task_id}")
async def update_task(task_id: int, body: TaskUpdate):
    values = {}
    if body.name is not None:
        values["name"] = body.name
    if body.priority is not None:
        values["priority"] = body.priority
    if body.stage_id is not None:
        values["stage_id"] = body.stage_id
    if body.date_deadline is not None:
        values["date_deadline"] = body.date_deadline
    if body.description is not None:
        values["description"] = body.description
    if body.user_ids is not None:
        values["user_ids"] = [[6, 0, body.user_ids]]
    if not values:
        raise HTTPException(status_code=400, detail="Aucune valeur à mettre à jour")
    try:
        await gateway.write("project.task", [task_id], values)
        return {"ok": True}
    except OdooGatewayError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stages/all")
async def get_all_stages():
    return await gateway.search_read(
        "project.task.type",
        domain=[],
        fields=["id", "name", "sequence"],
        limit=50,
        order="sequence asc",
    )
