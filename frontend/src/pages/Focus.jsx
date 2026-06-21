import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import { useTimer } from '../context/TimerContext'
import QuickTimelog from '../components/QuickTimelog'

const FOCUS_KEY = 'odoo_focus_tasks'

function loadFocus() {
  try { return JSON.parse(localStorage.getItem(FOCUS_KEY)) || [] } catch { return [] }
}
function saveFocus(tasks) {
  localStorage.setItem(FOCUS_KEY, JSON.stringify(tasks))
}

export default function Focus() {
  const { active } = useTeam()
  const { isRunning, runningTaskId, start } = useTimer()
  const [focus, setFocus] = useState(loadFocus)
  const [showPicker, setShowPicker] = useState(false)
  const [logTask, setLogTask] = useState(null)
  const [search, setSearch] = useState('')

  const userId = active.id === parseInt(import.meta.env.VITE_EMPLOYEE_A_ID || '0')
    ? parseInt(import.meta.env.VITE_EMPLOYEE_A_USER_ID || '0')
    : parseInt(import.meta.env.VITE_EMPLOYEE_B_USER_ID || '0')

  const qc = useQueryClient()

  const { data: myTasks = [] } = useQuery({
    queryKey: ['my-tasks', userId],
    queryFn: () => api.getMyTasks(userId),
    enabled: userId > 0,
    staleTime: 120_000,
  })

  const { data: stages = [] } = useQuery({
    queryKey: ['all-stages'],
    queryFn: api.getAllStages,
    staleTime: 300_000,
  })

  const doneStageId = useMemo(() => {
    const s = stages.filter(s => /done|terminé|fermé|clôt/i.test(s.name))
    if (!s.length) return null
    return s.reduce((best, cur) => cur.sequence > best.sequence ? cur : best).id
  }, [stages])

  const [completedIds, setCompletedIds] = useState(() => new Set())

  const completeTask = useMutation({
    mutationFn: (taskId) => api.updateTask(taskId, { stage_id: doneStageId }),
    onMutate: (taskId) => setCompletedIds(prev => new Set([...prev, taskId])),
    onSuccess: (_data, taskId) => {
      removeFromFocus(taskId)
      qc.invalidateQueries({ queryKey: ['my-tasks', userId] })
      toast.success('Tâche terminée ✓')
    },
    onError: (_err, taskId) => {
      setCompletedIds(prev => { const n = new Set(prev); n.delete(taskId); return n })
      toast.error('Erreur — tâche non marquée')
    },
  })

  useEffect(() => { saveFocus(focus) }, [focus])

  function addToFocus(task) {
    if (focus.length >= 3) { toast.error('Maximum 3 tâches en focus !'); return }
    if (focus.find(f => f.id === task.id)) { toast.error('Déjà dans le focus'); return }
    setFocus(f => [...f, task])
    setShowPicker(false)
    toast.success('Ajouté au focus du jour !')
  }

  function removeFromFocus(id) {
    setFocus(f => f.filter(t => t.id !== id))
  }

  const filtered = myTasks.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) &&
    !focus.find(f => f.id === t.id)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="nav-bar">
        <div>
          <div style={{ fontWeight: 700 }}>Focus du jour</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Max 3 tâches · {active.name.split(' ')[0]}</div>
        </div>
        <button onClick={() => setShowPicker(p => !p)} className="btn btn-primary"
          style={{ padding: '6px 12px', fontSize: '.8rem' }}
          disabled={focus.length >= 3}>
          + Ajouter
        </button>
      </header>

      {showPicker && (
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher parmi mes tâches…"
            style={{ width: '100%', padding: '.5rem .75rem', border: '1.5px solid var(--border)',
              borderRadius: 8, fontSize: '.9rem', marginBottom: '.5rem' }} autoFocus />
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            {filtered.slice(0, 20).map(t => (
              <div key={t.id} onClick={() => addToFocus(t)}
                style={{ padding: '.5rem .6rem', borderRadius: 6, cursor: 'pointer',
                  borderBottom: '1px solid var(--border)' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseOut={e => e.currentTarget.style.background = ''}>
                <div style={{ fontSize: '.85rem', fontWeight: 500 }}>
                  {t.priority === '1' ? '⭐ ' : ''}{t.name}
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
                  {Array.isArray(t.project_id) ? t.project_id[1] : 'Sans projet'}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', padding: '.5rem' }}>
                Aucune tâche trouvée
              </div>
            )}
          </div>
        </div>
      )}

      <main className="page">
        {focus.length === 0 && (
          <div className="empty-state">
            <div className="icon">🎯</div>
            <p>Aucune tâche en focus</p>
            <p style={{ fontSize: '.8rem', marginTop: '.25rem' }}>Ajoutez jusqu'à 3 tâches pour votre journée</p>
          </div>
        )}

        {focus.filter(task => !completedIds.has(task.id)).map((task, i) => {
          const isThisRunning = runningTaskId === task.id
          const projectId = Array.isArray(task.project_id) ? task.project_id[0] : task.project_id
          const projectName = Array.isArray(task.project_id) ? task.project_id[1] : 'Sans projet'

          return (
            <div key={task.id} className="card" style={{ marginBottom: '.75rem', border: isThisRunning ? '2px solid var(--primary)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem' }}>
                <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%',
                  width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, flexShrink: 0, fontSize: '.85rem' }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '.95rem' }}>
                    {task.priority === '1' ? '⭐ ' : ''}{task.name}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>
                    {projectId ? (
                      <Link to={`/projects/${projectId}`} style={{ color: 'var(--primary)' }}>
                        {projectName}
                      </Link>
                    ) : 'Sans projet'}
                    {task.date_deadline && ` · 📅 ${task.date_deadline}`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '.4rem', marginTop: '.75rem' }}>
                <button
                  onClick={() => doneStageId && completeTask.mutate(task.id)}
                  disabled={!doneStageId || completedIds.has(task.id)}
                  className={`task-done-btn${completedIds.has(task.id) ? ' task-done-btn--active' : ''}`}
                  title="Marquer comme terminée"
                >✓</button>
                <button
                  onClick={() => {
                    if (isThisRunning) return
                    if (isRunning) { toast.error("Arrêtez le timer en cours d'abord"); return }
                    start({ taskId: task.id, projectId, taskName: task.name, projectName, employeeId: active.id })
                  }}
                  style={{
                    flex: 1, background: isThisRunning ? '#dcfce7' : 'var(--primary)',
                    color: isThisRunning ? '#16a34a' : '#fff', border: 'none', borderRadius: 8,
                    padding: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '.85rem',
                  }}>
                  {isThisRunning ? '🔴 En cours…' : '▶ Démarrer timer'}
                </button>
                <button onClick={() => setLogTask(logTask?.id === task.id ? null : task)}
                  className="btn btn-ghost" style={{ padding: '8px 12px', fontSize: '.85rem' }}>
                  ⏱ Log
                </button>
                <button onClick={() => removeFromFocus(task.id)}
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  ✕
                </button>
              </div>

              {logTask?.id === task.id && (
                <div style={{ marginTop: '.5rem' }}>
                  <QuickTimelog task={task} projectId={projectId} onClose={() => setLogTask(null)} />
                </div>
              )}
            </div>
          )
        })}

        {focus.length > 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.78rem', marginTop: '.5rem' }}>
            {3 - focus.length} emplacement(s) disponible(s)
          </div>
        )}

        {myTasks.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: '1.5rem' }}>Toutes mes tâches</div>
            <div className="card">
              {myTasks.filter(t => !completedIds.has(t.id)).slice(0, 15).map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '.5rem',
                  padding: '.4rem 0', borderBottom: '1px solid var(--border)' }}>
                  <button
                    onClick={() => doneStageId && completeTask.mutate(t.id)}
                    disabled={!doneStageId || completedIds.has(t.id)}
                    className={`task-done-btn task-done-btn--sm${completedIds.has(t.id) ? ' task-done-btn--active' : ''}`}
                    title="Marquer comme terminée"
                  >✓</button>
                  <div style={{ flex: 1, fontSize: '.85rem' }}>
                    {t.priority === '1' ? '⭐ ' : ''}{t.name}
                    <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
                      {Array.isArray(t.project_id) ? t.project_id[1] : 'Sans projet'}
                    </div>
                  </div>
                  <button onClick={() => addToFocus(t)}
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '3px 8px', fontSize: '.75rem', cursor: 'pointer',
                      color: focus.length >= 3 ? 'var(--text-muted)' : 'var(--primary)' }}
                    disabled={focus.length >= 3}>
                    + Focus
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
