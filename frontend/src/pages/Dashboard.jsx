import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, parseISO, isPast, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import EmployeeToggle from '../components/EmployeeToggle'
import EntryCard from '../components/EntryCard'
import { DayBarChart, ProjectPieChart, WeeklyStats, buildWeekStats } from '../components/WeeklyReport'
import { parsePhase, ISO_PHASES } from '../components/ISOPhase'

const DAILY_GOAL = 8
const WEEKLY_GOAL = 40

export default function Dashboard() {
  const { active, members } = useTeam()
  const compare = members?.find(m => m.id !== active.id)
  const [tab, setTab] = useState('personal')

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

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-detail'],
    queryFn: api.getProjectsDetail,
    staleTime: 120_000,
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

      {/* ── TABS ─────────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', padding: '0 1.25rem', gap: '.25rem' }}>
        {[
          { id: 'personal',  label: '👤 Personnel' },
          { id: 'portfolio', label: '📊 Portefeuille' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '.65rem .85rem', fontSize: '.82rem', fontWeight: 700,
              color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none', border: 'none', borderRadius: 0, cursor: 'pointer',
              transition: 'all .15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'personal' && (
        <PersonalTab
          todayH={todayH} weekTotal={weekTotal} avgPerDay={avgPerDay}
          overtimeH={overtimeH} weekOvertimeH={weekOvertimeH}
          dailyPct={dailyPct} overtimePct={overtimePct} isOverToday={isOverToday}
          weekEntries={weekEntries} compareEntries={compareEntries}
          active={active} compare={compare}
          todayEntries={todayEntries} loadingToday={loadingToday}
          qkToday={qkToday}
        />
      )}

      {tab === 'portfolio' && (
        <PortfolioTab
          projects={projects}
          weekEntries={weekEntries}
          compareEntries={compareEntries}
          active={active}
          compare={compare}
        />
      )}

      <Link to="/new" className="fab" aria-label="Nouvelle entrée">+</Link>
    </div>
  )
}

/* ─── TAB PERSONNEL ─────────────────────────────────────────── */

function PersonalTab({
  todayH, weekTotal, avgPerDay, overtimeH, weekOvertimeH,
  dailyPct, overtimePct, isOverToday,
  weekEntries, compareEntries, active, compare,
  todayEntries, loadingToday, qkToday,
}) {
  return (
    <main className="page">
      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '.75rem', marginBottom: '1rem' }}>
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

      {/* DAILY PROGRESS */}
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
          <div className="progress-bar-fill" style={{
            width: `${dailyPct}%`,
            background: isOverToday ? 'linear-gradient(90deg, var(--primary) 70%, var(--overtime) 100%)' : undefined,
          }} />
          {isOverToday && (
            <div className="progress-bar-overtime" style={{ width: `${overtimePct}%`, maxWidth: '25%' }} />
          )}
        </div>
        <div className="progress-label">
          <span style={{ color: 'var(--text-muted)', fontSize: '.72rem' }}>0h</span>
          <span style={{ fontWeight: 700, fontSize: '.78rem' }}>{todayH.toFixed(2)}h / {DAILY_GOAL}h</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '.72rem' }}>{DAILY_GOAL}h+</span>
        </div>
      </div>

      {/* WEEKLY CHART */}
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

      {/* PROJECT BREAKDOWN */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">Répartition par projet (7 jours)</div>
        <ProjectPieChart entries={weekEntries} />
      </div>

      {/* TODAY'S ENTRIES */}
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
  )
}

/* ─── TAB PORTEFEUILLE ───────────────────────────────────────── */

