"""Commandant — assistant conversationnel de l'app.

Les intentions connues sont gérées par des handlers rapides (sans IA).
Tout le reste est délégué à Claude Haiku pour une réponse naturelle.
"""

import re
from datetime import date, timedelta
from collections import Counter
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from app import gateway
from app.bot import nlp_parser
from app.routers.pdaap import parse_meta, PDAAP_PROJECT
from app.config import settings

router = APIRouter(prefix="/api/commandant", tags=["commandant"])
DONE_RE = re.compile(r"termin|clôt|clot|done|fait|validé|ferm", re.I)


class Msg(BaseModel):
    message: str
    user_id: Optional[int] = 0
    employee_id: Optional[int] = 0
    employee_name: Optional[str] = ""


def norm(s):
    return (s or "").strip().lower().replace("’", "'")


HELP = (
    "Bonjour, je suis **Commandant**. Je peux :\n"
    "• « mes tâches en retard »\n"
    "• « mes projets »\n"
    "• « combien d'heures cette semaine »\n"
    "• « avancement PDAAP » ou « statut <ministère> »\n"
    "• Saisir du temps : « 3h sur <projet> - <description> »\n"
    "• Créer une tâche : « crée une tâche <nom> dans <projet> »"
)


@router.post("")
async def commandant(body: Msg):
    t = norm(body.message)
    if not t or t in ("aide", "help", "?", "bonjour", "salut", "bonsoir"):
        return {"reply": HELP}

    # — Tâches en retard —
    if "retard" in t and body.user_id:
        rows = await gateway.search_read(
            "project.task",
            domain=[["user_ids", "in", [body.user_id]],
                    ["date_deadline", "<", date.today().isoformat()],
                    ["date_deadline", "!=", False]],
            fields=["name", "date_deadline", "project_id", "stage_id"], limit=60, order="date_deadline")
        late = [r for r in rows if not (r.get("stage_id") and DONE_RE.search(r["stage_id"][1] or ""))]
        if not late:
            return {"reply": "Aucune tâche en retard. Beau travail !"}
        lines = [f"• {r['name']} — échéance {r['date_deadline']}"
                 + (f" ({r['project_id'][1]})" if r.get("project_id") else "") for r in late[:8]]
        more = f"\n…et {len(late) - 8} autres." if len(late) > 8 else ""
        return {"reply": f"**{len(late)} tâche(s) en retard :**\n" + "\n".join(lines) + more}

    # — Mes projets —
    if "projet" in t and any(w in t for w in ("mes", "liste", "quels", "mon")) and body.user_id:
        rows = await gateway.search_read("project.task", domain=[["user_ids", "in", [body.user_id]]],
                                         fields=["project_id"], limit=300)
        c = Counter(r["project_id"][1] for r in rows if r.get("project_id"))
        if not c:
            return {"reply": "Aucun projet trouvé pour votre profil."}
        lines = [f"• {n} ({k} tâche{'s' if k > 1 else ''})" for n, k in c.most_common(10)]
        return {"reply": f"**Vos projets ({len(c)}) :**\n" + "\n".join(lines)}

    # — Heures saisies —
    if ("heure" in t or "temps" in t) and body.employee_id:
        days = 1 if "aujourd" in t else 7
        since = (date.today() - timedelta(days=days - 1)).isoformat()
        rows = await gateway.search_read("account.analytic.line",
            domain=[["employee_id", "=", body.employee_id], ["date", ">=", since]],
            fields=["unit_amount"], limit=300)
        total = round(sum(r.get("unit_amount") or 0 for r in rows), 1)
        label = "aujourd'hui" if days == 1 else "cette semaine"
        return {"reply": f"Vous avez saisi **{total}h** {label} ({len(rows)} entrée(s))."}

    # — PDAAP / ministères —
    if any(w in t for w in ("pdaap", "ministère", "ministere", "chantier", "statut", "intégrateur", "integrateur")):
        return await _pdaap_reply(t)

    # — Créer une tâche —
    mt = re.search(r"t[âa]che\s+(.+?)\s+dans\s+(.+)$", body.message, re.I)
    if mt and body.user_id:
        task_name, proj_q = mt.group(1).strip(), mt.group(2).strip()
        projects = await gateway.search_read("project.project", fields=["id", "name"], limit=500)
        pid = nlp_parser.find_project_id(proj_q, projects)
        if not pid:
            import difflib
            match = difflib.get_close_matches(proj_q, [p["name"] for p in projects], n=1, cutoff=0.4)
            pid = nlp_parser.find_project_id(match[0], projects) if match else None
        if not pid:
            return {"reply": f"Projet « {proj_q} » introuvable. Précisez le nom exact."}
        await gateway.create("project.task", {"name": task_name, "project_id": pid,
                                              "user_ids": [[6, 0, [body.user_id]]]})
        return {"reply": f"Tâche **« {task_name} »** créée dans le projet."}

    # — Saisie de temps (langage naturel) —
    projects = await gateway.search_read("project.project", fields=["id", "name"], limit=500)
    parsed = nlp_parser.parse(body.message, projects)
    if parsed.hours and parsed.project_name:
        pid = nlp_parser.find_project_id(parsed.project_name, projects)
        if not pid:
            return {"reply": f"Je n'ai pas trouvé le projet « {parsed.project_name} »."}
        if not body.employee_id:
            return {"reply": "Sélectionnez d'abord un chef de projet (profil) pour saisir du temps."}
        await gateway.create("account.analytic.line", {
            "name": parsed.description or "Saisie Commandant", "employee_id": body.employee_id,
            "project_id": pid, "date": parsed.entry_date, "unit_amount": parsed.hours})
        return {"reply": f"**{parsed.hours}h** enregistrées sur « {parsed.project_name} » le {parsed.entry_date}."}

    return await _claude_reply(body.message, body)


