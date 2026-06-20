import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import TaskTree from '../components/TaskTree'
import ISOPhase from '../components/ISOPhase'
import RiskRegister from '../components/RiskRegister'
import ProjectCharter from '../components/ProjectCharter'
import ISORegistry from '../components/ISORegistry'
import {
  STAKEHOLDER_CONFIG, CHANGE_CONFIG, DELIVERABLE_CONFIG,
  LESSON_CONFIG, COMMS_CONFIG, PROCUREMENT_CONFIG,
} from '../components/ISOConfigs'

const TABS = [
  { key: 'wbs',          label: 'WBS',          icon: '🗂️'  },
  { key: 'risks',        label: 'Risques',       icon: '⚠️'  },
  { key: 'charter',      label: 'Charte',        icon: '📋'  },
  { key: 'stakeholders', label: 'Parties',       icon: '👥'  },
  { key: 'changes',      label: 'Changements',   icon: '🔄'  },
  { key: 'deliverables', label: 'Livrables',     icon: '✅'  },
  { key: 'lessons',      label: 'Leçons',        icon: '📚'  },
  { key: 'comms',        label: 'Comm.',         icon: '📢'  },
  { key: 'procurement',  label: 'Achats',        icon: '🛒'  },
  { key: 'docs',         label: 'Docs',          icon: '📎'  },
  { key: 'info',         label: 'Infos',         icon: 'ℹ️'  },
]

