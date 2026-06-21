import re
from datetime import date, timedelta
from app import gateway
from app.bot import nlp_parser
from app.config import settings

# ─── Helpers ────────────────────────────────────────────────────────────────

_PHASE_LABELS = {
    'Initiating':   '🚀 Init.',
    'Planning':     '📋 Plan.',
    'Implementing': '⚙️ Réal.',
    'Controlling':  '🔍 Ctrl.',
    'Closing':      '✅ Clôture',
}

_META_RE = re.compile(r'<!-- ISO21500-META:([\s\S]+?) -->')
_PHASE_RE = re.compile(r'<!-- ISO21500-PHASE:(\w+) -->')

def _parse_phase(desc: str) -> str:
    m = _PHASE_RE.search(desc or '')
    return _PHASE_LABELS.get(m.group(1), m.group(1)) if m else '📋 Plan.'

def _parse_meta(desc: str) -> dict:
    m = _META_RE.search(desc or '')
    if not m:
        return {}
    try:
        import json
        return json.loads(m.group(1))
    except Exception:
        return {}

def _risk_level(meta: dict) -> str:
    niveau = meta.get('niveau', '')
    if niveau:
        return niveau
    try:
        score = int(meta.get('probabilite', 0)) * int(meta.get('impact', 0))
        if score >= 16: return 'Critique'
        if score >= 9:  return 'Élevé'
        if score >= 4:  return 'Moyen'
        return 'Faible'
    except Exception:
        return '?'

def _risk_emoji(level: str) -> str:
    return {'Critique': '🔴', 'Élevé': '🟠', 'Moyen': '🟡', 'Faible': '🟢'}.get(level, '⚪')

def _bar(current: float, goal: float, width: int = 10) -> str:
    filled = round(min(current / goal, 1.0) * width)
    return '█' * filled + '░' * (width - filled)

# ─── /aide ──────────────────────────────────────────────────────────────────

async def cmd_aide() -> str:
    return (
        "📖 <b>Commandes ATD Bot</b>\n\n"
        "<b>⏱ Temps</b>\n"
        "/log 3h Projet - description\n"
        "/aujourd'hui — Mes entrées du jour\n"
        "/semaine — Bilan semaine\n"
        "/mois — Bilan mensuel\n"
        "/modifier &lt;id&gt; &lt;heures&gt; — Modifier une entrée\n"
        "/supprimer &lt;id&gt; — Supprimer une entrée\n\n"
        "<b>📋 Tâches</b>\n"
        "/taches — Mes tâches ouvertes\n\n"
        "<b>📁 Projets</b>\n"
        "/projets — Liste des projets\n"
        "/portefeuille — Projets avec phases ISO\n"
        "/projet &lt;nom&gt; — Fiche d'un projet\n"
        "/retard — Projets en retard\n"
        "/risques — Risques élevés / critiques\n\n"
        "<b>👥 Équipe</b>\n"
        "/equipe — Activité de l'équipe aujourd'hui\n"
        "/recap — Récap journalier à partager\n\n"
        "💬 Ou en langage naturel :\n"
        "<i>3h Projet Alpha - correction bug</i>"
    )

# ─── /projets ───────────────────────────────────────────────────────────────

async def cmd_projets() -> str:
    projects = await gateway.get_projects()
    if not projects:
        return "Aucun projet trouvé."
    lines = [f"• {p['name']} (id:{p['id']})" for p in projects[:30]]
    return "📁 <b>Projets</b>\n\n" + "\n".join(lines)

# ─── /aujourd'hui ────────────────────────────────────────────────────────────

async def cmd_aujourd_hui(employee_id: int) -> str:
    today = date.today().isoformat()
    entries = await gateway.search_read(
        "account.analytic.line",
        domain=[["employee_id", "=", employee_id], ["date", "=", today]],
        fields=["id", "name", "unit_amount", "project_id"],
        order="id asc",
    )
    if not entries:
        return f"Aucune entrée pour aujourd'hui ({today}).\n\nUtilisez /log pour en ajouter une."
    total = sum(e["unit_amount"] for e in entries)
    bar = _bar(total, 8)
    lines = [f"📅 <b>Aujourd'hui — {today}</b>\n"]
    for e in entries:
        proj = e["project_id"][1] if e.get("project_id") else "Sans projet"
        lines.append(f"[{e['id']}] {e['unit_amount']:.1f}h — {proj} — {e['name']}")
    lines.append(f"\n{bar} <b>{total:.1f}h / 8h</b>")
    if total >= 8:
        lines.append("🔥 Objectif atteint !")
    return "\n".join(lines)

