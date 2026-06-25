import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO, isPast } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'
import Select from 'react-select'
import { FolderOpen, Archive, ClipboardList, Plus, Folder, Calendar, AlertTriangle, User, Building2 } from 'lucide-react'
import { parsePhase, ISO_PHASES } from '../components/ISOPhase'
import { useTeam } from '../context/TeamContext'

export default function Projects() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { active } = useTeam()
  const userId = active.id === parseInt(import.meta.env.VITE_EMPLOYEE_A_ID || '0')
    ? parseInt(import.meta.env.VITE_EMPLOYEE_A_USER_ID || '0')
    : parseInt(import.meta.env.VITE_EMPLOYEE_B_USER_ID || '0')
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
  const [ownerFilter, setOwnerFilter] = useState(false)
  const [companyFilter, setCompanyFilter] = useState(null)  // null = toutes les sociétés

  const activeProjects = projects.filter(p => {
    const phase = parsePhase(p.description)
    return phase !== 'Closing'
  })
  const archivedProjects = projects.filter(p => parsePhase(p.description) === 'Closing')
  const pool = (showArchived ? archivedProjects : activeProjects)
    .filter(p => !ownerFilter || (Array.isArray(p.user_id) && p.user_id[0] === userId))

  const companyOf = (p) => (Array.isArray(p.company_id) ? p.company_id[1] : 'Sans société')

  const searched = pool.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  // Liste des sociétés présentes (pour les boutons-filtres), triées par nombre de projets
  const companies = (() => {
    const m = {}
    searched.forEach(p => { const co = companyOf(p); m[co] = (m[co] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1])
  })()

  // Application du filtre société
  const filtered = companyFilter
    ? searched.filter(p => companyOf(p) === companyFilter)
    : searched

  // Regroupement par société autorisée (ATD, Togo AI Lab, Togo Data Lab…)
  const groupedByCompany = (() => {
    const m = {}
    filtered.forEach(p => {
      const co = companyOf(p)
      ;(m[co] = m[co] || []).push(p)
    })
    return Object.entries(m).sort((a, b) => b[1].length - a[1].length)
  })()

  const projectOptions = projects.map(p => ({ value: p.id, label: p.name }))

  // Rendu d'une carte projet (réutilisé dans chaque groupe société)
  const renderProject = (p) => {
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
                  <Calendar size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {format(parseISO(p.date), 'd MMM yy', { locale: fr })}
                  {overdue ? <> <AlertTriangle size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /></> : ''}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', marginTop: '.35rem', flexWrap: 'wrap' }}>
            {phase && (
              <span style={{ fontSize: '.65rem', padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                background: `${phase.color}18`, color: phase.color, border: `1px solid ${phase.color}44` }}>
                <phase.icon size={12} style={{ verticalAlign: '-2px' }} /> {phase.label}
              </span>
            )}
            {p.user_id && (
              <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
                <User size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {Array.isArray(p.user_id) ? p.user_id[1] : p.user_id}
              </span>
            )}
            {overdue && (
              <span className="badge badge-danger" style={{ fontSize: '.63rem' }}>En retard</span>
            )}
          </div>
        </div>
      </Link>
    )
  }

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
          <button onClick={() => setOwnerFilter(v => !v)}
            className={`btn ${ownerFilter ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px', fontSize: '.8rem' }}>
            <User size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Mes projets
          </button>
          <button onClick={() => setShowArchived(v => !v)}
            className={`btn ${showArchived ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '6px 10px', fontSize: '.8rem' }}>
            {showArchived
              ? <><FolderOpen size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Actifs</>
              : <><Archive size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Archivés</>}
          </button>
          {!showArchived && (
            <>
              <button onClick={() => { setShowClone(true); setShowNew(false) }}
                className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '.8rem' }}>
                <ClipboardList size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Cloner
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
            {showClone
              ? <><ClipboardList size={16} style={{ verticalAlign: '-3px', flexShrink: 0 }} /> Nouveau projet depuis template</>
              : <><Plus size={16} style={{ verticalAlign: '-3px', flexShrink: 0 }} /> Nouveau projet</>}
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
          placeholder="Rechercher un projet…"
          style={{ width: '100%', padding: '.6rem .75rem', border: '1.5px solid var(--border)',
            borderRadius: 8, fontSize: '.9rem' }} />
      </div>

      {/* Filtres par société autorisée */}
      <div style={{ display: 'flex', gap: '.4rem', padding: '.65rem 1rem .25rem',
        overflowX: 'auto', scrollbarWidth: 'none' }}>
        <button onClick={() => setCompanyFilter(null)}
          className={`chip${companyFilter === null ? ' selected' : ''}`}
          style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Building2 size={12} style={{ verticalAlign: '-2px' }} /> Toutes ({searched.length})
        </button>
        {companies.map(([co, n]) => (
          <button key={co} onClick={() => setCompanyFilter(co)}
            className={`chip${companyFilter === co ? ' selected' : ''}`}
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {co} ({n})
          </button>
        ))}
      </div>

      <main className="page" style={{ paddingTop: '.75rem' }}>
        {isLoading && <div className="loading">Chargement…</div>}
        {!isLoading && filtered.length === 0 && (
          <div className="empty-state"><div className="icon"><Folder size={28} /></div><p>Aucun projet trouvé</p></div>
        )}
        {groupedByCompany.map(([company, list]) => (
          <div key={company} style={{ marginBottom: '1rem' }}>
            <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}>
              <Building2 size={13} style={{ flexShrink: 0 }} /> {company} ({list.length})
            </div>
            {list.map(renderProject)}
          </div>
        ))}
      </main>
    </div>
  )
}
