import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import EmployeeToggle from '../components/EmployeeToggle'
import EntryCard from '../components/EntryCard'

export default function Dashboard() {
  const { active } = useTeam()
  const today = format(new Date(), 'EEEE d MMMM', { locale: fr })
  const queryKey = ['timesheets-today', active.id]

  const { data: entries = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => api.getToday(active.id),
    enabled: active.id > 0,
  })

  const total = entries.reduce((s, e) => s + e.unit_amount, 0)
  const pct = Math.min((total / 8) * 100, 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="nav-bar">
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>{today}</div>
          <div style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>Tableau de bord</div>
        </div>
        <EmployeeToggle />
      </header>

      <main className="page">
        <div className="summary-box">
          <div className="summary-hours">{total.toFixed(1)}h</div>
          <div className="summary-label">enregistrées aujourd'hui · {active.name}</div>
          <div className="progress-bar" style={{ marginTop: '.75rem' }}>
            <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: '.75rem', marginTop: '.3rem', opacity: .75 }}>
            {pct.toFixed(0)}% de la journée (8h)
          </div>
        </div>

        <div className="section-title">Entrées du jour</div>

        {isLoading && <div className="loading">Chargement…</div>}

        {!isLoading && entries.length === 0 && (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>Aucune entrée aujourd'hui</p>
            <p style={{ fontSize: '.8rem', marginTop: '.25rem' }}>Appuyez sur + pour commencer</p>
          </div>
        )}

        {!isLoading && entries.length > 0 && (
          <div className="card">
            {entries.map(e => (
              <EntryCard key={e.id} entry={e} queryKey={queryKey} />
            ))}
          </div>
        )}
      </main>

      <Link to="/new" className="fab" aria-label="Nouvelle entrée">+</Link>
    </div>
  )
}