# ─── /semaine ────────────────────────────────────────────────────────────────

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
    by_project: dict[str, float] = {}
    for e in entries:
        pname = e["project_id"][1] if e.get("project_id") else "Sans projet"
        by_project[pname] = by_project.get(pname, 0) + e["unit_amount"]
    bar = _bar(total, 40)
    lines = [f"📊 <b>Bilan semaine</b> (depuis lundi)\n"]
    for pname, h in sorted(by_project.items(), key=lambda x: -x[1]):
        lines.append(f"• {h:.1f}h — {pname}")
    lines.append(f"\n{bar} <b>{total:.1f}h / 40h</b>")
    if total >= 40:
        lines.append(f"🔥 Objectif atteint ! (+{total - 40:.1f}h overtime)")
    else:
        lines.append(f"⏳ {40 - total:.1f}h restantes pour l'objectif")
    return "\n".join(lines)

# ─── /mois ───────────────────────────────────────────────────────────────────

async def cmd_mois(employee_id: int) -> str:
    today = date.today()
    month_start = today.replace(day=1).isoformat()
    entries = await gateway.search_read(
        "account.analytic.line",
        domain=[["employee_id", "=", employee_id], ["date", ">=", month_start]],
        fields=["id", "name", "unit_amount", "project_id", "date"],
        order="date asc",
    )
    if not entries:
        return f"Aucune entrée ce mois-ci (depuis le {month_start})."

    total = sum(e["unit_amount"] for e in entries)
    days_worked = len({e["date"] for e in entries})
    by_project: dict[str, float] = {}
    for e in entries:
        pname = e["project_id"][1] if e.get("project_id") else "Sans projet"
        by_project[pname] = by_project.get(pname, 0) + e["unit_amount"]

    month_name = today.strftime("%B %Y")
    # Expected ~20 working days per month = 160h
    bar = _bar(total, 160)
    lines = [f"📆 <b>Bilan {month_name}</b>\n"]
    for pname, h in sorted(by_project.items(), key=lambda x: -x[1]):
        pct = round(h / total * 100)
        lines.append(f"• {h:.1f}h ({pct}%) — {pname}")
    lines.append(f"\n{bar} <b>{total:.1f}h</b> sur {days_worked} jour(s)")
    lines.append(f"Moyenne : {total / days_worked:.1f}h/jour")
    return "\n".join(lines)

# ─── /taches ─────────────────────────────────────────────────────────────────

async def cmd_taches(res_user_id: int) -> str:
    if not res_user_id:
        return "Votre identifiant Odoo n'est pas configuré. Contactez l'administrateur."
    tasks = await gateway.search_read(
        "project.task",
        domain=[
            ["user_ids", "in", [res_user_id]],
            ["stage_id.fold", "=", False],
        ],
        fields=["id", "name", "project_id", "date_deadline", "priority", "stage_id"],
        limit=25,
        order="priority desc, date_deadline asc",
    )
    if not tasks:
        return "✅ Aucune tâche ouverte assignée."

    by_project: dict[str, list] = {}
    for t in tasks:
        pname = t["project_id"][1] if t.get("project_id") else "Sans projet"
        by_project.setdefault(pname, []).append(t)

    lines = [f"📋 <b>Mes tâches ouvertes</b> ({len(tasks)})\n"]
    for pname, ptasks in sorted(by_project.items()):
        lines.append(f"\n<b>{pname}</b>")
        for t in ptasks:
            star = "⭐ " if t.get("priority") == "1" else ""
            deadline = f" · 📅 {t['date_deadline']}" if t.get("date_deadline") else ""
            stage = t["stage_id"][1] if t.get("stage_id") else ""
            lines.append(f"  • {star}{t['name']}{deadline} [{stage}]")
    return "\n".join(lines)

# ─── /risques ────────────────────────────────────────────────────────────────

