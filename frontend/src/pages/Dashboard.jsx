import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import EmployeeToggle from '../components/EmployeeToggle'
import EntryCard from '../components/EntryCard'
import { DayBarChart, ProjectPieChart, WeeklyStats, buildWeekStats } from '../components/WeeklyReport'

const DAILY_GOAL = 8

export default function Dashboard() {
  const { active, members } = useTeam()
  const compare = members?.find(m => m.id !== active.id)

  const today = format(new Date(), 'EEEE d MMMM', { locale: fr })
  const qkToday = ['timesheets-today', active.id]
  const qkWeek  = ['timesheets-week', active.id]
  const qkCmp   = ['timesheets-week', compare?.id]

  const { data: todayEntries = [], isLoading: loadingToday } = useQuery({
    queryKey: qkToday,
    queryFn: () => api.getToday(active.id),
    enabled: active.id > 0,
  })

  const { data: weekEntries = [] } = useQuery({
    queryKey: qkWeek,
    queryFn: () => api.getWeek(active.id, 7),
    enabled: active.id > 0,
  })

  const { data: compareEntries = [] } = useQuery({
    queryKey: qkCmp,
    queryFn: () => api.getWeek(compare.id, 7),
    enabled: !!compare?.id,
  })

  const { total: weekTotal, todayH, avgPerDay, overtimeH, weekOvertimeH } = buildWeekStats(weekEntries)

  const dailyPct    = Math.min((todayH / DAILY_GOAL) * 100, 100)
  const overtimePct = overtimeH > 0 ? Math.min((overtimeH / DAILY_GOAL) * 100, 40) : 0
  const isOverToday = todayH > DAILY_GOAL

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="nav-bar">
        <div>
          <div style={{ fontWeight: 700, fontSize: '.95rem', textTransform: 'capitalize' }}>{today}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Tableau de bord</div>
        </div>
        <EmployeeToggle />
      </header>

      <main className="page">

        {/* ── KPI ROW ───────────────────────────────── */}
        <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '.75rem', marginBottom: '1rem' }}>
          <StatCard
            value={`${todayH.toFixed(1)}h`}
            label="Aujourd'hui"
            sub={isOverToday ? `🔥 +${overtimeH.toFixed(1)}h overtime` : `/ ${DAILY_GOAL}h`}
            accent={isOverToday}
          />
          <StatCard
            value={`${weekTotal.toFixed(1)}h`}
            label="Cette semaine"
            sub={weekOvertimeH > 0 ? `🔥 +${weekOvertimeH.toFixed(1)}h` : `/ 40h`}
          />
          <StatCard
            value={`${avgPerDay.toFixed(1)}h`}
            label="Moy. / jour"
            sub="jours travaillés"
          />
          <StatCard
            value={`${Math.round((todayH / DAILY_GOAL) * 100)}%`}
            label="Objectif jour"
            sub={isOverToday ? 'Dépassé !' : `${(DAILY_GOAL - todayH).toFixed(1)}h restantes`}
            highlight={isOverToday}
          />
        </div>

        {/* ── DAILY PROGRESS ───────────────────────── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title" style={{ marginBottom: '.5rem' }}>
            Progression du jour
            {isOverToday && (
              <span className="badge badge-overtime" style={{ marginLeft: '.5rem' }}>
                🔥 {Math.round((todayH / DAILY_GOAL) * 100)}%
              </span>
            )}
          </div>
          <div className="progress-bar" style={{ height: 10, position: 'relative' }}>
            <div
              className="progress-bar-fill"
              style={{
                width: `${dailyPct}%`,
                background: isOverToday
                  ? 'linear-gradient(90deg, var(--primary) 70%, var(--overtime) 100%)'
                  : undefined,
              }}
            />
            {isOverToday && (
              <div
                className="progress-bar-overtime"
                style={{ width: `${overtimePct}%`, maxWidth: '25%' }}
              />
            )}
          </div>
          <div className="progress-label">
            <span style={{ color: 'var(--text-muted)', fontSize: '.72rem' }}>0h</span>
            <span style={{ fontWeight: 700, fontSize: '.78rem' }}>
              {todayH.toFixed(2)}h / {DAILY_GOAL}h
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '.72rem' }}>{DAILY_GOAL}h+</span>
          </div>
        </div>

        {/* ── WEEKLY CHART ─────────────────────────── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title">Répartition hebdomadaire</div>
          <WeeklyStats
            entries={weekEntries}
            compareEntries={compareEntries}
            memberName={active.name}
            compareName={compare?.name}
          />
          <div style={{ marginTop: '1.25rem' }}>
            <DayBarChart entries={weekEntries} />
          </div>
          <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.4rem', textAlign: 'center' }}>
            — ligne pointillée = objectif 8h · orange = heures supp.
          </div>
        </div>

        {/* ── PROJECT BREAKDOWN ────────────────────── */}
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-title">Répartition par projet (7 jours)</div>
          <ProjectPieChart entries={weekEntries} />
        </div>

        {/* ── TODAY'S ENTRIES ──────────────────────── */}
        <div className="section-title">Entrées du jour</div>

        {loadingToday && <div className="loading">Chargement…</div>}

        {!loadingToday && todayEntries.length === 0 && (
          <div className="empty-state">
            <div className="icon">📋</div>
            <p>Aucune entrée aujourd'hui</p>
            <p style={{ fontSize: '.8rem', marginTop: '.25rem' }}>Appuyez sur + pour commencer</p>
          </div>
        )}

        {!loadingToday && todayEntries.length > 0 && (
          <div className="card">
            {todayEntries.map(e => (
              <EntryCard key={e.id} entry={e} queryKey={qkToday} />
            ))}
          </div>
        )}

      </main>

      <Link to="/new" className="fab" aria-label="Nouvelle entrée">+</Link>
    </div>
  )
}

function StatCard({ value, label, sub, accent, highlight }) {
  return (
    <div className={`stat-card${accent ? ' accent' : ''}`} style={
      highlight && !accent ? { borderLeft: '3px solid var(--overtime)' } : undefined
    }>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}