async def _claude_reply(message: str, body: Msg) -> dict:
    if not settings.anthropic_api_key:
        return {"reply": "Je n'ai pas compris. Tapez **aide** pour voir mes commandes."}

    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    ctx = [f"Utilisateur : {body.employee_name or 'Chef de projet'} — ATD (Agence des Transformations Digitales du Togo)"]

    if body.user_id:
        today = date.today().isoformat()
        tasks = await gateway.search_read(
            "project.task",
            domain=[["user_ids", "in", [body.user_id]], ["stage_id.fold", "=", False]],
            fields=["name", "date_deadline", "project_id"], limit=20, order="date_deadline asc",
        )
        overdue = [t for t in tasks if t.get("date_deadline") and t["date_deadline"] < today]
        ctx.append(f"Tâches ouvertes : {len(tasks)} dont {len(overdue)} en retard")
        if overdue[:3]:
            ctx.append("En retard : " + " | ".join(t["name"] for t in overdue[:3]))

    system = (
        "Tu es Commandant, l'assistant IA de gestion de projet de l'ATD. "
        "Tu es intégré dans une app de pilotage de projets ISO 21500 pour la transformation digitale du Togo. "
        "Réponds en français, de manière concise et professionnelle. "
        "Utilise **texte** pour mettre en gras. Pas de HTML. Contexte: " + " | ".join(ctx)
    )

    resp = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        system=system,
        messages=[{"role": "user", "content": message}],
    )
    return {"reply": resp.content[0].text.strip()}


async def _pdaap_reply(t):
    rows = await gateway.search_read("project.task",
        domain=[["project_id", "=", PDAAP_PROJECT], ["name", "ilike", "[PDAAP-"]],
        fields=["name", "description"], limit=200)
    chantiers, mins = [], []
    for r in rows:
        if r["name"].startswith("[PDAAP-CHANTIER]"):
            chantiers.append((r["name"].replace("[PDAAP-CHANTIER] ", ""), parse_meta(r["description"])))
        elif r["name"].startswith("[PDAAP-MIN]"):
            mins.append((r["name"].replace("[PDAAP-MIN] ", ""), parse_meta(r["description"])))

    # Ministère spécifique ? (correspondance par MOT entier pour éviter les faux positifs)
    tokens = set(w for w in re.split(r"[ ,'/]+", t) if w)
    for name, meta in mins:
        short = (meta.get("short") or "").lower()
        words = [w for w in re.split(r"[ ,'/]+", name.lower()) if len(w) > 4]
        if (short and short in tokens) or any(w in tokens for w in words):
            chs = meta.get("chantiers", [])
            avg = round(sum(c.get("progress", 0) for c in chs) / len(chs)) if chs else 0
            lines = [f"  - {c['name']} : {c.get('status')} ({c.get('progress', 0)}%)" for c in chs]
            return {"reply": f"**{name}**\nStatut : {meta.get('status')} · Intégrateur : "
                    f"{meta.get('integrator')} · Avancement {avg}%\nChantiers :\n" + "\n".join(lines)}

    # Vue programme
    if chantiers:
        chantiers.sort(key=lambda x: x[1].get("order", 9))
        avg = round(sum(m.get("progress", 0) for _, m in chantiers) / len(chantiers))
        lines = [f"• {n} : {m.get('status')} ({m.get('progress', 0)}%)" for n, m in chantiers]
        return {"reply": f"**PDAAP — santé {avg}%**\n" + "\n".join(lines)}
    return {"reply": "Données PDAAP indisponibles."}
