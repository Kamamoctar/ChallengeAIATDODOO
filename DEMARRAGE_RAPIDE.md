# ⚡ Démarrage rapide — test manuel (optionnel)

> Normalement, vous n'avez rien à faire à la main : collez `00_PROMPT_IA.md`
> dans votre IA et suivez-la. Ce fichier sert juste à vérifier vous-même que
> la passerelle répond.

La clé d'accès du concours (partagée) est :

```
concours_vm0MF_Ujrf9y3k-OSbu_MhUihpr0Lk5c
```

## 1. Mettez la clé dans une variable d'environnement

**macOS / Linux :**
```bash
export GATEWAY_API_KEY="concours_vm0MF_Ujrf9y3k-OSbu_MhUihpr0Lk5c"
```

**Windows (PowerShell) :**
```powershell
$env:GATEWAY_API_KEY = "concours_vm0MF_Ujrf9y3k-OSbu_MhUihpr0Lk5c"
```

## 2. La passerelle répond-elle ?

```bash
curl https://odoo-gateway-kappa.vercel.app/api/health
```
✅ Attendu : `{"status":"ok","odoo":"connected"}`

## 3. La clé fonctionne-t-elle ?

```bash
curl -H "Authorization: Bearer $GATEWAY_API_KEY" \
     https://odoo-gateway-kappa.vercel.app/api/me
```
✅ Attendu : `{"name":"Concours Binomes", ...}`

## 4. Retrouvez-vous dans Odoo (par votre nom)

```bash
curl -X POST https://odoo-gateway-kappa.vercel.app/api/odoo/search_read \
  -H "Authorization: Bearer $GATEWAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"hr.employee","domain":[["name","ilike","VOTRE_NOM"]],"fields":["id","name","work_email"]}'
```
✅ Vous obtenez votre `id` (= votre `employee_id`).

## Codes d'erreur

| Code | Signification | Que faire |
|------|---------------|-----------|
| 401 | Clé absente/invalide | Vérifiez l'en-tête `Authorization: Bearer ...` |
| 403 | Modèle interdit | Utilisez un autre modèle |
| 400 | Donnée refusée par Odoo | Lisez le champ `detail` |
| 502 | Odoo injoignable | Réessayez |
