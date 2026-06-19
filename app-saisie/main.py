"""
Saisie Odoo — application web de saisie quotidienne (feuilles de temps).

Backend FastAPI qui sert de proxy sécurisé vers la passerelle Odoo du concours.
La clé API n'est jamais exposée au navigateur : seul ce backend la connaît
(via la variable d'environnement GATEWAY_API_KEY).

Lancer :  uvicorn main:app --reload
Puis ouvrir http://127.0.0.1:8000
"""

import os
from datetime import date, timedelta

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from gateway import GatewayError, OdooGateway

load_dotenv()

HERE = os.path.dirname(__file__)
TIMESHEET_MODEL = "account.analytic.line"

# Les 2 équipiers du binôme (identifiants hr.employee). Non secrets.
MEMBERS = [
    {"id": int(os.environ.get("MEMBER_A_ID", 32)),
     "name": os.environ.get("MEMBER_A_NAME", "SOSSOU Candide")},
    {"id": int(os.environ.get("MEMBER_B_ID", 291)),
     "name": os.environ.get("MEMBER_B_NAME", "NAMADOU Moctar")},
]
MEMBER_IDS = [m["id"] for m in MEMBERS]

app = FastAPI(title="Saisie Odoo")
gw = OdooGateway()  # lève une erreur claire au démarrage si la clé manque


def guard(fn):
    """Convertit les GatewayError en réponses HTTP lisibles côté navigateur."""
    try:
        return fn()
    except GatewayError as e:
        raise HTTPException(status_code=e.status or 502, detail=e.detail)


# ----------------------------------------------------------------------------
# Modèles de requête
# ----------------------------------------------------------------------------
class TimesheetIn(BaseModel):
    employee_id: int
    project_id: int
    task_id: int | None = None
    date: str = Field(default_factory=lambda: date.today().isoformat())
    hours: float = Field(gt=0, le=24)
    description: str = Field(min_length=1, max_length=500)


class TimesheetEdit(BaseModel):
    hours: float | None = Field(default=None, gt=0, le=24)
    description: str | None = None
    date: str | None = None


# ----------------------------------------------------------------------------
# API
# ----------------------------------------------------------------------------
@app.get("/api/config")
def config():
    """Données de démarrage pour le front : membres + date du jour."""
    return {"members": MEMBERS, "today": date.today().isoformat()}


@app.get("/api/health")
def health():
    return guard(gw.health)


@app.get("/api/projects")
def projects(q: str = "", limit: int = 50):
    domain = [["name", "ilike", q]] if q else []
    rows = guard(lambda: gw.search_read(
        "project.project", domain=domain, fields=["id", "name"],
        limit=limit, order="name"))
    return rows


@app.get("/api/tasks")
def tasks(project_id: int, q: str = "", limit: int = 100):
    domain = [["project_id", "=", project_id]]
    if q:
        domain.append(["name", "ilike", q])
    rows = guard(lambda: gw.search_read(
        "project.task", domain=domain,
        fields=["id", "name", "stage_id", "date_deadline"],
        limit=limit, order="name"))
    return rows


@app.get("/api/timesheets")
def timesheets(employee_id: int | None = None, days: int = 14, limit: int = 50):
    ids = [employee_id] if employee_id else MEMBER_IDS
    since = (date.today() - timedelta(days=days)).isoformat()
    domain = [["employee_id", "in", ids], ["date", ">=", since]]
    rows = guard(lambda: gw.search_read(
        TIMESHEET_MODEL, domain=domain,
        fields=["id", "name", "date", "unit_amount",
                "employee_id", "project_id", "task_id"],
        limit=limit, order="date desc, id desc"))
    total = round(sum(r.get("unit_amount") or 0 for r in rows), 2)
    return {"entries": rows, "total_hours": total, "since": since}


@app.post("/api/timesheets")
def create_timesheet(body: TimesheetIn):
    if body.employee_id not in MEMBER_IDS:
        raise HTTPException(
            status_code=400,
            detail="employee_id hors du périmètre du binôme.")
    values = {
        "name": body.description,
        "employee_id": body.employee_id,
        "project_id": body.project_id,
        "date": body.date,
        "unit_amount": body.hours,
    }
    if body.task_id:
        values["task_id"] = body.task_id
    new_id = guard(lambda: gw.create(TIMESHEET_MODEL, values))
    return {"id": new_id, "values": values}


@app.patch("/api/timesheets/{entry_id}")
def edit_timesheet(entry_id: int, body: TimesheetEdit):
    # On ne modifie que des lignes appartenant au binôme.
    rows = guard(lambda: gw.read(TIMESHEET_MODEL, [entry_id], ["employee_id"]))
    if not rows or rows[0]["employee_id"][0] not in MEMBER_IDS:
        raise HTTPException(status_code=403, detail="Ligne hors du binôme.")
    values = {}
    if body.hours is not None:
        values["unit_amount"] = body.hours
    if body.description is not None:
        values["name"] = body.description
    if body.date is not None:
        values["date"] = body.date
    if not values:
        raise HTTPException(status_code=400, detail="Rien à modifier.")
    guard(lambda: gw.write(TIMESHEET_MODEL, [entry_id], values))
    return {"id": entry_id, "values": values}


# ----------------------------------------------------------------------------
# Frontend statique
# ----------------------------------------------------------------------------
app.mount("/static", StaticFiles(directory=os.path.join(HERE, "static")), name="static")


@app.get("/")
def index():
    return FileResponse(os.path.join(HERE, "static", "index.html"))
