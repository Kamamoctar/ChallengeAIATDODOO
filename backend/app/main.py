import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.config import settings
from app import gateway
from app.routers import employees, projects, timesheets, tasks, calendar, pdaap, commandant, risks
from app.bot.telegram_webhook import router as telegram_router, _send

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler(timezone="UTC")


async def send_daily_briefings():
    """Envoyé automatiquement chaque matin à 8h30 UTC."""
    from app.bot.commands import cmd_briefing
    for tg_uid, emp_id in settings.telegram_user_map.items():
        res_uid = settings.res_user_map.get(tg_uid)
        if not res_uid or not settings.telegram_bot_token:
            continue
        try:
            msg = await cmd_briefing(emp_id, res_uid)
            await _send(settings.telegram_bot_token, tg_uid, msg)
        except Exception as e:
            logger.error("Briefing failed for tg=%s: %s", tg_uid, e)


@asynccontextmanager
async def lifespan(app):
    scheduler.add_job(send_daily_briefings, "cron", hour=8, minute=30)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Odoo Daily Entry API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(employees.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(timesheets.router)
app.include_router(calendar.router)
app.include_router(pdaap.router)
app.include_router(commandant.router)
app.include_router(risks.router)
app.include_router(telegram_router)


@app.get("/api/health")
async def health():
    return await gateway.health()


@app.post("/api/briefing/send")
async def trigger_briefing():
    """Déclenche le briefing manuellement (test / démo)."""
    await send_daily_briefings()
    return {"sent": len(settings.telegram_user_map)}
