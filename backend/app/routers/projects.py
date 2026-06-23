from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app import gateway
from app.gateway import OdooGatewayError

router = APIRouter(prefix="/api/projects", tags=["projects"])

PROJ_FIELDS = ["id", "name", "user_id", "date", "description", "tag_ids", "company_id"]
TASK_FIELDS = ["id", "name", "priority", "stage_id", "child_ids", "user_ids",
               "parent_id", "date_deadline", "description", "sequence"]


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    date: Optional[str] = None
    user_id: Optional[int] = None


@router.get("")
async def get_projects():
    return await gateway.get_projects()


@router.get("/detail")
async def get_projects_detail():
    return await gateway.search_read(
        "project.project", domain=[], fields=PROJ_FIELDS, limit=500, order="name asc"
    )


@router.get("/{project_id}")
async def get_project(project_id: int):
    results = await gateway.read("project.project", [project_id], PROJ_FIELDS)
    if not results:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return results[0]


@router.get("/{project_id}/tasks")
async def get_tasks(project_id: int):
    return await gateway.get_tasks_for_project(project_id)


@router.get("/{project_id}/tasks/tree")
async def get_task_tree(project_id: int):
    all_tasks = await gateway.search_read(
        "project.task",
        domain=[["project_id", "=", project_id]],
        fields=TASK_FIELDS,
        limit=300,
        order="sequence asc",
    )
    return all_tasks


@router.put("/{project_id}")
async def update_project(project_id: int, body: dict):
    try:
        await gateway.write("project.project", [project_id], body)
        return {"ok": True}
    except OdooGatewayError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("", status_code=201)
async def create_project(body: ProjectCreate):
    try:
        values: dict = {"name": body.name}
        if body.description:
            values["description"] = body.description
        if body.date:
            values["date"] = body.date
        if body.user_id:
            values["user_id"] = body.user_id
        record_id = await gateway.create("project.project", values)
        return {"id": record_id}
    except OdooGatewayError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{template_id}/clone", status_code=201)
async def clone_project(template_id: int, body: ProjectCreate):
    try:
        # 1. Créer le nouveau projet
        values: dict = {"name": body.name}
        if body.description:
            values["description"] = body.description
        if body.date:
            values["date"] = body.date
        if body.user_id:
            values["user_id"] = body.user_id
        new_project_id = await gateway.create("project.project", values)

        # 2. Copier les tâches racines du template
        template_tasks = await gateway.search_read(
            "project.task",
            domain=[["project_id", "=", template_id], ["parent_id", "=", False]],
            fields=["id", "name", "sequence", "priority"],
            limit=100,
        )
        for t in template_tasks:
            await gateway.create("project.task", {
                "name": t["name"],
                "project_id": new_project_id,
                "priority": t.get("priority", "0"),
                "sequence": t.get("sequence", 10),
            })

        return {"id": new_project_id, "tasks_copied": len(template_tasks)}
    except OdooGatewayError as e:
        raise HTTPException(status_code=400, detail=str(e))
