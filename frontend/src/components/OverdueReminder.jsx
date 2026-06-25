import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bell, AlertTriangle, X } from 'lucide-react'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'

// Rappel pop-up des tâches en retard (à la manière du rappel de RDV d'Odoo).

const DONE_RE = /done|termin|ferm|clôt|annul/i
const snoozeKey = (memberId) => `overdue_snooze_${memberId}`

const SNOOZE_OPTIONS = [
  { label: '1 heure', ms: 3_600_000 },
  { label: '1 jour', ms: 86_400_000 },
  { label: '3 jours', ms: 3 * 86_400_000 },
  { label: '1 semaine', ms: 7 * 86_400_000 },
]
const DISMISS_MS = 365 * 86_400_000  // « Ignorer » = ne plus rappeler avant longtemps

function loadSnooze(memberId) {
  try { return JSON.parse(localStorage.getItem(snoozeKey(memberId))) || {} } catch { return {} }
}
function saveSnooze(memberId, map) {
  localStorage.setItem(snoozeKey(memberId), JSON.stringify(map))
}

export default function OverdueReminder() {
  const { active, userId } = useTeam()

  const { data: myTasks = [] } = useQuery({
    queryKey: ['my-tasks', userId],
    queryFn: () => api.getMyTasks(userId),
    enabled: userId > 0,
    staleTime: 120_000,
  })

  const [snooze, setSnooze] = useState(() => loadSnooze(active.id))
  const [closed, setClosed] = useState(false)
  const [delayMs, setDelayMs] = useState(86_400_000)  // défaut : 1 jour
  const [showAll, setShowAll] = useState(false)

  const TOP_N = 10

  // Quand on change d'équipier, on recharge ses rappels et on rouvre.
  useEffect(() => {
    setSnooze(loadSnooze(active.id))
    setClosed(false)
    setShowAll(false)
  }, [active.id])

  const overdue = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const now = Date.now()
    return myTasks
      .filter(t => {
        if (!t.date_deadline) return false
        const due = new Date(t.date_deadline + 'T00:00:00')
        if (due >= today) return false                                   // pas en retard
        if (t.stage_id && DONE_RE.test(t.stage_id[1])) return false      // déjà terminée
        if (snooze[t.id] && now < snooze[t.id]) return false             // reportée
        return true
      })
      .sort((a, b) => a.date_deadline.localeCompare(b.date_deadline))     // plus ancienne d'abord
  }, [myTasks, snooze])

  if (closed || overdue.length === 0) return null

  const daysLate = (d) => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.floor((today - new Date(d + 'T00:00:00')) / 86_400_000)
  }

  function snoozeTasks(ids, ms) {
    const until = Date.now() + ms
    const next = { ...snooze }
    ids.forEach(id => { next[id] = until })
    setSnooze(next)
    saveSnooze(active.id, next)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={() => setClosed(true)}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', width: '100%',
          maxWidth: 560, maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)', overflow: 'hidden' }}>

        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.9rem 1.1rem',
          borderBottom: '1px solid var(--border)', background: 'var(--danger-light)' }}>
          <Bell size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontWeight: 800, color: 'var(--danger)' }}>
            Rappel — {overdue.length} tâche{overdue.length > 1 ? 's' : ''} en retard
          </div>
          <button onClick={() => setClosed(true)} title="Fermer"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Liste des tâches en retard (les plus en retard d'abord) */}
        <div style={{ overflowY: 'auto', padding: '.4rem 1.1rem' }}>
          {(showAll ? overdue : overdue.slice(0, TOP_N)).map(t => {
            const pid = Array.isArray(t.project_id) ? t.project_id[0] : 0
            const pname = Array.isArray(t.project_id) ? t.project_id[1] : 'Sans projet'
            const late = daysLate(t.date_deadline)
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '.6rem',
                padding: '.7rem 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{t.name}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.1rem' }}>
                    {pid ? <Link to={`/projects/${pid}`} onClick={() => setClosed(true)}
                      style={{ color: 'var(--primary)' }}>{pname}</Link> : pname}
                    {' · échéance '}{t.date_deadline}
                  </div>
                  <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--danger)', marginTop: '.15rem' }}>
                    <AlertTriangle size={12} style={{ verticalAlign: '-2px', flexShrink: 0 }} />
                    {' '}En retard de {late} jour{late > 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', flexShrink: 0 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => snoozeTasks([t.id], delayMs)}>
                    Reporter
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => snoozeTasks([t.id], DISMISS_MS)}
                    style={{ color: 'var(--text-muted)' }}>
                    Ignorer
                  </button>
                </div>
              </div>
            )
          })}

          {/* Ligne « + N autres… » dépliable */}
          {overdue.length > TOP_N && (
            <button onClick={() => setShowAll(v => !v)}
              style={{ width: '100%', textAlign: 'center', padding: '.7rem 0', background: 'transparent',
                border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 700, fontSize: '.82rem' }}>
              {showAll
                ? '▲ Afficher seulement les 10 plus en retard'
                : `▼ + ${overdue.length - TOP_N} autre${overdue.length - TOP_N > 1 ? 's' : ''} en retard…`}
            </button>
          )}
        </div>

        {/* Pied : actions globales */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap',
          padding: '.8rem 1.1rem', borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>Me rappeler dans :</span>
          <select value={delayMs} onChange={e => setDelayMs(Number(e.target.value))}
            style={{ padding: '.35rem .5rem', borderRadius: 6, border: '1.5px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)', fontSize: '.82rem' }}>
            {SNOOZE_OPTIONS.map(o => <option key={o.ms} value={o.ms}>{o.label}</option>)}
          </select>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm"
            onClick={() => snoozeTasks(overdue.map(t => t.id), delayMs)}>
            Tout reporter
          </button>
          <button className="btn btn-primary btn-sm"
            onClick={() => snoozeTasks(overdue.map(t => t.id), DISMISS_MS)}>
            Tout ignorer
          </button>
        </div>
      </div>
    </div>
  )
}