export default function ProjectDetail() {
  const { id } = useParams()
  const projectId = parseInt(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { active } = useTeam()

  const [tab, setTab] = useState('wbs')
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
      toast.success('Créé !')
      setNewTaskName(''); setNewTaskDeadline(''); setShowNewTask(false)
      setMilestoneText(''); setMilestoneDate(''); setShowMilestone(false)
    },
    onError: (e) => toast.error(e.message),
  })

  const updateProject = useMutation({
    mutationFn: (data) => api.updateProject(projectId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', projectId] }); toast.success('Mis à jour') },
    onError: (e) => toast.error(e.message),
  })

  function closeAllPanels() {
    setShowNewTask(false); setShowMilestone(false)
    setShowBlocker(false); setShowDocLink(false)
  }

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

  // Stats
  const wbsTasks     = allTasks.filter(t => !/^\[(RISK|RISQUE|ISSUE|PROBLEME|CHARTER|STAKEHOLDER|CHANGE|DELIVERABLE|LESSON|COMMS|PROCUREMENT)\]/i.test(t.name))
  const rootTasks    = wbsTasks.filter(t => !t.parent_id)
  const doneTasks    = rootTasks.filter(t => Array.isArray(t.stage_id) && /done|terminé|closed|fini|validé/i.test(t.stage_id[1] || '')).length
  const completionPct = rootTasks.length > 0 ? Math.round((doneTasks / rootTasks.length) * 100) : 0
  const overdueTasks  = wbsTasks.filter(t => t.date_deadline && t.date_deadline < new Date().toISOString().split('T')[0]).length

  if (loadingProject) return <div className="loading" style={{ padding: '2rem' }}>Chargement…</div>

  const projectName = project?.name || `Projet #${projectId}`
  const isProjectOverdue = project?.date && project.date < new Date().toISOString().split('T')[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>

      {/* ── HEADER ──────────────────────────────── */}
      <header className="nav-bar">
        <button onClick={() => navigate(-1)} style={{ fontSize: '1.2rem', color: 'var(--text-muted)', flexShrink: 0 }}>←</button>
        <div style={{ flex: 1, marginLeft: '.5rem', minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {projectName}
          </div>
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
                {overdueTasks} en retard
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ── ISO PHASE ───────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '.75rem 1rem' }}>
        <ISOPhase projectId={projectId} description={project?.description} />
      </div>

      {/* ── QUICK ACTIONS ───────────────────────── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '.5rem 1rem', display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
        <button onClick={() => { closeAllPanels(); setShowNewTask(t => !t) }} className="btn btn-primary btn-sm">+ Tâche</button>
        <button onClick={() => { closeAllPanels(); setShowMilestone(m => !m) }}
          style={{ background: '#f3e8ff', border: '1px solid #c4b5fd', color: '#7c3aed',
            borderRadius: 6, padding: '5px 10px', fontSize: '.78rem', cursor: 'pointer', fontWeight: 600 }}>
          ◆ Jalon
        </button>
        <button onClick={() => { closeAllPanels(); setShowBlocker(b => !b) }}
          style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            borderRadius: 6, padding: '5px 10px', fontSize: '.78rem', cursor: 'pointer', fontWeight: 600 }}>
          🚨 Blocage
        </button>
        <button onClick={() => { closeAllPanels(); setShowDocLink(d => !d) }}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '5px 10px', fontSize: '.78rem', cursor: 'pointer' }}>
          📎 Doc
        </button>
      </div>

      {/* ── PANELS ──────────────────────────────── */}
      {showNewTask && (
        <Panel color="#f0f4ff" border="#c7d2fe">
          <PanelTitle color="var(--primary)">Nouvelle tâche WBS — {projectName}</PanelTitle>
          <input type="text" value={newTaskName} onChange={e => setNewTaskName(e.target.value)}
            placeholder="Nom du livrable / activité…"
            style={{ width: '100%', padding: '.5rem', border: '1px solid #c7d2fe', borderRadius: 6,
              fontSize: '.9rem', marginBottom: '.4rem' }} />
          <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.4rem', alignItems: 'center' }}>
            <button onClick={() => setNewTaskPrio(p => p === '0' ? '1' : '0')}
              style={{ background: newTaskPrio === '1' ? '#fef3c7' : 'var(--bg)',
                border: `1px solid ${newTaskPrio === '1' ? '#f59e0b' : 'var(--border)'}`,
                borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '.8rem', whiteSpace: 'nowrap' }}>
              {newTaskPrio === '1' ? '⭐ Haute' : '○ Normale'}
            </button>
            <input type="date" value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)}
              style={{ flex: 1, padding: '.3rem .5rem', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '.8rem' }} />
          </div>
          <PanelButtons
            onSave={() => createTask.mutate({ name: newTaskName, project_id: projectId,
              priority: newTaskPrio, date_deadline: newTaskDeadline || undefined, user_ids: [getUserId()] })}
            onCancel={() => setShowNewTask(false)}
            disabled={!newTaskName || createTask.isPending}
            loading={createTask.isPending} label="Créer" />
        </Panel>
      )}

      {showMilestone && (
        <Panel color="#faf5ff" border="#c4b5fd">
          <PanelTitle color="#7c3aed">◆ Nouveau jalon ISO 21500</PanelTitle>
          <input type="text" value={milestoneText} onChange={e => setMilestoneText(e.target.value)}
            placeholder="Nom du jalon (ex: Livraison V1, Recette client…)"
            style={{ width: '100%', padding: '.5rem', border: '1px solid #c4b5fd', borderRadius: 6,
              fontSize: '.9rem', marginBottom: '.35rem' }} />
          <input type="date" value={milestoneDate} onChange={e => setMilestoneDate(e.target.value)}
            style={{ width: '100%', padding: '.4rem .5rem', border: '1px solid #c4b5fd', borderRadius: 6,
              fontSize: '.85rem', marginBottom: '.4rem' }} />
          <PanelButtons
            onSave={() => createTask.mutate({ name: `[MILESTONE] ${milestoneText}`, project_id: projectId,
              priority: '1', date_deadline: milestoneDate || undefined, user_ids: [getUserId()] })}
            onCancel={() => setShowMilestone(false)}
            disabled={!milestoneText || createTask.isPending}
            loading={createTask.isPending}
            label="Créer le jalon"
            saveStyle={{ background: '#7c3aed' }} />
        </Panel>
      )}

      {showBlocker && (
        <Panel color="#fef2f2" border="#fecaca">
          <PanelTitle color="#dc2626">🚨 Signaler un blocage projet</PanelTitle>
          <input type="text" value={blockerText} onChange={e => setBlockerText(e.target.value)}
            placeholder="Cause du blocage, décalage calendrier, dépendance bloquante…"
            style={{ width: '100%', padding: '.5rem', border: '1px solid #fecaca', borderRadius: 6,
              fontSize: '.9rem', marginBottom: '.4rem' }}
            onKeyDown={e => e.key === 'Enter' && handleBlocker()} />
          <PanelButtons onSave={handleBlocker} onCancel={() => setShowBlocker(false)}
            disabled={!blockerText} label="Enregistrer" saveStyle={{ background: 'var(--danger)' }} />
        </Panel>
      )}

      {showDocLink && (
        <Panel color="#f0fdf4" border="#bbf7d0">
          <PanelTitle color="#16a34a">📎 Lien livrable / document</PanelTitle>
          <input type="text" value={docTitle} onChange={e => setDocTitle(e.target.value)}
            placeholder="Titre (facultatif)"
            style={{ width: '100%', padding: '.4rem .5rem', border: '1px solid #bbf7d0', borderRadius: 6,
              fontSize: '.85rem', marginBottom: '.35rem' }} />
          <input type="url" value={docLink} onChange={e => setDocLink(e.target.value)}
            placeholder="https://…"
            style={{ width: '100%', padding: '.5rem', border: '1px solid #bbf7d0', borderRadius: 6,
              fontSize: '.9rem', marginBottom: '.4rem' }}
            onKeyDown={e => e.key === 'Enter' && handleDocLink()} />
          <PanelButtons onSave={handleDocLink} onCancel={() => setShowDocLink(false)}
            disabled={!docLink} label="Enregistrer" saveStyle={{ background: '#16a34a' }} />
        </Panel>
      )}

      {/* ── TAB BAR ─────────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flexShrink: 0, padding: '.55rem .7rem', border: 'none', cursor: 'pointer',
              fontSize: '.72rem', fontWeight: tab === t.key ? 800 : 500,
              color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)',
              background: 'transparent',
              borderBottom: tab === t.key ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
            }}>
            <span style={{ fontSize: '.9rem' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ─────────────────────────────── */}
      <main className="page">

        {tab === 'wbs' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="section-title">
              <span>WBS — Structure de Découpage du Travail</span>
              <span style={{ color: completionPct === 100 ? '#16a34a' : 'var(--primary)', fontWeight: 800 }}>{completionPct}%</span>
            </div>
            {rootTasks.length > 0 && (
              <div style={{ marginBottom: '.75rem' }}>
                <div className="progress-bar" style={{ height: 6 }}>
                  <div className="progress-bar-fill" style={{ width: `${completionPct}%`,
                    background: completionPct === 100 ? '#22c55e' : undefined }} />
                </div>
                <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                  {doneTasks}/{rootTasks.length} tâche{rootTasks.length > 1 ? 's' : ''} terminée{rootTasks.length > 1 ? 's' : ''}
                </div>
              </div>
            )}
            <div className="card">
              <TaskTree projectId={projectId} projectName={projectName} />
            </div>
          </>
        )}

        {tab === 'risks' && (
          <>
            <div className="section-title">Registre des Risques & Problèmes</div>
            <div className="card">
              <RiskRegister projectId={projectId} />
            </div>
          </>
        )}

        {tab === 'charter' && (
          <>
            <div className="section-title">Charte de Projet (ISO 21500 §4.3.2)</div>
            <div className="card">
              <ProjectCharter projectId={projectId} projectName={projectName} />
            </div>
          </>
        )}

        {tab === 'stakeholders' && (
          <>
            <div className="section-title">Parties Prenantes</div>
            <div className="card">
              <ISORegistry projectId={projectId} {...STAKEHOLDER_CONFIG} />
            </div>
          </>
        )}

        {tab === 'changes' && (
          <>
            <div className="section-title">Journal des Modifications</div>
            <div className="card">
              <ISORegistry projectId={projectId} {...CHANGE_CONFIG} />
            </div>
          </>
        )}

        {tab === 'deliverables' && (
          <>
            <div className="section-title">Registre des Livrables</div>
            <div className="card">
              <ISORegistry projectId={projectId} {...DELIVERABLE_CONFIG} />
            </div>
          </>
        )}

        {tab === 'lessons' && (
          <>
            <div className="section-title">Leçons Apprises</div>
            <div className="card">
              <ISORegistry projectId={projectId} {...LESSON_CONFIG} />
            </div>
          </>
        )}

        {tab === 'comms' && (
          <>
            <div className="section-title">Plan de Communication</div>
            <div className="card">
              <ISORegistry projectId={projectId} {...COMMS_CONFIG} />
            </div>
          </>
        )}

        {tab === 'procurement' && (
          <>
            <div className="section-title">Registre des Achats</div>
            <div className="card">
              <ISORegistry projectId={projectId} {...PROCUREMENT_CONFIG} />
            </div>
          </>
        )}

        {tab === 'docs' && (
          <>
            <div className="section-title">Livrables & Documents (ISO 21500 §4.3.11)</div>
            <div className="card">
              {[...((project?.description || '').matchAll(/<p>📎 <strong>Doc:<\/strong> <a href="([^"]+)">([^<]+)<\/a><\/p>/g))].length === 0
                ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem', fontSize: '.85rem' }}>
                    Aucun document lié. Cliquez sur "📎 Doc" pour ajouter.
                  </div>
                : [...((project?.description || '').matchAll(/<p>📎 <strong>Doc:<\/strong> <a href="([^"]+)">([^<]+)<\/a><\/p>/g))]
                    .map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.5rem',
                        padding: '.6rem 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '1.1rem' }}>📎</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
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
          </>
        )}

        {tab === 'info' && (
          <>
            <div className="section-title">Informations Projet (ISO 21500 §4.3.2)</div>
            <div className="card" style={{ marginBottom: '.75rem' }}>
              <table style={{ width: '100%', fontSize: '.85rem', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Nom', projectName],
                    ['ID Odoo', projectId],
                    ['Deadline', project?.date || '—'],
                    ['Chef de projet', project?.user_id ? (Array.isArray(project.user_id) ? project.user_id[1] : project.user_id) : '—'],
                    ['Tâches WBS (racines)', rootTasks.length],
                    ['Tâches en retard', overdueTasks],
                    ['% Complétion', `${completionPct}%`],
                  ].map(([k, v]) => (
                    <tr key={k} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '7px 0', color: 'var(--text-muted)', fontWeight: 600, width: '45%' }}>{k}</td>
                      <td style={{ padding: '7px 0', fontWeight: 500 }}>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {project?.description && (
              <div className="card">
                <div className="card-title">Notes / Description</div>
                <div style={{ fontSize: '.85rem', lineHeight: 1.65 }}
                  dangerouslySetInnerHTML={{ __html: (project.description || '')
                    .replace(/<!-- ISO21500[^>]*-->/g, '')
                    .replace(/<!-- [^>]* -->/g, '') }} />
              </div>
            )}
          </>
        )}

      </main>
    </div>
  )
}

/* ─── Small helpers ─────────────────────────────────────── */
function Panel({ children, color, border }) {
  return (
    <div style={{ background: color, borderBottom: `1px solid ${border}`, padding: '1rem' }}>
      {children}
    </div>
  )
}

function PanelTitle({ children, color }) {
  return (
    <div style={{ fontWeight: 700, color, marginBottom: '.5rem', fontSize: '.85rem' }}>{children}</div>
  )
}

function PanelButtons({ onSave, onCancel, disabled, loading, label, saveStyle = {} }) {
  return (
    <div style={{ display: 'flex', gap: '.4rem' }}>
      <button className="btn btn-primary" style={{ flex: 1, padding: '6px', ...saveStyle }}
        disabled={disabled || loading} onClick={onSave}>
        {loading ? '…' : label}
      </button>
      <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={onCancel}>
        Annuler
      </button>
    </div>
  )
}
