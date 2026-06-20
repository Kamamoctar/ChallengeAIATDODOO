# Documentation Utilisateur
# ATD — Application de Gestion de Projet

**Version :** 1.0  
**Date :** Juin 2026  
**Équipe :** ATD  
**Contact :** kamamoctar@gmail.com

---

## Table des matières

1. [Présentation de l'application](#1-présentation-de-lapplication)
2. [Accès et installation](#2-accès-et-installation)
3. [Tableau de bord](#3-tableau-de-bord)
4. [Focus du jour](#4-focus-du-jour)
5. [Vue Kanban](#5-vue-kanban)
6. [Gestion des projets](#6-gestion-des-projets)
7. [Fiche projet et conformité ISO 21500](#7-fiche-projet-et-conformité-iso-21500)
8. [Saisie de temps](#8-saisie-de-temps)
9. [Timer de focus](#9-timer-de-focus)
10. [Historique et export](#10-historique-et-export)
11. [Recherche globale](#11-recherche-globale)
12. [Bot Telegram](#12-bot-telegram)
13. [Mode hors-ligne](#13-mode-hors-ligne)
14. [Guide administrateur](#14-guide-administrateur)

---

## 1. Présentation de l'application

### 1.1 Description générale

ATD Gestion de Projet est une application web progressive (PWA) conçue pour les chefs de projet et leur hiérarchie. Elle permet de :

- **Saisir et suivre le temps** passé sur chaque projet en temps réel
- **Gérer les projets** selon la norme internationale **ISO 21500**
- **Visualiser les indicateurs clés** à travers un tableau de bord multi-niveaux
- **Communiquer avec l'équipe** via un bot Telegram intégré

L'application se synchronise automatiquement avec **Odoo** (ERP de l'organisation) et peut être installée sur mobile comme une application native.

### 1.2 Architecture technique

| Composant | Technologie | Hébergement |
|---|---|---|
| Interface utilisateur | React 18 + PWA | Vercel |
| Serveur API | FastAPI (Python) | Render |
| Base de données | Odoo (ERP) | Odoo Cloud |
| Bot Telegram | Python webhook | Render |

### 1.3 Navigateurs et plateformes supportés

L'application fonctionne sur tous les navigateurs modernes (Chrome, Firefox, Safari, Edge) et sur tous les appareils (ordinateur, tablette, smartphone). Elle est **installable sur l'écran d'accueil** du smartphone via la bannière d'installation automatique.

---

## 2. Accès et installation

### 2.1 Accès web

Ouvrir le navigateur et saisir l'URL de l'application fournie par l'administrateur.

### 2.2 Installation sur smartphone (PWA)

1. Ouvrir l'application dans **Chrome** (Android) ou **Safari** (iOS)
2. Un bandeau « Ajouter à l'écran d'accueil » apparaît automatiquement
3. Appuyer sur **Installer** ou **Ajouter**
4. L'application est désormais accessible comme une application native

### 2.3 Sélection du membre actif

Lors de la première utilisation, l'application affiche les deux membres de l'équipe dans la barre latérale (ordinateur) ou via le bouton de bascule en haut à droite (mobile). Appuyer sur le nom du membre souhaité pour basculer entre les deux comptes. Les données de saisie de temps sont propres à chaque membre.

---

## 3. Tableau de bord

Le tableau de bord est la page d'accueil de l'application. Il propose **trois onglets** adaptés à chaque profil d'utilisateur.

### 3.1 Onglet « Moi » — Vue personnelle

Destiné à chaque membre de l'équipe pour suivre sa propre activité.

| Indicateur | Description |
|---|---|
| **Aujourd'hui** | Nombre d'heures saisies ce jour |
| **Cette semaine** | Total des heures de la semaine en cours + tendance vs semaine précédente (▲▼) |
| **Moy./jour** | Moyenne d'heures sur les jours travaillés |
| **Objectif jour** | Progression vers les 8h quotidiennes |

La **barre de progression** du jour devient orange lorsque les 8h sont dépassées, signalant les heures supplémentaires.

Le graphique en barres montre la répartition des heures sur les 7 derniers jours. Le graphique circulaire montre la répartition du temps par projet sur 7 jours.

En bas de page se trouvent les entrées de temps du jour en cours, modifiables individuellement.

### 3.2 Onglet « Chef de Projet » — Vue opérationnelle

Destiné au chef de projet pour surveiller l'avancement du portefeuille.

| Section | Contenu |
|---|---|
| **KPIs** | Projets actifs, projets en retard, heures personnelles, heures équipe |
| **Projets nécessitant une action** | Liste des projets en retard ou avec deadline dans 7 jours |
| **Distribution par phase** | Barres horizontales montrant combien de projets sont dans chaque phase ISO |
| **Échéances 14 jours** | Projets avec deadline imminente, code couleur rouge/orange/vert |
| **Charge hebdomadaire** | Comparaison des heures des deux membres de l'équipe |

### 3.3 Onglet « Direction » — Vue stratégique

Destiné au management pour une vue d'ensemble du portefeuille.

| Section | Contenu |
|---|---|
| **Santé du portefeuille** | Pourcentage de projets dans les délais (vert ≥ 80%, orange ≥ 50%, rouge < 50%) |
| **Utilisation équipe** | Pourcentage d'utilisation par rapport à l'objectif 40h/semaine |
| **Portefeuille par phase** | Graphique donut (camembert) des projets par phase ISO |
| **Top projets** | Graphique à barres des 5 projets les plus actifs de la semaine |
| **Pipeline de livraisons** | Projets avec deadline dans les 30 prochains jours |
| **Performance équipe** | Barres de progression individuelles avec indicateur heures supplémentaires |

> **Note :** Les tendances N vs N-1 (▲▼) sont calculées automatiquement en comparant la semaine en cours avec la semaine précédente.

---

## 4. Focus du jour

La page Focus permet de définir jusqu'à **3 tâches prioritaires** pour la journée.

### 4.1 Ajouter une tâche au focus

1. Appuyer sur le bouton **« + Ajouter »** en haut à droite
2. Saisir quelques lettres pour filtrer la liste des tâches assignées
3. Sélectionner la tâche souhaitée
4. Maximum 3 tâches par jour

### 4.2 Démarrer le timer sur une tâche

Appuyer sur le bouton **« ▶ Démarrer timer »** de la tâche. Le timer apparaît en bas de l'écran et commence à décompter. Une seule tâche peut être chronométrée à la fois.

### 4.3 Saisir le temps manuellement

Appuyer sur **« ⏱ Log »** à côté d'une tâche pour saisir manuellement une durée sans utiliser le timer.

### 4.4 Retirer une tâche du focus

Appuyer sur le bouton **« ✕ »** à droite de la tâche. La tâche reste dans Odoo, elle est simplement retirée de la vue Focus du jour.

---

## 5. Vue Kanban

La vue Kanban (**icône 📋 dans la navigation**) présente toutes les tâches assignées au membre actif, organisées par colonne selon leur étape (stage Odoo).

### 5.1 Navigation

- Faire défiler **horizontalement** pour voir toutes les colonnes
- Utiliser le **filtre de recherche** en haut pour chercher une tâche par mot-clé
- Utiliser le **sélecteur de projet** pour n'afficher que les tâches d'un projet donné

### 5.2 Déplacer une tâche

1. Dans la carte de la tâche, appuyer sur **« Déplacer ▾ »**
2. Choisir l'étape cible dans le menu déroulant
3. La tâche se déplace vers la nouvelle colonne et la modification est enregistrée dans Odoo

### 5.3 Codes couleur des cartes

| Bordure | Signification |
|---|---|
| Jaune (gauche) | Tâche marquée comme prioritaire (étoile ⭐) |
| Rouge (gauche) | Tâche avec deadline dépassée |
| Grise | Tâche normale |

---

## 6. Gestion des projets

### 6.1 Liste des projets

La page **Projets** (icône 📁) affiche tous les projets. Un filtre de recherche est disponible en haut de la liste.

Chaque projet affiche :
- Le **nom** du projet
- La **phase ISO 21500** actuelle (badge coloré)
- La **deadline** si définie, en rouge si dépass��e
- Un indicateur **« En retard »** si la deadline est passée

### 6.2 Projets actifs et archivés

- **Vue Actifs** (défaut) : projets en phases Initialisation, Planification, Réalisation ou Contrôle
- **Vue Archivés** (bouton 🗄) : projets en phase Clôture

Appuyer sur le bouton **« 🗄 Archivés »** pour basculer entre les deux vues. Appuyer sur **« 📂 Actifs »** pour revenir à la vue par défaut.

### 6.3 Créer un nouveau projet

1. Appuyer sur **« + Nouveau »**
2. Saisir le **nom du projet** (obligatoire)
3. Saisir la **date limite** (optionnel)
4. Appuyer sur **Créer**

Le projet est créé dans Odoo et apparaît immédiatement dans la liste.

### 6.4 Créer un projet depuis un template

1. Appuyer sur **« 📋 Cloner »**
2. Sélectionner le **projet modèle** dans la liste
3. Saisir le nom du nouveau projet
4. Appuyer sur **Créer**

Le nouveau projet est créé avec toutes les tâches du projet modèle recopiées.

---

## 7. Fiche projet et conformité ISO 21500

En appuyant sur un projet, on accède à sa fiche détaillée avec **13 onglets**.

### 7.1 Score de conformité ISO 21500

Un badge de conformité est affiché dans l'en-tête du projet :

| Couleur | Score | Signification |
|---|---|---|
| Vert | ≥ 80% | Projet bien documenté |
| Orange | 50–79% | Documentation incomplète |
| Rouge | < 50% | Documentation insuffisante |

Le score est calculé automatiquement à partir de la présence des 11 éléments clés de la norme.

### 7.2 Description des onglets

| Onglet | Contenu | Référence ISO 21500 |
|---|---|---|
| **WBS** | Structure de découpage du travail, arborescence des tâches numérotées, jalons | §4.3.3 |
| **Phases** | Progression du projet sur les 5 phases ISO (cliquer pour avancer) | §4.3.1–2 |
| **Charte** | Document de charte projet (objectifs, périmètre, budget, dates, risques, critères de succès) | §4.3.1 |
| **Parties prenantes** | Registre des parties prenantes (influence, intérêt, canal de communication) | §4.3.9 |
| **Risques** | Registre des risques (probabilité × impact, niveau, traitement, propriétaire) | §4.3.28 |
| **Livrables** | Registre des livrables (critères d'acceptation, responsable, statut) | §4.3.11 |
| **Modifications** | Journal des demandes de modification (type, impact, statut) | §4.3.8 |
| **Leçons** | Registre des leçons apprises (catégorie, impact, recommandation) | §4.3.7 |
| **Communication** | Plan de communication (audience, canal, fréquence) | §4.3.37–39 |
| **Achats** | Registre des achats et contrats (fournisseur, montant, statut) | §4.3.40–42 |
| **Ressources** | Planification des ressources humaines (rôle, disponibilité, charge) | §4.3.16–17 |
| **Qualité** | Plan qualité (indicateurs, méthodes de mesure, valeurs cibles) | §4.3.31–33 |
| **Infos** | Informations générales du projet (description, dates, responsable) | — |

### 7.3 Structure de découpage du travail (WBS)

L'onglet **WBS** affiche l'arborescence des tâches avec numérotation automatique (1, 1.1, 1.1.1…). Les jalons sont identifiés par le symbole ◆.

Pour ajouter une tâche, utiliser le formulaire en bas de la liste. Les sous-tâches peuvent être imbriquées sur plusieurs niveaux.

### 7.4 Avancement des phases

L'onglet **Phases** affiche les 5 phases ISO 21500 :

1. 🚀 **Initialisation** — Définir le projet, identifier les parties prenantes
2. 📋 **Planification** — Élaborer le plan de projet, définir le périmètre
3. ⚙️ **Réalisation** — Exécuter les activités planifiées
4. 🔍 **Contrôle** — Surveiller et maîtriser l'avancement
5. ✅ **Clôture** — Formaliser la fin du projet, capitaliser les leçons

Pour passer à la phase suivante, cliquer sur la phase cible. Si des éléments requis sont manquants, un avertissement s'affiche avec la liste des points à compléter. Il est possible d'ignorer et d'avancer quand même.

### 7.5 Gestion des risques

Chaque risque est évalué selon la matrice **Probabilité × Impact** :

| Niveau | Score | Couleur |
|---|---|---|
| Critique | ≥ 16 | Rouge |
| Élevé | 9–15 | Orange |
| Moyen | 4–8 | Jaune |
| Faible | 1–3 | Vert |

---

## 8. Saisie de temps

### 8.1 Saisie rapide (bouton +)

Le bouton **+** (en bas à droite) ouvre le formulaire de saisie rapide.

**Champs à remplir :**

| Champ | Obligatoire | Description |
|---|---|---|
| Projet | Oui | Sélectionner dans la liste des projets |
| Tâche | Non | Sélectionner une tâche du projet (optionnel) |
| Durée | Oui | Sélectionner parmi les chips (0.5h, 1h, 1.5h…) ou saisir manuellement |
| Description | Non | Description de l'activité réalisée |
| Date | Oui | Aujourd'hui par défaut, modifiable |

### 8.2 Modifier ou supprimer une entrée

Dans l'historique ou le tableau de bord, appuyer sur les icônes **✏️** (modifier) ou **🗑** (supprimer) à côté d'une entrée pour la modifier ou la supprimer. La modification est enregistrée dans Odoo.

---

## 9. Timer de focus

Le timer permet de chronométrer le temps passé sur une tâche et de créer automatiquement l'entrée de temps à l'arrêt.

### 9.1 Démarrer le timer

Depuis la page **Focus**, appuyer sur **« ▶ Démarrer timer »** sur l'une des trois tâches du focus. Le timer apparaît sous forme de pilule flottante en bas de l'écran.

### 9.2 Pendant le chronomètre

La pilule flottante affiche le temps écoulé et les contrôles suivants :

| Bouton | Action |
|---|---|
| ⏸ | Mettre en pause (le temps de pause n'est PAS compté) |
| ▶ Reprendre | Reprendre après une pause |
| ■ Stop | Arrêter et enregistrer automatiquement |
| ✕ | Annuler sans enregistrer |

> **Important :** Les pauses ne sont pas comptabilisées dans la durée enregistrée. Seul le temps actif est sauvegardé dans Odoo.

### 9.3 Arrêt automatique à 45 minutes

Après 45 minutes de focus continu, le timer s'arrête automatiquement et propose une **pause**. Un panneau s'affiche avec trois options :

- **▶ Continuer** — Reprendre le chronomètre
- **■ Stop & enregistrer** �� Enregistrer les 45 minutes et terminer
- **✕** — Fermer le panneau (le timer reste en pause)

### 9.4 Enregistrement automatique

À l'arrêt, l'entrée de temps est créée automatiquement dans Odoo sans confirmation supplémentaire. Une notification de succès confirme la durée enregistrée.

Si la durée est inférieure à 1 minute, aucune entrée n'est créée et un message d'information s'affiche.

---

## 10. Historique et export

### 10.1 Consulter l'historique

La page **Historique** (icône 📅) affiche les 14 derniers jours d'activité, groupés par jour. Chaque journée affiche :
- Le total d'heures
- Une barre de progression (orange si > 8h)
- Le badge heures supplémentaires si applicable
- La liste détaillée des entrées

### 10.2 Exporter en CSV

1. Appuyer sur le bouton **« ⬇ CSV »** dans l'en-tête de la page Historique
2. Un fichier CSV est téléchargé automatiquement

**Format du fichier :**

| Colonne | Description |
|---|---|
| Date | Date de l'entrée (AAAA-MM-JJ) |
| Projet | Nom du projet |
| Tâche | Nom de la tâche (si renseignée) |
| Description | Description de l'activité |
| Heures | Dur��e en heures (ex : 1.50) |

> **Note :** Le fichier est encodé en UTF-8 avec BOM pour une compatibilité optimale avec Microsoft Excel.

---

## 11. Recherche globale

### 11.1 Ouvrir la recherche

Deux méthodes pour ouvrir la recherche :
- **Raccourci clavier :** `Ctrl + K` (Windows/Linux) ou `Cmd + K` (Mac)
- **Bouton 🔍** dans la barre latérale gauche (ordinateur)

### 11.2 Utiliser la recherche

La barre de recherche cherche simultanément dans :
- Les **projets** (avec leur phase et deadline)
- Les **tâches** assignées au membre actif

Commencer à taper dès l'ouverture. Les résultats s'affichent immédiatement. Cliquer sur un résultat pour naviguer vers le projet ou la tâche correspondante.

**Fermer la recherche :** Appuyer sur `Échap` ou cliquer en dehors du panneau.

---

## 12. Bot Telegram

Le bot Telegram permet d'interagir avec l'application directement depuis Telegram, sans ouvrir le navigateur.

### 12.1 Commandes disponibles

| Commande | Description | Requiert identification |
|---|---|---|
| `/aide` | Affiche la liste de toutes les commandes | Non |
| `/projets` | Liste tous les projets actifs | Non |
| `/portefeuille` | Projets avec phase ISO et deadline | Non |
| `/retard` | Projets ayant dépassé leur deadline | Non |
| `/aujourd'hui` | Mes entrées de temps du jour | Oui |
| `/semaine` | Bilan hebdomadaire par projet | Oui |
| `/log Xh Projet - description` | Créer une entrée de temps | Oui |

### 12.2 Saisie en langage naturel

Le bot comprend le langage naturel pour la saisie de temps. Exemples de messages reconnus :

```
j'ai travaillé 3h sur Projet Alpha hier
2h30 Projet Beta - revue du code
30min Projet Gamma
```

Le bot identifie automatiquement le projet par correspondance approximative (même si le nom n'est pas parfaitement exact).

### 12.3 Commande /log détaillée

```
/log 2h Projet Alpha - description de l'activité
/log 30min Projet Beta
/log 3.5h Projet Gamma - mardi
```

**Formats de durée acceptés :** `2h`, `2.5h`, `30min`, `1h30min`

**Formats de date acceptés :** `hier`, `avant-hier`, `lundi`, `2026-06-15`, `15/06`

### 12.4 Exemple de /semaine

```
📊 Bilan semaine

• 12.5h — Projet Alpha
• 8.0h — Projet Beta
• 4.0h — Projet Gamma

Total : 24.5h / 40h
⏳ 15.5h pour atteindre l'objectif
```

### 12.5 Exemple de /portefeuille

```
📂 Portefeuille projets

• ⚙️ Réalisation — Projet Alpha · 📅 2026-07-15
• 📋 Planning — Projet Beta · 📅 2026-08-30
• ✅ Clôture — Projet Gamma · 📅 2026-05-01 ⚠️
```

---

## 13. Mode hors-ligne

### 13.1 Comportement en cas de perte de réseau

L'application détecte automatiquement la perte de connexion réseau. Si le timer est arrêté sans réseau :
- L'entrée de temps est **sauvegardée localement** sur l'appareil
- Une notification confirme la sauvegarde locale
- Un badge orange **« X entrée(s) en attente de sync »** apparaît dans la barre latérale

### 13.2 Synchronisation automatique

Dès que la connexion réseau est rétablie :
1. L'application détecte automatiquement le retour du réseau
2. Toutes les entrées en attente sont **synchronisées vers Odoo**
3. Un message de confirmation affiche le nombre d'entrées synchronis��es
4. Le badge disparaît

> **Important :** La synchronisation est transparente et ne nécessite aucune action manuelle.

---

## 14. Guide administrateur

Cette section s'adresse à la personne responsable du déploiement et de la configuration de l'application.

### 14.1 Variables d'environnement — Backend (Render)

Les 12 variables suivantes doivent être configurées dans le service backend sur Render (Dashboard → Service → Environment Variables) :

| Variable | Description | Exemple |
|---|---|---|
| `GATEWAY_URL` | URL de la passerelle Odoo | `https://odoo-gateway-kappa.vercel.app` |
| `GATEWAY_API_KEY` | Clé API secrète de la passerelle | `votre_cle_secrete` |
| `EMPLOYEE_A_ID` | ID employé Odoo du membre A | `291` |
| `EMPLOYEE_A_NAME` | Nom complet du membre A | `NAMADOU Moctar Kamakate` |
| `EMPLOYEE_A_USER_ID` | ID utilisateur Odoo du membre A | `187` |
| `EMPLOYEE_B_ID` | ID employé Odoo du membre B | `32` |
| `EMPLOYEE_B_NAME` | Nom complet du membre B | `SOSSOU Candide` |
| `EMPLOYEE_B_USER_ID` | ID utilisateur Odoo du membre B | `32` |
| `TELEGRAM_BOT_TOKEN` | Token du bot Telegram (BotFather) | `123456:ABC...` |
| `TELEGRAM_USER_A` | Telegram User ID du membre A | `805113249` |
| `TELEGRAM_USER_B` | Telegram User ID du membre B | `981509710` |
| `ALLOWED_ORIGINS` | URL(s) du frontend autorisées | `https://challenge-aiatdodoo.vercel.app` |

> ⚠️ **Sécurité :** Ces variables ne doivent jamais être partagées ni committées dans Git. Le fichier `.env` local est exclu du dépôt par le fichier `.gitignore`.

### 14.2 Variables d'environnement — Frontend (Vercel)

| Variable | Description | Exemple |
|---|---|---|
| `VITE_API_URL` | URL du backend Render | `https://votre-service.onrender.com` |
| `VITE_EMPLOYEE_A_ID` | ID employé Odoo du membre A | `291` |
| `VITE_EMPLOYEE_A_NAME` | Nom du membre A | `NAMADOU Moctar` |
| `VITE_EMPLOYEE_B_ID` | ID employé Odoo du membre B | `32` |
| `VITE_EMPLOYEE_B_NAME` | Nom du membre B | `SOSSOU Candide` |

### 14.3 Configuration du webhook Telegram

Après chaque changement de token du bot, enregistrer le nouveau webhook en appelant une seule fois l'URL suivante (remplacer les valeurs entre accolades) :

```
https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/setWebhook?url={BACKEND_URL}/webhook/telegram
```

**Exemple :**
```
https://api.telegram.org/bot123456:ABC.../setWebhook?url=https://mon-service.onrender.com/webhook/telegram
```

### 14.4 Obtenir le Telegram User ID

Pour configurer `TELEGRAM_USER_A` et `TELEGRAM_USER_B`, chaque membre doit :
1. Ouvrir Telegram et chercher **@userinfobot**
2. Envoyer le message `/start`
3. Le bot répond avec votre User ID numérique

### 14.5 Créer un bot Telegram

1. Ouvrir Telegram et chercher **@BotFather**
2. Envoyer `/newbot`
3. Suivre les instructions (choisir un nom et un nom d'utilisateur)
4. Le token est affiché à la fin — le copier immédiatement

Pour révoquer un token compromis : envoyer `/revoke` à @BotFather et sélectionner le bot concerné.

### 14.6 Conformité ISO 21500 — Référence des processus couverts

| Processus | § ISO 21500 | Couverture |
|---|---|---|
| Charte de projet | 4.3.1 | ✅ Complet |
| Phases de projet | 4.3.2 | ✅ Complet |
| Structure de découpage | 4.3.3 | ✅ Complet |
| Ressources humaines | 4.3.16–17 | ✅ Complet |
| Suivi du temps | 4.3.5 | ✅ Complet |
| Gestion des risques | 4.3.28 | ✅ Complet |
| Plan qualité | 4.3.31–33 | ✅ Complet |
| Parties prenantes | 4.3.9 | ✅ Complet |
| Leçons apprises | 4.3.7 | ✅ Complet |
| Maîtrise des modifications | 4.3.8 | ✅ Complet |
| Livrables | 4.3.11 | ✅ Complet |
| Plan de communication | 4.3.37–39 | ✅ Complet |
| Achats et contrats | 4.3.40–42 | ✅ Complet |

---

*Document généré le 20 juin 2026 — ATD Gestion de Projet v1.0*
