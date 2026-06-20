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
        await c.post(url, json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"})


@router.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=503, detail="Bot Telegram non configuré")

    body = await request.json()
    message = body.get("message") or body.get("edited_message")
    if not message:
        return {"ok": True}

    chat_id = message["chat"]["id"]
    user_id = message["from"]["id"]
    text = message.get("text", "").strip()

    if not text:
        return {"ok": True}

    # Map Telegram user → employee_id
    employee_id = settings.telegram_user_map.get(user_id)

    async def reply(msg: str):
        await _send(settings.telegram_bot_token, chat_id, msg)

    if text.startswith("/start") or text.startswith("/aide") or text.startswith("/help"):
        await reply(await commands.cmd_aide())
        return {"ok": True}

    if text.startswith("/projets"):
        await reply(await commands.cmd_projets())
        return {"ok": True}

    if text.startswith("/aujourd"):
        if not employee_id:
            await reply("Votre Telegram ID n'est pas configuré. Parlez à votre binôme.")
            return {"ok": True}
        await reply(await commands.cmd_aujourd_hui(employee_id))
        return {"ok": True}

    if text.startswith("/log ") or text.startswith("/log\n"):
        if not employee_id:
            await reply("Votre Telegram ID n'est pas configuré. Parlez à votre binôme.")
            return {"ok": True}
        await reply(await commands.handle_log(text[4:].strip(), employee_id))
        return {"ok": True}

    # Langage naturel
    if employee_id:
        response = await commands.handle_log(text, employee_id)
        if "pas compris" not in response and "pas trouvé" not in response:
            await reply(response)
            return {"ok": True}

    await reply(
        "Je n'ai pas compris. Essayez :\n"
        '  "3h Projet Alpha - ma description"\n'
        "  /log 3h Projet Alpha - ma description\n"
        "  /aide pour voir toutes les commandes"
    )
    return {"ok": True}
