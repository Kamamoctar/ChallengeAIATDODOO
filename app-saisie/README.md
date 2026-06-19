# ⏱️ Saisie Odoo — app web du binôme

Application web qui rend la **saisie quotidienne dans Odoo** (feuilles de temps)
simple et rapide :

- saisie en quelques secondes : équipier → projet → tâche → heures → description ;
- recherche de projet instantanée et liste des tâches du projet ;
- **tableau de bord** des 14 derniers jours (total d'heures, nombre de saisies) ;
- écriture attribuée au **bon équipier** (`employee_id` explicite).

L'app ne parle **jamais** directement à Odoo : tout passe par la passerelle
sécurisée du concours, et la clé API reste **côté serveur** (variable
d'environnement), jamais dans le navigateur ni en dur dans le code.

```
Navigateur ──► Backend FastAPI (/api/*) ──► Passerelle ──► Odoo
                 │ détient la clé API
                 └ MEMBER_A_ID = 32 (SOSSOU Candide)
                   MEMBER_B_ID = 291 (NAMADOU Moctar)
```

## Prérequis
- Python 3.10+

## Installation
```bash
cd app-saisie
python -m venv .venv
# Windows :  .venv\Scripts\activate
# macOS/Linux :  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # Windows : copy .env.example .env
```
Ouvrez `.env` et vérifiez `GATEWAY_API_KEY` (déjà pré-rempli avec la clé du concours).

## Lancer
```bash
uvicorn main:app --reload
```
Puis ouvrez **http://127.0.0.1:8000**

## Structure
| Fichier | Rôle |
|---------|------|
| `gateway.py` | Client de la passerelle (lit la clé dans l'env, gère les erreurs) |
| `main.py` | Backend FastAPI : `/api/config`, `/api/projects`, `/api/tasks`, `/api/timesheets` (GET/POST/PATCH) |
| `static/` | Interface web (HTML/CSS/JS, sans build) |
| `.env` | **Secrets** — non versionné (voir `.gitignore`) |

## Endpoints du backend
| Méthode | Chemin | Rôle |
|--------|--------|------|
| GET | `/api/config` | Membres du binôme + date du jour |
| GET | `/api/projects?q=` | Recherche de projets |
| GET | `/api/tasks?project_id=` | Tâches d'un projet |
| GET | `/api/timesheets?employee_id=&days=` | Saisies récentes + total |
| POST | `/api/timesheets` | Créer une feuille de temps |
| PATCH | `/api/timesheets/{id}` | Modifier (heures / desc. / date) |

## Sécurité & garde-fous
- La clé API n'est jamais envoyée au navigateur.
- Les écritures sont **restreintes au binôme** : le backend refuse tout
  `employee_id` autre que 32 ou 291, et toute modification d'une ligne qui
  n'appartient pas au binôme (base Odoo **partagée**).

## Idées d'extensions
- Saisie en langage naturel (« 3h sur le projet X aujourd'hui »).
- Rappel de fin de journée si aucune saisie.
- Import en masse (CSV → plusieurs feuilles de temps).
