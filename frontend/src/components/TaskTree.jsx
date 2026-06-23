import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'
import { useTimer } from '../context/TimerContext'
import { useTeam } from '../context/TeamContext'
import { Star, AlertCircle, Calendar, AlertTriangle, Square, Play, Inbox, Clock } from 'lucide-react'
import QuickTimelog from './QuickTimelog'

const RISK_RE      = /^\[(RISK|RISQUE)\]/i
const ISSUE_RE     = /^\[(ISSUE|PROBLEME)\]/i
const MILESTONE_RE = /^\[MILESTONE\]/i

function priorityBadge(p) {
  return p === '1' ? <span style={{ color: '#f59e0b', fontSize: '.8rem' }}><Star size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} color="#f59e0b" fill="#f59e0b" /></span> : null
}

function TaskNode({ task, projectId, projectName, depth = 0, allTasks, wbsNumber }) {
  const [open, setOpen] = useState(depth === 0)
  const [showLog, setShowLog] = useState(false)
  const [showBlocker, setShowBlocker] = useState(false)
  const [blockerText, setBlockerText] = useState('')
  const { isRunning, runningTaskId, start, stop } = useTimer()
  const { active } = useTeam()
  const qc = useQueryClient()

  const children = allTasks.filter(t =>
    t.parent_id && t.parent_id[0] === task.id &&
    !RISK_RE.test(t.name) && !ISSUE_RE.test(t.name)
  )
  const hasChildren = children.length > 0 || (task.child_ids && task.child_ids.length > 0)

  const stageName = Array.isArray(task.stage_id) ? task.stage_id[1] : '—'
  const isThisRunning = runningTaskId === task.id
  const isMilestone = MILESTONE_RE.test(task.name)
  const displayName = task.name.replace(/^\[MILESTONE\]\s*/i, '')
  const isOverdue = task.date_deadline && task.date_deadline < new Date().toISOString().split('T')[0]
  const hasBlocker = (task.description || '').includes('BLOCAGE')

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => api.updateTask(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-tree', projectId] }); toast.success('Mis à jour') },
    onError: (e) => toast.error(e.message),
  })

  function handleTimer() {
    if (isThisRunning) {
      // stop is handled by FloatingTimer
    } else {
      if (isRunning) toast.error('Arrêtez le timer en cours d\'abord')
      else start({ taskId: task.id, projectId, taskName: task.name, projectName })
    }
  }

  function handleBlockerSubmit() {
    if (!blockerText.trim()) return
    const existing = task.description || ''
    const newDesc = `<p><strong>BLOCAGE:</strong> ${blockerText}</p>${existing}`
    updateTask.mutate({ id: task.id, data: { description: newDesc } })
    setBlockerText('')
    setShowBlocker(false)
  }

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '.4rem',
        padding: '.5rem 0', borderBottom: '1px solid var(--border)',
        background: isMilestone ? '#faf5ff' : undefined,
        borderLeft: isMilestone ? '3px solid #8b5cf6' : undefined,
        paddingLeft: isMilestone ? '.5rem' : undefined,
        borderRadius: isMilestone ? '0 6px 6px 0' : undefined,
      }}>
        {hasChildren ? (
          <button onClick={() => setOpen(o => !o)}
            style={{ color: 'var(--text-muted)', fontWeight: 700, width: 20, flexShrink: 0 }}>
            {open ? '▾' : '▸'}
          </button>
        ) : <span style={{ width: 20, flexShrink: 0 }} />}

        {/* WBS number */}
        {wbsNumber && (
          <span style={{ fontSize: '.65rem', color: 'var(--text-muted)', fontWeight: 700,
            minWidth: depth === 0 ? 24 : undefined, flexShrink: 0 }}>
            {wbsNumber}
          </span>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', flexWrap: 'wrap' }}>
            {isMilestone && <span title="Jalon" style={{ color: '#8b5cf6' }}>◆</span>}
            {priorityBadge(task.priority)}
            {hasBlocker && <span title="Blocage signalé" style={{ fontSize: '.75rem' }}><AlertCircle size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} color="var(--danger)" /></span>}
            <span style={{ fontSize: '.9rem', fontWeight: depth === 0 ? 600 : 400,
              color: isMilestone ? '#6d28d9' : undefined }}>
              {displayName}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.15rem' }}>
            <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', background: 'var(--bg)',
              padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
              {stageName}
            </span>
            {task.date_deadline && (
              <span style={{ fontSize: '.7rem', color: isOverdue ? 'var(--danger)' : 'var(--text-muted)',
                fontWeight: isOverdue ? 700 : 400 }}>
                <Calendar size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {task.date_deadline}{isOverdue ? <AlertTriangle size={14} style={{ verticalAlign: '-2px', flexShrink: 0, marginLeft: 2 }} color="var(--danger)" /> : ''}
              </span>
            )}
            {isMilestone && (
              <span style={{ fontSize: '.65rem', background: '#f3e8ff', color: '#7c3aed',
                padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>JALON</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '.25rem', flexShrink: 0 }}>
          <button
            onClick={handleTimer}
            title={isThisRunning ? 'Timer en cours' : 'Démarrer timer'}
            style={{
              background: isThisRunning ? '#ef4444' : 'var(--primary)',
              color: '#fff', border: 'none', borderRadius: 6,
              padding: '3px 8px', fontSize: '.75rem', cursor: 'pointer',
            }}>
            {isThisRunning ? <Square size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> : <Play size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} />}
          </button>
          <button onClick={() => setShowLog(l => !l)} title="Log manuel"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '3px 8px', fontSize: '.75rem', cursor: 'pointer' }}>
            <Clock size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} />
          </button>
          <button onClick={() => setShowBlocker(b => !b)} title="Signaler un blocage"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '3px 8px', fontSize: '.75rem', cursor: 'pointer' }}>
            <AlertCircle size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} color="var(--danger)" />
          </button>
        </div>
      </div>

      {showLog && (
        <QuickTimelog
          task={task} projectId={projectId}
          onClose={() => setShowLog(false)}
        />
      )}

      {showBlocker && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8,
          padding: '.75rem', margin: '.25rem 0 .25rem 20px' }}>
          <div style={{ fontSize: '.8rem', fontWeight: 700, color: '#dc2626', marginBottom: '.4rem' }}>
            <AlertCircle size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} color="#dc2626" /> Signaler un blocage / retard
          </div>
          <input
            type="text" value={blockerText} onChange={e => setBlockerText(e.target.value)}
            placeholder="Décrire le blocage, la cause du retard..."
            style={{ width: '100%', padding: '.4rem .6rem', border: '1px solid #fecaca',
              borderRadius: 6, fontSize: '.85rem', marginBottom: '.4rem' }}
            onKeyDown={e => e.key === 'Enter' && handleBlockerSubmit()}
          />
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button onClick={handleBlockerSubmit} className="btn btn-danger"
              style={{ padding: '4px 12px', fontSize: '.8rem' }}>
              Enregistrer
            </button>
            <button onClick={() => setShowBlocker(false)} className="btn btn-ghost"
              style={{ padding: '4px 12px', fontSize: '.8rem' }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {open && children.map((child, i) => (
        <TaskNode key={child.id} task={child} projectId={projectId}
          projectName={projectName} depth={depth + 1} allTasks={allTasks}
          wbsNumber={wbsNumber ? `${wbsNumber}.${i + 1}` : undefined} />
      ))}
    </div>
  )
}

