import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Folder, Star, Check } from 'lucide-react'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import { parsePhase, ISO_PHASES } from './ISOPhase'

export default function SearchModal({ open, onClose }) {
  const { active } = useTeam()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  const userId = active.id === parseInt(import.meta.env.VITE_EMPLOYEE_A_ID || '0')
    ? parseInt(import.meta.env.VITE_EMPLOYEE_A_USER_ID || '0')
    : parseInt(import.meta.env.VITE_EMPLOYEE_B_USER_ID || '0')

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-detail'],
    queryFn: api.getProjectsDetail,
    staleTime: 120_000,
  })
  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks', userId],
    queryFn: () => api.getMyTasks(userId),
    enabled: open && userId > 0,
    staleTime: 120_000,
  })

  useEffect(() => {
    if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [open])

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); onClose() }
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!open) return null

  const lower = q.toLowerCase().trim()

  const filteredProjects = lower.length < 1 ? projects.slice(0, 5) :
    projects.filter(p => p.name.toLowerCase().includes(lower)).slice(0, 6)

  const filteredTasks = lower.length < 2 ? [] :
    tasks.filter(t => t.name.toLowerCase().includes(lower)).slice(0, 5)

  function goProject(id) { navigate(`/projects/${id}`); onClose() }
  function goTask(task) {
    const projectId = Array.isArray(task.project_id) ? task.project_id[0] : null
    if (projectId) navigate(`/projects/${projectId}`)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', paddingTop: '10vh' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,.25)', overflow: 'hidden', margin: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '.75rem 1rem',
          borderBottom: '1px solid var(--border)', gap: '.6rem' }}>
          <Search size={18} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Rechercher un projet, une tâche…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem',
              background: 'transparent', color: 'var(--text)' }} />
          <span style={{ fontSize: '.72rem', color: 'var(--text-muted)',
            background: 'var(--bg)', borderRadius: 4, padding: '2px 5px' }}>Esc</span>
        </div>

        <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          {filteredProjects.length > 0 && (
            <Section label="Projets">
              {filteredProjects.map(p => {
                const phase = ISO_PHASES.find(ph => ph.id === (parsePhase(p.description) || 'Planning'))
                return (
                  <ResultRow key={`p-${p.id}`} onClick={() => goProject(p.id)}
                    icon={phase?.icon || Folder}
                    title={p.name}
                    sub={phase ? `${phase.label}${p.date ? ` · ${p.date}` : ''}` : undefined} />
                )
              })}
            </Section>
          )}
          {filteredTasks.length > 0 && (
            <Section label="Mes tâches">
              {filteredTasks.map(t => (
                <ResultRow key={`t-${t.id}`} onClick={() => goTask(t)}
                  icon={t.priority === '1' ? Star : Check}
                  title={t.name}
                  sub={Array.isArray(t.project_id) ? t.project_id[1] : 'Sans projet'} />
              ))}
            </Section>
          )}
          {lower.length >= 1 && filteredProjects.length === 0 && filteredTasks.length === 0 && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.88rem' }}>
              Aucun résultat pour « {q} »
            </div>
          )}
          {lower.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.8rem' }}>
              Tapez pour rechercher dans les projets et tâches
            </div>
          )}
        </div>

        <div style={{ padding: '.5rem 1rem', borderTop: '1px solid var(--border)',
          display: 'flex', gap: '1rem', fontSize: '.7rem', color: 'var(--text-muted)' }}>
          <span>↵ Ouvrir</span>
          <span>Esc Fermer</span>
          <span>Ctrl+K Ouvrir/Fermer</span>
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }) {
  return (
    <div style={{ padding: '.4rem 0' }}>
      <div style={{ padding: '.3rem 1rem', fontSize: '.65rem', fontWeight: 700,
        color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function ResultRow({ onClick, icon: Icon, title, sub }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '.75rem',
        padding: '.55rem 1rem', background: hovered ? 'var(--bg)' : 'transparent',
        border: 'none', cursor: 'pointer', textAlign: 'left' }}>
      {Icon && <Icon size={16} style={{ flexShrink: 0 }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '.88rem', fontWeight: 500, color: 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: '.72rem', color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {sub}
        </div>}
      </div>
      <span style={{ fontSize: '.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>→</span>
    </button>
  )
}