async def cmd_risques() -> str:
    risks = await gateway.search_read(
        "project.task",
        domain=[["name", "like", "[RISK]"], ["active", "=", True]],
        fields=["id", "name", "project_id", "description"],
        limit=50,
    )
    if not risks:
        return "✅ Aucun risque enregistré dans les projets."

    high = []
    for r in risks:
        meta = _parse_meta(r.get("description", ""))
        level = _risk_level(meta)
        if level in ("Critique", "Élevé"):
            proj = r["project_id"][1] if r.get("project_id") else "?"
            name = r["name"].replace("[RISK]", "").strip()
            traitement = meta.get("traitement", "")
            high.append((level, proj, name, traitement))

    if not high:
        return "🟡 Aucun risque élevé ou critique détecté.\n\nTous les risques enregistrés sont de niveau Moyen ou Faible."

    high.sort(key=lambda x: (0 if x[0] == "Critique" else 1, x[1]))
    lines = [f"⚠️ <b>Risques Élevés / Critiques</b> ({len(high)})\n"]
    for level, proj, name, traitement in high:
        emoji = _risk_emoji(level)
        lines.append(f"{emoji} <b>{level}</b> — {proj}")
        lines.append(f"   ↳ {name}")
        if traitement:
            lines.append(f"   Plan : {traitement}")
        lines.append("")
    return "\n".join(lines).rstrip()

# ─── /projet <nom> ───────────────────────────────────────────────────────────

async def cmd_projet(name_query: str) -> str:
    if not name_query.strip():
        return "Usage : /projet <nom du projet>\nEx: /projet Alpha"

    projects = await gateway.search_read(
        "project.project",
        domain=[["active", "=", True], ["name", "ilike", name_query.strip()]],
        fields=["id", "name", "date", "description", "user_id"],
        limit=3,
    )
    if not projects:
        # Fallback: fuzzy match
        all_p = await gateway.get_projects()
        import difflib
        names = [p["name"] for p in all_p]
        matches = difflib.get_close_matches(name_query.strip(), names, n=1, cutoff=0.4)
        if not matches:
            return f"Projet '{name_query}' introuvable. Utilisez /projets pour voir la liste."
        projects = await gateway.search_read(
            "project.project",
            domain=[["name", "=", matches[0]]],
            fields=["id", "name", "date", "description", "user_id"],
            limit=1,
        )

    p = projects[0]
    phase = _parse_phase(p.get("description", ""))
    manager = p["user_id"][1] if p.get("user_id") else "Non défini"

    # Count tasks
    task_count = await gateway.search_count(
        "project.task",
        domain=[["project_id", "=", p["id"]], ["active", "=", True]],
    )

    # Recent activity (last 7 days)
    week_ago = (date.today() - timedelta(days=7)).isoformat()
    recent = await gateway.search_read(
        "account.analytic.line",
        domain=[["project_id", "=", p["id"]], ["date", ">=", week_ago]],
        fields=["unit_amount", "employee_id"],
        limit=50,
    )
    recent_hours = sum(e.get("unit_amount", 0) for e in recent)

    # Deadline status
    deadline_str = "Non définie"
    deadline_status = ""
    if p.get("date"):
        d = date.fromisoformat(p["date"])
        days_diff = (d - date.today()).days
        deadline_str = p["date"]
        if days_diff < 0:
            deadline_status = f" ⚠️ {abs(days_diff)}j de retard"
        elif days_diff == 0:
            deadline_status = " 🚨 Aujourd'hui !"
        elif days_diff <= 7:
            deadline_status = f" ⚡ Dans {days_diff}j"
        else:
            deadline_status = f" ({days_diff}j restants)"

    lines = [
        f"📁 <b>{p['name']}</b>\n",
        f"Phase : {phase}",
        f"Chef de projet : {manager}",
        f"Deadline : {deadline_str}{deadline_status}",
        f"Tâches actives : {task_count}",
        f"Activité (7j) : {recent_hours:.1f}h",
    ]
    return "\n".join(lines)

# ─── /retard ─────────────────────────────────────────────────────────────────

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
        try:
            d = date.fromisoformat(p["date"])
            days_late = (date.today() - d).days
            phase = _parse_phase(p.get("description", ""))
            lines.append(f"• {p['name']}\n  {phase} · {p['date']} · {days_late}j de retard")
        except Exception:
            lines.append(f"• {p['name']}")
    return "\n".join(lines)

