from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app import gateway
from app.routers import employees, projects, timesheets
from app.bot.telegram_webhook import router as telegram_router

app = FastAPI(title="Odoo Daily Entry API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(employees.router)
app.include_router(projects.router)
app.include_router(timesheets.router)
app.include_router(telegram_router)


@app.get("/api/health")
async def health():
    return await gateway.health()
