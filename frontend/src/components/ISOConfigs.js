/**
 * Configuration objects for each ISO 21500 registry.
 * Passed as props to <ISORegistry />.
 */

export const STAKEHOLDER_CONFIG = {
  prefix: 'STAKEHOLDER',
  title: 'Parties Prenantes',
  isoRef: 'ISO 21500 §4.3.9',
  isoNote: "Identifier toutes les personnes/organisations affectées ou susceptibles d'affecter le projet. Analyser leur influence et intérêt pour définir la stratégie de communication.",
  nameField: 'nom',
  emptyMsg: 'Aucune partie prenante enregistrée.',
  columns: [
    { key: 'nom',        label: 'Nom / Entité',    width: 140 },
    { key: 'role',       label: 'Rôle',            width: 120 },
    { key: 'organisation', label: 'Organisation',  width: 120 },
    { key: 'influence',  label: 'Influence',       width: 80,  badge: true },
    { key: 'interet',    label: 'Intérêt',         width: 80,  badge: true },
    { key: 'canal',      label: 'Canal',           width: 90 },
    { key: 'frequence',  label: 'Fréquence',       width: 90 },
  ],
  fields: [
    { key: 'nom',          label: 'Nom / Entité',          type: 'text',     placeholder: 'Prénom Nom ou Entité',   required: true },
    { key: 'role',         label: 'Rôle dans le projet',   type: 'text',     placeholder: 'Client, Sponsor, MOA…' },
    { key: 'organisation', label: 'Organisation',          type: 'text',     placeholder: 'Entreprise, département…' },
    { key: 'influence',    label: 'Niveau d\'influence',   type: 'select',   options: ['Élevé', 'Moyen', 'Faible'] },
    { key: 'interet',      label: 'Niveau d\'intérêt',     type: 'select',   options: ['Élevé', 'Moyen', 'Faible'] },
    { key: 'canal',        label: 'Canal de communication',type: 'text',     placeholder: 'Email, Réunion, Rapport…' },
    { key: 'frequence',    label: 'Fréquence',             type: 'text',     placeholder: 'Hebdo, Mensuel…' },
    { key: 'notes',        label: 'Notes / Attentes',      type: 'textarea', placeholder: 'Attentes, préoccupations, risques liés…', fullWidth: true },
  ],
}

export const CHANGE_CONFIG = {
  prefix: 'CHANGE',
  title: 'Journal des Modifications',
  isoRef: 'ISO 21500 §4.3.8',
  isoNote: "Enregistrer formellement toutes les demandes de modification du périmètre, du calendrier ou du budget. Chaque changement doit être évalué, approuvé ou rejeté avant mise en œuvre.",
  nameField: 'description',
  emptyMsg: 'Aucune demande de modification enregistrée.',
  columns: [
    { key: 'description',    label: 'Description',    width: 200, maxWidth: 200, wrap: true },
    { key: 'type',           label: 'Type',           width: 90,  badge: true },
    { key: 'demandeur',      label: 'Demandeur',      width: 100 },
    { key: 'impact',         label: 'Impact',         width: 80,  badge: true },
    { key: 'statut',         label: 'Statut',         width: 90,  badge: true },
    { key: 'date_demande',   label: 'Date',           width: 85 },
  ],
  fields: [
    { key: 'description',  label: 'Description de la modification', type: 'textarea', placeholder: 'Décrire précisément le changement demandé…', required: true, fullWidth: true },
    { key: 'type',         label: 'Type de modification', type: 'select', options: ['Périmètre', 'Calendrier', 'Budget', 'Qualité', 'Ressource', 'Autre'] },
    { key: 'demandeur',    label: 'Demandeur',             type: 'text',   placeholder: 'Nom ou rôle' },
    { key: 'impact',       label: 'Impact estimé',         type: 'select', options: ['Élevé', 'Moyen', 'Faible'] },
    { key: 'statut',       label: 'Statut',                type: 'select', options: ['Soumis', 'En révision', 'Approuvé', 'Rejeté', 'Annulé'] },
    { key: 'date_demande', label: 'Date de la demande',    type: 'date' },
    { key: 'justification',label: 'Justification / Analyse', type: 'textarea', placeholder: 'Raisons, alternatives analysées…', fullWidth: true },
  ],
}