# ─── /portefeuille ───────────────────────────────────────────────────────────

async def cmd_portefeuille() -> str:
    projects = await gateway.search_read(
        "project.project",
        domain=[["active", "=", True]],
        fields=["id", "name", "date", "description"],
        order="name asc",
    )
    if not projects:
        return "Aucun projet trouvé."

    today = date.today().isoformat()
    overdue = [p for p in projects if p.get("date") and p["date"] < today]
    on_track = [p for p in projects if p.get("date") and p["date"] >= today]
    no_date  = [p for p in projects if not p.get("date")]

    lines = [f"📂 <b>Portefeuille</b> — {len(projects)} projets\n"]

    if overdue:
        lines.append(f"🚨 <b>En retard ({len(overdue)})</b>")
        for p in overdue:
            days_late = (date.today() - date.fromisoformat(p["date"])).days
            lines.append(f"  • {_parse_phase(p.get('description',''))} {p['name']} — {days_late}j ⚠️")
        lines.append("")

    if on_track:
        lines.append(f"✅ <b>Dans les délais ({len(on_track)})</b>")
        for p in on_track:
            lines.append(f"  • {_parse_phase(p.get('description',''))} {p['name']} · 📅 {p['date']}")
        lines.append("")

    if no_date:
        lines.append(f"📋 <b>Sans deadline ({len(no_date)})</b>")
        for p in no_date:
            lines.append(f"  • {_parse_phase(p.get('description',''))} {p['name']}")

    return "\n".join(lines)

# ─── /equipe ─────────────────────────────────────────────────────────────────

async def cmd_equipe() -> str:
    today = date.today().isoformat()
    employee_ids = settings.all_employee_ids
    if not employee_ids:
        return "Aucun employé configuré."

    lines = [f"👥 <b>Équipe — {today}</b>\n"]
    team_total = 0.0

    for emp_id in employee_ids:
        name = settings.employee_name(emp_id)
        entries = await gateway.search_read(
            "account.analytic.line",
            domain=[["employee_id", "=", emp_id], ["date", "=", today]],
            fields=["unit_amount", "project_id"],
            limit=50,
        )
        total = sum(e.get("unit_amount", 0) for e in entries)
        team_total += total
        bar = _bar(total, 8)
        lines.append(f"<b>{name.split()[0]}</b>")
        lines.append(f"{bar} {total:.1f}h / 8h")
        if entries:
            by_proj: dict[str, float] = {}
            for e in entries:
                pname = e["project_id"][1] if e.get("project_id") else "Sans projet"
                by_proj[pname] = by_proj.get(pname, 0) + e.get("unit_amount", 0)
            for pname, h in sorted(by_proj.items(), key=lambda x: -x[1]):
                lines.append(f"  • {h:.1f}h — {pname}")
        else:
            lines.append("  (aucune entrée)")
        lines.append("")

    lines.append(f"<b>Total équipe : {team_total:.1f}h</b>")
    return "\n".join(lines)

# ─── /recap ──────────────────────────────────────────────────────────────────

async def cmd_recap(employee_id: int) -> str:
    today = date.today()
    week_start = (today - timedelta(days=today.weekday())).isoformat()

    today_entries = await gateway.search_read(
        "account.analytic.line",
        domain=[["employee_id", "=", employee_id], ["date", "=", today.isoformat()]],
        fields=["unit_amount", "project_id", "name"],
        order="id asc",
    )
    week_entries = await gateway.search_read(
        "account.analytic.line",
        domain=[["employee_id", "=", employee_id], ["date", ">=", week_start]],
        fields=["unit_amount"],
        limit=200,
    )

    overdue_projects = await gateway.search_read(
        "project.project",
        domain=[["active", "=", True], ["date", "<", today.isoformat()]],
        fields=["name"],
        limit=5,
    )

    today_total = sum(e.get("unit_amount", 0) for e in today_entries)
    week_total  = sum(e.get("unit_amount", 0) for e in week_entries)
    name = settings.employee_name(employee_id).split()[0]

    lines = [
        f"📋 <b>Récap journalier — {name}</b>",
        f"📅 {today.strftime('%A %d %B %Y')}\n",
        "─────────────────",
        "<b>Réalisé aujourd'hui</b>",
    ]
    if today_entries:
        for e in today_entries:
            proj = e["project_id"][1] if e.get("project_id") else "Sans projet"
            lines.append(f"  ✓ {e['unit_amount']:.1f}h — {proj} ({e['name']})")
        lines.append(f"  → <b>Total : {today_total:.1f}h</b>")
    else:
        lines.append("  (aucune entrée aujourd'hui)")

    lines += [
        "",
        "─────────────────",
        "<b>Semaine en cours</b>",
        f"  {_bar(week_total, 40)} {week_total:.1f}h / 40h",
    ]

    if week_total >= 40:
        lines.append(f"  🔥 Objectif hebdo atteint (+{week_total - 40:.1f}h)")
    else:
        lines.append(f"  ⏳ {40 - week_total:.1f}h restantes")

    if overdue_projects:
        lines += ["", "─────────────────", "<b>⚠️ Projets en retard</b>"]
        for p in overdue_projects[:3]:
            lines.append(f"  • {p['name']}")

    lines += ["", "─────────────────", "Généré par ATD Bot 🤖"]
    return "\n".join(lines)