export default function TaskTree({ projectId, projectName }) {
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['task-tree', projectId],
    queryFn: () => api.getProjectTaskTree(projectId),
    staleTime: 60_000,
  })

  if (isLoading) return <div className="loading">Chargement des tâches…</div>
  if (!tasks.length) return <div className="empty-state"><div className="icon"><Inbox size={28} style={{ verticalAlign: '-2px', flexShrink: 0 }} /></div><p>Aucune tâche</p></div>

  // Exclude risk/issue tasks from WBS (they appear in the Risk Register)
  const wbsTasks = tasks.filter(t => !RISK_RE.test(t.name) && !ISSUE_RE.test(t.name))
  const roots = wbsTasks.filter(t => !t.parent_id)

  const milestones = roots.filter(t => MILESTONE_RE.test(t.name))
  const regular = roots.filter(t => !MILESTONE_RE.test(t.name))

  return (
    <div>
      {milestones.length > 0 && (
        <div style={{ marginBottom: '.5rem', padding: '.3rem .5rem',
          background: '#faf5ff', borderRadius: 6, fontSize: '.7rem',
          color: '#7c3aed', fontWeight: 700 }}>
          ◆ {milestones.length} jalon{milestones.length > 1 ? 's' : ''} identifié{milestones.length > 1 ? 's' : ''}
        </div>
      )}
      {roots.map((t, i) => (
        <TaskNode key={t.id} task={t} projectId={projectId}
          projectName={projectName} depth={0} allTasks={wbsTasks}
          wbsNumber={String(i + 1)} />
      ))}
    </div>
  )
}
