import time
import httpx
from app.config import settings


class OdooGatewayError(Exception):
    pass


_cache: dict[str, tuple[float, object]] = {}
_CACHE_TTL = 300  # 5 minutes


def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and time.time() - entry[0] < _CACHE_TTL:
        return entry[1]
    return None


def _cache_set(key: str, value):
    _cache[key] = (time.time(), value)


def _client() -> httpx.AsyncClient:
    return httpx.AsyncClient(
        base_url=settings.gateway_url,
        headers={
            "Authorization": f"Bearer {settings.gateway_api_key}",
            "Content-Type": "application/json",
        },
        timeout=30,
    )


async def _get(path: str):
    async with _client() as c:
        r = await c.get(path)
    if not r.is_success:
        raise OdooGatewayError(f"{r.status_code}: {r.text}")
    return r.json()


async def _post(path: str, payload: dict):
    async with _client() as c:
        r = await c.post(path, json=payload)
    if not r.is_success:
        try:
            detail = r.json().get("detail", r.text)
        except Exception:
            detail = r.text
        raise OdooGatewayError(f"{r.status_code}: {detail}")
    return r.json()


async def health():
    return await _get("/api/health")


async def me():
    return await _get("/api/me")


async def search_read(model, domain=None, fields=None, limit=100, offset=0, order=None):
    return await _post("/api/odoo/search_read", {
        "model": model,
        "domain": domain or [],
        "fields": fields,
        "limit": limit,
        "offset": offset,
        "order": order,
    })


async def read(model, ids, fields=None):
    return await _post("/api/odoo/read", {"model": model, "ids": ids, "fields": fields})


async def search_count(model, domain=None):
    return await _post("/api/odoo/search_count", {"model": model, "domain": domain or []})


async def create(model, values: dict):
    return await _post("/api/odoo/create", {"model": model, "values": values})


async def write(model, ids, values: dict):
    return await _post("/api/odoo/write", {"model": model, "ids": ids, "values": values})


async def unlink(model, ids):
    return await _post("/api/odoo/unlink", {"model": model, "ids": ids})


async def get_projects(use_cache=True):
    key = "projects"
    if use_cache:
        cached = _cache_get(key)
        if cached is not None:
            return cached
    data = await search_read("project.project", fields=["id", "name"], limit=200, order="name asc")
    _cache_set(key, data)
    return data


async def get_tasks_for_project(project_id: int, use_cache=True):
    key = f"tasks_{project_id}"
    if use_cache:
        cached = _cache_get(key)
        if cached is not None:
            return cached
    data = await search_read(
        "project.task",
        domain=[["project_id", "=", project_id]],
        fields=["id", "name", "stage_id"],
        limit=200,
        order="name asc",
    )
    _cache_set(key, data)
    return data