# ─── /modifier <id> <heures> ──────────────────────────────────────────────────

async def cmd_modifier(args: str, employee_id: int) -> str:
    parts = args.strip().split()
    if len(parts) < 2:
        return (
            "Usage : /modifier &lt;id&gt; &lt;heures&gt;\n"
            "Ex: /modifier 1234 2.5\n\n"
            "Trouvez l'ID avec /aujourd'hui"
        )
    try:
        entry_id = int(parts[0])
        new_hours_str = parts[1].replace("h", "").replace(",", ".")
        new_hours = float(new_hours_str)
        if new_hours <= 0 or new_hours > 24:
            return "Le nombre d'heures doit être entre 0.1 et 24."
    except ValueError:
        return f"Format invalide. Exemple : /modifier 1234 2.5"

    # Verify ownership
    check = await gateway.search_read(
        "account.analytic.line",
        domain=[["id", "=", entry_id], ["employee_id", "=", employee_id]],
        fields=["id", "name", "unit_amount", "project_id"],
    )
    if not check:
        return f"Entrée {entry_id} introuvable ou vous n'êtes pas autorisé à la modifier."

    old = check[0]
    await gateway.write("account.analytic.line", [entry_id], {"unit_amount": new_hours})

    proj = old["project_id"][1] if old.get("project_id") else "?"
    return (
        f"✅ Entrée {entry_id} modifiée\n"
        f"• Projet : {proj}\n"
        f"• Description : {old['name']}\n"
        f"• Durée : {old['unit_amount']:.1f}h → <b>{new_hours:.1f}h</b>"
    )

# ─── /supprimer <id> ─────────────────────────────────────────────────────────

async def cmd_supprimer(args: str, employee_id: int) -> str:
    try:
        entry_id = int(args.strip())
    except ValueError:
        return "Usage : /supprimer &lt;id&gt;\nEx: /supprimer 1234\n\nTrouvez l'ID avec /aujourd'hui"

    # Verify ownership
    check = await gateway.search_read(
        "account.analytic.line",
        domain=[["id", "=", entry_id], ["employee_id", "=", employee_id]],
        fields=["id", "name", "unit_amount", "project_id"],
    )
    if not check:
        return f"Entrée {entry_id} introuvable ou vous n'êtes pas autorisé à la supprimer."

    e = check[0]
    proj = e["project_id"][1] if e.get("project_id") else "?"
    await gateway.unlink("account.analytic.line", [entry_id])
    return (
        f"🗑️ Entrée {entry_id} supprimée\n"
        f"• {e['unit_amount']:.1f}h — {proj} — {e['name']}"
    )

# ─── Handle /log (natural language + explicit) ───────────────────────────────

async def handle_log(text: str, employee_id: int) -> str:
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
        f"✅ <b>Enregistré</b> (id:{record_id})\n"
        f"• {parsed.hours}h sur {parsed.project_name}\n"
        f"• {description}\n"
        f"• {parsed.entry_date}"
    )
    if parsed.confidence < 0.7:
        confirm += f"\n\n<i>Projet trouvé par approximation — confiance {parsed.confidence:.0%}</i>"
    return confirm