export const DELIVERABLE_CONFIG = {
  prefix: 'DELIVERABLE',
  title: 'Registre des Livrables',
  isoRef: 'ISO 21500 §4.3.11',
  isoNote: "Identifier et suivre chaque livrable du projet. Un livrable est tout résultat, produit ou service produit pour accomplir le projet ou une phase.",
  nameField: 'nom',
  emptyMsg: 'Aucun livrable enregistré.',
  columns: [
    { key: 'nom',          label: 'Livrable',         width: 150 },
    { key: 'description',  label: 'Description',      width: 180, maxWidth: 180, wrap: true },
    { key: 'responsable',  label: 'Responsable',      width: 100 },
    { key: 'criteres',     label: 'Critères accep.',  width: 150, maxWidth: 150, wrap: true },
    { key: 'statut',       label: 'Statut',           width: 100, badge: true },
    { key: 'date_cible',   label: 'Date cible',       width: 85 },
  ],
  fields: [
    { key: 'nom',          label: 'Nom du livrable',         type: 'text',     placeholder: 'Ex: Rapport d\'analyse, Application V1…', required: true },
    { key: 'description',  label: 'Description',             type: 'textarea', placeholder: 'Contenu, format, destinataires…', fullWidth: true },
    { key: 'criteres',     label: 'Critères d\'acceptation', type: 'textarea', placeholder: 'Comment valider que ce livrable est acceptable…' },
    { key: 'responsable',  label: 'Responsable',             type: 'text',     placeholder: 'Nom / rôle' },
    { key: 'statut',       label: 'Statut',                  type: 'select',   options: ['Brouillon', 'En cours', 'Soumis', 'Accepté', 'Rejeté'] },
    { key: 'date_cible',   label: 'Date cible',              type: 'date' },
  ],
}

export const LESSON_CONFIG = {
  prefix: 'LESSON',
  title: 'Leçons Apprises',
  isoRef: 'ISO 21500 §4.3.7',
  isoNote: "Capitaliser sur l'expérience accumulée tout au long du projet. Les leçons apprises améliorent les projets futurs et contribuent à la mémoire organisationnelle.",
  nameField: 'titre',
  emptyMsg: 'Aucune leçon apprise enregistrée.',
  columns: [
    { key: 'titre',           label: 'Titre',           width: 150 },
    { key: 'phase',           label: 'Phase',           width: 100 },
    { key: 'categorie',       label: 'Catégorie',       width: 110 },
    { key: 'impact',          label: 'Impact',          width: 80,  badge: true },
    { key: 'recommandation',  label: 'Recommandation',  width: 200, maxWidth: 200, wrap: true },
  ],
  fields: [
    { key: 'titre',          label: 'Titre de la leçon', type: 'text',     placeholder: 'Ex: Sous-estimation des tests…', required: true, fullWidth: true },
    { key: 'phase',          label: 'Phase',             type: 'select',   options: ['Initialisation', 'Planification', 'Réalisation', 'Contrôle', 'Clôture', 'Tout le projet'] },
    { key: 'categorie',      label: 'Catégorie',         type: 'select',   options: ['Processus', 'Technique', 'Équipe', 'Communication', 'Risque', 'Budget', 'Autre'] },
    { key: 'impact',         label: 'Impact',            type: 'select',   options: ['Positif', 'Négatif', 'Mixte'] },
    { key: 'description',    label: 'Description détaillée', type: 'textarea', placeholder: 'Que s\'est-il passé ? Pourquoi ?', fullWidth: true },
    { key: 'recommandation', label: 'Recommandation',   type: 'textarea', placeholder: 'Que faire différemment la prochaine fois ?', fullWidth: true },
  ],
}

