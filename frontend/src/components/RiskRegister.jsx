import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Pencil, X, AlertCircle } from 'lucide-react'
import { api } from '../api/odoo'

const PROB_LEVELS  = ['L', 'M', 'H']
const IMPACT_LEVELS = ['L', 'M', 'H']

const PROB_LABELS  = { L: 'Faible', M: 'Moyen', H: 'Élevé' }
const IMPACT_LABELS = { L: 'Faible', M: 'Modéré', H: 'Sévère' }

const CATEGORIES = ['Technique', 'Organisationnel', 'Externe', 'Calendrier', 'Budget', 'Qualité', 'Autre']
const STATUS_OPTS = ['Ouvert', 'En traitement', 'Clos']

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

function RiskRow({ task, projectId, onEdit }) {
  const meta = parseRiskMeta(task.description)
  const type = RISK_RE.test(task.name) ? 'RISQUE' : 'PROBLÈME'
  const label = task.name.replace(/^\[.*?\]\s*/, '')
  const score = riskScore(meta.prob, meta.impact)
  const level = riskLevel(score)
  const qc = useQueryClient()

  const del = useMutation({
    mutationFn: () => api.updateTask(task.id, { active: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks', projectId] })
      toast.success('Supprimé')
    },
    onError: (e) => toast.error(e.message),
  })

  return (
    <tr style={{ fontSize: '.8rem', borderBottom: '1px solid var(--border)', background: level.bg + '44' }}>
      <td style={{ padding: '6px 8px', fontWeight: 700, color: type === 'RISQUE' ? '#f97316' : '#ef4444', whiteSpace: 'nowrap' }}>
        <span style={{ fontSize: '.65rem', background: type === 'RISQUE' ? '#fff7ed' : '#fef2f2',
          border: `1px solid ${type === 'RISQUE' ? '#fed7aa' : '#fecaca'}`,
          borderRadius: 4, padding: '2px 5px' }}>{type}</span>
      </td>
      <td style={{ padding: '6px 8px' }}>{label}</td>
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
        <span style={{
          fontSize: '.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700,
          background: meta.status === 'Clos' ? '#f0fdf4' : meta.status === 'En traitement' ? '#eff6ff' : '#fef9c3',
          color: meta.status === 'Clos' ? '#16a34a' : meta.status === 'En traitement' ? '#2563eb' : '#92400e',
        }}>{meta.status || 'Ouvert'}</span>
      </td>
      <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>
        <button onClick={() => onEdit(task)} style={{ fontSize: '.75rem', color: 'var(--primary)', cursor: 'pointer',
          background: 'none', border: 'none', padding: '2px 4px' }}><Pencil size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /></button>
        <button onClick={() => del.mutate()} style={{ fontSize: '.75rem', color: 'var(--danger)', cursor: 'pointer',
          background: 'none', border: 'none', padding: '2px 4px' }}><X size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /></button>
      </td>
    </tr>
  )
}

const EMPTY_FORM = {
  type: 'RISQUE', name: '', prob: 'M', impact: 'M',
  category: 'Technique', treatment: '', owner: '', status: 'Ouvert',
}

export default function RiskRegister({ projectId }) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data: allTasks = [] } = useQuery({
    queryKey: ['risks', projectId],
    queryFn: async () => {
      const tasks = await api.getProjectTaskTree(projectId)
      return tasks.filter(t => RISK_RE.test(t.name) || ISSUE_RE.test(t.name))
    },
    enabled: !!projectId,
  })

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

  function openCreate() { setEditTask(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(task) {
    const meta = parseRiskMeta(task.description)
    const type = RISK_RE.test(task.name) ? 'RISQUE' : 'PROBLÈME'
    const name = task.name.replace(/^\[.*?\]\s*/, '')
    setEditTask(task)
    setForm({ type, name, prob: meta.prob || 'M', impact: meta.impact || 'M',
      category: meta.category || 'Technique', treatment: meta.treatment || '',
      owner: meta.owner || '', status: meta.status || 'Ouvert' })
    setShowForm(true)
  }

  function handleSubmit() {
    if (!form.name.trim()) return toast.error('Décrivez le risque/problème')
    const prefix = form.type === 'RISQUE' ? '[RISK]' : '[ISSUE]'
    const taskName = `${prefix} ${form.name.trim()}`
    const meta = { prob: form.prob, impact: form.impact, category: form.category,
      treatment: form.treatment, owner: form.owner, status: form.status }
    const description = encodeMeta('', meta)

    if (editTask) {
      updateRisk.mutate({ id: editTask.id, data: { name: taskName, description } })
    } else {
      createRisk.mutate({ name: taskName, project_id: projectId, description,
        priority: form.impact === 'H' ? '1' : '0' })
    }
    setShowForm(false); setEditTask(null)
  }

  const risks  = allTasks.filter(t => RISK_RE.test(t.name))
  const issues = allTasks.filter(t => ISSUE_RE.test(t.name))
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
        <button onClick={openCreate} className="btn btn-primary btn-sm">+ Ajouter</button>
      </div>

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
                {['Type', 'Description', 'Prob.', 'Impact', 'Niveau', 'Traitement', 'Propriétaire', 'Statut', ''].map(h => (
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
