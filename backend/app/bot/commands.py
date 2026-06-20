import re
from datetime import date, timedelta
from app import gateway
from app.bot import nlp_parser
from app.config import settings

_PHASE_LABELS = {
    'Initiating':   '🚀 Initiating',
    'Planning':     '📋 Planning',
    'Implementing': '⚙️ Réalisation',
    'Controlling':  '🔍 Contrôle',
    'Closing':      '✅ Clôture',
}

def _parse_phase(desc: str) -> str:
    m = re.search(r'<!-- ISO21500-PHASE:(\w+) -->', desc or '')
    if m:
        return _PHASE_LABELS.get(m.group(1), m.group(1))
    return '📋 Planning'


async def cmd_aide() -> str:
    return (
        "Commandes disponibles :\n\n"
        "/log <Xh> <Projet> - <description>\n"
        "  Ex: /log 3h Projet Alpha - correction bug\n\n"
        "/aujourd'hui — Mes entrées du jour\n"
        "/semaine — Mon bilan de la semaine\n"
        "/projets — Liste des projets\n"
        "/portefeuille — Projets avec phases ISO\n"
        "/retard — Projets en retard\n"
        "/aide — Cette aide\n\n"
        "Ou en langage naturel :\n"
        '"j\'ai travaillé 2h sur Projet Alpha hier"'
    )


async def cmd_projets() -> str:
    projects = await gateway.get_projects()
    if not projects:
        return "Aucun projet trouvé."
    lines = [f"• {p['name']} (id:{p['id']})" for p in projects[:30]]
    return "Projets disponibles :\n" + "\n".join(lines)


async def cmd_aujourd_hui(employee_id: int) -> str:
    today = date.today().isoformat()
    entries = await gateway.search_read(
        "account.analytic.line",
        domain=[["employee_id", "=", employee_id], ["date", "=", today]],
        fields=["id", "name", "unit_amount", "project_id"],
        order="id asc",
    )
    if not entries:
        return f"Aucune entrée pour aujourd'hui ({today})."
    total = sum(e["unit_amount"] for e in entries)
    lines = [f"• {e['unit_amount']}h — {e['project_id'][1] if e.get('project_id') else '?'} — {e['name']}" for e in entries]
    lines.append(f"\nTotal : {total:.1f}h")
    return "\n".join(lines)


async def cmd_semaine(employee_id: int) -> str:
    today = date.today()
    week_start = (today - timedelta(days=today.weekday())).isoformat()
    entries = await gateway.search_read(
        "account.analytic.line",
        domain=[["employee_id", "=", employee_id], ["date", ">=", week_start]],
        fields=["id", "name", "unit_amount", "project_id", "date"],
        order="date asc",
    )
    if not entries:
        return f"Aucune entrée cette semaine (depuis le {week_start})."
    total = sum(e["unit_amount"] for e in entries)
    by_project: dict = {}
    for e in entries:
        pname = e["project_id"][1] if e.get("project_id") else "Sans projet"
        by_project[pname] = by_project.get(pname, 0) + e["unit_amount"]
    lines = ["📊 <b>Bilan semaine</b>\n"]
    for pname, h in sorted(by_project.items(), key=lambda x: -x[1]):
        lines.append(f"• {h:.1f}h — {pname}")
    lines.append(f"\n<b>Total : {total:.1f}h / 40h</b>")
    if total >= 40:
        lines.append("🔥 Objectif atteint !")
    elif total >= 32:
        lines.append(f"⏳ {40 - total:.1f}h pour atteindre l'objectif")
    return "\n".join(lines)


async def cmd_portefeuille() -> str:
    projects = await gateway.search_read(
        "project.project",
        domain=[["active", "=", True]],
        fields=["id", "name", "date", "description"],
        order="name asc",
    )
    if not projects:
        return "Aucun projet trouvé."
    lines = ["📂 <b>Portefeuille projets</b>\n"]
    for p in projects[:25]:
        phase = _parse_phase(p.get("description", ""))
        deadline = f" · 📅 {p['date']}" if p.get("date") else ""
        overdue = ""
        if p.get("date") and p["date"] < date.today().isoformat():
            overdue = " ⚠️"
        lines.append(f"• {phase} — {p['name']}{deadline}{overdue}")
    return "\n".join(lines)


async def cmd_retard() -> str:
    today = date.today().isoformat()
    projects = await gateway.search_read(
        "project.project",
        domain=[["active", "=", True], ["date", "<", today]],
        fields=["id", "name", "date", "description"],
        order="date asc",
    )
    if not projects:
        return "✅ Aucun projet en retard. Bravo !"
    lines = [f"🚨 <b>{len(projects)} projet(s) en retard</b>\n"]
    for p in projects:
        from datetime import date as dt
        try:
            d = dt.fromisoformat(p["date"])
            days_late = (dt.today() - d).days
            lines.append(f"• {p['name']} — {p['date']} ({days_late}j de retard)")
        except Exception:
            lines.append(f"• {p['name']}")
    return "\n".join(lines)


async def handle_log(text: str, employee_id: int) -> str:
    # Strip "/log" prefix if present
    text = text.lstrip("/log").strip() if text.lower().startswith("/log") else text

    projects = await gateway.get_projects()
    parsed = nlp_parser.parse(text, projects)

    if parsed.hours is None:
        return (
            "Je n'ai pas compris les heures.\n"
            "Format : /log 3h Projet Alpha - description\n"
            "Ou : 3h Projet Alpha - description"
        )

    if parsed.project_name is None or parsed.confidence < 0.4:
        return (
            "Je n'ai pas trouvé le projet. Vérifiez avec /projets.\n"
            f"Texte reçu : {text}"
        )

    project_id = nlp_parser.find_project_id(parsed.project_name, projects)
    if project_id is None:
        return f"Projet '{parsed.project_name}' introuvable. Utilisez /projets pour voir la liste."

    description = parsed.description or parsed.project_name
    record_id = await gateway.create("account.analytic.line", {
        "name": description,
        "employee_id": employee_id,
        "project_id": project_id,
        "date": parsed.entry_date,
        "unit_amount": parsed.hours,
    })

    confirm = (
        f"Enregistré ✓\n"
        f"• {parsed.hours}h sur {parsed.project_name}\n"
        f"• Description : {description}\n"
        f"• Date : {parsed.entry_date}\n"
        f"• ID Odoo : {record_id}"
    )
    if parsed.confidence < 0.7:
        confirm += f"\n\n(Projet trouvé par approximation — confiance {parsed.confidence:.0%})"
    return confirm
