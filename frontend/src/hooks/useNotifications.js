import { useEffect, useRef } from 'react'
import { differenceInDays, parseISO, format } from 'date-fns'

const SEEN_KEY = 'atd_notif_seen'

export function useDeadlineNotifications(projects = []) {
  const askedPermission = useRef(false)

  useEffect(() => {
    if (!('Notification' in window) || projects.length === 0) return

    async function check() {
      if (Notification.permission === 'default' && !askedPermission.current) {
        askedPermission.current = true
        await Notification.requestPermission()
      }
      if (Notification.permission !== 'granted') return

      const today = format(new Date(), 'yyyy-MM-dd')
      const seen = (() => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') } catch { return {} } })()
      const key = `${today}_deadline`
      if (seen[key]) return

      const overdue = projects.filter(p => p.date && differenceInDays(parseISO(p.date), new Date()) < 0)
      const imminent = projects.filter(p => {
        if (!p.date) return false
        const d = differenceInDays(parseISO(p.date), new Date())
        return d >= 0 && d <= 3
      })

      let notified = false
      if (overdue.length > 0) {
        new Notification('ATD — Projets en retard', {
          body: `${overdue.length} projet(s) ont dépassé leur deadline`,
          icon: '/LOGO_ATD.png',
          tag: 'deadline-overdue',
        })
        notified = true
      } else if (imminent.length > 0) {
        new Notification('ATD — Deadlines dans 3 jours', {
          body: imminent.map(p => p.name).join(', '),
          icon: '/LOGO_ATD.png',
          tag: 'deadline-imminent',
        })
        notified = true
      }

      if (notified) {
        seen[key] = true
        localStorage.setItem(SEEN_KEY, JSON.stringify(seen))
      }
    }

    check()
  }, [projects])
}
