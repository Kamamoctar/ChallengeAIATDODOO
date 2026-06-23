import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { startOfWeek, addWeeks, addDays, format, parseISO, isSameDay, differenceInMinutes } from 'date-fns'
import { fr } from 'date-fns/locale'
import { CornerDownLeft, Target, Clock, Folder, MapPin, Video } from 'lucide-react'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import EmployeeToggle from '../components/EmployeeToggle'

// Une couleur stable par projet (pour repérer d'un coup d'œil).
const PALETTE = ['#0a4b8b', '#139cbc', '#1c9a97', '#b45309', '#7c3aed', '#0891b2', '#65a30d', '#d30731']
const colorFor = (id) => PALETTE[Math.abs(id || 0) % PALETTE.length]

const hm = (dt) => (dt ? dt.slice(11, 16) : '')          // "2026-06-23 09:00:00" -> "09:00"
const dayKey = (dt) => (dt ? dt.slice(0, 10) : '')        // -> "2026-06-23"
const iso = (s) => parseISO(s.replace(' ', 'T'))

export default function Week() {
  const { active } = useTeam()
  const userId = active.id === parseInt(import.meta.env.VITE_EMPLOYEE_A_ID || '0')
    ? parseInt(import.meta.env.VITE_EMPLOYEE_A_USER_ID || '0')
    : parseInt(import.meta.env.VITE_EMPLOYEE_B_USER_ID || '0')

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const startStr = format(weekStart, 'yyyy-MM-dd')
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const { data, isLoading } = useQuery({
    queryKey: ['cal-week', userId, startStr],
    queryFn: () => api.getCalendarWeek(userId, startStr, 7),
    enabled: userId > 0,
    staleTime: 60_000,
  })

  const meetings = data?.meetings || []
  const deadlines = data?.deadlines || []

  // Petit résumé de la semaine
  const totalMeetMin = meetings.reduce((s, m) =>
    s + Math.max(0, differenceInMinutes(iso(m.stop), iso(m.start))), 0)
  const totalMeetH = (totalMeetMin / 60).toFixed(1)

  const isThisWeek = isSameDay(weekStart, startOfWeek(new Date(), { weekStartsOn: 1 }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="nav-bar">
        <div>
          <div style={{ fontWeight: 700 }}>Ma semaine</div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
            RDV & échéances · {active.name.split(' ')[0]}
          </div>
        </div>
        <EmployeeToggle />
      </header>

      {/* Barre de navigation entre semaines */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '.5rem', padding: '.6rem 1.25rem', background: 'var(--surface)',
        borderBottom: '1px solid var(--border)' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(w => addWeeks(w, -1))}>← Préc.</button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '.85rem' }}>
            {format(weekStart, 'd MMM', { locale: fr })} – {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: fr })}
          </div>
          <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
            {meetings.length} RDV · {totalMeetH}h · {deadlines.length} échéance(s)
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setWeekStart(w => addWeeks(w, 1))}>Suiv. →</button>
      </div>

      {!isThisWeek && (
        <div style={{ padding: '.4rem 1.25rem' }}>
          <button className="btn btn-ghost btn-sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
            <CornerDownLeft size={14} style={{ verticalAlign: '-2px', marginRight: 4, flexShrink: 0 }} />Revenir à cette semaine
          </button>
        </div>
      )}

      <main className="page">
        {isLoading && <div className="loading">Chargement…</div>}

        {!isLoading && (
          <div className="week-grid">
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              const dayMeetings = meetings.filter(m => dayKey(m.start) === key)
              const dayDeadlines = deadlines.filter(t => t.date_deadline === key)
              const isToday = isSameDay(day, new Date())
              const empty = dayMeetings.length === 0 && dayDeadlines.length === 0

              return (
                <div key={key} className="week-day"
                  style={{ borderColor: isToday ? 'var(--primary)' : 'var(--border)' }}>
                  <div className="week-day-head" style={{ color: isToday ? 'var(--primary)' : 'var(--text)' }}>
                    <span style={{ textTransform: 'capitalize' }}>{format(day, 'EEEE', { locale: fr })}</span>
                    <span style={{ fontWeight: 800 }}>{format(day, 'd', { locale: fr })}</span>
                  </div>

                  {/* Échéances (toute la journée) */}
                  {dayDeadlines.map(t => {
                    const pid = Array.isArray(t.project_id) ? t.project_id[0] : 0
                    const pname = Array.isArray(t.project_id) ? t.project_id[1] : 'Sans projet'
                    return (
                      <Link key={'d' + t.id} to={pid ? `/projects/${pid}` : '#'}
                        className="week-item"
                        style={{ borderLeftColor: colorFor(pid), background: `${colorFor(pid)}10` }}>
                        <div style={{ fontSize: '.7rem', fontWeight: 700, color: colorFor(pid) }}><Target size={12} style={{ verticalAlign: '-2px', marginRight: 4, flexShrink: 0 }} />Échéance</div>
                        <div className="week-item-title">{t.name}</div>
                        <div className="week-item-sub">{pname}</div>
                      </Link>
                    )
                  })}

                  {/* Réunions / RDV */}
                  {dayMeetings.map(m => {
                    const pid = Array.isArray(m.project_id) ? m.project_id[0] : 0
                    const pname = Array.isArray(m.project_id) ? m.project_id[1] : null
                    return (
                      <div key={'m' + m.id} className="week-item"
                        style={{ borderLeftColor: colorFor(pid) }}>
                        <div style={{ fontSize: '.7rem', fontWeight: 700, color: colorFor(pid) }}>
                          <Clock size={12} style={{ verticalAlign: '-2px', marginRight: 4, flexShrink: 0 }} />{hm(m.start)}–{hm(m.stop)}
                        </div>
                        <div className="week-item-title">{m.name}</div>
                        {pname && <div className="week-item-sub" style={{ color: colorFor(pid), fontWeight: 600 }}><Folder size={12} style={{ verticalAlign: '-2px', marginRight: 4, flexShrink: 0 }} />{pname}</div>}
                        {m.location && <div className="week-item-sub"><MapPin size={12} style={{ verticalAlign: '-2px', marginRight: 4, flexShrink: 0 }} />{m.location}</div>}
                        {m.videocall_location && (
                          <a href={m.videocall_location} target="_blank" rel="noreferrer"
                            className="week-item-sub" style={{ color: 'var(--accent)' }}><Video size={12} style={{ verticalAlign: '-2px', marginRight: 4, flexShrink: 0 }} />Lien visio</a>
                        )}
                      </div>
                    )
                  })}

                  {empty && <div className="week-empty">—</div>}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
