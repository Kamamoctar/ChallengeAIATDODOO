from fastapi import APIRouter
from app import gateway

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
async def get_projects():
    return await gateway.get_projects()


@router.get("/{project_id}/tasks")
async def get_tasks(project_id: int):
    return await gateway.get_tasks_for_project(project_id)