function PortfolioTab({ projects, weekEntries, compareEntries, active, compare }) {
  const now = new Date()

  const activeProjects = projects.filter(p => parsePhase(p.description) !== 'Closing')
  const overdueProjects = projects.filter(p => p.date && isPast(parseISO(p.date)))

  const totalA = weekEntries.reduce((s, e) => s + (e.unit_amount || 0), 0)
  const totalB = compareEntries.reduce((s, e) => s + (e.unit_amount || 0), 0)
  const teamTotal = totalA + totalB
  const teamRate = Math.round((teamTotal / (2 * WEEKLY_GOAL)) * 100)

  const phaseDist = ISO_PHASES.map(ph => ({
    ...ph,
    count: projects.filter(p => (parsePhase(p.description) || 'Initiating') === ph.id).length,
  }))
  const maxPhaseCount = Math.max(...phaseDist.map(p => p.count), 1)

  const urgentProjects = projects
    .filter(p => p.date)
    .map(p => {
      const daysLeft = differenceInDays(parseISO(p.date), now)
      return { ...p, daysLeft }
    })
    .filter(p => p.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6)

  return (
    <main className="page">
      {/* KPI ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '.75rem', marginBottom: '1rem' }}>
        <StatCard
          value={activeProjects.length}
          label="Projets actifs"
          sub={`sur ${projects.length} total`}
          accent={false}
          color="var(--primary)"
        />
        <StatCard
          value={overdueProjects.length}
          label="En retard"
          sub={overdueProjects.length > 0 ? 'deadlines dépassées' : 'Tous dans les délais'}
          highlight={overdueProjects.length > 0}
          color={overdueProjects.length > 0 ? 'var(--danger)' : 'var(--success)'}
          invertHighlight
        />
        <StatCard
          value={`${teamTotal.toFixed(1)}h`}
          label="Charge équipe"
          sub={`${active.name?.split(' ')[0]} + ${compare?.name?.split(' ')[0]} / semaine`}
        />
        <StatCard
          value={`${teamRate}%`}
          label="Taux de charge"
          sub={`objectif 2×40h = 80h`}
          highlight={teamRate > 100}
        />
      </div>

      {/* PHASE DISTRIBUTION */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">Santé du portefeuille — phases</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.55rem' }}>
          {phaseDist.map(ph => (
            <div key={ph.id} style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
              <div style={{ width: 80, fontSize: '.72rem', fontWeight: 700, color: ph.color, flexShrink: 0 }}>
                {ph.icon} {ph.label}
              </div>
              <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  width: `${(ph.count / maxPhaseCount) * 100}%`,
                  background: ph.color,
                  transition: 'width .5s ease',
                  minWidth: ph.count > 0 ? 4 : 0,
                }} />
              </div>
              <div style={{ width: 20, textAlign: 'right', fontSize: '.75rem', fontWeight: 700, color: ph.count > 0 ? 'var(--text)' : 'var(--text-muted)' }}>
                {ph.count}
              </div>
            </div>
          ))}
        </div>
        {projects.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem', padding: '.75rem 0' }}>
            Aucun projet chargé
          </div>
        )}
      </div>

      {/* URGENT / UPCOMING DEADLINES */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">Échéances imminentes (14 jours)</div>
        {urgentProjects.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem', padding: '.5rem 0' }}>
            Aucune deadline dans les 14 prochains jours
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {urgentProjects.map(p => {
              const phaseId = parsePhase(p.description) || 'Initiating'
              const phase = ISO_PHASES.find(ph => ph.id === phaseId)
              const overdue = p.daysLeft < 0
              const critical = p.daysLeft >= 0 && p.daysLeft <= 3

              return (
                <Link key={p.id} to={`/projects/${p.id}`}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: '.75rem',
                    padding: '.6rem .75rem', borderRadius: 8,
                    background: overdue ? 'var(--danger-light)' : critical ? 'var(--warning-light)' : 'var(--bg)',
                    border: `1px solid ${overdue ? 'var(--danger)' : critical ? 'var(--warning)' : 'var(--border)'}22`,
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                    </div>
                    {phase && (
                      <span style={{ fontSize: '.65rem', padding: '1px 5px', borderRadius: 3, fontWeight: 700,
                        background: `${phase.color}18`, color: phase.color }}>
                        {phase.icon} {phase.label}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 800,
                      color: overdue ? 'var(--danger)' : critical ? '#b45309' : 'var(--text-muted)' }}>
                      {overdue
                        ? `⚠ ${Math.abs(p.daysLeft)}j de retard`
                        : p.daysLeft === 0
                          ? "Aujourd'hui !"
                          : `Dans ${p.daysLeft}j`
                      }
                    </div>
                    <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                      {format(parseISO(p.date), 'd MMM', { locale: fr })}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* TEAM COMPARISON */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">Charge hebdomadaire équipe</div>
        <WeeklyStats
          entries={weekEntries}
          compareEntries={compareEntries}
          memberName={active.name}
          compareName={compare?.name}
        />
      </div>

      {/* PROJECT BREAKDOWN */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">Répartition par projet — équipe (7j)</div>
        <ProjectPieChart entries={[...weekEntries, ...compareEntries]} />
      </div>
    </main>
  )
}

/* ─── SHARED STAT CARD ───────────────────────────────────────── */

function StatCard({ value, label, sub, accent, highlight, color, invertHighlight }) {
  const borderStyle = highlight && !accent
    ? { borderLeft: `3px solid ${invertHighlight ? 'var(--danger)' : 'var(--overtime)'}` }
    : undefined

  return (
    <div className={`stat-card${accent ? ' accent' : ''}`} style={borderStyle}>
      <div className="stat-card-value" style={color && !accent ? { color } : undefined}>{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  )
}
