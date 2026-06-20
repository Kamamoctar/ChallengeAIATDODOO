"""
Script de démarrage : trouvez vos employee_id Odoo.
Usage: python find_employees.py "Prénom Nom"
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import requests

GATEWAY_URL = "https://odoo-gateway-kappa.vercel.app"
API_KEY = os.environ.get("GATEWAY_API_KEY")
if not API_KEY:
    raise SystemExit("Erreur : définissez la variable GATEWAY_API_KEY dans votre .env ou environnement")


def search(name: str):
    r = requests.post(
        f"{GATEWAY_URL}/api/odoo/search_read",
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
        json={
            "model": "hr.employee",
            "domain": [["name", "ilike", name]],
            "fields": ["id", "name", "job_title", "department_id"],
            "limit": 10,
        },
        timeout=15,
    )
    r.raise_for_status()
    return r.json()


if __name__ == "__main__":
    query = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else ""
    if not query:
        query = input("Entrez votre nom (ou une partie) : ")

    results = search(query)
    if not results:
        print("Aucun employé trouvé.")
    else:
        print(f"\n{len(results)} résultat(s) :\n")
        for e in results:
            dept = e.get("department_id", [None, "—"])
            dept_name = dept[1] if isinstance(dept, list) else "—"
            print(f"  ID={e['id']:4d}  {e['name']:<30}  {e.get('job_title','') or '':<20}  Dept: {dept_name}")
    print("\nCopiez l'ID dans votre fichier .env (EMPLOYEE_A_ID / EMPLOYEE_B_ID)")
