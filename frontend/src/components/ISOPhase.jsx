import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'

export const ISO_PHASES = [
  { id: 'Initiating',    label: 'Initialisation', short: 'Init.',  icon: '🚀', color: '#6366f1' },
  { id: 'Planning',      label: 'Planification',  short: 'Plan.',  icon: '📋', color: '#f59e0b' },
  { id: 'Implementing',  label: 'Réalisation',    short: 'Réal.',  icon: '⚙️', color: '#22c55e' },
  { id: 'Controlling',   label: 'Contrôle',       short: 'Ctrl.',  icon: '🔍', color: '#06b6d4' },
  { id: 'Closing',       label: 'Clôture',        short: 'Clôt.', icon: '✅', color: '#8b5cf6' },
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

export default function ISOPhase({ projectId, description, readOnly = false }) {
  const qc = useQueryClient()
  const currentPhase = parsePhase(description)
  const currentIdx = ISO_PHASES.findIndex(p => p.id === currentPhase)

  const updateProject = useMutation({
    mutationFn: (data) => api.updateProject(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Phase mise à jour')
    },
    onError: (e) => toast.error(e.message),
  })

  function setPhase(phaseId) {
    if (readOnly) return
    const newDesc = encodePhase(description, phaseId)
    updateProject.mutate({ description: newDesc })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.5rem' }}>
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Phase ISO 21500
        </span>
        <span className="badge badge-primary" style={{ fontSize: '.65rem' }}>
          {ISO_PHASES[currentIdx]?.icon} {ISO_PHASES[currentIdx]?.label}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {ISO_PHASES.map((phase, i) => {
          const isDone = i < currentIdx
          const isCurrent = i === currentIdx
          return (
            <button
              key={phase.id}
              onClick={() => setPhase(phase.id)}
              title={phase.label}
              disabled={readOnly || updateProject.isPending}
              style={{
                flex: 1,
                padding: '6px 4px',
                borderRadius: 6,
                border: isCurrent ? `2px solid ${phase.color}` : '2px solid transparent',
                background: isCurrent ? phase.color
                  : isDone ? `${phase.color}22`
                  : 'var(--bg)',
                color: isCurrent ? '#fff'
                  : isDone ? phase.color
                  : 'var(--text-muted)',
                fontSize: '.65rem',
                fontWeight: isCurrent ? 800 : 600,
                cursor: readOnly ? 'default' : 'pointer',
                textAlign: 'center',
                transition: 'all .15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span style={{ fontSize: '.9rem' }}>{phase.icon}</span>
              <span style={{ display: 'none' }}>{phase.short}</span>
              <span style={{ fontSize: '.6rem', lineHeight: 1.1 }}>{phase.short}</span>
            </button>
          )
        })}
      </div>

      {/* Progress line */}
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginTop: '.4rem', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${((currentIdx + 1) / ISO_PHASES.length) * 100}%`,
          background: ISO_PHASES[currentIdx]?.color || 'var(--primary)',
          transition: 'width .4s ease',
          borderRadius: 2,
        }} />
      </div>
      <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', marginTop: '.2rem', textAlign: 'right' }}>
        Étape {currentIdx + 1}/{ISO_PHASES.length}
        {!readOnly && <span> · cliquer pour avancer</span>}
      </div>
    </div>
  )
}
