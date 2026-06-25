import { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Home, Target, CalendarDays, ClipboardList, Folder, Calendar, Search, Plus, Wifi, RefreshCw, Trash2 } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import QuickEntry from './pages/QuickEntry'
import History from './pages/History'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Focus from './pages/Focus'
import Week from './pages/Week'
import Kanban from './pages/Kanban'
import FloatingTimer from './components/FloatingTimer'
import OverdueReminder from './components/OverdueReminder'
import SearchModal from './components/SearchModal'
import ThemeSwitch from './components/ThemeSwitch'
import { useTeam } from './context/TeamContext'
import { api } from './api/odoo'
import { queueGet, queueRemove, queueClear } from './utils/offlineQueue'

const NAV = [
  { to: '/',         icon: Home,         label: "Aujourd'hui", end: true },
  { to: '/focus',    icon: Target,       label: 'Focus' },
  { to: '/week',     icon: CalendarDays, label: 'Semaine' },
  { to: '/kanban',   icon: ClipboardList, label: 'Kanban' },
  { to: '/projects', icon: Folder,       label: 'Projets' },
  { to: '/history',  icon: Calendar,     label: 'Historique' },
]

export default function App() {
  const { active, members, setActive } = useTeam()
  const qc = useQueryClient()
  const [searchOpen, setSearchOpen] = useState(false)
  const [pendingSync, setPendingSync] = useState(queueGet().length)

  /* Ctrl+K global shortcut */
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* Offline sync — accessible depuis les boutons et auto au reconnect */
  async function syncQueue() {
    const queue = queueGet()
    if (queue.length === 0) return
    toast.loading(`Synchronisation de ${queue.length} entrée(s)…`, { id: 'sync' })
    let synced = 0
    for (let i = queue.length - 1; i >= 0; i--) {
      try {
        const { _queued_at, ...entry } = queue[i]
        await api.createTimesheet(entry)
        queueRemove(i)
        synced++
      } catch { /* skip */ }
    }
    const remaining = queueGet().length
    setPendingSync(remaining)
    toast.dismiss('sync')
    if (synced > 0) {
      toast.success(`${synced} entrée(s) synchronisée(s)`)
      qc.invalidateQueries({ queryKey: ['timesheets-today'] })
      qc.invalidateQueries({ queryKey: ['timesheets-2weeks'] })
    } else if (remaining > 0) {
      toast.error('Synchronisation impossible — vérifiez votre connexion')
    }
  }

  function discardQueue() {
    queueClear()
    setPendingSync(0)
    toast('File d\'attente vidée')
  }

  useEffect(() => {
    function onOnline() { setPendingSync(queueGet().length); syncQueue() }
    function onStorageChange() { setPendingSync(queueGet().length) }

    window.addEventListener('online', onOnline)
    window.addEventListener('storage', onStorageChange)

    setPendingSync(queueGet().length)
    if (navigator.onLine) syncQueue()

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('storage', onStorageChange)
    }
  }, [qc])

  return (
    <div className="app-shell">

      {/* ── SIDEBAR (desktop only) ──────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.5rem' }}>
          <img src="/LOGO_ATD.png" alt="ATD" style={{ height: 38, objectFit: 'contain', flex: 1, minWidth: 0 }} />
          <ThemeSwitch iconOnly />
        </div>

        <button onClick={() => setSearchOpen(true)}
          style={{ margin: '.5rem .75rem', padding: '.45rem .75rem', borderRadius: 8,
            background: 'var(--bg)', border: '1.5px solid var(--border)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--text-muted)',
            fontSize: '.8rem', width: 'calc(100% - 1.5rem)' }}>
          <Search size={16} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Rechercher…</span>
          <span style={{ fontSize: '.65rem', background: 'var(--border)', borderRadius: 3,
            padding: '1px 4px', whiteSpace: 'nowrap' }}>Ctrl+K</span>
        </button>

        <nav className="sidebar-nav">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {({ isActive }) => (
                <>
                  <span className="nav-icon"><n.icon size={20} fill={isActive ? 'currentColor' : 'none'} /></span>
                  {n.label}
                </>
              )}
            </NavLink>
          ))}
          <NavLink to="/new">
            {({ isActive }) => (
              <>
                <span className="nav-icon"><Plus size={20} fill={isActive ? 'currentColor' : 'none'} /></span>
                Nouvelle entrée
              </>
            )}
          </NavLink>
        </nav>

        <div className="sidebar-team">
          <div className="sidebar-team-label">Membre actif</div>
          {members?.map(m => (
            <button key={m.id} onClick={() => setActive(m.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left',
                padding: '.45rem .65rem', borderRadius: 6, fontSize: '.82rem',
                fontWeight: active.id === m.id ? 700 : 400,
                color: active.id === m.id ? 'var(--primary)' : 'var(--text-muted)',
                background: active.id === m.id ? 'var(--primary-light)' : 'transparent',
                marginBottom: 2, cursor: 'pointer', border: 'none' }}>
              {active.id === m.id ? '● ' : '○ '}
              {m.name.split(' ')[0]}
            </button>
          ))}

          {pendingSync > 0 && (
            <div style={{ marginTop: '.75rem', padding: '.4rem .65rem', borderRadius: 6,
              background: 'var(--warning-light)', border: '1px solid var(--warning)',
              fontSize: '.72rem', color: '#b45309' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.35rem' }}>
                <Wifi size={14} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{pendingSync} entrée(s) en attente de sync</span>
              </div>
              <div style={{ display: 'flex', gap: '.35rem' }}>
                <button onClick={syncQueue}
                  style={{ flex: 1, padding: '3px 0', borderRadius: 5, border: '1px solid var(--warning)',
                    background: 'transparent', cursor: 'pointer', fontSize: '.7rem', fontWeight: 700,
                    color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.3rem' }}>
                  <RefreshCw size={12} style={{ flexShrink: 0 }} /> Réessayer
                </button>
                <button onClick={discardQueue}
                  style={{ flex: 1, padding: '3px 0', borderRadius: 5, border: '1px solid var(--warning)',
                    background: 'transparent', cursor: 'pointer', fontSize: '.7rem', fontWeight: 700,
                    color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.3rem' }}>
                  <Trash2 size={12} style={{ flexShrink: 0 }} /> Supprimer
                </button>
              </div>
            </div>
          )}

        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────────────── */}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<QuickEntry />} />
          <Route path="/history" element={<History />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/week" element={<Week />} />
          <Route path="/kanban" element={<Kanban />} />
        </Routes>

        <FloatingTimer />
      </div>

      {/* ── BOTTOM NAV (mobile only) ─────────────────── */}
      <nav className="bottom-nav">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            {({ isActive }) => (
              <>
                <span className="nav-icon"><n.icon size={20} fill={isActive ? 'currentColor' : 'none'} /></span>
                <span>{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── THEME BAR (mobile only, above bottom-nav) ─── */}
      <div className="theme-bar-mobile">
        <ThemeSwitch />
      </div>

      {/* ── SEARCH MODAL ───────────────────────────────── */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {/* ── RAPPEL DES TÂCHES EN RETARD ────────────────── */}
      <OverdueReminder />
    </div>
  )
}
