/**
 * Client JavaScript prêt à l'emploi pour la passerelle Odoo du concours.
 * Fonctionne avec Node 18+ (fetch natif) ou dans le navigateur.
 *
 * Configuration : GATEWAY_API_KEY dans l'environnement (Node) ou passée au constructeur.
 *
 *   import { OdooGateway } from "./client.js";
 *   const gw = new OdooGateway(process.env.GATEWAY_API_KEY);
 *   console.log(await gw.me());
 *   const projets = await gw.searchRead("project.project", { fields: ["id", "name"] });
 */

const DEFAULT_BASE = "https://odoo-gateway-kappa.vercel.app";

export class OdooGateway {
  constructor(apiKey, baseUrl = DEFAULT_BASE) {
    this.apiKey =
      apiKey ||
      (typeof process !== "undefined" ? process.env.GATEWAY_API_KEY : null);
    if (!this.apiKey) throw new Error("Clé API manquante (GATEWAY_API_KEY).");
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  get _headers() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async _post(path, payload) {
    const r = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this._headers,
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${r.status}: ${data.detail || r.statusText}`);
    return data;
  }

  async _get(path) {
    const r = await fetch(`${this.baseUrl}${path}`, { headers: this._headers });
    if (!r.ok) throw new Error(`${r.status}: ${r.statusText}`);
    return r.json();
  }

  // --- Profil ---
  me() {
    return this._get("/api/me");
  }

  // --- Lecture ---
  searchRead(model, { domain = [], fields = null, limit = 100, offset = 0, order = null } = {}) {
    return this._post("/api/odoo/search_read", { model, domain, fields, limit, offset, order });
  }

  read(model, ids, fields = null) {
    return this._post("/api/odoo/read", { model, ids, fields });
  }

  searchCount(model, domain = []) {
    return this._post("/api/odoo/search_count", { model, domain });
  }

  fields(model) {
    return this._post("/api/odoo/fields", { model });
  }

  // --- Écriture ---
  create(model, values) {
    return this._post("/api/odoo/create", { model, values });
  }

  write(model, ids, values) {
    return this._post("/api/odoo/write", { model, ids, values });
  }

  unlink(model, ids) {
    return this._post("/api/odoo/unlink", { model, ids });
  }

  call(model, method, args = [], kwargs = {}) {
    return this._post("/api/odoo/call", { model, method, args, kwargs });
  }
}
