import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Pencil, X, AlertCircle, TrendingUp, AlertTriangle, Check, Sparkles, Plus } from 'lucide-react'
import { api } from '../api/odoo'

const PROB_LEVELS  = ['L', 'M', 'H']
const IMPACT_LEVELS = ['L', 'M', 'H']

const PROB_LABELS  = { L: 'Faible', M: 'Moyen', H: 'Élevé' }
const IMPACT_LABELS = { L: 'Faible', M: 'Modéré', H: 'Sévère' }

const CATEGORIES = ['Technique', 'Organisationnel', 'Externe', 'Calendrier', 'Budget', 'Qualité', 'Autre']
const STATUS_OPTS = ['Ouvert', 'En traitement', 'Survenu', 'Clos']

// Catalogue de risques fréquents (projets de digitalisation / secteur public).
// L'utilisateur les accepte d'un clic ; ils ne sont pas imposés.
const SUGGESTED_RISKS = [
  { name: "Retard de validation par le ministère / sponsor", prob: 'M', impact: 'H', category: 'Organisationnel' },
  { name: "Indisponibilité des données ou accès tardif", prob: 'M', impact: 'H', category: 'Externe' },
  { name: "Changement de périmètre en cours de projet", prob: 'M', impact: 'M', category: 'Organisationnel' },
  { name: "Dépendance à un prestataire externe", prob: 'M', impact: 'M', category: 'Externe' },
  { name: "Sous-estimation de la charge de travail", prob: 'H', impact: 'M', category: 'Calendrier' },
  { name: "Faible adoption par les utilisateurs finaux", prob: 'M', impact: 'H', category: 'Organisationnel' },
  { name: "Problème d'intégration avec un système existant", prob: 'M', impact: 'H', category: 'Technique' },
  { name: "Faille de sécurité / fuite de données", prob: 'L', impact: 'H', category: 'Technique' },
  { name: "Rotation / départ d'un membre clé de l'équipe", prob: 'L', impact: 'M', category: 'Organisationnel' },
  { name: "Dépassement budgétaire", prob: 'L', impact: 'H', category: 'Budget' },
  { name: "Qualité des livrables non conforme aux attentes", prob: 'M', impact: 'M', category: 'Qualité' },
  { name: "Instabilité de la connexion / infrastructure", prob: 'M', impact: 'M', category: 'Technique' },
]

const nextProb = (p) => (p === 'L' ? 'M' : p === 'M' ? 'H' : 'H')   // monte d'un cran
const today = () => new Date().toISOString().slice(0, 10)
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / 86_400_000)

const RISK_RE  = /^(\[RISK\]|\[RISQUE\])/i
const ISSUE_RE = /^(\[ISSUE\]|\[PROBLEME\])/i
const META_RE  = /<!-- ISO21500-META:([\s\S]+?) -->/

function parseRiskMeta(description) {
  const m = (description || '').match(META_RE)
  if (!m) return {}
  try { return JSON.parse(m[1]) } catch { return {} }
}

function encodeMeta(description, meta) {
  const clean = (description || '').replace(META_RE, '').trim()
  return `<!-- ISO21500-META:${JSON.stringify(meta)} -->${clean ? '\n' + clean : ''}`
}

function riskScore(prob, impact) {
  const p = { L: 1, M: 2, H: 3 }
  return (p[prob] || 1) * (p[impact] || 1)
}

function riskLevel(score) {
  if (score >= 7) return { label: 'Critique', color: '#ef4444', bg: '#fef2f2' }
  if (score >= 4) return { label: 'Élevé',    color: '#f97316', bg: '#fff7ed' }
  if (score >= 2) return { label: 'Moyen',    color: '#f59e0b', bg: '#fffbeb' }
  return            { label: 'Faible',    color: '#22c55e', bg: '#f0fdf4' }
}

