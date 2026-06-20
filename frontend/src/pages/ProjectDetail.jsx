import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import TaskTree from '../components/TaskTree'

export default function ProjectDetail() {
  const { id } = useParams()
  const projectId = parseInt(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { active } = useTeam()

  const [showNewTask, setShowNewTask] = useState(false)
  const [showBlocker, setShowBlocker] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskPrio, setNewTaskPrio] = useState('0')
  const [newTaskDeadline, setNewTaskDeadline] = useState('')
  const [blockerText, setBlockerText] = useState('')
  const [docLink, setDocLink] = useState('')
  const [showDocLink, setShowDocLink] = useState(false)

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.getProject(projectId),
    staleTime: 60_000,
  })

  const createTask = useMutation({
    mutationFn: (data) => api.createTask(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-tree', projectId] })
      toast.success('Tâche créée !')
      setNewTaskName(''); setNewTaskDeadline(''); setShowNewTask(false)
    },
    onError: (e) => toast.error(e.message),
  })

  const updateProject = useMutation({
    mutationFn: (data) => api.updateProject(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Projet mis à jour')
    },
    onError: (e) => toast.error(e.message),
  })

  function handleBlocker() {
    if (!blockerText.trim()) return
    const existing = project?.description || ''
    const newDesc = `<p>🚨 <strong>BLOCAGE:</strong> ${blockerText}</p>${existing}`
    updateProject.mutate({ description: newDesc })
    setBlockerText(''); setShowBlocker(false)
  }

  function handleDocLink() {
    if (!docLink.trim()) return
    const existing = project?.description || ''
    const newDesc = `${existing}<p>📎 <strong>Doc:</strong> <a href="${docLink}">${docLink}</a></p>`
    updateProject.mutate({ description: newDesc })
    setDocLink(''); setShowDocLink(false)
  }

  if (loadingProject) return <div className="loading" style={{ padding: '2rem' }}>Chargement…</div>

  const projectName = project?.name || `Projet #${projectId}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="nav-bar">
        <button onClick={() => navigate(-1)} style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>←</button>
        <div style={{ flex: 1, marginLeft: '.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '.95rem', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectName}</div>
          {project?.date && (
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>Deadline: {project.date}</div>
          )}
        </div>
      </header>

      {/* Actions rapides projet */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '.6rem 1rem', display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
        <button onClick={() => setShowNewTask(t => !t)} className="btn btn-primary"
          style={{ padding: '5px 10px', fontSize: '.78rem' }}>
          + Tâche
        </button>
        <button onClick={() => setShowBlocker(b => !b)}
          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            borderRadius: 6, padding: '5px 10px', fontSize: '.78rem', cursor: 'pointer', fontWeight: 600 }}>
          🚨 Blocage
        </button>
        <button onClick={() => setShowDocLink(d => !d)}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '5px 10px', fontSize: '.78rem', cursor: 'pointer' }}>
          📎 Doc
        </button>
      </div>

      {/* Panneau nouvelle tâche */}
      {showNewTask && (
        <div style={{ background: '#f0f4ff', borderBottom: '1px solid #c7d2fe', padding: '1rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '.5rem', fontSize: '.85rem' }}>
            Nouvelle tâche dans {projectName}
          </div>
          <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)}
            placeholder="Nom de la tâche…"
            style={{ width: '100%', padding: '.5rem', border: '1px solid #c7d2fe', borderRadius: 6,
              fontSize: '.9rem', marginBottom: '.4rem' }} />
          <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.4rem', alignItems: 'center' }}>
            <label style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Priorité :</label>
            <button onClick={() => setNewTaskPrio(p => p === '0' ? '1' : '0')}
              style={{ background: newTaskPrio === '1' ? '#fef3c7' : 'var(--bg)',
                border: `1px solid ${newTaskPrio === '1' ? '#f59e0b' : 'var(--border)'}`,
                borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '.8rem' }}>
              {newTaskPrio === '1' ? '⭐ Haute' : '○ Normale'}
            </button>
            <input type="date" value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)}
              style={{ flex: 1, padding: '.3rem .5rem', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '.8rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '6px' }}
              disabled={!newTaskName || createTask.isPending}
              onClick={() => createTask.mutate({
                name: newTaskName,
                project_id: projectId,
                priority: newTaskPrio,
                date_deadline: newTaskDeadline || undefined,
                user_ids: [active.id === parseInt(import.meta.env.VITE_EMPLOYEE_A_ID) ?
                  parseInt(import.meta.env.VITE_EMPLOYEE_A_USER_ID || '0') :
                  parseInt(import.meta.env.VITE_EMPLOYEE_B_USER_ID || '0')],
              })}>
              {createTask.isPending ? '…' : 'Créer'}
            </button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
              onClick={() => setShowNewTask(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Panneau blocage */}
      {showBlocker && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '1rem' }}>
          <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '.5rem', fontSize: '.85rem' }}>
            🚨 Signaler un blocage sur ce projet
          </div>
          <input type="text" value={blockerText} onChange={e => setBlockerText(e.target.value)}
            placeholder="Cause du blocage, décalage de calendrier…"
            style={{ width: '100%', padding: '.5rem', border: '1px solid #fecaca', borderRadius: 6,
              fontSize: '.9rem', marginBottom: '.4rem' }}
            onKeyDown={e => e.key === 'Enter' && handleBlocker()} />
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={handleBlocker}>
              Enregistrer
            </button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
              onClick={() => setShowBlocker(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Panneau lien document */}
      {showDocLink && (
        <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '1rem' }}>
          <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: '.5rem', fontSize: '.85rem' }}>
            📎 Lien document / livrable
          </div>
          <input type="url" value={docLink} onChange={e => setDocLink(e.target.value)}
            placeholder="https://nextcloud.example.com/share/..."
            style={{ width: '100%', padding: '.5rem', border: '1px solid #bbf7d0', borderRadius: 6,
              fontSize: '.9rem', marginBottom: '.4rem' }}
            onKeyDown={e => e.key === 'Enter' && handleDocLink()} />
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button onClick={handleDocLink}
              style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6,
                padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}>
              Enregistrer
            </button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
              onClick={() => setShowDocLink(false)}>Annuler</button>
          </div>
        </div>
      )}

      <main className="page">
        <div className="section-title">Tâches & sous-tâches</div>
        <div className="card">
          <TaskTree projectId={projectId} projectName={projectName} />
        </div>
      </main>
    </div>
  )
}
