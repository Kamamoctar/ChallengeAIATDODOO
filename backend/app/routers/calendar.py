"""Vue calendrier hebdomadaire : réunions (RDV) + échéances de tâches.

Les RDV viennent de `calendar.event`. Quand un RDV est rattaché à un projet
(res_model = 'project.project'), on résout le nom du projet pour l'afficher.
Les échéances viennent des tâches (`project.task`) assignées au membre — elles
portent naturellement le nom du projet.
"""

from fastapi import APIRouter, Query
from app import gateway

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
