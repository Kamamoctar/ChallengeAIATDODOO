import { useState, useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Dashboard from './pages/Dashboard'
import QuickEntry from './pages/QuickEntry'
import History from './pages/History'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Focus from './pages/Focus'
import Kanban from './pages/Kanban'
import FloatingTimer from './components/FloatingTimer'
import SearchModal from './components/SearchModal'
import { useTeam } from './context/TeamContext'
import { api } from './api/odoo'
import { queueGet, queueRemove } from './utils/offlineQueue'

const NAV = [
  { to: '/',         icon: '🏠', label: "Aujourd'hui", end: true },
  { to: '/focus',    icon: '🎯', label: 'Focus' },
  { to: '/kanban',   icon: '📋', label: 'Kanban' },
  { to: '/projects', icon: '📁', label: 'Projets' },
  { to: '/history',  icon: '📅', label: 'Historique' },
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

  /* Offline sync on reconnect */
  useEffect(() => {
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
        toast.success(`✅ ${synced} entrée(s) synchronisée(s)`)
        qc.invalidateQueries({ queryKey: ['timesheets-today'] })
        qc.invalidateQueries({ queryKey: ['timesheets-2weeks'] })
      }
    }

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
        <div className="sidebar-logo">
          <img src="/LOGO_ATD.png" alt="ATD" style={{ height: 38, objectFit: 'contain', maxWidth: '100%' }} />
        </div>

        <button onClick={() => setSearchOpen(true)}
          style={{ margin: '.5rem .75rem', padding: '.45rem .75rem', borderRadius: 8,
            background: 'var(--bg)', border: '1.5px solid var(--border)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--text-muted)',
            fontSize: '.8rem', width: 'calc(100% - 1.5rem)' }}>
          <span>🔍</span>
          <span style={{ flex: 1 }}>Rechercher…</span>
          <span style={{ fontSize: '.65rem', background: 'var(--border)', borderRadius: 3,
            padding: '1px 4px', whiteSpace: 'nowrap' }}>Ctrl+K</span>
        </button>

        <nav className="sidebar-nav">
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <span className="nav-icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
          <NavLink to="/new">
            <span className="nav-icon">➕</span>
            Nouvelle entrée
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
              fontSize: '.72rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <span>📶</span>
              <span>{pendingSync} entrée(s) en attente de sync</span>
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
          <Route path="/kanban" element={<Kanban />} />
        </Routes>

        <FloatingTimer />
      </div>

      {/* ── BOTTOM NAV (mobile only) ─────────────────── */}
      <nav className="bottom-nav">
        {NAV.map(n => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── SEARCH MODAL ───────────────────────────────── */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
