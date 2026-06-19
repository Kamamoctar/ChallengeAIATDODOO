"""
Client de la passerelle Odoo du concours.

La clé API est lue dans la variable d'environnement GATEWAY_API_KEY
(jamais en dur dans le code). Voir .env.example.
"""

import os
import requests


class GatewayError(Exception):
    """Erreur renvoyée par la passerelle ou Odoo (porte le code HTTP + detail)."""

    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(f"{status}: {detail}")


class OdooGateway:
    def __init__(self, api_key: str | None = None, base_url: str | None = None):
        self.base_url = (base_url or os.environ.get(
            "GATEWAY_URL", "https://odoo-gateway-kappa.vercel.app")).rstrip("/")
        self.api_key = api_key or os.environ.get("GATEWAY_API_KEY")
        if not self.api_key:
            raise GatewayError(0, "Clé API manquante (définissez GATEWAY_API_KEY).")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        })

    def _post(self, path: str, payload: dict):
        r = self.session.post(f"{self.base_url}{path}", json=payload, timeout=30)
        return self._handle(r)

    def _get(self, path: str):
        r = self.session.get(f"{self.base_url}{path}", timeout=30)
        return self._handle(r)

    @staticmethod
    def _handle(r: requests.Response):
        if r.ok:
            return r.json()
        detail = r.text
        if r.headers.get("content-type", "").startswith("application/json"):
            try:
                detail = r.json().get("detail", r.text)
            except ValueError:
                pass
        raise GatewayError(r.status_code, detail)

    # --- Profil / santé ---
    def health(self):
        return self._get("/api/health")

    def me(self):
        return self._get("/api/me")

    # --- Lecture ---
    def search_read(self, model, domain=None, fields=None, limit=100, offset=0, order=None):
        return self._post("/api/odoo/search_read", {
            "model": model, "domain": domain or [], "fields": fields,
            "limit": limit, "offset": offset, "order": order,
        })

    def read(self, model, ids, fields=None):
        return self._post("/api/odoo/read", {"model": model, "ids": ids, "fields": fields})

    def search_count(self, model, domain=None):
        return self._post("/api/odoo/search_count", {"model": model, "domain": domain or []})

    def fields(self, model):
        return self._post("/api/odoo/fields", {"model": model})

    # --- Écriture ---
    def create(self, model, values: dict):
        return self._post("/api/odoo/create", {"model": model, "values": values})

    def write(self, model, ids, values: dict):
        return self._post("/api/odoo/write", {"model": model, "ids": ids, "values": values})

    def unlink(self, model, ids):
        return self._post("/api/odoo/unlink", {"model": model, "ids": ids})
