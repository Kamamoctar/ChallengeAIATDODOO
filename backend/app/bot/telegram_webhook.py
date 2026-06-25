import logging
import httpx
from fastapi import APIRouter, Request, HTTPException
from app.config import settings
from app.bot import commands

logger = logging.getLogger(__name__)
router = APIRouter(tags=["telegram"])

# ── Clavier inline affiché avec /start et /menu ──────────────────────────────

MENU_KEYBOARD = [
    [
        {"text": "📅 Aujourd'hui", "callback_data": "/aujourdhui"},
        {"text": "📊 Semaine",      "callback_data": "/semaine"},
    ],
    [
        {"text": "📆 Mois",         "callback_data": "/mois"},
        {"text": "✅ Mes tâches",   "callback_data": "/taches"},
    ],
    [
        {"text": "📝 Récap du jour","callback_data": "/recap"},
        {"text": "⏱ Log du temps", "callback_data": "/log_help"},
    ],
    [
        {"text": "📁 Projets",      "callback_data": "/projets"},
        {"text": "⚠️ En retard",    "callback_data": "/retard"},
    ],
    [
        {"text": "🔴 Risques",      "callback_data": "/risques"},
        {"text": "👥 Équipe",       "callback_data": "/equipe"},
    ],
    [
        {"text": "🔔 Alertes",      "callback_data": "/alertes"},
        {"text": "🗂 Portefeuille", "callback_data": "/portefeuille"},
    ],
    [
        {"text": "❓ Aide",         "callback_data": "/aide"},
    ],
]

# Commandes enregistrées dans le menu natif Telegram (visibles avec /)
BOT_COMMANDS = [
    {"command": "menu",        "description": "Menu interactif 🗂"},
    {"command": "aujourdhui",  "description": "Mes heures du jour 📅"},
    {"command": "semaine",     "description": "Résumé de la semaine 📊"},
    {"command": "mois",        "description": "Bilan du mois 📆"},
    {"command": "taches",      "description": "Mes tâches ouvertes ✅"},
    {"command": "recap",       "description": "Récap journalier 📝"},
    {"command": "projets",     "description": "Liste des projets 📁"},
    {"command": "portefeuille","description": "Santé du portefeuille 🗂"},
    {"command": "retard",      "description": "Projets en retard ⚠️"},
    {"command": "risques",     "description": "Risques critiques 🔴"},
    {"command": "equipe",      "description": "Activité de l'équipe 👥"},
    {"command": "projet",      "description": "Détail d'un projet (ex: /projet Alpha)"},
    {"command": "log",         "description": "Enregistrer du temps (ex: /log 2h Alpha)"},
    {"command": "modifier",    "description": "Modifier une entrée (ex: /modifier 123 2.5)"},
    {"command": "supprimer",   "description": "Supprimer une entrée (ex: /supprimer 123)"},
    {"command": "alertes",     "description": "Mes tâches urgentes et en retard 🔔"},
    {"command": "aide",        "description": "Aide et liste des commandes ❓"},
]


# ── Helpers HTTP ─────────────────────────────────────────────────────────────

async def _send(bot_token: str, chat_id: int, text: str, keyboard: list | None = None):
    payload: dict = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }
    if keyboard:
        payload["reply_markup"] = {"inline_keyboard": keyboard}
    async with httpx.AsyncClient() as c:
        await c.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json=payload)


async def _answer_callback(bot_token: str, callback_id: str, text: str = ""):
    async with httpx.AsyncClient() as c:
        await c.post(
            f"https://api.telegram.org/bot{bot_token}/answerCallbackQuery",
            json={"callback_query_id": callback_id, "text": text},
        )


async def _set_commands(bot_token: str):
    async with httpx.AsyncClient() as c:
        r = await c.post(
            f"https://api.telegram.org/bot{bot_token}/setMyCommands",
            json={"commands": BOT_COMMANDS},
        )
        return r.json()


# ── Endpoint setup (à appeler une fois pour enregistrer le menu natif) ───────

@router.post("/webhook/telegram/setup")
async def telegram_setup():
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=503, detail="Bot Telegram non configuré")
    result = await _set_commands(settings.telegram_bot_token)
    return {"ok": result.get("ok"), "description": result.get("description", "")}


# ── Webhook principal ─────────────────────────────────────────────────────────

@router.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=503, detail="Bot Telegram non configuré")

    body = await request.json()

    # ── Gestion des clics sur boutons inline ──────────────────────────
    callback = body.get("callback_query")
    if callback:
        cb_id   = callback["id"]
        chat_id = callback["message"]["chat"]["id"]
        tg_uid  = callback["from"]["id"]
        text    = callback.get("data", "").strip()
        await _answer_callback(settings.telegram_bot_token, cb_id)
        # Traiter comme une commande normale (réutilise le bloc ci-dessous)
        await _dispatch(settings.telegram_bot_token, chat_id, tg_uid, text)
        return {"ok": True}

    # ── Gestion des messages texte ────────────────────────────────────
    message = body.get("message") or body.get("edited_message")
    if not message:
        return {"ok": True}

    chat_id = message["chat"]["id"]
    tg_uid  = message["from"]["id"]
    text    = message.get("text", "").strip()

    if not text:
        return {"ok": True}

    await _dispatch(settings.telegram_bot_token, chat_id, tg_uid, text)
    return {"ok": True}


