import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'
import { queueAdd } from '../utils/offlineQueue'

const TimerContext = createContext(null)
const STORAGE_KEY = 'odoo_timer_v2'
const AUTO_STOP_SECS = 45 * 60   // 45 minutes

function loadTimer() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
}

export function TimerProvider({ children }) {
  const qc = useQueryClient()
  const [timer, setTimer] = useState(loadTimer)
  const [elapsed, setElapsed] = useState(0)
  const [autoStopped, setAutoStopped] = useState(false)
  const intervalRef = useRef(null)

  const computeElapsed = useCallback((t) => {
    if (!t) return 0
    const work = (t.workMs || 0) + (t.paused || !t.lastStart ? 0 : Date.now() - t.lastStart)
    return Math.floor(work / 1000)
  }, [])

  useEffect(() => {
    clearInterval(intervalRef.current)

    if (!timer) { setElapsed(0); return }

    if (timer.paused) {
      setElapsed(computeElapsed(timer))
      return
    }

    const tick = () => {
      const secs = computeElapsed(timer)
      setElapsed(secs)

      if (secs >= AUTO_STOP_SECS) {
        clearInterval(intervalRef.current)
        const now = Date.now()
        const updated = {
          ...timer,
          workMs: (timer.workMs || 0) + (now - timer.lastStart),
          paused: true,
          lastStart: null,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        setTimer(updated)
        setAutoStopped(true)
        setElapsed(Math.floor(updated.workMs / 1000))
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => clearInterval(intervalRef.current)
  }, [timer, computeElapsed])

  function start(task) {
    clearInterval(intervalRef.current)
    const t = { ...task, workMs: 0, lastStart: Date.now(), paused: false }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
    setTimer(t)
    setAutoStopped(false)
    setElapsed(0)
  }

  function pause() {
    if (!timer || timer.paused) return
    clearInterval(intervalRef.current)
    const now = Date.now()
    const updated = {
      ...timer,
      workMs: (timer.workMs || 0) + (now - timer.lastStart),
      paused: true,
      lastStart: null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setTimer(updated)
    setElapsed(Math.floor(updated.workMs / 1000))
  }

  function resume() {
    if (!timer || !timer.paused) return
    const updated = { ...timer, paused: false, lastStart: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setTimer(updated)
    setAutoStopped(false)
  }

  async function stop() {
    if (!timer) return
    clearInterval(intervalRef.current)
    const finalWorkMs = (timer.workMs || 0) + (timer.paused || !timer.lastStart ? 0 : Date.now() - timer.lastStart)
    const hours = parseFloat(Math.max(0.08, finalWorkMs / 3600000).toFixed(2))
    const saved = { ...timer }

    localStorage.removeItem(STORAGE_KEY)
    setTimer(null)
    setElapsed(0)
    setAutoStopped(false)

    if (saved.projectId && finalWorkMs >= 60_000) {
      const entry = {
        employee_id: saved.employeeId,
        project_id: saved.projectId,
        task_id: saved.taskId || null,
        name: saved.taskName || 'Focus',
        date: format(new Date(), 'yyyy-MM-dd'),
        unit_amount: hours,
      }
      if (!navigator.onLine) {
        queueAdd(entry)
        toast.success(`Hors-ligne — ${hours}h mis en attente de sync`, { duration: 5000 })
      } else {
        try {
          await api.createTimesheet(entry)
          qc.invalidateQueries({ queryKey: ['timesheets-today'] })
          qc.invalidateQueries({ queryKey: ['timesheets-2weeks'] })
          toast.success(`${hours}h enregistrées → ${saved.projectName}`)
        } catch (e) {
          queueAdd(entry)
          toast.error(`Erreur réseau — ${hours}h sauvegardées localement`, { duration: 5000 })
        }
      }
    } else if (finalWorkMs < 60_000) {
      toast('Durée inférieure à 1 min — non enregistré')
    }
  }

  function cancel() {
    clearInterval(intervalRef.current)
    localStorage.removeItem(STORAGE_KEY)
    setTimer(null)
    setElapsed(0)
    setAutoStopped(false)
  }

  return (
    <TimerContext.Provider value={{
      timer, elapsed, isRunning: !!timer,
      isPaused: timer?.paused || false,
      autoStopped,
      runningTaskId: timer?.taskId || null,
      start, pause, resume, stop, cancel,
    }}>
      {children}
    </TimerContext.Provider>
  )
}

export function useTimer() { return useContext(TimerContext) }

export function formatElapsed(secs) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
