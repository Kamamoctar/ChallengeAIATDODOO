/**
 * Generic ISO 21500 registry — reusable for Stakeholders, Changes,
 * Deliverables, Lessons, Communication Plan, Procurement.
 *
 * Each item is stored as an Odoo task:
 *   name  = "[PREFIX] {value of nameField}"
 *   desc  = "<!-- ISO21500-META:{...json...} -->"
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Pencil, X } from 'lucide-react'
import { api } from '../api/odoo'

/* ─── Shared utils ─────────────────────────────────────── */
const META_RE = /<!-- ISO21500-META:([\s\S]+?) -->/

export function parseMeta(desc) {
  const m = (desc || '').match(META_RE)
  if (!m) return {}
  try { return JSON.parse(m[1]) } catch { return {} }
}

export function encodeMeta(meta) {
  return `<!-- ISO21500-META:${JSON.stringify(meta)} -->`
}

/* ─── Badge renderer ────────────────────────────────────── */
const LEVEL_STYLES = {
  H:               { bg: 'var(--danger-light)',  color: 'var(--danger)' },
  M:               { bg: 'var(--warning-light)', color: '#b45309' },
  L:               { bg: '#e6f7f6',              color: 'var(--success)' },
  Élevé:           { bg: 'var(--danger-light)',  color: 'var(--danger)' },
  Moyen:           { bg: 'var(--warning-light)', color: '#b45309' },
  Faible:          { bg: '#e6f7f6',              color: 'var(--success)' },
  Critique:        { bg: 'var(--danger-light)',  color: 'var(--danger)' },
  Approuvé:        { bg: '#e6f7f6',              color: 'var(--success)' },
  Rejeté:          { bg: 'var(--danger-light)',  color: 'var(--danger)' },
  Annulé:          { bg: '#f0f4f5',              color: 'var(--text-muted)' },
  Livré:           { bg: '#e6f7f6',              color: 'var(--success)' },
  Accepté:         { bg: '#e6f7f6',              color: 'var(--success)' },
  Positif:         { bg: '#e6f7f6',              color: 'var(--success)' },
  Négatif:         { bg: 'var(--danger-light)',  color: 'var(--danger)' },
  Clôturé:         { bg: '#e8f4f8',              color: 'var(--primary)' },
  'Plein temps':   { bg: '#e6f7f6',              color: 'var(--success)' },
  'Mi-temps':      { bg: 'var(--warning-light)', color: '#b45309' },
  Ponctuel:        { bg: 'var(--primary-light)', color: 'var(--primary)' },
  Indisponible:    { bg: 'var(--danger-light)',  color: 'var(--danger)' },
  Conforme:        { bg: '#e6f7f6',              color: 'var(--success)' },
  'À surveiller':  { bg: 'var(--warning-light)', color: '#b45309' },
  'Non conforme':  { bg: 'var(--danger-light)',  color: 'var(--danger)' },
}

function Badge({ value }) {
  if (!value) return <span style={{ color: 'var(--text-muted)' }}>—</span>
  const s = LEVEL_STYLES[value] || { bg: 'var(--primary-light)', color: 'var(--primary)' }
  return (
    <span style={{ fontSize: '.68rem', padding: '2px 7px', borderRadius: 4, fontWeight: 700,
      background: s.bg, color: s.color }}>{value}</span>
  )
}

/* ─── Form field ─────────────────────────────────────────── */
function FormField({ field, value, onChange, wbsTasks = [] }) {
  const base = { width: '100%', padding: '.55rem .75rem', border: '1.5px solid var(--border)',
    borderRadius: 8, font: 'inherit', fontSize: '.9rem', background: 'var(--bg)' }

  if (field.type === 'select') {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={base}>
        <option value="">— choisir —</option>
        {field.options.map(o => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
    )
  }
  if (field.type === 'task_select') {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={base}>
        <option value="">— Aucune tâche liée —</option>
        {wbsTasks.map(t => (
          <option key={t.id} value={t.name}>{t.name}</option>
        ))}
      </select>
    )
  }
  if (field.type === 'textarea') {
    return (
      <textarea value={value || ''} onChange={e => onChange(e.target.value)}
        placeholder={field.placeholder || ''} rows={3} style={{ ...base, resize: 'vertical' }} />
    )
  }
  if (field.type === 'date') {
    return <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} style={base} />
  }
  return (
    <input type="text" value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder || ''} style={base} />
  )
}

/* ─── Main component ─────────────────────────────────────── */
const ALL_ISO_RE = /^\[(STAKEHOLDER|CHANGE|DELIVERABLE|LESSON|COMMS|RESOURCE|QUALITY|PROCUREMENT|CHARTER|MEETING|RISK|ISSUE|MILESTONE)\]/i