function statusStyle(status) {
  if (status === 'Clos')         return { background: '#f0fdf4', color: '#16a34a' }
  if (status === 'Survenu' || status === 'Déclenché') return { background: '#fef2f2', color: '#dc2626' }
  if (status === 'En traitement') return { background: '#eff6ff', color: '#2563eb' }
  return { background: '#fef9c3', color: '#92400e' }
}

function RiskRow({ task, projectId, onEdit }) {
  const meta = parseRiskMeta(task.description)
  const type = RISK_RE.test(task.name) ? 'RISQUE' : 'PROBLÈME'
  const label = task.name.replace(/^\[.*?\]\s*/, '')
  const score = riskScore(meta.prob, meta.impact)
  const level = riskLevel(score)
  const qc = useQueryClient()
  const today = new Date().toISOString().split('T')[0]

  const del = useMutation({
    mutationFn: () => api.updateTask(task.id, { active: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks', projectId] }); toast.success('Supprimé') },
    onError: (e) => toast.error(e.message),
  })

  // Applique une modification de métadonnées (réévaluation, survenu, réglé…)
  const patch = useMutation({
    mutationFn: (newMeta) => api.updateTask(task.id, { description: encodeMeta(task.description, newMeta) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', projectId] }),
    onError: (e) => toast.error(e.message),
  })

  function escalate() {
    patch.mutate({ ...meta, prob: nextProb(meta.prob || 'L'), lastReview: today() })
    toast('Probabilité réévaluée à la hausse', { icon: '↑' })
  }
  function markOccurred() {
    patch.mutate({ ...meta, occurredOn: today(), status: 'Survenu' })
    toast('Marqué comme survenu')
  }
  function markResolved() {
    const m = { ...meta, resolvedOn: today(), status: 'Clos' }
    patch.mutate(m)
    const delay = meta.occurredOn ? daysBetween(meta.occurredOn, m.resolvedOn) : null
    toast.success(delay != null ? `Réglé en ${delay} jour(s)` : 'Marqué comme réglé')
  }

  // Délai de résolution (jours) — depuis « survenu » jusqu'à « réglé ».
  const resolutionDays = meta.occurredOn && meta.resolvedOn
    ? daysBetween(meta.occurredOn, meta.resolvedOn)
    : null

  return (
    <tr style={{ fontSize: '.8rem', borderBottom: '1px solid var(--border)', background: level.bg + '44' }}>
      <td style={{ padding: '6px 8px', fontWeight: 700, color: type === 'RISQUE' ? '#f97316' : '#ef4444', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '.65rem', background: type === 'RISQUE' ? '#fff7ed' : '#fef2f2',
          border: `1px solid ${type === 'RISQUE' ? '#fed7aa' : '#fecaca'}`,
          borderRadius: 4, padding: '2px 5px' }}>{type}</span>
      </td>
      <td style={{ padding: '6px 8px' }}>
        {label}
        {meta.occurredOn && !meta.resolvedOn && (
          <div style={{ fontSize: '.66rem', color: '#ef4444', fontWeight: 700 }}>
            Survenu le {meta.occurredOn} · ouvert depuis {daysBetween(meta.occurredOn, today())} j
          </div>
        )}
        {meta.occurredOn && meta.resolvedOn && (
          <div style={{ fontSize: '.66rem', color: '#16a34a', fontWeight: 700 }}>
            Réglé en {daysBetween(meta.occurredOn, meta.resolvedOn)} j
          </div>
        )}
        {!meta.occurredOn && meta.lastReview && (
          <div style={{ fontSize: '.66rem', color: 'var(--text-muted)' }}>
            réévalué le {meta.lastReview}
          </div>
        )}
      </td>
      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
        <span style={{ color: meta.prob === 'H' ? '#ef4444' : meta.prob === 'M' ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>
          {PROB_LABELS[meta.prob] || '—'}
        </span>
      </td>
      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
        <span style={{ color: meta.impact === 'H' ? '#ef4444' : meta.impact === 'M' ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>
          {IMPACT_LABELS[meta.impact] || '—'}
        </span>
      </td>
      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
        <span style={{ background: level.bg, color: level.color, fontWeight: 800, borderRadius: 6,
          padding: '2px 6px', fontSize: '.72rem', border: `1px solid ${level.color}33` }}>
          {level.label}
        </span>
      </td>
      <td style={{ padding: '6px 8px', color: 'var(--text-muted)', maxWidth: 140,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {meta.treatment || '—'}
      </td>
      <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{meta.owner || '—'}</td>
      <td style={{ padding: '6px 8px' }}>
        <span style={{ fontSize: '.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700, ...statusStyle(meta.status || 'Ouvert') }}>
          {meta.status || 'Ouvert'}
        </span>
      </td>
      <td style={{ padding: '6px 8px', fontSize: '.72rem', color: 'var(--primary)',
        fontStyle: 'italic', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {meta.tache_concernee
          ? <span>🔗 {meta.tache_concernee}</span>
          : <span style={{ color: 'var(--text-muted)', fontStyle: 'normal' }}>—</span>}
      </td>
      <td style={{ padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap', fontSize: '.72rem' }}>
        {resolutionDays !== null
          ? <span style={{ color: '#16a34a', fontWeight: 700 }}>Δ {resolutionDays}j</span>
          : meta.occurredOn
          ? <span style={{ color: '#f97316' }}>⏳ En cours</span>
          : <span style={{ color: 'var(--text-muted)' }}>—</span>}
      </td>
      <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>
        <button onClick={escalate} title="Réévaluer la probabilité à la hausse"
          style={{ color: '#b45309', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}>
          <TrendingUp size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /></button>
        {!meta.occurredOn && (
          <button onClick={markOccurred} title="C'est arrivé (survenu)"
            style={{ color: '#ef4444', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}>
            <AlertTriangle size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /></button>
        )}
        {!meta.resolvedOn && (
          <button onClick={markResolved} title="Marquer comme réglé"
            style={{ color: '#16a34a', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}>
            <Check size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /></button>
        )}
        <button onClick={() => onEdit(task)} title="Modifier"
          style={{ color: 'var(--primary)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}>
          <Pencil size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /></button>
        <button onClick={() => del.mutate()} title="Supprimer"
          style={{ color: 'var(--danger)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}>
          <X size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /></button>
      </td>
    </tr>
  )
}

function emptyForm(owner) {
  return {
    type: 'RISQUE', name: '', prob: 'M', impact: 'M',
    category: 'Technique', treatment: '', owner: owner || '', status: 'Ouvert',
    deliverable_id: '', tache_concernee: '',
  }
}

const RISK_ISO_RE = /^\[(RISK|RISQUE|ISSUE|PROBLEME|CHARTER|STAKEHOLDER|CHANGE|DELIVERABLE|LESSON|COMMS|PROCUREMENT|RESOURCE|QUALITY|MILESTONE)\]/i

export default function RiskRegister({ projectId, defaultOwner = '' }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [form, setForm] = useState(() => emptyForm(defaultOwner))
  const [showSuggest, setShowSuggest] = useState(false)

  const { data: allTasks = [] } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: async () => {
      const tasks = await api.getProjectTaskTree(projectId)
      return tasks.filter(t => RISK_RE.test(t.name) || ISSUE_RE.test(t.name))
    },
    enabled: !!projectId,
  })

  // Tâches du projet : on en tire à la fois les livrables et les tâches WBS.
  const { data: projectTasks = [] } = useQuery({
    queryKey: ['task-tree', projectId],
    queryFn: () => api.getProjectTaskTree(projectId),
    staleTime: 60_000,
    enabled: !!projectId,
  })
  const wbsTasks = projectTasks.filter(t => !RISK_ISO_RE.test(t.name))
  const deliverables = projectTasks
    .filter(t => /^\[DELIVERABLE\]/i.test(t.name))
    .map(t => ({ id: t.id, name: t.name.replace(/^\[DELIVERABLE\]\s*/i, '').trim() }))

  const createRisk = useMutation({
    mutationFn: (data) => api.createTask(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks', projectId] }); toast.success('Enregistré') },
    onError: (e) => toast.error(e.message),
  })

  const updateRisk = useMutation({
    mutationFn: ({ id, data }) => api.updateTask(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks', projectId] }); toast.success('Mis à jour') },
    onError: (e) => toast.error(e.message),
  })

  function f(k, v) { setForm(p => ({ ...p, [k]: v })) }

  function openCreate() { setEditTask(null); setForm(emptyForm(defaultOwner)); setShowForm(true) }
  function openEdit(task) {
    const meta = parseRiskMeta(task.description)
    const type = RISK_RE.test(task.name) ? 'RISQUE' : 'PROBLÈME'
    const name = task.name.replace(/^\[.*?\]\s*/, '')
    setEditTask(task)
    setForm({ type, name, prob: meta.prob || 'M', impact: meta.impact || 'M',
      category: meta.category || 'Technique', treatment: meta.treatment || '',
      owner: meta.owner || '', status: meta.status || 'Ouvert',
      deliverable_id: meta.deliverable_id || '', tache_concernee: meta.tache_concernee || '' })
    setShowForm(true)
  }

  function handleSubmit() {
    if (!form.name.trim()) return toast.error('Décrivez le risque/problème')
    const prefix = form.type === 'RISQUE' ? '[RISK]' : '[ISSUE]'
    const taskName = `${prefix} ${form.name.trim()}`
    const meta = { ...(editTask ? parseRiskMeta(editTask.description) : {}),
      prob: form.prob, impact: form.impact, category: form.category,
      treatment: form.treatment, owner: form.owner, status: form.status,
      deliverable_id: form.deliverable_id, tache_concernee: form.tache_concernee }
    const description = encodeMeta('', meta)

    if (editTask) {
      updateRisk.mutate({ id: editTask.id, data: { name: taskName, description } })
    } else {
      createRisk.mutate({ name: taskName, project_id: projectId, description,
        priority: form.impact === 'H' ? '1' : '0' })
    }
    setShowForm(false); setEditTask(null)
  }

  function addSuggestion(s) {
    const description = encodeMeta('', { prob: s.prob, impact: s.impact, category: s.category,
      treatment: '', owner: '', status: 'Ouvert' })
    createRisk.mutate({ name: `[RISK] ${s.name}`, project_id: projectId, description,
      priority: s.impact === 'H' ? '1' : '0' })
  }

  const risks  = allTasks.filter(t => RISK_RE.test(t.name))
  const issues = allTasks.filter(t => ISSUE_RE.test(t.name))
  const existingNames = new Set(allTasks.map(t => t.name.replace(/^\[.*?\]\s*/, '').toLowerCase()))
  const freshSuggestions = SUGGESTED_RISKS.filter(s => !existingNames.has(s.name.toLowerCase()))
  const critical = allTasks.filter(t => {
    const m = parseRiskMeta(t.description)
    return riskScore(m.prob, m.impact) >= 7 && m.status !== 'Clos'
  }).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          {critical > 0 && (
            <span className="badge badge-danger"><AlertCircle size={14} color="var(--danger)" style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {critical} critique{critical > 1 ? 's' : ''}</span>
          )}
          <span className="badge badge-warning">{risks.length} risque{risks.length > 1 ? 's' : ''}</span>
          <span className="badge badge-danger" style={{ opacity: .8 }}>{issues.length} problème{issues.length > 1 ? 's' : ''}</span>
        </div>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <button onClick={() => setShowSuggest(v => !v)} className="btn btn-ghost btn-sm">
            <Sparkles size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Suggérer
          </button>
          <button onClick={openCreate} className="btn btn-primary btn-sm">+ Ajouter</button>
        </div>
      </div>

      {/* Panneau de suggestions de risques */}
      {showSuggest && (
        <div style={{ marginBottom: '.8rem', background: 'var(--bg)', borderRadius: 8,
          border: '1.5px solid var(--border)', padding: '.85rem' }}>
          <div style={{ fontWeight: 700, fontSize: '.82rem', marginBottom: '.5rem' }}>
            <Sparkles size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Risques fréquents — ajoutez ceux qui vous concernent
          </div>
          {freshSuggestions.length === 0 ? (
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Toutes les suggestions sont déjà ajoutées.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
              {freshSuggestions.map(s => {
                const lvl = riskLevel(riskScore(s.prob, s.impact))
                return (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '.5rem',
                    padding: '.35rem .5rem', background: 'var(--surface)', borderRadius: 6,
                    border: '1px solid var(--border)' }}>
                    <span style={{ background: lvl.bg, color: lvl.color, fontWeight: 800, borderRadius: 5,
                      padding: '1px 6px', fontSize: '.66rem', flexShrink: 0 }}>{lvl.label}</span>
                    <span style={{ flex: 1, fontSize: '.8rem' }}>{s.name}</span>
                    <span style={{ fontSize: '.66rem', color: 'var(--text-muted)', flexShrink: 0 }}>{s.category}</span>
                    <button onClick={() => addSuggestion(s)} className="btn btn-ghost btn-sm"
                      style={{ flexShrink: 0 }} disabled={createRisk.isPending}>
                      <Plus size={13} style={{ verticalAlign: '-2px' }} /> Ajouter
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {allTasks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '.85rem' }}>
          Aucun risque ni problème enregistré
        </div>
      )}

      {allTasks.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                {['Type', 'Description', 'Prob.', 'Impact', 'Niveau', 'Traitement', 'Propriétaire', 'Statut', 'Tâche liée', 'Résolution', ''].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700,
                    fontSize: '.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allTasks.map(t => (
                <RiskRow key={t.id} task={t} projectId={projectId} onEdit={openEdit} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ marginTop: '1rem', background: 'var(--bg)', borderRadius: 8,
          border: '1.5px solid var(--border)', padding: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '.85rem', marginBottom: '.75rem' }}>
            {editTask ? 'Modifier' : 'Nouveau risque / problème'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Type</label>
              <select value={form.type} onChange={e => f('type', e.target.value)}>
                <option value="RISQUE">Risque (futur potentiel)</option>
                <option value="PROBLÈME">Problème (survenu)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Catégorie</label>
              <select value={form.category} onChange={e => f('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group" style={{ margin: '.6rem 0 0' }}>
            <label>Description *</label>
            <input type="text" value={form.name} onChange={e => f('name', e.target.value)}
              placeholder="Décrivez le risque ou problème…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.6rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Probabilité</label>
              <select value={form.prob} onChange={e => f('prob', e.target.value)}>
                {PROB_LEVELS.map(l => <option key={l} value={l}>{PROB_LABELS[l]}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Impact</label>
              <select value={form.impact} onChange={e => f('impact', e.target.value)}>
                {IMPACT_LEVELS.map(l => <option key={l} value={l}>{IMPACT_LABELS[l]}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Statut</label>
              <select value={form.status} onChange={e => f('status', e.target.value)}>
                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginTop: '.6rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Plan de traitement</label>
              <input type="text" value={form.treatment} onChange={e => f('treatment', e.target.value)}
                placeholder="Action de réduction…" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Responsable</label>
              <input type="text" value={form.owner} onChange={e => f('owner', e.target.value)}
                placeholder="Nom / rôle…" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem', marginTop: '.6rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Livrable associé</label>
              <select value={form.deliverable_id} onChange={e => f('deliverable_id', e.target.value)}>
                <option value="">— Aucun —</option>
                {deliverables.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Tâche WBS liée</label>
              <select value={form.tache_concernee} onChange={e => f('tache_concernee', e.target.value)}>
                <option value="">— Aucune tâche liée —</option>
                {wbsTasks.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem' }}>
            <button className="btn btn-primary" style={{ flex: 1 }}
              onClick={handleSubmit} disabled={createRisk.isPending || updateRisk.isPending}>
              {createRisk.isPending || updateRisk.isPending ? '…' : editTask ? 'Sauvegarder' : 'Enregistrer'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setEditTask(null) }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
