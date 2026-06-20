from datetime import date
from app import gateway
from app.bot import nlp_parser
from app.config import settings


async def cmd_aide() -> str:
    return (
        "Commandes disponibles :\n\n"
        "/log <Xh> <Projet> - <description>\n"
        "  Ex: /log 3h Projet Alpha - correction bug\n\n"
        "/aujourd'hui — Mes entrées du jour\n"
        "/projets — Liste des projets\n"
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
