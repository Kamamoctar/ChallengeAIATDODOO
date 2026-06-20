/**
 * Project Charter — ISO 21500 §4.3.2
 * Stored as a single Odoo task: "[CHARTER] Charte - {projectName}"
 * Sections encoded as JSON in task description.
 */
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'
import { parseMeta, encodeMeta } from './ISORegistry'

const CHARTER_RE = /^\[CHARTER\]/i

const SECTIONS = [
  { key: 'objectifs',       label: 'Objectifs du projet',        placeholder: 'Décrire ce que le projet doit accomplir…', rows: 3 },
  { key: 'perimetre_in',    label: 'Périmètre inclus',           placeholder: 'Ce qui est dans le périmètre…', rows: 2 },
  { key: 'perimetre_out',   label: 'Périmètre exclu',            placeholder: 'Ce qui est hors périmètre…', rows: 2 },
  { key: 'hypotheses',      label: 'Hypothèses',                 placeholder: 'Conditions supposées vraies pour le projet…', rows: 2 },
  { key: 'contraintes',     label: 'Contraintes',                placeholder: 'Limites imposées : budget, délai, ressources…', rows: 2 },
  { key: 'livrables_cles',  label: 'Livrables clés',             placeholder: 'Principaux résultats attendus…', rows: 2 },
  { key: 'criteres_succes', label: 'Critères de succès',         placeholder: 'Comment mesurer que le projet est réussi…', rows: 2 },
  { key: 'sponsor',         label: 'Commanditaire (Sponsor)',     placeholder: 'Nom, rôle…', rows: 1 },
  { key: 'chef_projet',     label: 'Chef de projet',              placeholder: 'Nom, contact…', rows: 1 },
  { key: 'budget_estime',   label: 'Budget estimé',              placeholder: 'Montant ou fourchette…', rows: 1 },
]

const EMPTY = Object.fromEntries(SECTIONS.map(s => [s.key, '']))

export default function ProjectCharter({ projectId, projectName }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const { data: allTasks = [], isLoading } = useQuery({
    queryKey: ['task-tree', projectId],
    queryFn: () => api.getProjectTaskTree(projectId),
    staleTime: 60_000,
    enabled: !!projectId,
  })

  const charterTask = allTasks.find(t => CHARTER_RE.test(t.name))
  const charter = charterTask ? parseMeta(charterTask.description) : null

  useEffect(() => {
    if (charter) setForm({ ...EMPTY, ...charter })
  }, [charterTask?.id])

  const saveCharter = useMutation({
    mutationFn: (data) => charterTask
      ? api.updateTask(charterTask.id, data)
      : api.createTask(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-tree', projectId] })
      toast.success('Charte sauvegardée')
      setEditing(false)
    },
    onError: (e) => toast.error(e.message),
  })

  function handleSave() {
    const hasContent = Object.values(form).some(v => v?.trim())
    if (!hasContent) return toast.error('Remplissez au moins un champ')
    const taskData = {
      name: `[CHARTER] Charte - ${projectName}`,
      project_id: projectId,
      description: encodeMeta(form),
      priority: '1',
    }
    saveCharter.mutate(taskData)
  }

  if (isLoading) return <div className="loading">Chargement…</div>

  if (!charterTask && !editing) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>📋</div>
        <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '.4rem' }}>Charte de projet non rédigée</div>
        <div style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          La charte de projet est le document fondateur du projet (ISO 21500 §4.3.2).<br />
          Elle autorise formellement le projet et définit objectifs, périmètre et contraintes.
        </div>
        <button className="btn btn-primary" onClick={() => setEditing(true)}>
          Créer la charte de projet
        </button>
      </div>
    )
  }

  if (editing) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>
            {charterTask ? 'Modifier la charte' : 'Nouvelle charte de projet'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); if (charter) setForm({ ...EMPTY, ...charter }) }}>
            Annuler
          </button>
        </div>
        {SECTIONS.map(s => (
          <div key={s.key} className="form-group">
            <label>{s.label}</label>
            {s.rows > 1
              ? <textarea value={form[s.key] || ''} onChange={e => setForm(p => ({ ...p, [s.key]: e.target.value }))}
                  placeholder={s.placeholder} rows={s.rows}
                  style={{ resize: 'vertical' }} />
              : <input type="text" value={form[s.key] || ''} onChange={e => setForm(p => ({ ...p, [s.key]: e.target.value }))}
                  placeholder={s.placeholder} />
            }
          </div>
        ))}
        <div style={{ display: 'flex', gap: '.5rem', marginTop: '.25rem' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}
            disabled={saveCharter.isPending}>
            {saveCharter.isPending ? '…' : 'Sauvegarder la charte'}
          </button>
        </div>
      </div>
    )
  }

  // View mode
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', align: 'center', gap: '.5rem' }}>
          <span className="badge badge-success">✅ Charte rédigée</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>✏️ Modifier</button>
      </div>

      {SECTIONS.filter(s => charter[s.key]?.trim()).map(s => (
        <div key={s.key} style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.07em',
            color: 'var(--primary)', marginBottom: '.25rem' }}>{s.label}</div>
          <div style={{ fontSize: '.9rem', lineHeight: 1.65, color: 'var(--text)',
            background: 'var(--bg)', borderRadius: 8, padding: '.65rem .85rem',
            borderLeft: '3px solid var(--primary-light)', whiteSpace: 'pre-wrap' }}>
            {charter[s.key]}
          </div>
        </div>
      ))}

      {SECTIONS.every(s => !charter[s.key]?.trim()) && (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '.85rem' }}>
          Charte vide — cliquez sur Modifier pour la remplir.
        </div>
      )}
    </div>
  )
}
