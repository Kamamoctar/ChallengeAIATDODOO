import { Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import QuickEntry from './pages/QuickEntry'
import History from './pages/History'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<QuickEntry />} />
        <Route path="/history" element={<History />} />
      </Routes>

      <nav className="bottom-nav">
        <NavLink to="/" end>
          <span>🏠</span>
          <span>Aujourd'hui</span>
        </NavLink>
        <NavLink to="/history">
          <span>📅</span>
          <span>Historique</span>
        </NavLink>
      </nav>
    </>
  )
}
