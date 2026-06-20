import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import TaskTree from '../components/TaskTree'
import ISOPhase from '../components/ISOPhase'
import RiskRegister from '../components/RiskRegister'

const SECTION = { WBS: 'wbs', RISKS: 'risks', DOCS: 'docs', INFO: 'info' }

export default function ProjectDetail() {
  const { id } = useParams()
  const projectId = parseInt(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { active } = useTeam()

  const [section, setSection] = useState(SECTION.WBS)
  const [showNewTask, setShowNewTask] = useState(false)
  const [showMilestone, setShowMilestone] = useState(false)
  const [showBlocker, setShowBlocker] = useState(false)
  const [showDocLink, setShowDocLink] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [newTaskPrio, setNewTaskPrio] = useState('0')
  const [newTaskDeadline, setNewTaskDeadline] = useState('')
  const [milestoneText, setMilestoneText] = useState('')
  const [milestoneDate, setMilestoneDate] = useState('')
  const [blockerText, setBlockerText] = useState('')
  const [docLink, setDocLink] = useState('')
  const [docTitle, setDocTitle] = useState('')

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.getProject(projectId),
    staleTime: 60_000,
  })

  const { data: allTasks = [] } = useQuery({
    queryKey: ['task-tree', projectId],
    queryFn: () => api.getProjectTaskTree(projectId),
    staleTime: 60_000,
    enabled: !!projectId,
  })

  const createTask = useMutation({
    mutationFn: (data) => api.createTask(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task-tree', projectId] })
      qc.invalidateQueries({ queryKey: ['risks', projectId] })
      toast.success('Créé !')
      setNewTaskName(''); setNewTaskDeadline(''); setShowNewTask(false)
      setMilestoneText(''); setMilestoneDate(''); setShowMilestone(false)
    },
    onError: (e) => toast.error(e.message),
  })

  const updateProject = useMutation({
    mutationFn: (data) => api.updateProject(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Mis à jour')
    },
    onError: (e) => toast.error(e.message),
  })

  function handleBlocker() {
    if (!blockerText.trim()) return
    const existing = project?.description || ''
    updateProject.mutate({ description: `<p>🚨 <strong>BLOCAGE:</strong> ${blockerText}</p>${existing}` })
    setBlockerText(''); setShowBlocker(false)
  }

  function handleDocLink() {
    if (!docLink.trim()) return
    const existing = project?.description || ''
    const title = docTitle.trim() || docLink
    updateProject.mutate({ description: `${existing}<p>📎 <strong>Doc:</strong> <a href="${docLink}">${title}</a></p>` })
    setDocLink(''); setDocTitle(''); setShowDocLink(false)
  }

  function getUserId() {
    return active.id === parseInt(import.meta.env.VITE_EMPLOYEE_A_ID)
      ? parseInt(import.meta.env.VITE_EMPLOYEE_A_USER_ID || '0')
      : parseInt(import.meta.env.VITE_EMPLOYEE_B_USER_ID || '0')
  }

  // Completion % based on stage names
  const doneTasks = allTasks.filter(t =>
    !t.parent_id &&
    Array.isArray(t.stage_id) &&
    /done|terminé|closed|fini|validé/i.test(t.stage_id[1] || '')
  ).length
  const totalWbsTasks = allTasks.filter(t => !t.parent_id).length
  const completionPct = totalWbsTasks > 0 ? Math.round((doneTasks / totalWbsTasks) * 100) : 0

  // Overdue tasks
  const overdueTasks = allTasks.filter(t =>
    t.date_deadline && t.date_deadline < new Date().toISOString().split('T')[0]
  ).length

  if (loadingProject) return <div className="loading" style={{ padding: '2rem' }}>Chargement…</div>

  const projectName = project?.name || `Projet #${projectId}`
  const isProjectOverdue = project?.date && project.date < new Date().toISOString().split('T')[0]

  const TABS = [
    { key: SECTION.WBS,   label: 'WBS', icon: '🗂️' },
    { key: SECTION.RISKS, label: 'Risques', icon: '⚠️' },
    { key: SECTION.DOCS,  label: 'Docs', icon: '📎' },
    { key: SECTION.INFO,  label: 'Infos', icon: 'ℹ️' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="nav-bar">
        <button onClick={() => navigate(-1)} style={{ fontSize: '1.2rem', color: 'var(--text-muted)', flexShrink: 0 }}>←</button>
        <div style={{ flex: 1, marginLeft: '.5rem', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '.95rem', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{projectName}</div>
          <div style={{ display: 'flex', gap: '.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {project?.date && (
              <span style={{ fontSize: '.7rem', color: isProjectOverdue ? 'var(--danger)' : 'var(--text-muted)',
                fontWeight: isProjectOverdue ? 700 : 400 }}>
                📅 {project.date}{isProjectOverdue ? ' ⚠️' : ''}
              </span>
            )}
            <span style={{ fontSize: '.7rem', color: completionPct === 100 ? '#16a34a' : 'var(--primary)', fontWeight: 700 }}>
              {completionPct}% complet
            </span>
            {overdueTasks > 0 && (
              <span style={{ fontSize: '.65rem', background: '#fef2f2', color: '#dc2626',
                borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>
                {overdueTasks} tâche{overdueTasks > 1 ? 's' : ''} en retard
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ISO 21500 Phase */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '.75rem 1rem' }}>
        <ISOPhase projectId={projectId} description={project?.description} />
      </div>

      {/* Quick actions */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '.5rem 1rem', display: 'flex', gap: '.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => { setShowNewTask(t => !t); setShowMilestone(false); setShowBlocker(false); setShowDocLink(false) }}
          className="btn btn-primary btn-sm">+ Tâche</button>
        <button onClick={() => { setShowMilestone(m => !m); setShowNewTask(false); setShowBlocker(false); setShowDocLink(false) }}
          style={{ background: '#f3e8ff', border: '1px solid #c4b5fd', color: '#7c3aed',
            borderRadius: 6, padding: '5px 10px', fontSize: '.78rem', cursor: 'pointer', fontWeight: 600 }}>
          ◆ Jalon
        </button>
        <button onClick={() => { setShowBlocker(b => !b); setShowNewTask(false); setShowMilestone(false); setShowDocLink(false) }}
          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            borderRadius: 6, padding: '5px 10px', fontSize: '.78rem', cursor: 'pointer', fontWeight: 600 }}>
          🚨 Blocage
        </button>
        <button onClick={() => { setShowDocLink(d => !d); setShowNewTask(false); setShowMilestone(false); setShowBlocker(false) }}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '5px 10px', fontSize: '.78rem', cursor: 'pointer' }}>
          📎 Doc
        </button>
      </div>

      {/* Panels */}
      {showNewTask && (
        <div style={{ background: '#f0f4ff', borderBottom: '1px solid #c7d2fe', padding: '1rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '.5rem', fontSize: '.85rem' }}>
            Nouvelle tâche WBS — {projectName}
          </div>
          <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)}
            placeholder="Nom du livrable / activité…"
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
                name: newTaskName, project_id: projectId, priority: newTaskPrio,
                date_deadline: newTaskDeadline || undefined, user_ids: [getUserId()],
              })}>
              {createTask.isPending ? '…' : 'Créer'}
            </button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
              onClick={() => setShowNewTask(false)}>Annuler</button>
          </div>
        </div>
      )}

      {showMilestone && (
        <div style={{ background: '#faf5ff', borderBottom: '1px solid #c4b5fd', padding: '1rem' }}>
          <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: '.5rem', fontSize: '.85rem' }}>
            ◆ Nouveau jalon ISO 21500
          </div>
          <input type="text" value={milestoneText} onChange={e => setMilestoneText(e.target.value)}
            placeholder="Nom du jalon (ex: Livraison V1, Recette client…)"
            style={{ width: '100%', padding: '.5rem', border: '1px solid #c4b5fd', borderRadius: 6,
              fontSize: '.9rem', marginBottom: '.4rem' }} />
          <input type="date" value={milestoneDate} onChange={e => setMilestoneDate(e.target.value)}
            style={{ width: '100%', padding: '.4rem .5rem', border: '1px solid #c4b5fd', borderRadius: 6,
              fontSize: '.85rem', marginBottom: '.4rem' }} />
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button className="btn btn-primary" style={{ flex: 1, padding: '6px',
              background: '#7c3aed', opacity: !milestoneText ? .5 : 1 }}
              disabled={!milestoneText || createTask.isPending}
              onClick={() => createTask.mutate({
                name: `[MILESTONE] ${milestoneText}`, project_id: projectId, priority: '1',
                date_deadline: milestoneDate || undefined, user_ids: [getUserId()],
              })}>
              {createTask.isPending ? '…' : 'Créer le jalon'}
            </button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
              onClick={() => setShowMilestone(false)}>Annuler</button>
          </div>
        </div>
      )}

      {showBlocker && (
        <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '1rem' }}>
          <div style={{ fontWeight: 700, color: '#dc2626', marginBottom: '.5rem', fontSize: '.85rem' }}>
            🚨 Signaler un blocage / problème projet
          </div>
          <input type="text" value={blockerText} onChange={e => setBlockerText(e.target.value)}
            placeholder="Cause du blocage, décalage calendrier, dépendance bloquante…"
            style={{ width: '100%', padding: '.5rem', border: '1px solid #fecaca', borderRadius: 6,
              fontSize: '.9rem', marginBottom: '.4rem' }}
            onKeyDown={e => e.key === 'Enter' && handleBlocker()} />
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button className="btn btn-danger" style={{ padding: '6px 12px' }} onClick={handleBlocker}>Enregistrer</button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
              onClick={() => setShowBlocker(false)}>Annuler</button>
          </div>
        </div>
      )}

      {showDocLink && (
        <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '1rem' }}>
          <div style={{ fontWeight: 700, color: '#16a34a', marginBottom: '.5rem', fontSize: '.85rem' }}>
            📎 Lien livrable / document
          </div>
          <input type="text" value={docTitle} onChange={e => setDocTitle(e.target.value)}
            placeholder="Titre du document (facultatif)"
            style={{ width: '100%', padding: '.4rem .5rem', border: '1px solid #bbf7d0', borderRadius: 6,
              fontSize: '.85rem', marginBottom: '.35rem' }} />
          <input type="url" value={docLink} onChange={e => setDocLink(e.target.value)}
            placeholder="https://nextcloud.example.com/share/..."
            style={{ width: '100%', padding: '.5rem', border: '1px solid #bbf7d0', borderRadius: 6,
              fontSize: '.9rem', marginBottom: '.4rem' }}
            onKeyDown={e => e.key === 'Enter' && handleDocLink()} />
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button onClick={handleDocLink}
              style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6,
                padding: '6px 12px', cursor: 'pointer', fontWeight: 600, flex: 1 }}>
              Enregistrer
            </button>
            <button className="btn btn-ghost" style={{ padding: '6px 12px' }}
              onClick={() => setShowDocLink(false)}>Annuler</button>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setSection(t.key)}
            style={{
              flex: 1, padding: '.6rem .5rem', border: 'none', cursor: 'pointer',
              fontSize: '.78rem', fontWeight: section === t.key ? 800 : 500,
              color: section === t.key ? 'var(--primary)' : 'var(--text-muted)',
              background: 'transparent',
              borderBottom: section === t.key ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              whiteSpace: 'nowrap',
            }}>
            <span style={{ fontSize: '1rem' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <main className="page">

        {/* WBS TAB */}
        {section === SECTION.WBS && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              className="section-title">
              <span>WBS — Structure de Découpage du Travail</span>
              <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{completionPct}%</span>
            </div>
            {totalWbsTasks > 0 && (
              <div style={{ marginBottom: '.75rem' }}>
                <div className="progress-bar" style={{ height: 6 }}>
                  <div className="progress-bar-fill" style={{ width: `${completionPct}%`,
                    background: completionPct === 100 ? '#22c55e' : undefined }} />
                </div>
                <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                  {doneTasks}/{totalWbsTasks} tâche{totalWbsTasks > 1 ? 's' : ''} terminée{totalWbsTasks > 1 ? 's' : ''}
                </div>
              </div>
            )}
            <div className="card">
              <TaskTree projectId={projectId} projectName={projectName} />
            </div>
          </>
        )}

        {/* RISKS TAB */}
        {section === SECTION.RISKS && (
          <>
            <div className="section-title">Registre des Risques & Problèmes (ISO 21500 §4.3.28)</div>
            <div style={{ marginBottom: '.75rem', padding: '.75rem', background: '#fffbeb',
              borderRadius: 8, border: '1px solid #fed7aa', fontSize: '.8rem', color: '#92400e' }}>
              <strong>ISO 21500 §4.3.28</strong> — Identifier les risques, évaluer leur probabilité et impact,
              définir des plans de traitement. Mettre à jour tout au long du cycle de vie du projet.
            </div>
            <div className="card">
              <RiskRegister projectId={projectId} />
            </div>
          </>
        )}

        {/* DOCS TAB */}
        {section === SECTION.DOCS && (
          <>
            <div className="section-title">Livrables & Documents (ISO 21500 §4.3.11)</div>
            <div style={{ marginBottom: '.75rem', padding: '.75rem', background: '#f0fdf4',
              borderRadius: 8, border: '1px solid #bbf7d0', fontSize: '.8rem', color: '#166534' }}>
              <strong>ISO 21500 §4.3.11</strong> — Identifier les livrables du projet. Un livrable est tout
              résultat, document ou service produit pour accomplir le projet.
            </div>
            <div className="card">
              {project?.description ? (
                <div>
                  {(project.description.match(/<a href="([^"]+)">([^<]+)<\/a>/g) || []).length === 0
                    ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem', fontSize: '.85rem' }}>
                        Aucun document lié. Cliquez sur "📎 Doc" pour ajouter un lien.
                      </div>
                    : [...project.description.matchAll(/<p>📎 <strong>Doc:<\/strong> <a href="([^"]+)">([^<]+)<\/a><\/p>/g)]
                        .map((m, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem',
                            padding: '.6rem 0', borderBottom: '1px solid var(--border)' }}>
                            <span style={{ fontSize: '1.1rem' }}>📎</span>
                            <div style={{ flex: 1 }}>
                              <a href={m[1]} target="_blank" rel="noopener noreferrer"
                                style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '.9rem' }}>
                                {m[2]}
                              </a>
                              <div style={{ fontSize: '.7rem', color: 'var(--text-muted)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {m[1]}
                              </div>
                            </div>
                          </div>
                        ))
                  }
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem', fontSize: '.85rem' }}>
                  Aucun document lié.
                </div>
              )}
            </div>
          </>
        )}

        {/* INFO TAB */}
        {section === SECTION.INFO && (
          <>
            <div className="section-title">Informations projet (ISO 21500 §4.3.2)</div>
            <div className="card" style={{ marginBottom: '.75rem' }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>
                Identité du projet
              </div>
              <table style={{ width: '100%', fontSize: '.85rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Nom', projectName],
                    ['ID Odoo', projectId],
                    ['Deadline', project?.date || '—'],
                    ['Chef de projet', project?.user_id ? (Array.isArray(project.user_id) ? project.user_id[1] : project.user_id) : '—'],
                    ['Tâches WBS', totalWbsTasks],
                    ['Tâches en retard', overdueTasks],
                    ['% Complétion', `${completionPct}%`],
                  ].map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 0', color: 'var(--text-muted)', fontWeight: 600, width: '45%' }}>{k}</td>
                      <td style={{ padding: '6px 0', fontWeight: 500 }}>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {project?.description && (
              <div className="card">
                <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>
                  Description / Notes
                </div>
                <div style={{ fontSize: '.85rem', lineHeight: 1.6, color: 'var(--text)' }}
                  dangerouslySetInnerHTML={{
                    __html: (project.description || '')
                      .replace(/<!-- ISO21500[^>]*-->/g, '')
                      .replace(/<!-- [^>]* -->/g, '')
                  }} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
