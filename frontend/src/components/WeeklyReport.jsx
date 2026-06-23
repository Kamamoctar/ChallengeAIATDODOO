import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
  PieChart, Pie, Legend
} from 'recharts'
import { eachDayOfInterval, subDays, format, parseISO, isSameDay, isToday } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Flame } from 'lucide-react'

const DAILY_GOAL = 8
const WEEKLY_GOAL = 40
const PRIMARY    = '#0a4b8b'
const OVERTIME   = '#ef532b'
const TODAY_CLR  = '#203c48'

const COLORS = ['#0a4b8b','#ef532b','#1c9a97','#f5c36e','#139cbc','#5acaad','#8ed4de','#d30731']

function buildDayData(entries, days = 7) {
  const today = new Date()
  const interval = eachDayOfInterval({ start: subDays(today, days - 1), end: today })
  return interval.map(day => {
    const dayEntries = entries.filter(e => {
      try { return isSameDay(parseISO(e.date), day) } catch { return false }
    })
    const hours = dayEntries.reduce((s, e) => s + (e.unit_amount || 0), 0)
    const normal = Math.min(hours, DAILY_GOAL)
    const over = Math.max(0, hours - DAILY_GOAL)
    return {
      day: format(day, 'EEE', { locale: fr }),
      date: format(day, 'dd/MM'),
      hours: parseFloat(hours.toFixed(2)),
      normal: parseFloat(normal.toFixed(2)),
      over: parseFloat(over.toFixed(2)),
      isToday: isToday(day),
    }
  })
}

function buildProjectData(entries) {
  const map = {}
  entries.forEach(e => {
    const name = Array.isArray(e.project_id) ? e.project_id[1] : (e.project_id || 'Sans projet')
    const short = name.length > 22 ? name.slice(0, 20) + '…' : name
    map[short] = (map[short] || 0) + (e.unit_amount || 0)
  })
  return Object.entries(map)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)
}

function CustomBarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  const isOver = total > DAILY_GOAL
  return (
    <div style={{ background: '#1a2e38', color: '#fff', borderRadius: 8,
      padding: '.6rem .9rem', fontSize: '.8rem', boxShadow: '0 4px 16px rgba(0,0,0,.3)' }}>
      <div style={{ fontWeight: 700, marginBottom: '.25rem' }}>{label}</div>
      <div>{total.toFixed(2)}h {isOver && <span style={{ color: OVERTIME }}><Flame size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> +{(total - DAILY_GOAL).toFixed(2)}h</span>}</div>
    </div>
  )
}

export function DayBarChart({ entries }) {
  const data = buildDayData(entries)
  const maxH = Math.max(...data.map(d => d.hours), DAILY_GOAL + 1)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#d0e4ea" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5a7080' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#5a7080' }} axisLine={false} tickLine={false} domain={[0, maxH]} />
        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(10,75,139,.06)' }} />
        <ReferenceLine y={DAILY_GOAL} stroke={PRIMARY} strokeDasharray="4 3" strokeWidth={1.5}
          label={{ value: '8h', position: 'right', fontSize: 10, fill: PRIMARY }} />
        <Bar dataKey="normal" stackId="a" radius={[0, 0, 4, 4]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.isToday ? TODAY_CLR : PRIMARY} opacity={entry.isToday ? 1 : 0.75} />
          ))}
        </Bar>
        <Bar dataKey="over" stackId="a" fill={OVERTIME} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function ProjectPieChart({ entries }) {
  const data = buildProjectData(entries)
  if (!data.length) return <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem', fontSize: '.85rem' }}>Aucune donnée</div>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="40%" cy="50%"
          outerRadius={70} innerRadius={36}
          paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => [`${v}h`, '']}
          contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,.15)', fontSize: '.8rem' }} />
        <Legend iconType="circle" iconSize={8}
          formatter={(v) => <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{v}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function WeeklyStats({ entries, compareEntries, memberName, compareName }) {
  const total = entries.reduce((s, e) => s + (e.unit_amount || 0), 0)
  const compareTotal = compareEntries.reduce((s, e) => s + (e.unit_amount || 0), 0)
  const pct = Math.min((total / WEEKLY_GOAL) * 100, 150)
  const overtimeH = Math.max(0, total - WEEKLY_GOAL)
  const isOver = total > WEEKLY_GOAL

  const barWidth = Math.min(pct, 100)
  const overtimeWidth = isOver ? Math.min(((total - WEEKLY_GOAL) / WEEKLY_GOAL) * 100, 50) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <span style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-.04em' }}>{total.toFixed(1)}h</span>
          <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginLeft: '.4rem' }}>/ {WEEKLY_GOAL}h</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          {isOver
            ? <span className="badge badge-overtime"><Flame size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> +{overtimeH.toFixed(1)}h overtime</span>
            : <span className="badge badge-primary">{Math.round(pct)}%</span>
          }
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${barWidth}%`, background: isOver ? `linear-gradient(90deg, var(--primary) 60%, var(--overtime) 100%)` : undefined }} />
        {isOver && (
          <div className="progress-bar-overtime" style={{ width: `${overtimeWidth}%`, maxWidth: '30%' }} />
        )}
      </div>

      {compareName && (
        <div style={{ display: 'flex', gap: '.5rem', marginTop: '.25rem' }}>
          <div style={{ flex: 1, background: 'var(--primary-light)', borderRadius: 8, padding: '.6rem .75rem' }}>
            <div style={{ fontSize: '.7rem', color: 'var(--primary)', fontWeight: 700 }}>{memberName?.split(' ')[0]}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{total.toFixed(1)}h</div>
          </div>
          <div style={{ flex: 1, background: '#fff3ee', borderRadius: 8, padding: '.6rem .75rem' }}>
            <div style={{ fontSize: '.7rem', color: 'var(--overtime)', fontWeight: 700 }}>{compareName?.split(' ')[0]}</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{compareTotal.toFixed(1)}h</div>
          </div>
        </div>
      )}
    </div>
  )
}

export function buildWeekStats(entries) {
  const today = new Date()
  const data = buildDayData(entries, 7)
  const total = entries.reduce((s, e) => s + (e.unit_amount || 0), 0)
  const todayEntries = entries.filter(e => {
    try { return isSameDay(parseISO(e.date), today) } catch { return false }
  })
  const todayH = todayEntries.reduce((s, e) => s + (e.unit_amount || 0), 0)
  const daysWorked = data.filter(d => d.hours > 0).length
  const avgPerDay = daysWorked ? total / daysWorked : 0
  const overtimeH = Math.max(0, todayH - DAILY_GOAL)
  const weekOvertimeH = Math.max(0, total - WEEKLY_GOAL)

  return { total, todayH, daysWorked, avgPerDay, overtimeH, weekOvertimeH }
}
