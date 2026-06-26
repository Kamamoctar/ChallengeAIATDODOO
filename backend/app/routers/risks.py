"""Suggestion IA pour l'évaluation des risques projet via Claude."""
import json
from fastapi import APIRouter
from pydantic import BaseModel
from app.config import settings

router = APIRouter(prefix="/api/risks", tags=["risks"])


class SuggestRequest(BaseModel):
    risk_name: str
    project_name: str = ""


@router.post("/suggest")
async def suggest_risk(body: SuggestRequest):
    if not settings.anthropic_api_key:
        return {"error": "AI non configurée — ajoutez ANTHROPIC_API_KEY dans les variables d'environnement"}

    from anthropic import AsyncAnthropic
    client = AsyncAnthropic(api_key=settings.anthropic_api_key)

    prompt = (
        "Tu es un expert en gestion de risques de projets de digitalisation dans le secteur public africain.\n\n"
        f"Risque : {body.risk_name}\n"
        f"Projet : {body.project_name or 'projet de digitalisation publique'}\n\n"
        "Évalue ce risque. Réponds UNIQUEMENT en JSON valide, sans markdown ni commentaires :\n"
        '{"prob":"L|M|H","impact":"L|M|H","category":"Technique|Organisationnel|Externe|Calendrier|Budget|Qualité|Autre",'
        '"strategie":"Éviter|Réduire|Transférer|Accepter","note":"explication courte en 1 phrase"}\n\n'
        "L = Faible, M = Moyen, H = Élevé"
    )

    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = response.content[0].text.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Tentative d'extraction JSON si le modèle a ajouté du texte autour
        start, end = raw.find("{"), raw.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(raw[start:end])
            except Exception:
                pass
        return {"error": "Parsing impossible", "raw": raw}
