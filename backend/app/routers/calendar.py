"""Vue calendrier hebdomadaire : réunions (RDV) + échéances de tâches.

Les RDV viennent de `calendar.event`. Quand un RDV est rattaché à un projet
(res_model = 'project.project'), on résout le nom du projet pour l'afficher.
Les échéances viennent des tâches (`project.task`) assignées au membre — elles
portent naturellement le nom du projet.
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from app import gateway
from app.gateway import OdooGatewayError

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

EVENT_FIELDS = ["id", "name", "start", "stop", "allday", "location",
                "videocall_location", "res_model", "res_id", "res_model_name"]


@router.get("/week")
async def get_week(user_id: int = Query(...), start: str = Query(...), days: int = 7):
    """RDV + échéances entre `start` (YYYY-MM-DD) et start + days jours."""
    # Bornes de la fenêtre
    from datetime import date, timedelta
    start_d = date.fromisoformat(start)
    end_d = start_d + timedelta(days=days - 1)
    start_s, end_s = start_d.isoformat(), end_d.isoformat()

    # 1) Réunions du membre (en tant qu'organisateur) dans la fenêtre
    meetings = await gateway.search_read(
        "calendar.event",
        domain=[["user_id", "=", user_id],
                ["start", ">=", f"{start_s} 00:00:00"],
                ["start", "<=", f"{end_s} 23:59:59"]],
        fields=EVENT_FIELDS,
        limit=200,
        order="start asc",
    )

    # Résoudre le nom des projets rattachés aux RDV
    proj_ids = sorted({m["res_id"] for m in meetings
                       if m.get("res_model") == "project.project" and m.get("res_id")})
    proj_names = {}
    if proj_ids:
        rows = await gateway.read("project.project", proj_ids, ["id", "name"])
        proj_names = {r["id"]: r["name"] for r in rows}
    for m in meetings:
        if m.get("res_model") == "project.project":
            m["project_id"] = [m["res_id"], proj_names.get(m["res_id"], "Projet")]
        else:
            m["project_id"] = None

    # 2) Échéances de tâches du membre dans la fenêtre (porteuses du projet)
    deadlines = await gateway.search_read(
        "project.task",
        domain=[["user_ids", "in", [user_id]],
                ["date_deadline", ">=", start_s],
                ["date_deadline", "<=", end_s]],
        fields=["id", "name", "date_deadline", "project_id"],
        limit=200,
        order="date_deadline asc",
    )

    return {"start": start_s, "end": end_s, "meetings": meetings, "deadlines": deadlines}


@router.get("/resource-types")
async def resource_types():
    """Ressources réservables (VOITURE, SALLE…)."""
    return await gateway.search_read(
        "resource.booking.type", fields=["id", "name"], limit=50, order="name asc")


class EventCreate(BaseModel):
    name: str
    date: str            # YYYY-MM-DD
    start_time: str      # HH:MM
    end_time: str        # HH:MM
    user_id: Optional[int] = None
    project_id: Optional[int] = None
    task_id: Optional[int] = None
    location: Optional[str] = None
    videocall: Optional[str] = None
    resource_type_id: Optional[int] = None


@router.post("/event")
async def create_event(body: EventCreate):
    """Crée un RDV (calendar.event), le lie à un projet/tâche, et réserve
    optionnellement une ressource (resource.booking)."""
    from datetime import datetime

    start = f"{body.date} {body.start_time}:00"
    stop = f"{body.date} {body.end_time}:00"
    if stop <= start:
        raise HTTPException(status_code=400, detail="L'heure de fin doit être après le début")

    values = {"name": body.name, "start": start, "stop": stop}
    if body.user_id:
        values["user_id"] = body.user_id
    if body.location:
        values["location"] = body.location
    if body.videocall:
        values["videocall_location"] = body.videocall
    created = await gateway.create("calendar.event", values)
    event_id = created["id"] if isinstance(created, dict) else created

    # Lien vers une tâche (prioritaire) ou un projet
    if body.task_id:
        await gateway.write("calendar.event", [event_id],
                            {"res_model": "project.task", "res_id": body.task_id})
    elif body.project_id:
        await gateway.write("calendar.event", [event_id],
                            {"res_model": "project.project", "res_id": body.project_id})

    # Réservation de ressource optionnelle
    booking_id = None
    booking_error = None
    if body.resource_type_id:
        t0 = datetime.strptime(start, "%Y-%m-%d %H:%M:%S")
        t1 = datetime.strptime(stop, "%Y-%m-%d %H:%M:%S")
        dur = max((t1 - t0).total_seconds() / 3600, 0.5)
        partner_ids = []
        if body.user_id:
            emp = await gateway.search_read(
                "hr.employee", domain=[["user_id", "=", body.user_id]],
                fields=["user_partner_id"], limit=1)
            if emp and emp[0].get("user_partner_id"):
                partner_ids = [emp[0]["user_partner_id"][0]]
        bvals = {"name": body.name, "type_id": body.resource_type_id,
                 "start": start, "stop": stop, "duration": dur}
        if body.user_id:
            bvals["referent_id"] = body.user_id
        if partner_ids:
            bvals["partner_ids"] = [[6, 0, partner_ids]]
        try:
            b = await gateway.create("resource.booking", bvals)
            booking_id = b["id"] if isinstance(b, dict) else b
            try:
                await gateway.write("calendar.event", [event_id],
                                    {"resource_booking_ids": [[4, booking_id]]})
            except OdooGatewayError:
                pass
        except OdooGatewayError as e:
            booking_error = str(e)

    return {"event_id": event_id, "booking_id": booking_id, "booking_error": booking_error}
