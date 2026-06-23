import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Rocket, ClipboardList, Settings2, Search, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { api } from '../api/odoo'

export const ISO_PHASES = [
  { id: 'Initiating',    label: 'Initialisation', short: 'Init.',  icon: Rocket,        color: '#0a4b8b' },
  { id: 'Planning',      label: 'Planification',  short: 'Plan.',  icon: ClipboardList, color: '#b45309' },
  { id: 'Implementing',  label: 'Réalisation',    short: 'Réal.',  icon: Settings2,     color: '#1c9a97' },
  { id: 'Controlling',   label: 'Contrôle',       short: 'Ctrl.',  icon: Search,        color: '#139cbc' },
  { id: 'Closing',       label: 'Clôture',        short: 'Clôt.', icon: CheckCircle2,  color: '#5acaad' },
]

const PHASE_COMMENT_RE = /<!-- ISO21500-PHASE:(\w+) -->\n?/

export function parsePhase(description) {
  const m = (description || '').match(PHASE_COMMENT_RE)
  return m ? m[1] : 'Planning'
}

export function encodePhase(description, phase) {
  const clean = (description || '').replace(PHASE_COMMENT_RE, '')
  return `<!-- ISO21500-PHASE:${phase} -->\n${clean}`
}

/* Phase gate checklist — which items must be present to advance */
const PHASE_GATES = {
  Planning: [
    { key: 'charter',      label: 'Charte de projet initiée', check: t => t.some(x => /^\[CHARTER\]/i.test(x.name)) },
  ],
  Implementing: [
    { key: 'charter',      label: 'Charte de projet rédigée',         check: t => t.some(x => /^\[CHARTER\]/i.test(x.name)) },
    { key: 'wbs',          label: 'WBS défini (au moins 1 tâche)',     check: t => t.some(x => !/^\[/.test(x.name)) },
    { key: 'stakeholders', label: 'Parties prenantes identifiées',     check: t => t.some(x => /^\[STAKEHOLDER\]/i.test(x.name)) },
  ],
  Controlling: [
    { key: 'wbs',          label: 'WBS à jour',                       check: t => t.some(x => !/^\[/.test(x.name)) },
    { key: 'risks',        label: 'Risques identifiés',               check: t => t.some(x => /^\[RISK\]/i.test(x.name)) },
    { key: 'deliverables', label: 'Livrables enregistrés',            check: t => t.some(x => /^\[DELIVERABLE\]/i.test(x.name)) },
  ],
  Closing: [
    { key: 'deliverables', label: 'Livrables validés',                check: t => t.some(x => /^\[DELIVERABLE\]/i.test(x.name)) },
    { key: 'lessons',      label: 'Leçons apprises documentées',      check: t => t.some(x => /^\[LESSON\]/i.test(x.name)) },
  ],
}

export default function ISOPhase({ projectId, description, allTasks, readOnly = false }) {
  const qc = useQueryClient()
  const currentPhase = parsePhase(description)
  const currentIdx = ISO_PHASES.findIndex(p => p.id === currentPhase)
  const [pendingPhase, setPendingPhase] = useState(null)

  const updateProject = useMutation({
    mutationFn: (data) => api.updateProject(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Phase mise à jour')
      setPendingPhase(null)
    },
    onError: (e) => toast.error(e.message),
  })

  function applyPhase(phaseId) {
    const newDesc = encodePhase(description, phaseId)
    updateProject.mutate({ description: newDesc })
  }

  function handlePhaseClick(phaseId) {
    if (readOnly || phaseId === currentPhase) return
    if (allTasks) {
      const gates = PHASE_GATES[phaseId] || []
      const unchecked = gates.filter(g => !g.check(allTasks))
      if (unchecked.length > 0) {
        setPendingPhase({ phaseId, unchecked })
        return
      }
    }
    applyPhase(phaseId)
  }

  const phase = ISO_PHASES[currentIdx]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.5rem' }}>
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Phase ISO 21500
        </span>
        <span className="badge badge-primary" style={{ fontSize: '.65rem' }}>
          {phase && <phase.icon size={13} style={{ verticalAlign: '-2px' }} />} {phase?.label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {ISO_PHASES.map((ph, i) => {
          const isDone = i < currentIdx
          const isCurrent = i === currentIdx
          return (
            <button
              key={ph.id}
              onClick={() => handlePhaseClick(ph.id)}
              title={ph.label}
              disabled={readOnly || updateProject.isPending}
              style={{
                flex: 1, padding: '6px 4px', borderRadius: 6,
                border: isCurrent ? `2px solid ${ph.color}` : '2px solid transparent',
                background: isCurrent ? ph.color : isDone ? `${ph.color}22` : 'var(--bg)',
                color: isCurrent ? '#fff' : isDone ? ph.color : 'var(--text-muted)',
                fontSize: '.65rem', fontWeight: isCurrent ? 800 : 600,
                cursor: readOnly ? 'default' : 'pointer',
                textAlign: 'center', transition: 'all .15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
              <ph.icon size={15} />
              <span style={{ fontSize: '.6rem', lineHeight: 1.1 }}>{ph.short}</span>
            </button>
          )
        })}
      </div>

      {/* Progress line */}
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: '.4rem', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${((currentIdx + 1) / ISO_PHASES.length) * 100}%`,
          background: phase?.color || 'var(--primary)',
          transition: 'width .4s ease', borderRadius: 2,
        }} />
      </div>
      <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', marginTop: '.2rem', textAlign: 'right' }}>
        Étape {currentIdx + 1}/{ISO_PHASES.length}
        {!readOnly && <span> · cliquer pour avancer</span>}
      </div>

      {/* Phase gate checklist */}
      {pendingPhase && (
        <div style={{ marginTop: '.75rem', background: 'var(--warning-light)',
          border: '1px solid var(--warning)', borderRadius: 8, padding: '.85rem' }}>
          <div style={{ fontWeight: 700, fontSize: '.82rem', color: '#92400e', marginBottom: '.5rem' }}>
            <AlertTriangle size={14} style={{ verticalAlign: '-2px' }} /> Certains éléments recommandés manquent pour la phase «{' '}
            {ISO_PHASES.find(p => p.id === pendingPhase.phaseId)?.label} »
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', marginBottom: '.65rem' }}>
            {pendingPhase.unchecked.map(g => (
              <div key={g.key} style={{ fontSize: '.8rem', color: '#78350f', display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                <X size={13} color="var(--danger)" />
                {g.label}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button onClick={() => applyPhase(pendingPhase.phaseId)}
              style={{ background: '#92400e', color: '#fff', border: 'none', borderRadius: 6,
                padding: '5px 12px', fontSize: '.78rem', fontWeight: 700, cursor: 'pointer' }}>
              Ignorer & avancer quand même
            </button>
            <button onClick={() => setPendingPhase(null)}
              style={{ background: 'transparent', border: '1px solid #d97706', color: '#92400e',
                borderRadius: 6, padding: '5px 12px', fontSize: '.78rem', cursor: 'pointer' }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
