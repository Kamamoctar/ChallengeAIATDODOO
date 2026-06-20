"""
Client Python prêt à l'emploi pour la passerelle Odoo du concours.

Pré-requis : pip install requests
Configuration : export GATEWAY_API_KEY="cand_votre_cle"

    from client import OdooGateway
    gw = OdooGateway()
    print(gw.me())
    projets = gw.search_read("project.project", fields=["id", "name"])
"""

import os
import requests

BASE_URL = os.environ.get("GATEWAY_URL", "https://odoo-gateway-kappa.vercel.app")


class OdooGatewayError(Exception):
    pass


class OdooGateway:
    def __init__(self, api_key: str | None = None, base_url: str = BASE_URL):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key or os.environ.get("GATEWAY_API_KEY")
        if not self.api_key:
            raise OdooGatewayError("Clé API manquante (GATEWAY_API_KEY).")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        })

    def _post(self, path: str, payload: dict):
        r = self.session.post(f"{self.base_url}{path}", json=payload, timeout=30)
        if not r.ok:
            detail = r.json().get("detail", r.text) if r.headers.get("content-type", "").startswith("application/json") else r.text
            raise OdooGatewayError(f"{r.status_code}: {detail}")
        return r.json()

    def _get(self, path: str):
        r = self.session.get(f"{self.base_url}{path}", timeout=30)
        if not r.ok:
            raise OdooGatewayError(f"{r.status_code}: {r.text}")
        return r.json()

    # --- Profil ---
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

    def call(self, model, method, args=None, kwargs=None):
        return self._post("/api/odoo/call", {
            "model": model, "method": method, "args": args or [], "kwargs": kwargs or {},
        })


if __name__ == "__main__":
    gw = OdooGateway()
    print("Profil :", gw.me())
    print("Projets :", gw.search_read("project.project", fields=["id", "name"], limit=5))
