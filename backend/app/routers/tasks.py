from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from app import gateway
from app.gateway import OdooGatewayError

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

TASK_FIELDS = ["id", "name", "priority", "stage_id", "child_ids", "user_ids",
               "parent_id", "date_deadline", "description", "project_id", "sequence",
               "allocated_hours"]


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


class RescheduleBody(BaseModel):
    date_start: str       # YYYY-MM-DD
    date_deadline: str    # YYYY-MM-DD


class DependBody(BaseModel):
    predecessor_id: int   # la tâche qui doit se terminer avant (« bloqué par »)


async def _cascade(project_id, anchor_id, anchor_start, anchor_end):
    """Pose les dates de l'ancre puis décale en cascade tout ce qui en dépend.

    Règle : si B est « bloqué par » A, alors début(B) ≥ lendemain de fin(A).
    Les durées sont préservées. Renvoie la liste des tâches modifiées.
    """
    from datetime import date, timedelta
    from collections import deque

    def d(s):
        return date.fromisoformat(s) if isinstance(s, str) and s else (s or None)

    rows = await gateway.search_read(
        "project.task",
        domain=[["project_id", "=", project_id]],
        fields=["id", "date_start", "date_deadline", "depend_on_ids", "allocated_hours"],
        limit=500,
    )
    M = {}
    for t in rows:
        s, e = d(t.get("date_start")), d(t.get("date_deadline"))
        if s and e:
            dur = max((e - s).days, 0)
        elif t.get("allocated_hours"):
            dur = max(round(t["allocated_hours"] / 8) - 1, 0)
        else:
            dur = 0
        M[t["id"]] = {"start": s, "end": e, "dur": dur, "preds": t.get("depend_on_ids") or []}

    if anchor_id not in M:
        raise HTTPException(status_code=404, detail="Tâche absente du projet")

    M[anchor_id]["start"] = d(anchor_start)
    M[anchor_id]["end"] = d(anchor_end)
    M[anchor_id]["dur"] = max((M[anchor_id]["end"] - M[anchor_id]["start"]).days, 0)

    successors = {tid: [] for tid in M}
    for tid, t in M.items():
        for p in t["preds"]:
            if p in successors:
                successors[p].append(tid)

    changed = {anchor_id: (M[anchor_id]["start"], M[anchor_id]["end"])}
    q = deque([anchor_id])
    guard = 0
    while q and guard < 5000:
        guard += 1
        cur = q.popleft()
        cur_end = M[cur]["end"]
        if not cur_end:
            continue
        for s in successors.get(cur, []):
            required = cur_end + timedelta(days=1)
            if M[s]["start"] is None or M[s]["start"] < required:
                M[s]["start"] = required
                M[s]["end"] = required + timedelta(days=M[s]["dur"])
                changed[s] = (M[s]["start"], M[s]["end"])
                q.append(s)

    out = []
    for tid, (s, e) in changed.items():
        await gateway.write("project.task", [tid],
                            {"date_start": s.isoformat(), "date_deadline": e.isoformat()})
        out.append({"id": tid, "date_start": s.isoformat(), "date_deadline": e.isoformat()})
    return out


async def _project_of(task_id):
    base = await gateway.read("project.task", [task_id], ["project_id"])
    if not base or not base[0].get("project_id"):
        raise HTTPException(status_code=404, detail="Tâche ou projet introuvable")
    return base[0]["project_id"][0]


@router.post("/{task_id}/reschedule")
async def reschedule(task_id: int, body: RescheduleBody):
    project_id = await _project_of(task_id)
    out = await _cascade(project_id, task_id, body.date_start, body.date_deadline)
    return {"changed": out, "count": len(out)}


@router.post("/{task_id}/depend-on")
async def add_dependency(task_id: int, body: DependBody):
    """Crée une dépendance : `task_id` devient « bloqué par » predecessor_id,
    puis on re-décale en cascade depuis le prédécesseur."""
    if task_id == body.predecessor_id:
        raise HTTPException(status_code=400, detail="Une tâche ne peut pas dépendre d'elle-même")
    project_id = await _project_of(task_id)
    # Lier (commande Odoo 4 = ajouter un lien vers un enregistrement existant)
    await gateway.write("project.task", [task_id],
                        {"depend_on_ids": [[4, body.predecessor_id]]})
    # Décaler depuis le prédécesseur pour respecter la nouvelle contrainte
    pre = await gateway.read("project.task", [body.predecessor_id], ["date_start", "date_deadline"])
    out = []
    if pre and pre[0].get("date_start") and pre[0].get("date_deadline"):
        out = await _cascade(project_id, body.predecessor_id,
                             pre[0]["date_start"], pre[0]["date_deadline"])
    return {"changed": out, "count": len(out)}


@router.post("/{task_id}/undepend")
async def remove_dependency(task_id: int, body: DependBody):
    """Supprime une dépendance (commande Odoo 3 = délier)."""
    await gateway.write("project.task", [task_id],
                        {"depend_on_ids": [[3, body.predecessor_id]]})
    return {"ok": True}


class ScheduleItem(BaseModel):
    id: int
    date_start: Optional[str] = None
    date_deadline: Optional[str] = None


class BulkScheduleBody(BaseModel):
    items: list[ScheduleItem]


@router.post("/bulk-schedule")
async def bulk_schedule(body: BulkScheduleBody):
    """Met à jour les dates de plusieurs tâches (import d'un chronogramme Excel).
    Écriture directe, sans cascade : le fichier importé fait foi."""
    count = 0
    for it in body.items:
        vals = {}
        if it.date_start:
            vals["date_start"] = it.date_start
        if it.date_deadline:
            vals["date_deadline"] = it.date_deadline
        if not vals:
            continue
        try:
            await gateway.write("project.task", [it.id], vals)
            count += 1
        except OdooGatewayError:
            pass
    return {"updated": count}


@router.get("/stages/all")
async def get_all_stages():
    return await gateway.search_read(
        "project.task.type",
        domain=[],
        fields=["id", "name", "sequence"],
        limit=50,
        order="sequence asc",
    )
