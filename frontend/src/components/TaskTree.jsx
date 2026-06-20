import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'
import { useTimer } from '../context/TimerContext'
import { useTeam } from '../context/TeamContext'
import QuickTimelog from './QuickTimelog'

function priorityBadge(p) {
  return p === '1'
    ? <span style={{ color: '#f59e0b', fontSize: '.8rem' }}>⭐</span>
    : null
}

function TaskNode({ task, projectId, projectName, depth = 0, allTasks }) {
  const [open, setOpen] = useState(depth === 0)
  const [showLog, setShowLog] = useState(false)
  const [showBlocker, setShowBlocker] = useState(false)
  const [blockerText, setBlockerText] = useState('')
  const { isRunning, runningTaskId, start, stop } = useTimer()
  const { active } = useTeam()
  const qc = useQueryClient()

  const children = allTasks.filter(t => t.parent_id && t.parent_id[0] === task.id)
  const hasChildren = children.length > 0 || (task.child_ids && task.child_ids.length > 0)

  const stageName = Array.isArray(task.stage_id) ? task.stage_id[1] : '—'
  const isThisRunning = runningTaskId === task.id

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
    const newDesc = `<p>🚨 <strong>BLOCAGE:</strong> ${blockerText}</p>${existing}`
    updateTask.mutate({ id: task.id, data: { description: newDesc } })
    setBlockerText('')
    setShowBlocker(false)
  }

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '.4rem',
        padding: '.5rem 0', borderBottom: '1px solid var(--border)',
      }}>
        {hasChildren ? (
          <button onClick={() => setOpen(o => !o)}
            style={{ color: 'var(--text-muted)', fontWeight: 700, width: 20, flexShrink: 0 }}>
            {open ? '▾' : '▸'}
          </button>
        ) : <span style={{ width: 20, flexShrink: 0 }} />}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', flexWrap: 'wrap' }}>
            {priorityBadge(task.priority)}
            <span style={{ fontSize: '.9rem', fontWeight: depth === 0 ? 600 : 400 }}>{task.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.15rem' }}>
            <span style={{ fontSize: '.7rem', color: 'var(--text-muted)', background: 'var(--bg)',
              padding: '1px 6px', borderRadius: 4, border: '1px solid var(--border)' }}>
              {stageName}
            </span>
            {task.date_deadline && (
              <span style={{ fontSize: '.7rem', color: task.date_deadline < new Date().toISOString().split('T')[0] ? 'var(--danger)' : 'var(--text-muted)' }}>
                📅 {task.date_deadline}
              </span>
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
            {isThisRunning ? '⏹' : '▶'}
          </button>
          <button onClick={() => setShowLog(l => !l)} title="Log manuel"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '3px 8px', fontSize: '.75rem', cursor: 'pointer' }}>
            ⏱
          </button>
          <button onClick={() => setShowBlocker(b => !b)} title="Signaler un blocage"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 6, padding: '3px 8px', fontSize: '.75rem', cursor: 'pointer' }}>
            🚨
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
            🚨 Signaler un blocage / retard
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

      {open && children.map(child => (
        <TaskNode key={child.id} task={child} projectId={projectId}
          projectName={projectName} depth={depth + 1} allTasks={allTasks} />
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
  if (!tasks.length) return <div className="empty-state"><div className="icon">📭</div><p>Aucune tâche</p></div>

  const roots = tasks.filter(t => !t.parent_id)
  return (
    <div>
      {roots.map(t => (
        <TaskNode key={t.id} task={t} projectId={projectId}
          projectName={projectName} depth={0} allTasks={tasks} />
      ))}
    </div>
  )
}
