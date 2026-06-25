# Documentation Utilisateur
# ATD — Application de Gestion de Projet

**Version :** 1.2  
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
9. [Timer Pomodoro](#9-timer-pomodoro)
10. [Historique et export](#10-historique-et-export)
11. [Recherche globale](#11-recherche-globale)
12. [Bot Telegram](#12-bot-telegram)
13. [Mode hors-ligne](#13-mode-hors-ligne)
14. [Mode sombre](#14-mode-sombre)
15. [Guide administrateur](#15-guide-administrateur)

---

## 1. Présentation de l'application

### 1.1 Description générale

ATD Gestion de Projet est une application web progressive (PWA) conçue pour les chefs de projet et leur hiérarchie. Elle permet de :

- **Saisir et suivre le temps** passé sur chaque projet en temps réel
- **Gérer les projets** selon la norme internationale **ISO 21500**
- **Visualiser les indicateurs clés** à travers un tableau de bord multi-niveaux avec cockpit KPI
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

#### Cockpit KPI

En haut de l'onglet, quatre tuiles colorées offrent une vue instantanée de l'activité :

| Tuile | Valeur affichée | Code couleur |
|---|---|---|
| **Aujourd'hui** | Heures saisies ce jour / 8h | Vert ≥ 6h · Orange ≥ 3h · Rouge < 3h |
| **Cette semaine** | Total heures + % de l'objectif 40h | Vert ≥ 80% · Orange ≥ 50% · Rouge < 50% |
| **En retard** | Nombre de tâches dont la deadline est dépassée | Rouge si > 0 · Vert si aucune |
| **Mes projets** | Nombre de projets actifs dont vous êtes gestionnaire | Bleu |

#### Indicateurs détaillés

| Indicateur | Description |
|---|---|
| **Cette semaine** | Total des heures + tendance vs semaine précédente (▲▼) |
| **Moy./jour** | Moyenne d'heures sur les jours travaillés |
| **Objectif jour** | Progression vers les 8h quotidiennes |

La **barre de progression** du jour devient orange lorsque les 8h sont dépassées, signalant les heures supplémentaires.

Le graphique en barres montre la répartition des heures sur les 7 derniers jours. Le graphique circulaire montre la répartition du temps par projet sur 7 jours.

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

La page Focus permet de définir jusqu'à **3 tâches prioritaires** pour la journée et de consulter l'ensemble de vos tâches actives.

### 4.1 Ajouter une tâche au focus

1. Appuyer sur le bouton **« + Ajouter »** en haut à droite
2. Saisir quelques lettres pour filtrer la liste des tâches assignées
3. Sélectionner la tâche souhaitée
4. Maximum 3 tâches par jour

Le bouton **« ✨ Suggérer »** remplit automatiquement le focus avec les 3 tâches les plus urgentes.

### 4.2 Démarrer le timer sur une tâche

Appuyer sur le bouton **« ▶ Démarrer timer »** de la tâche. Le timer Pomodoro apparaît en bas de l'écran et commence le décompte de 25 minutes. Une seule tâche peut être chronométrée à la fois.

### 4.3 Saisir le temps manuellement

Appuyer sur **« ⏱ Log »** à côté d'une tâche pour saisir manuellement une durée sans utiliser le timer.

### 4.4 Marquer une tâche comme terminée

Appuyer sur le bouton **✓** à gauche d'une tâche dans la section « Mes tâches » pour la passer à l'étape « Terminée » dans Odoo. La tâche disparaît de la liste et est retirée du focus si elle s'y trouvait.

### 4.5 Retirer une tâche du focus

Appuyer sur le bouton **« ✕ »** à droite de la tâche. La tâche reste dans Odoo, elle est simplement retirée de la vue Focus du jour.

### 4.6 Filtre « En cours » et « Toutes »

Par défaut, la liste **n'affiche que les tâches actives** (celles dont le stage Odoo indique qu'elles sont en cours de traitement). Les tâches encore en file d'attente (« À faire », « Backlog »…) sont masquées pour éviter le bruit.

Un bouton toggle en haut à droite de chaque section permet de basculer :

- **⚡ En cours** (défaut) — affiche uniquement les tâches actives + les tâches en retard (quel que soit leur stage)
- **📋 Toutes** — affiche l'intégralité des tâches assignées

### 4.7 Section « Tâches de mes projets »

En dessous de « Mes tâches par priorité », une deuxième section liste automatiquement les tâches ouvertes de **tous les projets dont vous êtes gestionnaire** (chef de projet Odoo). Cette liste est dédupliquée par rapport à « Mes tâches » : une tâche déjà assignée à vous n'apparaît pas deux fois.

Chaque tâche indique si elle est **assignée** à quelqu'un ou **non assignée** (indicateur orange), ce qui permet de repérer rapidement les tâches en attente d'attribution.

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

### 5.3 Marquer une tâche comme terminée

Dans chaque carte tâche, le bouton **✓** permet de déplacer directement la tâche vers l'étape « Terminée » sans passer par le menu de déplacement.

### 5.4 Codes couleur des cartes

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
- La **deadline** si définie, en rouge si dépassée
- Un indicateur **« En retard »** si la deadline est passée

### 6.2 Filtres de la liste

Trois boutons dans la barre de commandes permettent de filtrer l'affichage :

| Bouton | Effet |
|---|---|
| **👤 Mes projets** | N'affiche que les projets dont vous êtes le gestionnaire (chef de projet dans Odoo) |
| **🗄 Archivés** | Affiche les projets en phase Clôture |
| **📂 Actifs** | Revient à la vue des projets actifs |

> Ces filtres sont indépendants et cumulables : « Mes projets » + « Actifs » montre uniquement vos projets en cours.

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
| **Risques** | Registre des risques et problèmes (probabilité × impact, lifecycle, tâche liée) | §4.3.28 |
| **Charte** | Document de charte projet (objectifs, périmètre, budget, dates, critères de succès) | §4.3.1 |
| **Parties prenantes** | Registre des parties prenantes (influence, intérêt, canal) | §4.3.9 |
| **Ressources** | Planification des ressources humaines (rôle, disponibilité, charge) | §4.3.16–17 |
| **Changements** | Journal des demandes de modification (type, impact, statut, **tâche WBS liée**) | §4.3.8 |
| **Livrables** | Registre des livrables (critères, responsable, statut, **tâche WBS liée**) | §4.3.11 |
| **Qualité** | Plan qualité (indicateurs, méthodes de mesure, valeurs cibles) | §4.3.31–33 |
| **Leçons** | Registre des leçons apprises (catégorie, impact, **tâche WBS liée**) | §4.3.7 |
| **Comm.** | Plan de communication (audience, canal, fréquence) | §4.3.37–39 |
| **Achats** | Registre des achats et contrats (fournisseur, montant, statut) | §4.3.40–42 |
| **Docs** | Liens vers les documents externes du projet | — |
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
| Critique | ≥ 7 | Rouge |
| Élevé | 4–6 | Orange |
| Moyen | 2–3 | Jaune |
| Faible | 1 | Vert |

#### Cycle de vie d'un risque

Chaque risque ou problème suit un cycle de vie formalisé :

| Statut | Signification |
|---|---|
| **Ouvert** | Risque identifié, en surveillance |
| **En traitement** | Plan de mitigation en cours |
| **Déclenché** | Le risque s'est matérialisé (date enregistrée automatiquement) |
| **Clos** | Risque résolu (date de résolution et délai enregistrés) |

**Boutons d'action rapide dans le tableau :**
- **🔴 Arrivé** — Marque le risque comme déclenché et enregistre la date du jour
- **✅ Réglé** — Clôture le risque et affiche le délai de résolution (Δ Xj)

#### Liaison avec une tâche WBS

Lors de la création ou modification d'un risque, le champ **« Tâche WBS liée »** propose une liste déroulante de toutes les tâches du projet. La liaison est affichée dans le tableau avec l'icône 🔗.

### 7.6 Pré-remplissage automatique des formulaires ISO

Lors de l'ouverture du formulaire **« + Ajouter »** dans n'importe quel onglet ISO, les champs suivants sont **pré-remplis automatiquement** avec le contexte courant :

| Champ | Valeur pré-remplie |
|---|---|
| Demandeur / Responsable / Propriétaire | Nom du membre actif connecté |
| Date de la demande / Prochaine occurrence | Date du jour |
| Statut | Valeur initiale appropriée (« Soumis », « En cours », « Conforme »…) |
| Date cible (livrables) | Date de fin du projet |

Toutes ces valeurs sont **modifiables** avant de valider. Le pré-remplissage ne s'applique pas à l'édition d'entrées existantes.

### 7.7 Liaisons inter-onglets — Tâche WBS associée

Les onglets **Livrables**, **Changements** et **Leçons apprises** proposent désormais un champ **« Tâche WBS liée »** qui permet de référencer la tâche WBS du projet directement reliée à l'entrée.

**Comment lier une tâche :**
1. Ouvrir le formulaire d'ajout ou de modification
2. Dans le champ « Tâche WBS liée », sélectionner la tâche dans la liste déroulante
3. La liste affiche toutes les tâches WBS du projet (hors entrées ISO)
4. Sauvegarder

**Affichage dans le tableau :** les tâches liées sont affichées avec l'icône 🔗 suivie du nom de la tâche. Si aucune tâche n'est liée, la cellule affiche « — ».

> Cette fonctionnalité permet de retrouver facilement quel livrable résulte de quelle tâche, quelle modification concerne quel lot de travail, et quelle leçon provient de quel contexte opérationnel.

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

## 9. Timer Pomodoro

Le timer implémente la **technique Pomodoro** : alternance de sessions de travail de 25 minutes et de pauses courtes, avec enregistrement automatique du temps de travail dans Odoo.

### 9.1 Démarrer un Pomodoro

Depuis la page **Focus**, appuyer sur **« ▶ Démarrer timer »** sur l'une des trois tâches du focus. La carte Pomodoro apparaît en bas à droite de l'écran.

### 9.2 Structure d'un cycle Pomodoro

| Phase | Durée | Déclenchement |
|---|---|---|
| **Travail (focus)** | 25 minutes | Manuel (bouton ▶) |
| **Pause courte** | 5 minutes | Automatique après chaque Pomodoro |
| **Pause longue** | 25 minutes | Automatique après le 4ᵉ Pomodoro consécutif |

### 9.3 La carte flottante

La carte affiche en permanence :
- **4 points de cycle** en haut (remplis = Pomodoros complétés dans le cycle actuel)
- Un **anneau de progression** SVG qui se vide en temps réel
- Le **compte à rebours** (MM:SS)
- Le nom de la **tâche en cours**

### 9.4 Contrôles pendant la phase de travail

| Bouton | Action |
|---|---|
| ⏸ Pause | Mettre en pause le décompte (le temps de pause n'est PAS comptabilisé) |
| ▶ Reprendre | Reprendre après une pause |
| ■ Stop | Arrêter et enregistrer le temps de travail accumulé dans Odoo |
| ✕ | Annuler sans enregistrer |

### 9.5 Transition automatique vers la pause

Lorsque les 25 minutes sont écoulées :
1. Un son d'arpège (montant) retentit pour signaler la fin du Pomodoro
2. La carte passe en **mode pause** (fond vert)
3. Le décompte de pause démarre automatiquement
4. Une notification toast confirme le nombre de Pomodoros complétés

**Contrôles pendant la pause :**

| Bouton | Action |
|---|---|
| ⏸ / ▶ | Mettre en pause ou reprendre la pause |
| ⏭ | Sauter la pause et démarrer immédiatement le Pomodoro suivant |
| ■ (fantôme) | Arrêter et enregistrer (fin de session) |

### 9.6 Fin de la pause

À la fin du décompte de pause :
- Un son doux retentit
- La carte affiche ☀️ **« Prêt pour le suivant ? »**
- Deux boutons s'affichent : **▶ Démarrer** (Pomodoro suivant) et **■ Stop** (fin de session)

### 9.7 Enregistrement du temps

Seul le **temps de travail actif** est enregistré dans Odoo (les pauses ne sont pas comptées). Le cumul est calculé sur l'ensemble des Pomodoros d'une session :

- Si la durée totale est **inférieure à 1 minute**, aucune entrée n'est créée
- L'entrée est créée au projet et à la tâche du focus, avec la date du jour
- En cas de perte de réseau, l'entrée est mise en file d'attente hors-ligne

### 9.8 Sons

| Événement | Son |
|---|---|
| Fin d'un Pomodoro (25 min) | Arpège montant Do-Mi-Sol-Do (4 notes) |
| Fin d'une pause | Deux tons descendants doux |

> Les sons utilisent l'API Web Audio du navigateur. Ils nécessitent une interaction préalable de l'utilisateur (clic) pour se déclencher, conformément aux politiques des navigateurs modernes.

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
| Heures | Durée en heures (ex : 1.50) |

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

### 12.1 Menu interactif

Après `/start` ou `/menu`, un **clavier interactif** s'affiche avec des boutons pour toutes les fonctions principales. Il suffit de taper sur un bouton pour exécuter la commande sans saisir de texte.

### 12.2 Commandes disponibles

#### Informations générales (sans compte lié)

| Commande | Description |
|---|---|
| `/aide` | Liste toutes les commandes disponibles |
| `/projets` | Liste tous les projets actifs avec leur ID |
| `/portefeuille` | Projets groupés : en retard / dans les délais / sans deadline, avec phases ISO |
| `/retard` | Projets ayant dépassé leur deadline avec nombre de jours de retard |
| `/risques` | Risques de niveau Élevé ou Critique sur tous les projets |
| `/projet <nom>` | Fiche rapide d'un projet : phase, deadline, nb tâches, activité 7 jours |
| `/equipe` | Activité des deux membres de l'équipe aujourd'hui |

#### Personnel (compte Telegram lié requis)

| Commande | Description |
|---|---|
| `/aujourd'hui` | Mes entrées du jour avec leurs IDs Odoo |
| `/semaine` | Bilan hebdomadaire par projet avec barre de progression |
| `/mois` | Bilan mensuel avec répartition par projet et pourcentages |
| `/taches` | Mes tâches ouvertes groupées par projet |
| `/alertes` | Mes tâches **urgentes** (dans les 3 jours) et **en retard** |
| `/recap` | Récapitulatif journalier complet, formaté pour partage en réunion |
| `/log Xh Projet - description` | Créer une entrée de temps |
| `/modifier <id> <heures>` | Modifier la durée d'une entrée (ID obtenu via /aujourd'hui) |
| `/supprimer <id>` | Supprimer une entrée de temps |

### 12.3 Commande /alertes

La commande `/alertes` retourne en un seul message la liste des tâches critiques :

- **🔴 En retard** — tâches dont la deadline est passée
- **🟡 Dans les 3 jours** — tâches dont la deadline est dans 1, 2 ou 3 jours

Exemple de réponse :

```
🔔 Alertes pour Moctar

🔴 En retard (2)
  · Rédaction cahier des charges · 📅 2026-06-20
  · Revue de conception · 📅 2026-06-22

🟡 Dans les 3 jours (1)
  · Livraison prototype · 📅 2026-06-27
```

### 12.4 Saisie en langage naturel

Le bot comprend le langage naturel pour la saisie de temps. Exemples de messages reconnus :

```
j'ai travaillé 3h sur Projet Alpha hier
2h30 Projet Beta - revue du code
30min Projet Gamma
```

Le bot identifie automatiquement le projet par correspondance approximative (même si le nom n'est pas parfaitement exact).

### 12.5 Commande /log détaillée

```
/log 2h Projet Alpha - description de l'activité
/log 30min Projet Beta
/log 3.5h Projet Gamma - mardi
```

**Formats de durée acceptés :** `2h`, `2.5h`, `30min`, `1h30min`

**Formats de date acceptés :** `hier`, `avant-hier`, `lundi`, `2026-06-15`, `15/06`

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
3. Un message de confirmation affiche le nombre d'entrées synchronisées
4. Le badge disparaît

> **Important :** La synchronisation est transparente et ne nécessite aucune action manuelle.

---

## 14. Mode sombre

### 14.1 Activation

L'application propose un **mode sombre** qui adapte toute l'interface à une palette de couleurs ATD nocturne, confortable en environnement peu éclairé.

Pour basculer entre le mode clair et le mode sombre :

- **Sur bureau** : utilisez le **bouton toggle animé** (soleil ☀️ / lune 🌙) situé en bas de la barre de navigation latérale.
- **Sur mobile** : appuyez sur le bouton toggle en bas à gauche de l'écran.

### 14.2 Persistance et détection automatique

| Comportement | Détail |
|---|---|
| **Mémorisation** | Votre préférence est sauvegardée dans le navigateur ; elle persiste entre les sessions. |
| **Détection système** | Au premier lancement, l'application lit la préférence système (`prefers-color-scheme`). Si votre OS est en mode sombre, l'application démarre automatiquement en mode sombre. |
| **Par appareil** | La préférence est locale à chaque appareil/navigateur et ne se synchronise pas. |

### 14.3 Éléments adaptés

Tous les composants utilisent la palette ATD nuit :

| Élément | Mode clair | Mode sombre |
|---|---|---|
| Fond général | `#f2f7f9` (bleu très clair) | `#0d1b26` (bleu très sombre) |
| Cartes / surfaces | `#ffffff` | `#152130` |
| Texte principal | `#1a2e38` | `#d8eaf3` |
| Bordures | `#d0e4ea` | `#1e3347` |
| Bleu ATD (boutons) | `#0a4b8b` | `#4a9fd4` (plus clair pour le contraste) |

> Les graphiques, les badges de statut, les tableaux ISO et les formulaires s'adaptent tous automatiquement.

---

## 15. Guide administrateur

Cette section s'adresse à la personne responsable du déploiement et de la configuration de l'application.

### 15.1 Variables d'environnement — Backend (Render)

Les variables suivantes doivent être configurées dans le service backend sur Render (Dashboard → Service → Environment Variables) :

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

### 15.2 Variables d'environnement — Frontend (Vercel)

| Variable | Description | Exemple |
|---|---|---|
| `VITE_API_URL` | URL du backend Render | `https://votre-service.onrender.com` |
| `VITE_EMPLOYEE_A_ID` | ID employé Odoo du membre A | `291` |
| `VITE_EMPLOYEE_A_NAME` | Nom du membre A | `NAMADOU Moctar` |
| `VITE_EMPLOYEE_A_USER_ID` | ID utilisateur Odoo du membre A | `187` |
| `VITE_EMPLOYEE_B_ID` | ID employé Odoo du membre B | `32` |
| `VITE_EMPLOYEE_B_NAME` | Nom du membre B | `SOSSOU Candide` |
| `VITE_EMPLOYEE_B_USER_ID` | ID utilisateur Odoo du membre B | `32` |

### 15.3 Configuration du webhook Telegram

Après chaque changement de token du bot, enregistrer le nouveau webhook en appelant une seule fois l'endpoint suivant :

```
POST {BACKEND_URL}/webhook/telegram/setup
```

Ou via curl :
```bash
curl -X POST https://votre-service.onrender.com/webhook/telegram/setup
```

Ce endpoint enregistre également toutes les commandes natives dans le menu Telegram (la liste apparaît quand l'utilisateur tape `/`).

### 15.4 Obtenir le Telegram User ID

Pour configurer `TELEGRAM_USER_A` et `TELEGRAM_USER_B`, chaque membre doit :
1. Ouvrir Telegram et chercher **@userinfobot**
2. Envoyer le message `/start`
3. Le bot répond avec votre User ID numérique

### 15.5 Créer ou révoquer un bot Telegram

**Créer un bot :**
1. Ouvrir Telegram et chercher **@BotFather**
2. Envoyer `/newbot`
3. Suivre les instructions (choisir un nom et un nom d'utilisateur)
4. Le token est affiché à la fin — le copier immédiatement

**Révoquer un token compromis :**
1. Envoyer `/revoke` à @BotFather
2. Sélectionner le bot concerné
3. Mettre à jour `TELEGRAM_BOT_TOKEN` dans Render
4. Appeler `/webhook/telegram/setup` pour ré-enregistrer le webhook

### 15.6 Conformité ISO 21500 — Référence des processus couverts

| Processus | § ISO 21500 | Couverture |
|---|---|---|
| Charte de projet | 4.3.1 | ✅ Complet |
| Phases de projet | 4.3.2 | ✅ Complet |
| Structure de découpage | 4.3.3 | ✅ Complet |
| Ressources humaines | 4.3.16–17 | ✅ Complet |
| Suivi du temps | 4.3.5 | ✅ Complet |
| Gestion des risques | 4.3.28 | ✅ Complet + lifecycle + liaison tâche |
| Plan qualité | 4.3.31–33 | ✅ Complet |
| Parties prenantes | 4.3.9 | ✅ Complet |
| Leçons apprises | 4.3.7 | ✅ Complet + liaison tâche |
| Maîtrise des modifications | 4.3.8 | ✅ Complet + liaison tâche |
| Livrables | 4.3.11 | ✅ Complet + liaison tâche |
| Plan de communication | 4.3.37–39 | ✅ Complet |
| Achats et contrats | 4.3.40–42 | ✅ Complet |

---

*Document mis à jour le 25 juin 2026 — ATD Gestion de Projet v1.2*
