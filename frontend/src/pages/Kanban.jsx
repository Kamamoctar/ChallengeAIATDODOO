import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import EmployeeToggle from '../components/EmployeeToggle'
import toast from 'react-hot-toast'
import { Search, Star, Folder, Calendar, AlertTriangle, Check } from 'lucide-react'

const DEFAULT_STAGES = [
  { id: 'todo',        name: 'À faire',    color: 'var(--text-muted)' },
  { id: 'inprogress',  name: 'En cours',   color: 'var(--primary)' },
  { id: 'review',      name: 'En révision',color: '#b45309' },
  { id: 'done',        name: 'Terminé',    color: 'var(--success)' },
]

function normalizeStageKey(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('progress') || n.includes('cours') || n.includes('doing')) return 'inprogress'
  if (n.includes('review') || n.includes('révision') || n.includes('validation')) return 'review'
  if (n.includes('done') || n.includes('terminé') || n.includes('fermé') || n.includes('clôt')) return 'done'
  return 'todo'
}

export default function Kanban() {
  const { active } = useTeam()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState('all')

  const userId = active.id === parseInt(import.meta.env.VITE_EMPLOYEE_A_ID || '0')
    ? parseInt(import.meta.env.VITE_EMPLOYEE_A_USER_ID || '0')
    : parseInt(import.meta.env.VITE_EMPLOYEE_B_USER_ID || '0')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks', userId],
    queryFn: () => api.getMyTasks(userId),
    enabled: userId > 0,
    staleTime: 60_000,
  })

  const { data: stages = [] } = useQuery({
    queryKey: ['all-stages'],
    queryFn: api.getAllStages,
    staleTime: 300_000,
  })

  const moveTask = useMutation({
    mutationFn: ({ id, stage_id }) => api.updateTask(id, { stage_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tasks', userId] }),
    onError: (e) => toast.error(e.message),
  })

  const doneStageId = useMemo(() => {
    const s = stages.filter(s => /done|terminé|fermé|clôt/i.test(s.name))
    if (!s.length) return null
    return s.reduce((best, cur) => cur.sequence > best.sequence ? cur : best).id
  }, [stages])

  // Build column definitions from real stages or fallback
  const columns = stages.length > 0
    ? stages.map(s => ({ id: s.id, name: s.name, color: DEFAULT_STAGES.find(d => d.id === normalizeStageKey(s.name))?.color || 'var(--text-muted)' }))
    : DEFAULT_STAGES

  // Get unique projects in tasks
  const projects = [...new Map(
    tasks.filter(t => Array.isArray(t.project_id))
      .map(t => [t.project_id[0], { id: t.project_id[0], name: t.project_id[1] }])
  ).values()]

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase())
    const matchProject = selectedProject === 'all' || (Array.isArray(t.project_id) && t.project_id[0] === parseInt(selectedProject))
    return matchSearch && matchProject
  })

  // Group by stage
  function getTasksForColumn(col) {
    return filtered.filter(t => {
      if (!t.stage_id) return col.id === 'todo' || col.name === 'À faire'
      if (Array.isArray(t.stage_id)) {
        if (stages.length > 0) return t.stage_id[0] === col.id
        return normalizeStageKey(t.stage_id[1]) === col.id
      }
      return false
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <header className="nav-bar">
        <div>
          <div style={{ fontWeight: 700 }}>Kanban</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{tasks.length} tâches assignées</div>
        </div>
        <EmployeeToggle />
      </header>

      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '.65rem 1rem', display: 'flex', gap: '.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <Search size={16} style={{ verticalAlign: '-2px', flexShrink: 0, color: 'var(--text-muted)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Filtrer les tâches…"
          style={{ flex: 1, minWidth: 150, padding: '.4rem .7rem', border: '1.5px solid var(--border)',
            borderRadius: 8, fontSize: '.85rem' }} />
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)}
          style={{ padding: '.4rem .7rem', border: '1.5px solid var(--border)', borderRadius: 8,
            fontSize: '.82rem', maxWidth: 180, background: 'var(--bg)', color: 'var(--text)' }}>
          <option value="all">Tous les projets</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {isLoading && <div className="loading">Chargement…</div>}

      {!isLoading && (
        <div style={{ flex: 1, overflowX: 'auto', display: 'flex', gap: '1rem',
          padding: '1rem', alignItems: 'flex-start', overflowY: 'hidden' }}>
          {columns.map(col => {
            const colTasks = getTasksForColumn(col)
            return (
              <div key={col.id} style={{ minWidth: 240, width: 260, flexShrink: 0,
                display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {/* Column header */}
                <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '.6rem .85rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderTop: `3px solid ${col.color}`, boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
                  <span style={{ fontWeight: 800, fontSize: '.82rem', color: col.color }}>{col.name}</span>
                  <span style={{ background: col.color + '22', color: col.color, borderRadius: 12,
                    padding: '2px 8px', fontSize: '.72rem', fontWeight: 700 }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem',
                  maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingBottom: '.5rem' }}>
                  {colTasks.map(task => (
                    <KanbanCard key={task.id} task={task} columns={columns}
                      stages={stages}
                      onMove={(stageId) => moveTask.mutate({ id: task.id, stage_id: stageId })}
                      onComplete={() => doneStageId && moveTask.mutate({ id: task.id, stage_id: doneStageId })}
                      alreadyDone={doneStageId != null && task.stage_id?.[0] === doneStageId} />
                  ))}
                  {colTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '1.5rem .5rem',
                      color: 'var(--text-muted)', fontSize: '.78rem',
                      borderRadius: 8, border: '2px dashed var(--border)' }}>
                      Vide
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function KanbanCard({ task, columns, stages, onMove, onComplete, alreadyDone }) {
  const [showMove, setShowMove] = useState(false)
  const [done, setDone] = useState(false)
  const projectName = Array.isArray(task.project_id) ? task.project_id[1] : null
  const projectId = Array.isArray(task.project_id) ? task.project_id[0] : null
  const isStarred = task.priority === '1'
  const isOverdue = task.date_deadline && new Date(task.date_deadline) < new Date()

  return (
    <div style={{ background: 'var(--surface)', borderRadius: 10, padding: '.75rem',
      boxShadow: '0 1px 4px rgba(0,0,0,.07)', border: '1px solid var(--border)',
      borderLeft: isStarred ? '3px solid var(--warning)' : isOverdue ? '3px solid var(--danger)' : '1px solid var(--border)' }}>
      <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)',
        lineHeight: 1.35, marginBottom: '.35rem' }}>
        {isStarred && <Star size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} color="var(--warning)" fill="var(--warning)" />}{isStarred ? ' ' : ''}{task.name}
      </div>
      {projectName && (
        <div style={{ fontSize: '.7rem', marginBottom: '.4rem' }}>
          {projectId
            ? <Link to={`/projects/${projectId}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                <Folder size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {projectName}
              </Link>
            : <span style={{ color: 'var(--text-muted)' }}><Folder size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {projectName}</span>
          }
        </div>
      )}
      {task.date_deadline && (
        <div style={{ fontSize: '.68rem', fontWeight: isOverdue ? 700 : 400,
          color: isOverdue ? 'var(--danger)' : 'var(--text-muted)', marginBottom: '.4rem' }}>
          <Calendar size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {task.date_deadline}{isOverdue ? <AlertTriangle size={14} style={{ verticalAlign: '-2px', flexShrink: 0, marginLeft: 2 }} color="var(--danger)" /> : ''}
        </div>
      )}

      {/* Move to stage */}
      <div style={{ position: 'relative', display: 'flex', gap: '.35rem' }}>
        <button
          onClick={() => { setDone(true); onComplete?.() }}
          disabled={done || alreadyDone || !onComplete}
          className={`task-done-btn task-done-btn--sm${(done || alreadyDone) ? ' task-done-btn--active' : ''}`}
          title="Marquer comme terminée"
        ><Check size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /></button>
        <button onClick={() => setShowMove(v => !v)}
          style={{ fontSize: '.68rem', color: 'var(--text-muted)', background: 'var(--bg)',
            border: '1px solid var(--border)', borderRadius: 6, padding: '2px 7px',
            cursor: 'pointer', flex: 1 }}>
          Déplacer ▾
        </button>
        {showMove && (
          <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 4,
            background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)',
            boxShadow: '0 4px 16px rgba(0,0,0,.15)', zIndex: 10, overflow: 'hidden' }}>
            {(stages.length > 0 ? stages : columns).map(s => (
              <button key={s.id} onClick={() => { onMove(s.id); setShowMove(false) }}
                style={{ width: '100%', textAlign: 'left', padding: '.4rem .65rem',
                  fontSize: '.78rem', background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text)', borderBottom: '1px solid var(--border)' }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseOut={e => e.currentTarget.style.background = ''}>
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
