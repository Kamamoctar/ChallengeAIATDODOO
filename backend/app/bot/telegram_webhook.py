import logging
from fastapi import APIRouter, Request, HTTPException
from app.config import settings
from app.bot import commands

logger = logging.getLogger(__name__)
router = APIRouter(tags=["telegram"])


async def _send(bot_token: str, chat_id: int, text: str):
    import httpx
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    async with httpx.AsyncClient() as c:
        await c.post(url, json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        })


@router.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=503, detail="Bot Telegram non configuré")

    body = await request.json()
    message = body.get("message") or body.get("edited_message")
    if not message:
        return {"ok": True}

    chat_id  = message["chat"]["id"]
    tg_uid   = message["from"]["id"]
    text     = message.get("text", "").strip()

    if not text:
        return {"ok": True}

    # Map Telegram user → Odoo IDs
    employee_id  = settings.telegram_user_map.get(tg_uid)   # hr.employee id
    res_user_id  = settings.res_user_map.get(tg_uid)        # res.users id

    async def reply(msg: str):
        await _send(settings.telegram_bot_token, chat_id, msg)

    def requires_auth():
        if not employee_id:
            return "⚠️ Votre compte Telegram n'est pas lié à un employé.\nContactez l'administrateur."
        return None

    # ── Commandes sans auth ──────────────────────────────────────────
    if text.startswith("/start") or text.startswith("/aide") or text.startswith("/help"):
        await reply(await commands.cmd_aide())
        return {"ok": True}

    if text.startswith("/projets"):
        await reply(await commands.cmd_projets())
        return {"ok": True}

    if text.startswith("/portefeuille"):
        await reply(await commands.cmd_portefeuille())
        return {"ok": True}

    if text.startswith("/retard"):
        await reply(await commands.cmd_retard())
        return {"ok": True}

    if text.startswith("/risques"):
        await reply(await commands.cmd_risques())
        return {"ok": True}

    if text.startswith("/equipe"):
        await reply(await commands.cmd_equipe())
        return {"ok": True}

    # ── /projet <nom> ───────────────────────────────────────────────
    if text.lower().startswith("/projet"):
        name_query = text[7:].strip()
        await reply(await commands.cmd_projet(name_query))
        return {"ok": True}

    # ── Commandes avec auth ──────────────────────────────────────────
    if text.startswith("/aujourd"):
        err = requires_auth()
        if err: await reply(err); return {"ok": True}
        await reply(await commands.cmd_aujourd_hui(employee_id))
        return {"ok": True}

    if text.startswith("/semaine"):
        err = requires_auth()
        if err: await reply(err); return {"ok": True}
        await reply(await commands.cmd_semaine(employee_id))
        return {"ok": True}

    if text.startswith("/mois"):
        err = requires_auth()
        if err: await reply(err); return {"ok": True}
        await reply(await commands.cmd_mois(employee_id))
        return {"ok": True}

    if text.startswith("/taches"):
        err = requires_auth()
        if err: await reply(err); return {"ok": True}
        await reply(await commands.cmd_taches(res_user_id))
        return {"ok": True}

    if text.startswith("/recap"):
        err = requires_auth()
        if err: await reply(err); return {"ok": True}
        await reply(await commands.cmd_recap(employee_id))
        return {"ok": True}

    if text.startswith("/modifier "):
        err = requires_auth()
        if err: await reply(err); return {"ok": True}
        await reply(await commands.cmd_modifier(text[9:].strip(), employee_id))
        return {"ok": True}

    if text.startswith("/supprimer "):
        err = requires_auth()
        if err: await reply(err); return {"ok": True}
        await reply(await commands.cmd_supprimer(text[10:].strip(), employee_id))
        return {"ok": True}

    if text.startswith("/log ") or text.startswith("/log\n"):
        err = requires_auth()
        if err: await reply(err); return {"ok": True}
        await reply(await commands.handle_log(text[4:].strip(), employee_id))
        return {"ok": True}

    # ── Langage naturel ──────────────────────────────────────────────
    if employee_id:
        response = await commands.handle_log(text, employee_id)
        if "pas compris" not in response and "pas trouvé" not in response:
            await reply(response)
            return {"ok": True}

    await reply(
        "Je n'ai pas compris 🤔\n\n"
        "Essayez : <i>3h Projet Alpha - description</i>\n"
        "Ou tapez /aide pour voir toutes les commandes."
    )
    return {"ok": True}