export default function ISORegistry({
  projectId,
  prefix,       // e.g. "STAKEHOLDER"
  title,
  isoRef,
  isoNote,
  columns,      // [{ key, label, type?, badge? }]
  fields,       // [{ key, label, type, options?, placeholder?, required? }]
  nameField,    // field key used as Odoo task name
  emptyMsg,
  autofill = {},
}) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [form, setForm] = useState({})

  const prefixTag = `[${prefix}]`
  const re = new RegExp(`^\\[${prefix}\\]`, 'i')

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['task-tree', projectId],
    queryFn: () => api.getProjectTaskTree(projectId),
    staleTime: 60_000,
    enabled: !!projectId,
  })

  const items = allTasks.filter(t => re.test(t.name))
  const wbsTasks = allTasks.filter(t => !ALL_ISO_RE.test(t.name))

  const createItem = useMutation({
    mutationFn: (data) => api.createTask(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-tree', projectId] }); toast.success('Ajouté'); setShowForm(false) },
    onError: (e) => toast.error(e.message),
  })

  const updateItem = useMutation({
    mutationFn: ({ id, data }) => api.updateTask(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-tree', projectId] }); toast.success('Mis à jour'); setShowForm(false) },
    onError: (e) => toast.error(e.message),
  })

  const deleteItem = useMutation({
    mutationFn: (id) => api.updateTask(id, { active: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-tree', projectId] }); toast.success('Supprimé') },
    onError: (e) => toast.error(e.message),
  })

  function openCreate() {
    setEditTask(null)
    const base = Object.fromEntries(fields.map(f => [f.key, f.default || '']))
    setForm({ ...base, ...autofill })
    setShowForm(true)
  }

  function openEdit(task) {
    const meta = parseMeta(task.description)
    const namePart = task.name.replace(re, '').trim()
    setEditTask(task)
    setForm(Object.fromEntries(fields.map(f => [f.key, meta[f.key] ?? (f.key === nameField ? namePart : '')])))
    setShowForm(true)
  }

  function handleSubmit() {
    const required = fields.find(f => f.required && !form[f.key]?.trim?.())
    if (required) return toast.error(`${required.label} est requis`)
    const taskName = `${prefixTag} ${(form[nameField] || 'Sans titre').trim()}`
    const { [nameField]: _, ...rest } = form
    const description = encodeMeta(rest)
    if (editTask) {
      updateItem.mutate({ id: editTask.id, data: { name: taskName, description } })
    } else {
      createItem.mutate({ name: taskName, project_id: projectId, description })
    }
  }

  function f(k, v) { setForm(p => ({ ...p, [k]: v })) }

  return (
    <div>
      {/* ISO reference note */}
      {isoNote && (
        <div style={{ marginBottom: '.75rem', padding: '.7rem .9rem', background: '#fffbeb',
          borderRadius: 8, border: '1px solid #fed7aa', fontSize: '.78rem', color: '#92400e', lineHeight: 1.5 }}>
          <strong>{isoRef}</strong> — {isoNote}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
        <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
          {items.length} entrée{items.length !== 1 ? 's' : ''}
        </span>
        <button className="btn btn-primary btn-sm" onClick={openCreate}>+ Ajouter</button>
      </div>

      {isLoading && <div className="loading">Chargement…</div>}

      {!isLoading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '.85rem' }}>
          {emptyMsg || 'Aucune entrée. Cliquez sur "+ Ajouter" pour commencer.'}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
            <thead>
              <tr style={{ background: 'var(--bg)' }}>
                {columns.map(col => (
                  <th key={col.key} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700,
                    fontSize: '.67rem', color: 'var(--text-muted)', textTransform: 'uppercase',
                    letterSpacing: '.05em', borderBottom: '2px solid var(--border)',
                    width: col.width, whiteSpace: 'nowrap' }}>
                    {col.label}
                  </th>
                ))}
                <th style={{ width: 60, borderBottom: '2px solid var(--border)' }} />
              </tr>
            </thead>
            <tbody>
              {items.map((task, ri) => {
                const meta = parseMeta(task.description)
                const namePart = task.name.replace(re, '').trim()
                return (
                  <tr key={task.id} style={{ borderBottom: '1px solid var(--border)',
                    background: ri % 2 === 0 ? '#fff' : '#fafafa' }}>
                    {columns.map(col => {
                      const val = col.key === nameField ? namePart : meta[col.key]
                      return (
                        <td key={col.key} style={{ padding: '8px 10px', fontSize: '.82rem',
                          maxWidth: col.maxWidth || 180,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: col.wrap ? 'normal' : 'nowrap' }}>
                          {col.type === 'task_select'
                            ? (val
                                ? <span style={{ fontSize: '.72rem', color: 'var(--primary)', fontStyle: 'italic' }}>🔗 {val}</span>
                                : <span style={{ color: 'var(--text-muted)' }}>—</span>)
                            : col.badge
                            ? <Badge value={val} />
                            : (val || <span style={{ color: 'var(--text-muted)' }}>—</span>)}
                        </td>
                      )
                    })}
                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openEdit(task)}
                        style={{ fontSize: '.75rem', color: 'var(--primary)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}>
                        <Pencil size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} />
                      </button>
                      <button onClick={() => { if (confirm('Supprimer ?')) deleteItem.mutate(task.id) }}
                        style={{ fontSize: '.75rem', color: 'var(--danger)', cursor: 'pointer', background: 'none', border: 'none', padding: '2px 4px' }}>
                        <X size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} color="var(--danger)" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div style={{ marginTop: '1rem', background: 'var(--bg)', borderRadius: 8,
          border: '1.5px solid var(--border)', padding: '1rem' }}>
          <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: '.75rem', color: 'var(--text)' }}>
            {editTask ? `Modifier` : `Nouvelle entrée — ${title}`}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '.65rem' }}>
            {fields.map(field => (
              <div key={field.key} className="form-group" style={{ marginBottom: 0,
                gridColumn: field.fullWidth ? '1 / -1' : undefined }}>
                <label>{field.label}{field.required ? ' *' : ''}</label>
                <FormField field={field} value={form[field.key]} onChange={v => f(field.key, v)} wbsTasks={wbsTasks} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.85rem' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit}
              disabled={createItem.isPending || updateItem.isPending}>
              {createItem.isPending || updateItem.isPending ? '…' : editTask ? 'Enregistrer' : 'Ajouter'}
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
