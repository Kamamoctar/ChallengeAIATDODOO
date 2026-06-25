import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format, parseISO, differenceInDays, subDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import {
  Flame, AlertTriangle, AlertCircle, ClipboardList, Check, User, BarChart3,
  Landmark, Zap, Circle,
} from 'lucide-react'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import EmployeeToggle from '../components/EmployeeToggle'
import EntryCard from '../components/EntryCard'
import { DayBarChart, ProjectPieChart, WeeklyStats, buildWeekStats } from '../components/WeeklyReport'
import { parsePhase, ISO_PHASES } from '../components/ISOPhase'
import { useDeadlineNotifications } from '../hooks/useNotifications'

const DAILY_GOAL = 8
const WEEKLY_GOAL = 40

/* ─── Root ────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { active, members } = useTeam()
  const compare = members?.find(m => m.id !== active.id)
  const [tab, setTab] = useState('personal')
  const today = format(new Date(), 'EEEE d MMMM', { locale: fr })

  const { data: todayEntries = [], isLoading: loadingToday } = useQuery({
    queryKey: ['timesheets-today', active.id],
    queryFn: () => api.getToday(active.id),
    enabled: active.id > 0,
  })
  const { data: twoWeekEntries = [] } = useQuery({
    queryKey: ['timesheets-2weeks', active.id],
    queryFn: () => api.getWeek(active.id, 14),
    enabled: active.id > 0,
  })
  const { data: compareEntries = [] } = useQuery({
    queryKey: ['timesheets-week', compare?.id],
    queryFn: () => api.getWeek(compare.id, 7),
    enabled: !!compare?.id,
  })
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-detail'],
    queryFn: api.getProjectsDetail,
    staleTime: 120_000,
  })

  // Identifiant "utilisateur" (res.users) du membre sélectionné, pour retrouver SES tâches.
  const userId = active.id === parseInt(import.meta.env.VITE_EMPLOYEE_A_ID || '0')
    ? parseInt(import.meta.env.VITE_EMPLOYEE_A_USER_ID || '0')
    : parseInt(import.meta.env.VITE_EMPLOYEE_B_USER_ID || '0')

  const { data: myTasks = [] } = useQuery({
    queryKey: ['my-tasks-dash', userId],
    queryFn: () => api.getMyTasks(userId),
    enabled: userId > 0,
    staleTime: 120_000,
  })

  // Liste des projets du membre = projets distincts tirés de ses tâches,
  // enrichis avec la date d'échéance et la phase (depuis le détail des projets).
  const myProjects = useMemo(() => {
    const counts = {}
    myTasks.forEach(t => {
      const id = Array.isArray(t.project_id) ? t.project_id[0] : null
      if (!id) return
      const name = Array.isArray(t.project_id) ? t.project_id[1] : 'Sans nom'
      if (!counts[id]) counts[id] = { id, name, taskCount: 0 }
      counts[id].taskCount++
    })
    return Object.values(counts)
      .map(p => {
        const detail = projects.find(d => d.id === p.id)
        return { ...p, date: detail?.date || null, description: detail?.description || '' }
      })
      .sort((a, b) => b.taskCount - a.taskCount)
  }, [myTasks, projects])

  useDeadlineNotifications(projects)

  const cutoff = format(subDays(new Date(), 7), 'yyyy-MM-dd')
  const weekEntries = twoWeekEntries.filter(e => e.date >= cutoff)
  const prevWeekEntries = twoWeekEntries.filter(e => e.date < cutoff)
  const prevWeekTotal = prevWeekEntries.reduce((s, e) => s + (e.unit_amount || 0), 0)

  const weekStats = buildWeekStats(weekEntries)
  const { total: weekTotal, todayH, avgPerDay, overtimeH, weekOvertimeH } = weekStats
  const dailyPct    = Math.min((todayH / DAILY_GOAL) * 100, 100)
  const overtimePct = overtimeH > 0 ? Math.min((overtimeH / DAILY_GOAL) * 100, 40) : 0
  const isOverToday = todayH > DAILY_GOAL

  const TABS = [
    { id: 'personal',  label: 'Moi',             icon: User },
    { id: 'chef',      label: 'Chef de Projet',  icon: BarChart3 },
    { id: 'direction', label: 'Direction',       icon: Landmark },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="nav-bar">
        <div>
          <div style={{ fontWeight: 700, fontSize: '.95rem', textTransform: 'capitalize' }}>{today}</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Tableau de bord</div>
        </div>
        <EmployeeToggle />
      </header>

      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', padding: '0 .75rem', gap: '.1rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '.6rem .8rem', fontSize: '.78rem', fontWeight: 700, flexShrink: 0,
              color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--primary)' : '2px solid transparent',
              background: 'none', border: 'none', borderRadius: 0, cursor: 'pointer',
              transition: 'all .15s',
            }}>
            <t.icon size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'personal' && (
        <PersonalTab
          todayH={todayH} weekTotal={weekTotal} avgPerDay={avgPerDay}
          overtimeH={overtimeH} weekOvertimeH={weekOvertimeH}
          dailyPct={dailyPct} overtimePct={overtimePct} isOverToday={isOverToday}
          weekEntries={weekEntries} compareEntries={compareEntries}
          prevWeekTotal={prevWeekTotal}
          active={active} compare={compare}
          todayEntries={todayEntries} loadingToday={loadingToday}
          qkToday={['timesheets-today', active.id]}
          myProjects={myProjects}
          myTasks={myTasks} userId={userId} projects={projects}
        />
      )}
      {tab === 'chef' && (
        <ChefTab
          projects={projects} weekEntries={weekEntries} compareEntries={compareEntries}
          active={active} compare={compare}
          weekTotal={weekTotal} prevWeekTotal={prevWeekTotal}
        />
      )}
      {tab === 'direction' && (
        <DirectionTab
          projects={projects} weekEntries={weekEntries} compareEntries={compareEntries}
          prevWeekTotal={prevWeekTotal}
          active={active} compare={compare}
        />
      )}

      <Link to="/new" className="fab" aria-label="Nouvelle entrée">+</Link>
    </div>
  )
}

/* ─── TAB : MOI (Personnel) ────────────────────────────────────── */
/* ─── Cockpit KPI ─────────────────────────────────────────────── */
function CockpitBar({ todayH, weekTotal, myTasks, projects, userId }) {
  const today = new Date().toISOString().split('T')[0]
  const overdueCount = myTasks.filter(t => t.date_deadline && t.date_deadline < today).length
  const myProjCount  = projects.filter(p =>
    Array.isArray(p.user_id) && p.user_id[0] === userId &&
    parsePhase(p.description) !== 'Closing'
  ).length
  const weekPct = Math.round((weekTotal / 40) * 100)

  const todayColor  = todayH >= 6 ? '#16a34a' : todayH >= 3 ? '#f59e0b' : '#ef4444'
  const weekColor   = weekPct >= 80 ? '#16a34a' : weekPct >= 50 ? '#f59e0b' : '#ef4444'
  const overdueColor = overdueCount > 0 ? '#ef4444' : '#16a34a'

  const tile = (value, label, sub, color, icon) => (
    <div style={{
      background: 'var(--surface)', borderRadius: 12,
      padding: '.75rem 1rem', borderTop: `3px solid ${color}`,
      boxShadow: 'var(--shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginBottom: '.15rem' }}>
        <span style={{ fontSize: '.85rem' }}>{icon}</span>
        <span style={{ fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '.05em', color: 'var(--text-muted)' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.55rem', fontWeight: 800, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      <div style={{ fontSize: '.65rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>{sub}</div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '.65rem', marginBottom: '1rem' }}>
      {tile(`${todayH.toFixed(1)}h`, "Aujourd'hui", `/ 8h`, todayColor, '🕐')}
      {tile(`${weekPct}%`, 'Cette semaine', `${weekTotal.toFixed(1)}h / 40h`, weekColor, '📅')}
      {tile(overdueCount, 'En retard', overdueCount > 0 ? 'tâche(s) dépassées' : 'Aucune', overdueColor, '⚠️')}
      {tile(myProjCount, 'Mes projets', 'projets actifs', 'var(--primary)', '📁')}
    </div>
  )
}

/* ─── TAB : MOI (Personnel) ────────────────────────────────────── */
function PersonalTab({
  todayH, weekTotal, avgPerDay, overtimeH, weekOvertimeH,
  dailyPct, overtimePct, isOverToday,
  weekEntries, compareEntries, prevWeekTotal, active, compare,
  todayEntries, loadingToday, qkToday, myProjects = [],
  myTasks = [], userId = 0, projects = [],
}) {
  const weekTrend = prevWeekTotal > 0 ? weekTotal - prevWeekTotal : null
  const now = new Date()
  return (
    <main className="page">
      <CockpitBar todayH={todayH} weekTotal={weekTotal}
        myTasks={myTasks} projects={projects} userId={userId} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '.75rem', marginBottom: '1rem' }}>
        <StatCard value={`${todayH.toFixed(1)}h`} label="Aujourd'hui"
          sub={isOverToday ? <><Flame size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> +{overtimeH.toFixed(1)}h overtime</> : `/ ${DAILY_GOAL}h`}
          accent={isOverToday} />
        <StatCard value={`${weekTotal.toFixed(1)}h`} label="Cette semaine"
          sub={weekTrend !== null
            ? (weekTrend >= 0 ? `▲ +${weekTrend.toFixed(1)}h vs S-1` : `▼ ${weekTrend.toFixed(1)}h vs S-1`)
            : (weekOvertimeH > 0 ? <><Flame size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> +{weekOvertimeH.toFixed(1)}h</> : `/ 40h`)}
          color={weekTrend !== null ? (weekTrend >= 0 ? 'var(--success)' : 'var(--danger)') : undefined} />
        <StatCard value={`${avgPerDay.toFixed(1)}h`} label="Moy. / jour"
          sub="jours travaillés" />
        <StatCard value={`${Math.round((todayH / DAILY_GOAL) * 100)}%`} label="Objectif jour"
          sub={isOverToday ? 'Dépassé !' : `${(DAILY_GOAL - todayH).toFixed(1)}h restantes`}
          highlight={isOverToday} />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title" style={{ marginBottom: '.5rem' }}>
          Progression du jour
          {isOverToday && <span className="badge badge-overtime" style={{ marginLeft: '.5rem' }}><Flame size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {Math.round((todayH / DAILY_GOAL) * 100)}%</span>}
        </div>
        <div className="progress-bar" style={{ height: 10, position: 'relative' }}>
          <div className="progress-bar-fill" style={{
            width: `${dailyPct}%`,
            background: isOverToday ? 'linear-gradient(90deg, var(--primary) 70%, var(--overtime) 100%)' : undefined,
          }} />
          {isOverToday && <div className="progress-bar-overtime" style={{ width: `${overtimePct}%`, maxWidth: '25%' }} />}
        </div>
        <div className="progress-label">
          <span style={{ color: 'var(--text-muted)', fontSize: '.72rem' }}>0h</span>
          <span style={{ fontWeight: 700, fontSize: '.78rem' }}>{todayH.toFixed(2)}h / {DAILY_GOAL}h</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '.72rem' }}>{DAILY_GOAL}h+</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">Répartition hebdomadaire</div>
        <WeeklyStats entries={weekEntries} compareEntries={compareEntries}
          memberName={active.name} compareName={compare?.name} />
        <div style={{ marginTop: '1.25rem' }}>
          <DayBarChart entries={weekEntries} />
        </div>
        <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: '.35rem', textAlign: 'center' }}>
          ligne pointillée = objectif 8h · orange = heures supp.
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">Répartition par projet (7 jours)</div>
        <ProjectPieChart entries={weekEntries} />
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">
          Mes projets · {active.name?.split(' ')[0]} ({myProjects.length})
        </div>
        {myProjects.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem', padding: '.5rem 0' }}>
            Aucun projet avec des tâches assignées
          </div>
        ) : myProjects.map(p => {
          const phase = ISO_PHASES.find(ph => ph.id === (parsePhase(p.description) || 'Planning'))
          const daysLeft = p.date ? differenceInDays(parseISO(p.date), now) : null
          const overdue = daysLeft !== null && daysLeft < 0
          const soon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7
          return (
            <Link key={p.id} to={`/projects/${p.id}`}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: '.75rem', padding: '.5rem 0',
                borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginTop: '.15rem' }}>
                  {phase && (
                    <span style={{ fontSize: '.62rem', padding: '1px 5px', borderRadius: 3,
                      background: `${phase.color}18`, color: phase.color, fontWeight: 700 }}>
                      <phase.icon size={12} style={{ verticalAlign: '-2px' }} /> {phase.label}
                    </span>
                  )}
                  <span style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                    {p.taskCount} tâche{p.taskCount > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              {daysLeft !== null && (
                <span style={{ fontSize: '.72rem', fontWeight: 800, flexShrink: 0,
                  color: overdue ? 'var(--danger)' : soon ? '#b45309' : 'var(--text-muted)' }}>
                  {overdue ? <><AlertTriangle size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {Math.abs(daysLeft)}j</> : daysLeft === 0 ? "Auj." : `J-${daysLeft}`}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      <div className="section-title">Entrées du jour</div>
      {loadingToday && <div className="loading">Chargement…</div>}
      {!loadingToday && todayEntries.length === 0 && (
        <div className="empty-state">
          <div className="icon"><ClipboardList size={28} /></div>
          <p>Aucune entrée aujourd'hui</p>
          <p style={{ fontSize: '.8rem', marginTop: '.25rem' }}>Appuyez sur + pour commencer</p>
        </div>
      )}
      {!loadingToday && todayEntries.length > 0 && (
        <div className="card">
          {todayEntries.map(e => <EntryCard key={e.id} entry={e} queryKey={qkToday} />)}
        </div>
      )}
    </main>
  )
}

/* ─── TAB : CHEF DE PROJET ──────────────────────────────────────── */
function ChefTab({ projects, weekEntries, compareEntries, active, compare, weekTotal, prevWeekTotal }) {
  const now = new Date()
  const totalA = weekEntries.reduce((s, e) => s + (e.unit_amount || 0), 0)
  const totalB = compareEntries.reduce((s, e) => s + (e.unit_amount || 0), 0)

  const activeProjects = projects.filter(p => parsePhase(p.description) !== 'Closing')
  const overdueProjects = projects.filter(p => p.date && differenceInDays(parseISO(p.date), now) < 0)
  const atRiskProjects  = projects.filter(p => {
    if (!p.date) return false
    const d = differenceInDays(parseISO(p.date), now)
    return d >= 0 && d <= 7
  })

  const maxPhaseCount = Math.max(...ISO_PHASES.map(ph =>
    projects.filter(p => (parsePhase(p.description) || 'Planning') === ph.id).length
  ), 1)

  const urgentProjects = projects
    .filter(p => p.date)
    .map(p => ({ ...p, daysLeft: differenceInDays(parseISO(p.date), now) }))
    .filter(p => p.daysLeft <= 14)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 6)

  const needsAction = [...overdueProjects, ...atRiskProjects.filter(p =>
    !overdueProjects.find(o => o.id === p.id))]

  return (
    <main className="page">
      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '.75rem', marginBottom: '1rem' }}>
        <StatCard value={activeProjects.length} label="Projets actifs"
          sub={`sur ${projects.length} au total`} color="var(--primary)" />
        <StatCard value={overdueProjects.length} label="En retard"
          sub={overdueProjects.length > 0 ? 'deadlines dépassées' : <><Check size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Tous dans les délais</>}
          color={overdueProjects.length > 0 ? 'var(--danger)' : 'var(--success)'}
          highlight={overdueProjects.length > 0} invertHighlight />
        <StatCard value={`${totalA.toFixed(1)}h`} label="Mes heures / sem."
          sub={prevWeekTotal > 0
            ? (totalA >= prevWeekTotal ? `▲ +${(totalA - prevWeekTotal).toFixed(1)}h vs S-1` : `▼ ${(totalA - prevWeekTotal).toFixed(1)}h vs S-1`)
            : (totalA > WEEKLY_GOAL ? <><Flame size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> +{(totalA - WEEKLY_GOAL).toFixed(1)}h</> : `/ ${WEEKLY_GOAL}h`)}
          color={prevWeekTotal > 0 ? (totalA >= prevWeekTotal ? 'var(--success)' : 'var(--danger)') : undefined} />
        <StatCard value={`${(totalA + totalB).toFixed(1)}h`} label="Équipe / sem."
          sub={`${active.name?.split(' ')[0]} + ${compare?.name?.split(' ')[0]}`} />
      </div>

      {/* Needs attention */}
      {needsAction.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem', border: '1.5px solid var(--danger)' }}>
          <div className="card-title" style={{ color: 'var(--danger)' }}>
            <AlertCircle size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Projets nécessitant une action ({needsAction.length})
          </div>
          {needsAction.slice(0, 4).map(p => {
            const daysLeft = p.date ? differenceInDays(parseISO(p.date), now) : null
            const overdue = daysLeft !== null && daysLeft < 0
            const phaseId = parsePhase(p.description) || 'Planning'
            const phase = ISO_PHASES.find(ph => ph.id === phaseId)
            return (
              <Link key={p.id} to={`/projects/${p.id}`}
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', padding: '.5rem 0',
                  borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '.85rem', color: 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  {phase && (
                    <span style={{ fontSize: '.62rem', padding: '1px 5px', borderRadius: 3,
                      background: `${phase.color}18`, color: phase.color, fontWeight: 700 }}>
                      <phase.icon size={12} style={{ verticalAlign: '-2px' }} /> {phase.label}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '.75rem', fontWeight: 800, flexShrink: 0, marginLeft: '.75rem',
                  color: overdue ? 'var(--danger)' : '#b45309' }}>
                  {overdue ? <><AlertTriangle size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {Math.abs(daysLeft)}j retard</> : <><Zap size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Dans {daysLeft}j</>}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* Phase distribution */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">Distribution par phase</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
          {ISO_PHASES.map(ph => {
            const count = projects.filter(p => (parsePhase(p.description) || 'Planning') === ph.id).length
            return (
              <div key={ph.id} style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
                <div style={{ width: 76, fontSize: '.72rem', fontWeight: 700, color: ph.color, flexShrink: 0 }}>
                  <ph.icon size={12} style={{ verticalAlign: '-2px' }} /> {ph.label}
                </div>
                <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 4, background: ph.color,
                    width: `${(count / maxPhaseCount) * 100}%`,
                    transition: 'width .5s ease', minWidth: count > 0 ? 4 : 0,
                  }} />
                </div>
                <span style={{ width: 20, textAlign: 'right', fontSize: '.75rem', fontWeight: 700,
                  color: count > 0 ? 'var(--text)' : 'var(--text-muted)' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Upcoming deadlines */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">Échéances — 14 prochains jours</div>
        {urgentProjects.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem', padding: '.5rem 0' }}>
              Aucune deadline dans les 14 jours
            </div>
          : urgentProjects.map(p => {
              const phase = ISO_PHASES.find(ph => ph.id === (parsePhase(p.description) || 'Planning'))
              const overdue = p.daysLeft < 0
              const critical = p.daysLeft >= 0 && p.daysLeft <= 3
              return (
                <Link key={p.id} to={`/projects/${p.id}`}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: '.75rem', padding: '.55rem .65rem',
                    borderRadius: 8, marginBottom: '.3rem',
                    background: overdue ? 'var(--danger-light)' : critical ? 'var(--warning-light)' : 'var(--bg)',
                    border: `1px solid ${overdue ? '#fca5a5' : critical ? '#fcd34d' : 'transparent'}`,
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '.85rem', overflow: 'hidden',
                      textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                      {p.name}
                    </div>
                    {phase && <span style={{ fontSize: '.62rem', color: phase.color, fontWeight: 700 }}>
                      <phase.icon size={12} style={{ verticalAlign: '-2px' }} /> {phase.label}
                    </span>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 800,
                      color: overdue ? 'var(--danger)' : critical ? '#b45309' : 'var(--text-muted)' }}>
                      {overdue ? <><AlertTriangle size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> {Math.abs(p.daysLeft)}j retard</> : p.daysLeft === 0 ? "Aujourd'hui !" : `Dans ${p.daysLeft}j`}
                    </div>
                    <div style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                      {format(parseISO(p.date), 'd MMM', { locale: fr })}
                    </div>
                  </div>
                </Link>
              )
            })
        }
      </div>

      {/* Team comparison */}
      <div className="card">
        <div className="card-title">Charge hebdomadaire</div>
        <WeeklyStats entries={weekEntries} compareEntries={compareEntries}
          memberName={active.name} compareName={compare?.name} />
      </div>
    </main>
  )
}

/* ─── TAB : DIRECTION ───────────────────────────────────────────── */
function DirectionTab({ projects, weekEntries, compareEntries, prevWeekTotal, active, compare }) {
  const now = new Date()
  const totalA = weekEntries.reduce((s, e) => s + (e.unit_amount || 0), 0)
  const totalB = compareEntries.reduce((s, e) => s + (e.unit_amount || 0), 0)
  const teamHours = totalA + totalB
  const teamUtil  = Math.round((teamHours / (2 * WEEKLY_GOAL)) * 100)

  const projectsWithDate = projects.filter(p => p.date)
  const overdueCount = projectsWithDate.filter(p => differenceInDays(parseISO(p.date), now) < 0).length
  const atRiskCount  = projectsWithDate.filter(p => {
    const d = differenceInDays(parseISO(p.date), now)
    return d >= 0 && d <= 7
  }).length
  const onTrackCount = projectsWithDate.filter(p => differenceInDays(parseISO(p.date), now) > 7).length
  const healthPct = projectsWithDate.length > 0
    ? Math.round((onTrackCount / projectsWithDate.length) * 100)
    : 100
  const healthColor = healthPct >= 80 ? 'var(--success)' : healthPct >= 50 ? '#b45309' : 'var(--danger)'

  // Phase distribution for donut
  const phaseData = ISO_PHASES.map(ph => ({
    name: ph.label,
    value: projects.filter(p => (parsePhase(p.description) || 'Planning') === ph.id).length,
    color: ph.color,
  })).filter(d => d.value > 0)

  // Top projects by team activity
  const topProjects = buildTopProjects(weekEntries, compareEntries)

  // Last 30 days delivery pipeline
  const deliveryPipeline = projects
    .filter(p => p.date)
    .map(p => ({ ...p, daysLeft: differenceInDays(parseISO(p.date), now) }))
    .filter(p => p.daysLeft >= -7 && p.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  return (
    <main className="page theme-direction">

      {/* Health Score Hero */}
      <div className="card" style={{ marginBottom: '1rem',
        background: `linear-gradient(135deg, var(--primary-dark), var(--primary))`,
        color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '.72rem', fontWeight: 700, opacity: .8,
              textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.3rem' }}>
              Santé du portefeuille
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1,
              color: healthPct >= 80 ? '#5acaad' : healthPct >= 50 ? '#f5c36e' : '#ef532b' }}>
              {healthPct}%
            </div>
            <div style={{ fontSize: '.78rem', opacity: .8, marginTop: '.25rem' }}>
              {onTrackCount} dans les délais · {atRiskCount} à risque · {overdueCount} en retard
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ marginBottom: '.2rem' }}>
              {healthPct >= 80
                ? <Circle size={28} fill="#1c9a97" color="#1c9a97" />
                : healthPct >= 50
                ? <Circle size={28} fill="#f5c36e" color="#f5c36e" />
                : <Circle size={28} fill="#ef4444" color="#ef4444" />}
            </div>
            <div style={{ fontSize: '.72rem', opacity: .75 }}>{projects.length} projets total</div>
          </div>
        </div>
      </div>

      {/* KPI Row direction */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '.75rem', marginBottom: '1rem' }}>
        <StatCard value={`${teamUtil}%`} label="Utilisation équipe"
          sub={prevWeekTotal > 0
            ? (teamHours / 2 >= prevWeekTotal ? `▲ progression vs S-1` : `▼ vs S-1 (${prevWeekTotal.toFixed(1)}h)`)
            : `${teamHours.toFixed(1)}h / ${2 * WEEKLY_GOAL}h`}
          color={teamUtil > 100 ? 'var(--overtime)' : teamUtil >= 70 ? 'var(--success)' : '#b45309'}
          highlight={teamUtil > 100} />
        <StatCard value={projects.filter(p => parsePhase(p.description) !== 'Closing').length}
          label="Projets actifs"
          sub={`${projects.filter(p => parsePhase(p.description) === 'Closing').length} en clôture`}
          color="var(--primary)" />
        <StatCard value={`${totalA.toFixed(1)}h`} label={active.name?.split(' ')[0] || 'Membre A'}
          sub={totalA >= WEEKLY_GOAL ? <><Flame size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Objectif atteint</> : `/ ${WEEKLY_GOAL}h`}
          color={totalA >= WEEKLY_GOAL ? 'var(--success)' : 'var(--text)'} />
        <StatCard value={`${totalB.toFixed(1)}h`} label={compare?.name?.split(' ')[0] || 'Membre B'}
          sub={totalB >= WEEKLY_GOAL ? <><Flame size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Objectif atteint</> : `/ ${WEEKLY_GOAL}h`}
          color={totalB >= WEEKLY_GOAL ? 'var(--success)' : 'var(--text)'} />
      </div>

      {/* Phase donut + top projects side by side on desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="card">
          <div className="card-title">Portefeuille par phase</div>
          {phaseData.length > 0
            ? <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={phaseData} dataKey="value" cx="45%" cy="50%"
                    outerRadius={62} innerRadius={30} paddingAngle={2}>
                    {phaseData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v} projet${v > 1 ? 's' : ''}`, name]}
                    contentStyle={{ borderRadius: 8, fontSize: '.75rem', border: 'none',
                      boxShadow: '0 4px 16px rgba(0,0,0,.15)' }} />
                  <Legend iconType="circle" iconSize={7}
                    formatter={v => <span style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            : <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem' }}>
                Aucun projet
              </div>
          }
        </div>

        <div className="card">
          <div className="card-title">Top projets (semaine)</div>
          {topProjects.length > 0
            ? <ResponsiveContainer width="100%" height={180}>
                <BarChart data={topProjects} layout="vertical"
                  margin={{ left: 0, right: 20, top: 4, bottom: 4 }}>
                  <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
                    axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={90}
                    tick={{ fontSize: 10, fill: 'var(--text)' }} axisLine={false} tickLine={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"
                    vertical={true} horizontal={false} />
                  <Tooltip formatter={v => [`${v}h`, '']}
                    contentStyle={{ borderRadius: 8, fontSize: '.78rem', border: 'none',
                      boxShadow: '0 4px 16px rgba(0,0,0,.15)' }} />
                  <Bar dataKey="hours" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            : <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', textAlign: 'center', padding: '1rem' }}>
                Aucune activité cette semaine
              </div>
          }
        </div>
      </div>

      {/* Delivery pipeline */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div className="card-title">Pipeline de livraisons — 30 jours</div>
        {deliveryPipeline.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '.85rem', padding: '.5rem 0' }}>
              Aucune livraison prévue dans les 30 jours
            </div>
          : <div>
              {deliveryPipeline.map(p => {
                const phase = ISO_PHASES.find(ph => ph.id === (parsePhase(p.description) || 'Planning'))
                const overdue = p.daysLeft < 0
                const critical = p.daysLeft >= 0 && p.daysLeft <= 3
                const statusColor = overdue ? 'var(--danger)' : critical ? '#b45309' : 'var(--success)'
                const statusLabel = overdue
                  ? `${Math.abs(p.daysLeft)}j retard`
                  : p.daysLeft === 0 ? 'Aujourd\'hui'
                  : `J-${p.daysLeft}`

                return (
                  <Link key={p.id} to={`/projects/${p.id}`}
                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center',
                      gap: '.75rem', padding: '.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 52, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '.7rem', fontWeight: 800, color: statusColor }}>
                        {statusLabel}
                      </div>
                      <div style={{ fontSize: '.62rem', color: 'var(--text-muted)' }}>
                        {format(parseISO(p.date), 'd MMM', { locale: fr })}
                      </div>
                    </div>
                    <div style={{ width: 3, height: 32, borderRadius: 2, flexShrink: 0,
                      background: statusColor }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '.85rem', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                        {p.name}
                      </div>
                      {phase && <span style={{ fontSize: '.62rem', color: phase.color, fontWeight: 700 }}>
                        <phase.icon size={12} style={{ verticalAlign: '-2px' }} /> {phase.label}
                      </span>}
                    </div>
                  </Link>
                )
              })}
            </div>
        }
      </div>

      {/* Team utilization bars */}
      <div className="card">
        <div className="card-title">Performance équipe — semaine en cours</div>
        {[
          { name: active.name, hours: weekEntries.reduce((s, e) => s + (e.unit_amount || 0), 0) },
          { name: compare?.name, hours: compareEntries.reduce((s, e) => s + (e.unit_amount || 0), 0) },
        ].map((m, i) => {
          if (!m.name) return null
          const pct = Math.min((m.hours / WEEKLY_GOAL) * 100, 150)
          const over = m.hours > WEEKLY_GOAL
          return (
            <div key={i} style={{ marginBottom: i === 0 ? '1rem' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.3rem' }}>
                <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{m.name}</span>
                <span style={{ fontSize: '.82rem', fontWeight: 800,
                  color: over ? 'var(--overtime)' : m.hours >= WEEKLY_GOAL * 0.75 ? 'var(--success)' : 'var(--text-muted)' }}>
                  {m.hours.toFixed(1)}h / {WEEKLY_GOAL}h
                </span>
              </div>
              <div className="progress-bar" style={{ height: 10 }}>
                <div className="progress-bar-fill" style={{
                  width: `${Math.min(pct, 100)}%`,
                  background: over ? 'linear-gradient(90deg, var(--primary) 60%, var(--overtime) 100%)' : undefined,
                }} />
              </div>
              <div style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>
                {Math.round(Math.min(pct, 100))}% de l'objectif
                {over && <> · <Flame size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> +{(m.hours - WEEKLY_GOAL).toFixed(1)}h overtime</>}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function buildTopProjects(weekEntries, compareEntries) {
  const map = {}
  ;[...weekEntries, ...compareEntries].forEach(e => {
    const id = Array.isArray(e.project_id) ? e.project_id[0] : null
    if (!id) return
    const name = Array.isArray(e.project_id) ? e.project_id[1] : '?'
    const short = name.length > 18 ? name.slice(0, 16) + '…' : name
    if (!map[id]) map[id] = { id, name: short, hours: 0 }
    map[id].hours += e.unit_amount || 0
  })
  return Object.values(map)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 5)
    .map(d => ({ ...d, hours: parseFloat(d.hours.toFixed(1)) }))
}

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
