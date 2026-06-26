"""Espace PDAAP — pilotage du programme de Digitalisation Accélérée des
Administrations Publiques.

Le cadre (chantiers, acteurs, gouvernance, arbitrages) est stocké dans le projet
Odoo « PDAAP MAECIATE » (id PDAAP_PROJECT) sous forme de tâches taguées
[PDAAP-CHANTIER] / [PDAAP-ACTEUR] / [PDAAP-GOUV] / [PDAAP-ARBITRAGE], avec des
métadonnées JSON dans la description. L'avancement par ministère est, lui, dérivé
des vrais projets Odoo (DIGITALISATION_COMPLETE_* et PDAAP).
"""

import re
import json
import base64
from fastapi import APIRouter
from app import gateway

router = APIRouter(prefix="/api/pdaap", tags=["pdaap"])

PDAAP_PROJECT = 1086
META_RE = re.compile(r"PDAAP-META:([A-Za-z0-9+/=]+)")
DONE_RE = re.compile(r"termin|clôt|clot|done|fait|validé|ferm", re.I)
PREFIX = {
    "CHANTIER": "chantiers",
    "ACTEUR": "acteurs",
    "GOUV": "gouvernance",
    "ARBITRAGE": "arbitrages",
}


def parse_meta(desc):
    m = META_RE.search(desc or "")
    if not m:
        return {}
    try:
        return json.loads(base64.b64decode(m.group(1)).decode("utf-8"))
    except Exception:
        return {}


def clean_name(name, prefix):
    return re.sub(r"^\[PDAAP-%s\]\s*" % prefix, "", name).strip()


@router.get("")
async def get_pdaap():
    # 1) Cadre PDAAP (tâches taguées du projet 1086)
    rows = await gateway.search_read(
        "project.task",
        domain=[["project_id", "=", PDAAP_PROJECT], ["name", "ilike", "[PDAAP-"]],
        fields=["id", "name", "description"],
        limit=200,
    )
    groups = {"chantiers": [], "acteurs": [], "gouvernance": [], "arbitrages": []}
    min_rows = []
    for t in rows:
        m = re.match(r"^\[PDAAP-(\w+)\]", t["name"] or "")
        if not m:
            continue
        tag = m.group(1)
        meta = parse_meta(t.get("description"))
        if tag == "MIN":
            min_rows.append({"id": t["id"], "name": clean_name(t["name"], "MIN"), **meta})
            continue
        key = PREFIX.get(tag)
        if not key:
            continue
        groups[key].append({"id": t["id"], "name": clean_name(t["name"], tag), **meta})
    for k in groups:
        groups[k].sort(key=lambda x: x.get("order", 99))

    # 2) Ministères (planning [PDAAP-MIN]) + avancement live si projet Odoo lié
    min_rows.sort(key=lambda x: x.get("order", 99))
    out_min = []
    for mn in min_rows:
        chs_m = mn.get("chantiers") or []
        prog = round(sum(c.get("progress", 0) for c in chs_m) / len(chs_m)) if chs_m else 0
        live = None
        pid = mn.get("projectId")
        if pid:
            try:
                tks = await gateway.search_read(
                    "project.task", domain=[["project_id", "=", pid]],
                    fields=["id", "stage_id"], limit=400)
                total = len(tks)
                done = sum(1 for t in tks if t.get("stage_id") and DONE_RE.search(t["stage_id"][1] or ""))
                live = round(done / total * 100) if total else 0
            except Exception:
                live = None
        out_min.append({**mn, "progress": prog, "liveProgress": live})

    # Carte des intégrateurs
    integ = {}
    for mn in out_min:
        nm = mn.get("integrator")
        if not nm or nm == "—":
            continue
        g = integ.setdefault(nm, {"integrator": nm, "count": 0, "sum": 0})
        g["count"] += 1
        g["sum"] += mn.get("progress", 0)
    integrators = sorted(
        [{"integrator": v["integrator"], "count": v["count"],
          "avgProgress": round(v["sum"] / v["count"]) if v["count"] else 0} for v in integ.values()],
        key=lambda x: -x["count"])

    # Compteurs de statut
    status_counts = {}
    for mn in out_min:
        s = mn.get("status", "?")
        status_counts[s] = status_counts.get(s, 0) + 1

    # 3) Santé globale = moyenne d'avancement des chantiers du programme
    chs = groups["chantiers"]
    health = round(sum(c.get("progress", 0) for c in chs) / len(chs)) if chs else 0

    kpis = {
        "weeks": 4,
        "chantiers": len(chs),
        "acteurs": len(groups["acteurs"]),
        "ministeres": len(out_min),
        "en_cours": status_counts.get("En cours", 0),
        "termines": status_counts.get("Terminé", 0),
        "arbitrages_ouverts": sum(1 for a in groups["arbitrages"] if a.get("status") != "Clos"),
    }

    return {
        "project_id": PDAAP_PROJECT,
        "health": health,
        "kpis": kpis,
        **groups,
        "ministeres": out_min,
        "integrators": integrators,
        "statusCounts": status_counts,
    }