# ── Dispatcher centralisé ─────────────────────────────────────────────────────

async def _dispatch(bot_token: str, chat_id: int, tg_uid: int, text: str):
    employee_id = settings.telegram_user_map.get(tg_uid)
    res_user_id = settings.res_user_map.get(tg_uid)

    async def reply(msg: str, keyboard: list | None = None):
        await _send(bot_token, chat_id, msg, keyboard)

    def requires_auth():
        if not employee_id:
            return "⚠️ Votre compte Telegram n'est pas lié à un employé.\nContactez l'administrateur."
        return None

    # ── /start → menu interactif ──────────────────────────────────────
    if text.startswith("/start"):
        name = settings.employee_name(employee_id) if employee_id else "visiteur"
        welcome = (
            f"👋 Bonjour <b>{name}</b> !\n\n"
            "Je suis votre assistant ATD de gestion de projet.\n"
            "Choisissez une action :"
        )
        await reply(welcome, MENU_KEYBOARD)
        return

    # ── /menu → clavier interactif ────────────────────────────────────
    if text.startswith("/menu"):
        await reply("Que souhaitez-vous faire ?", MENU_KEYBOARD)
        return

    # ── /aide ─────────────────────────────────────────────────────────
    if text.startswith("/aide") or text.startswith("/help"):
        await reply(await commands.cmd_aide(), MENU_KEYBOARD)
        return

    # ── /log_help (bouton Log du menu) ───────────────────────────────
    if text == "/log_help":
        await reply(
            "⏱ <b>Enregistrer du temps</b>\n\n"
            "Tapez directement dans le chat, par exemple :\n"
            "<code>2h Projet Alpha - réunion client</code>\n"
            "<code>1.5h Beta - développement API</code>\n\n"
            "Ou utilisez la commande :\n"
            "<code>/log 2h Projet Alpha - réunion client</code>"
        )
        return

    # ── Commandes sans auth ───────────────────────────────────────────
    if text.startswith("/projets"):
        await reply(await commands.cmd_projets())
        return

    if text.startswith("/portefeuille"):
        await reply(await commands.cmd_portefeuille())
        return

    if text.startswith("/retard"):
        await reply(await commands.cmd_retard())
        return

    if text.startswith("/risques"):
        await reply(await commands.cmd_risques())
        return

    if text.startswith("/equipe"):
        await reply(await commands.cmd_equipe())
        return

    if text.lower().startswith("/projet ") or text.lower() == "/projet":
        name_query = text[7:].strip()
        await reply(await commands.cmd_projet(name_query))
        return

    # ── Commandes avec auth ───────────────────────────────────────────
    if text.startswith("/aujour"):
        err = requires_auth()
        if err: await reply(err); return
        await reply(await commands.cmd_aujourd_hui(employee_id))
        return

    if text.startswith("/semaine"):
        err = requires_auth()
        if err: await reply(err); return
        await reply(await commands.cmd_semaine(employee_id))
        return

    if text.startswith("/mois"):
        err = requires_auth()
        if err: await reply(err); return
        await reply(await commands.cmd_mois(employee_id))
        return

    if text.startswith("/taches"):
        err = requires_auth()
        if err: await reply(err); return
        await reply(await commands.cmd_taches(res_user_id))
        return

    if text.startswith("/alertes"):
        err = requires_auth()
        if err: await reply(err); return
        await reply(await commands.cmd_alertes(employee_id, res_user_id))
        return

    if text.startswith("/recap"):
        err = requires_auth()
        if err: await reply(err); return
        await reply(await commands.cmd_recap(employee_id))
        return

    if text.startswith("/modifier "):
        err = requires_auth()
        if err: await reply(err); return
        await reply(await commands.cmd_modifier(text[9:].strip(), employee_id))
        return

    if text.startswith("/supprimer "):
        err = requires_auth()
        if err: await reply(err); return
        await reply(await commands.cmd_supprimer(text[10:].strip(), employee_id))
        return

    if text.startswith("/log ") or text.startswith("/log\n"):
        err = requires_auth()
        if err: await reply(err); return
        await reply(await commands.handle_log(text[4:].strip(), employee_id))
        return

    # ── Langage naturel ───────────────────────────────────────────────
    if employee_id:
        response = await commands.handle_log(text, employee_id)
        if "pas compris" not in response and "pas trouvé" not in response:
            await reply(response)
            return

    await reply(
        "Je n'ai pas compris 🤔\n\n"
        "Essayez : <i>3h Projet Alpha - réunion client</i>\n"
        "Ou tapez /menu pour le menu interactif.",
        [[{"text": "📋 Ouvrir le menu", "callback_data": "/menu"}]],
    )
