import { useQuery } from '@tanstack/react-query'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import EmployeeToggle from '../components/EmployeeToggle'
import EntryCard from '../components/EntryCard'

export default function History() {
  const { active } = useTeam()
  const queryKey = ['timesheets-week', active.id]

  const { data: entries = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => api.getWeek(active.id, 14),
    enabled: active.id > 0,
  })

  // Group by date
  const grouped = entries.reduce((acc, e) => {
    const d = e.date
    if (!acc[d]) acc[d] = []
    acc[d].push(e)
    return acc
  }, {})

  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="nav-bar">
        <div style={{ fontWeight: 700 }}>Historique</div>
        <EmployeeToggle />
      </header>

      <main className="page">
        {isLoading && <div className="loading">Chargement…</div>}

        {!isLoading && days.length === 0 && (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>Aucune entrée ces 14 derniers jours</p>
          </div>
        )}

        {days.map(day => {
          const dayEntries = grouped[day]
          const total = dayEntries.reduce((s, e) => s + e.unit_amount, 0)
          const label = format(parseISO(day), 'EEEE d MMMM', { locale: fr })
          return (
            <div key={day} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="section-title">
                <span style={{ textTransform: 'capitalize' }}>{label}</span>
                <span style={{ color: 'var(--primary)' }}>{total.toFixed(1)}h</span>
              </div>
              <div className="card">
                {dayEntries.map(e => (
                  <EntryCard key={e.id} entry={e} queryKey={queryKey} />
                ))}
              </div>
            </div>
          )
        })}
      </main>
    </div>
  )
}
