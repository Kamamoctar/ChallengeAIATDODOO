# HANDOVER — Référence technique
## Concours « App de saisie Odoo au quotidien » — Togo Data AI Lab

> Document de référence (endpoints, modèles, exemples). Pour démarrer, ce n'est
> pas ici qu'il faut aller : collez **`00_PROMPT_IA.md`** dans votre IA. Ce
> fichier sert d'aide-mémoire technique pour vous et votre IA.

---

## 1. Accès

| Élément | Valeur |
|--------|--------|
| **URL de la passerelle** | `https://odoo-gateway-kappa.vercel.app` |
| **Clé d'accès (partagée concours)** | `concours_vm0MF_Ujrf9y3k-OSbu_MhUihpr0Lk5c` |

En-têtes pour chaque appel :
```
Authorization: Bearer concours_vm0MF_Ujrf9y3k-OSbu_MhUihpr0Lk5c
Content-Type: application/json
```

> 🔒 La clé est partagée par tout le concours. Gardez-la dans une variable
> d'environnement (`GATEWAY_API_KEY`), jamais en dur dans le code livré. Vous
> n'aurez **jamais** le login/mot de passe Odoo — c'est voulu.

---

## 2. Identité du binôme

La clé étant partagée, l'identification se fait **par le nom** : on retrouve
chaque équipier dans Odoo via `hr.employee`, et on récupère son `employee_id`.
C'est ce que fait l'IA automatiquement (voir `00_PROMPT_IA.md`).

```bash
curl -X POST https://odoo-gateway-kappa.vercel.app/api/odoo/search_read \
  -H "Authorization: Bearer $GATEWAY_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"hr.employee","domain":[["name","ilike","VOTRE_NOM"]],"fields":["id","name","work_email","department_id"]}'
```

Conservez les **2 `employee_id`** du binôme : vous les passerez explicitement
lors de la création des feuilles de temps, pour attribuer chaque saisie au bon
équipier.

---

## 3. Endpoints

Base : `https://odoo-gateway-kappa.vercel.app`

| Méthode | Chemin | Description | Corps JSON |
|--------|--------|-------------|-----------|
| GET  | `/api/health` | État de la passerelle | — |
| GET  | `/api/me` | Vérifier la clé | — |
| POST | `/api/odoo/search_read` | Lire des enregistrements filtrés | `model, domain, fields, limit, offset, order` |
| POST | `/api/odoo/read` | Lire par IDs | `model, ids, fields` |
| POST | `/api/odoo/search_count` | Compter | `model, domain` |
| POST | `/api/odoo/fields` | Découvrir le schéma d'un modèle | `model` |
| POST | `/api/odoo/create` | Créer | `model, values` |
| POST | `/api/odoo/write` | Modifier | `model, ids, values` |
| POST | `/api/odoo/unlink` | Supprimer | `model, ids` |
| POST | `/api/odoo/call` | Appel générique execute_kw | `model, method, args, kwargs` |

Le `domain` est un filtre Odoo : liste de triplets `["champ","opérateur",valeur]`,
ex. `[["project_id","=",5]]`.

---

## 4. Modèles Odoo utiles

| Besoin | Modèle | Champs courants |
|--------|--------|-----------------|
| Employés | `hr.employee` | `id, name, work_email, department_id, job_title` |
| Projets | `project.project` | `id, name, user_id` |
| Tâches | `project.task` | `id, name, description, project_id, stage_id, user_ids, date_deadline, priority` |
| Étapes de tâche | `project.task.type` | `id, name` |
| **Feuilles de temps** | `account.analytic.line` | `name, date, unit_amount` (heures), `employee_id, project_id, task_id` |
| Départements | `hr.department` | `id, name` |
| Congés | `hr.leave` | `id, employee_id, holiday_status_id, date_from, date_to, state` |

> Certains modèles sont volontairement bloqués (utilisateurs, configuration
> système…). Un `403` est attendu : choisissez un autre modèle.

---

## 5. Exemples

### a) Lister les projets
```bash
curl -X POST https://odoo-gateway-kappa.vercel.app/api/odoo/search_read \
  -H "Authorization: Bearer $GATEWAY_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"project.project","fields":["id","name"],"limit":50}'
```

### b) Découvrir le schéma des feuilles de temps
```bash
curl -X POST https://odoo-gateway-kappa.vercel.app/api/odoo/fields \
  -H "Authorization: Bearer $GATEWAY_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"account.analytic.line"}'
```

### c) Créer une feuille de temps (employee_id explicite)
```bash
curl -X POST https://odoo-gateway-kappa.vercel.app/api/odoo/create \
  -H "Authorization: Bearer $GATEWAY_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "model": "account.analytic.line",
    "values": {
      "name": "Développement module X",
      "employee_id": 485,
      "project_id": 5,
      "date": "2026-06-19",
      "unit_amount": 3.5
    }
  }'
```
Réponse : `{ "id": 1234 }`

### d) Projets & tâches (lecture + écriture)
```bash
# Tâches d'un projet
curl -X POST https://odoo-gateway-kappa.vercel.app/api/odoo/search_read \
  -H "Authorization: Bearer $GATEWAY_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"project.task","domain":[["project_id","=",724]],"fields":["id","name","stage_id","date_deadline"]}'

# Créer une tâche
curl -X POST https://odoo-gateway-kappa.vercel.app/api/odoo/create \
  -H "Authorization: Bearer $GATEWAY_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"project.task","values":{"name":"Préparer le rapport","project_id":724,"date_deadline":"2026-06-30"}}'

# Déplacer une tâche vers une étape (voir les étapes via project.task.type)
curl -X POST https://odoo-gateway-kappa.vercel.app/api/odoo/write \
  -H "Authorization: Bearer $GATEWAY_API_KEY" -H "Content-Type: application/json" \
  -d '{"model":"project.task","ids":[62845],"values":{"stage_id":109}}'
```
> L'assignation se fait via `user_ids` (ids `res.users`, ≠ `employee_id` ;
> récupérez-le via le champ `user_id` de `hr.employee`).

### e) Python / JavaScript
Voir `exemples/client.py` et `exemples/client.js` (clients prêts à l'emploi).

---

## 6. Règles

1. Ne jamais chercher/exposer les identifiants Odoo ; tout passe par la passerelle.
2. Clé dans une variable d'environnement, jamais en clair dans le code livré.
3. Base **partagée** : prudence en écriture/suppression, restez dans votre périmètre.
4. Erreurs : `401` clé invalide · `403` modèle interdit · `400` donnée refusée (lire `detail`) · `502` réessayer.

Bonne chance ! 🚀