export const COMMS_CONFIG = {
  prefix: 'COMMS',
  title: 'Plan de Communication',
  isoRef: 'ISO 21500 §4.3.37–39',
  isoNote: "Définir qui communique quoi, quand, comment et à quelle fréquence. Un plan de communication efficace maintient les parties prenantes informées et engagées.",
  nameField: 'audience',
  emptyMsg: 'Aucun élément de communication planifié.',
  columns: [
    { key: 'audience',    label: 'Audience',    width: 130 },
    { key: 'message',     label: 'Message / Objet', width: 160, maxWidth: 160, wrap: true },
    { key: 'canal',       label: 'Canal',       width: 100 },
    { key: 'frequence',   label: 'Fréquence',   width: 90 },
    { key: 'responsable', label: 'Responsable', width: 100 },
    { key: 'prochaine',   label: 'Prochaine',   width: 85 },
  ],
  fields: [
    { key: 'audience',    label: 'Audience cible',    type: 'text',   placeholder: 'Ex: Comité de pilotage, équipe…', required: true },
    { key: 'message',     label: 'Message / Objet',   type: 'textarea', placeholder: 'Ce qui doit être communiqué, les informations clés…' },
    { key: 'canal',       label: 'Canal',             type: 'select', options: ['Réunion présentielle', 'Visioconférence', 'Email', 'Rapport', 'Tableau de bord', 'Chat', 'Téléphone'] },
    { key: 'frequence',   label: 'Fréquence',         type: 'select', options: ['Quotidien', 'Hebdomadaire', 'Bi-mensuel', 'Mensuel', 'Trimestriel', 'Ponctuel', 'À la demande'] },
    { key: 'responsable', label: 'Responsable',       type: 'text',   placeholder: 'Qui envoie / anime' },
    { key: 'prochaine',   label: 'Prochaine occurrence', type: 'date' },
    { key: 'notes',       label: 'Notes',             type: 'textarea', placeholder: 'Format, participants, ordre du jour type…', fullWidth: true },
  ],
}

export const PROCUREMENT_CONFIG = {
  prefix: 'PROCUREMENT',
  title: 'Registre des Achats',
  isoRef: 'ISO 21500 §4.3.40–42',
  isoNote: "Gérer les achats et contrats nécessaires au projet. Identifier les fournisseurs, suivre les commandes et assurer la conformité des livrables acquis.",
  nameField: 'item',
  emptyMsg: 'Aucun achat ou contrat enregistré.',
  columns: [
    { key: 'item',        label: 'Article / Service', width: 150 },
    { key: 'fournisseur', label: 'Fournisseur',       width: 120 },
    { key: 'type',        label: 'Type',              width: 90 },
    { key: 'montant',     label: 'Montant',           width: 80 },
    { key: 'statut',      label: 'Statut',            width: 100, badge: true },
    { key: 'date_echeance', label: 'Échéance',        width: 85 },
  ],
  fields: [
    { key: 'item',          label: 'Article / Service',   type: 'text',   placeholder: 'Nom du bien ou service à acquérir', required: true },
    { key: 'fournisseur',   label: 'Fournisseur',         type: 'text',   placeholder: 'Nom de l\'entreprise ou personne' },
    { key: 'type',          label: 'Type',                type: 'select', options: ['Service', 'Logiciel', 'Matériel', 'Sous-traitance', 'Licence', 'Formation', 'Autre'] },
    { key: 'montant',       label: 'Montant estimé',      type: 'text',   placeholder: 'Ex: 5 000 FCFA, 1 200 €…' },
    { key: 'statut',        label: 'Statut',              type: 'select', options: ['Planifié', 'Appel d\'offres', 'Contracté', 'Livré', 'Clôturé', 'Annulé'] },
    { key: 'date_echeance', label: 'Date d\'échéance',    type: 'date' },
    { key: 'contact',       label: 'Contact fournisseur', type: 'text',   placeholder: 'Email ou téléphone' },
    { key: 'notes',         label: 'Notes / Conditions',  type: 'textarea', placeholder: 'Modalités, garanties, conditions particulières…', fullWidth: true },
  ],
}
