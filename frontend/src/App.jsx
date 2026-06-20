import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import QuickEntry from './pages/QuickEntry'
import History from './pages/History'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import Focus from './pages/Focus'
import FloatingTimer from './components/FloatingTimer'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<QuickEntry />} />
        <Route path="/history" element={<History />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/focus" element={<Focus />} />
      </Routes>

      <FloatingTimer />

      <nav className="bottom-nav">
        <NavLink to="/" end>
          <span>🏠</span>
          <span>Aujourd'hui</span>
        </NavLink>
        <NavLink to="/focus">
          <span>🎯</span>
          <span>Focus</span>
        </NavLink>
        <NavLink to="/projects">
          <span>📁</span>
          <span>Projets</span>
        </NavLink>
        <NavLink to="/history">
          <span>📅</span>
          <span>Historique</span>
        </NavLink>
      </nav>
    </>
  )
}
