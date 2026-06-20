import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'
import Select from 'react-select'
import { parsePhase, ISO_PHASES } from '../components/ISOPhase'

export default function Projects() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showClone, setShowClone] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDate, setNewDate] = useState('')
  const [templateId, setTemplateId] = useState(null)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects-detail'],
    queryFn: api.getProjectsDetail,
    staleTime: 120_000,
  })

  const createProject = useMutation({
    mutationFn: (data) => api.createProject(data),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['projects-detail'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Projet créé !')
      setShowNew(false); setNewName(''); setNewDate('')
      navigate(`/projects/${d.id}`)
    },
    onError: (e) => toast.error(e.message),
  })

  const cloneProject = useMutation({
    mutationFn: ({ templateId, data }) => api.cloneProject(templateId, data),
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['projects-detail'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success(`Projet créé avec ${d.tasks_copied} tâche(s) copiée(s) !`)
      setShowClone(false); setNewName(''); setTemplateId(null)
      navigate(`/projects/${d.id}`)
    },
    onError: (e) => toast.error(e.message),
  })

  const [showArchived, setShowArchived] = useState(false)

  const activeProjects = projects.filter(p => {
    const phase = parsePhase(p.description)
    return phase !== 'Closing'
  })
  const archivedProjects = projects.filter(p => parsePhase(p.description) === 'Closing')
  const pool = showArchived ? archivedProjects : activeProjects

  const filtered = pool.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const projectOptions = projects.map(p => ({ value: p.id, label: p.name }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="nav-bar">
        <div>
          <div style={{ fontWeight: 700 }}>Projets</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
            {showArchived ? `${archivedProjects.length} clôturés` : `${activeProjects.length} actifs`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <button onClick={() => setShowArchived(v => !v)}
            className={`btn ${showArchived ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px', fontSize: '.8rem' }}>
            {showArchived ? '📂 Actifs' : '🗄 Archivés'}
          </button>
          {!showArchived && (
            <>
              <button onClick={() => { setShowClone(true); setShowNew(false) }}
                className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '.8rem' }}>
                📋 Cloner
              </button>
              <button onClick={() => { setShowNew(true); setShowClone(false) }}
                className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '.8rem' }}>
                + Nouveau
              </button>
            </>
          )}
        </div>
      </header>

      {(showNew || showClone) && (
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '.75rem' }}>
            {showClone ? '📋 Nouveau projet depuis template' : '➕ Nouveau projet'}
          </div>
          {showClone && (
            <div className="form-group">
              <label>Projet template</label>
              <Select options={projectOptions} value={templateId}
                onChange={setTemplateId} placeholder="Choisir un projet existant…"
                styles={{ control: (b) => ({ ...b, borderColor: 'var(--border)', borderRadius: 8 }) }} />
            </div>
          )}
          <div className="form-group">
            <label>Nom du projet *</label>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Nom du nouveau projet" />
          </div>
          <div className="form-group">
            <label>Date limite</label>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button className="btn btn-primary" style={{ flex: 1 }}
              disabled={!newName || (showClone && !templateId) || createProject.isPending || cloneProject.isPending}
              onClick={() => {
                const data = { name: newName, date: newDate || undefined }
                if (showClone) cloneProject.mutate({ templateId: templateId.value, data })
                else createProject.mutate(data)
              }}>
              {createProject.isPending || cloneProject.isPending ? '…' : 'Créer'}
            </button>
            <button className="btn btn-ghost" onClick={() => { setShowNew(false); setShowClone(false) }}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: '1rem 1rem 0' }}>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un projet…"
          style={{ width: '100%', padding: '.6rem .75rem', border: '1.5px solid var(--border)',
            borderRadius: 8, fontSize: '.9rem' }} />
      </div>

      <main className="page" style={{ paddingTop: '.75rem' }}>
        {isLoading && <div className="loading">Chargement…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="empty-state"><div className="icon">📁</div><p>Aucun projet trouvé</p></div>
        )}
        {filtered.map(p => {
          const overdue = p.date && isPast(parseISO(p.date))
          const phaseId = parsePhase(p.description)
          const phase = ISO_PHASES.find(ph => ph.id === phaseId)
          const isClosed = phaseId === 'Closing'
          return (
            <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ marginBottom: '.6rem', cursor: 'pointer',
                borderLeft: overdue ? '3px solid var(--danger)' : isClosed ? '3px solid #8b5cf6' : '3px solid transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text)', flex: 1, marginRight: '.5rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.2rem', flexShrink: 0 }}>
                    {p.date && (
                      <span style={{ fontSize: '.7rem', color: overdue ? 'var(--danger)' : 'var(--text-muted)',
                        whiteSpace: 'nowrap', fontWeight: overdue ? 700 : 400 }}>
                        📅 {format(parseISO(p.date), 'd MMM yy', { locale: fr })}
                        {overdue ? ' ⚠️' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', marginTop: '.35rem', flexWrap: 'wrap' }}>
                  {phase && (
                    <span style={{ fontSize: '.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                      background: `${phase.color}18`, color: phase.color, border: `1px solid ${phase.color}44` }}>
                      {phase.icon} {phase.label}
                    </span>
                  )}
                  {p.user_id && (
                    <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
                      👤 {Array.isArray(p.user_id) ? p.user_id[1] : p.user_id}
                    </span>
                  )}
                  {overdue && (
                    <span className="badge badge-danger" style={{ fontSize: '.63rem' }}>En retard</span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </main>
    </div>
  )
}
