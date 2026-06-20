import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import QuickEntry from './pages/QuickEntry'
import History from './pages/History'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Focus from './pages/Focus'
import FloatingTimer from './components/FloatingTimer'
import { useTeam } from './context/TeamContext'

const NAV = [
  { to: '/',        icon: '🏠', label: "Aujourd'hui", end: true },
  { to: '/focus',   icon: '🎯', label: 'Focus' },
  { to: '/projects',icon: '📁', label: 'Projets' },
  { to: '/history', icon: '📅', label: 'Historique' },
]

export default function App() {
  const { active, members, setActive } = useTeam()

  return (
    <div className="app-shell">

      {/* ── SIDEBAR (desktop only) ──────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/LOGO_ATD.png" alt="ATD" style={{ height: 38, objectFit: 'contain', maxWidth: '100%' }} />
        </div>

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
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '.45rem .65rem',
                borderRadius: 6,
                fontSize: '.82rem',
                fontWeight: active.id === m.id ? 700 : 400,
                color: active.id === m.id ? 'var(--primary)' : 'var(--text-muted)',
                background: active.id === m.id ? 'var(--primary-light)' : 'transparent',
                marginBottom: 2,
                cursor: 'pointer',
                border: 'none',
              }}
            >
              {active.id === m.id ? '● ' : '○ '}
              {m.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────── */}
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={<QuickEntry />} />
          <Route path="/history" element={<History />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/focus" element={<Focus />} />
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
    </div>
  )
}
