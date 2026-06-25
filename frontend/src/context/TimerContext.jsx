import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'
import { queueAdd } from '../utils/offlineQueue'

const TimerContext = createContext(null)
const STORAGE_KEY      = 'odoo_timer_v3'
const WORK_SECS        = 25 * 60   // 25 min focus
const SHORT_BREAK_SECS = 5  * 60   // 5 min break
const LONG_BREAK_SECS  = 25 * 60   // 25 min long break (every 4 pomodoros)

function loadTimer() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
}

// ── Web Audio: ascending C-maj arpeggio on work done, soft two-tone on break done
function _tone(freq, delayS, durS) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'sine'; o.frequency.value = freq
    const t0 = ctx.currentTime + delayS
    g.gain.setValueAtTime(0, t0)
    g.gain.linearRampToValueAtTime(0.32, t0 + 0.04)
    g.gain.exponentialRampToValueAtTime(0.001, t0 + durS)
    o.start(t0); o.stop(t0 + durS)
  } catch {}
}
function playWorkDone()  { [523, 659, 784, 1047].forEach((f, i) => _tone(f, i * 0.20, 0.55)) }
function playBreakDone() { [880, 660].forEach((f, i) => _tone(f, i * 0.28, 0.50)) }

// ── elapsed helpers ───────────────────────────────────────────────────────────
// workMs: accumulated work time (for timesheet); not updated during break
// breakMs: accumulated break time; resets each break phase
function computeElapsedSecs(t) {
  if (!t) return 0
  const base = t.phase === 'break' ? (t.breakMs || 0) : (t.workMs || 0)
  return Math.floor((base + (t.paused || !t.lastStart ? 0 : Date.now() - t.lastStart)) / 1000)
}

// ── TimerProvider ─────────────────────────────────────────────────────────────
export function TimerProvider({ children }) {
  const qc = useQueryClient()
  const [timer, setTimer]   = useState(loadTimer)
  const [elapsed, setElapsed] = useState(() => computeElapsedSecs(loadTimer()))
  const intervalRef   = useRef(null)
  const phaseEndedRef = useRef(false)

  const phaseSecs = timer?.phase === 'break'
    ? (timer.breakSecs || SHORT_BREAK_SECS)
    : WORK_SECS

  useEffect(() => {
    clearInterval(intervalRef.current)
    if (!timer || timer.paused) {
      setElapsed(computeElapsedSecs(timer))
      return
    }

    const curPhaseSecs = timer.phase === 'break'
      ? (timer.breakSecs || SHORT_BREAK_SECS)
      : WORK_SECS
    phaseEndedRef.current = false

    const tick = () => {
      const secs = computeElapsedSecs(timer)
      setElapsed(secs)
      if (secs >= curPhaseSecs && !phaseEndedRef.current) {
        phaseEndedRef.current = true
        clearInterval(intervalRef.current)
        const now = Date.now()
        const deltaMs = timer.lastStart ? now - timer.lastStart : 0

        if (timer.phase === 'work') {
          // Work done → transition to break
          playWorkDone()
          const newCount  = (timer.pomodoroCount || 0) + 1
          const breakSecs = newCount % 4 === 0 ? LONG_BREAK_SECS : SHORT_BREAK_SECS
          const updated = {
            ...timer,
            workMs: (timer.workMs || 0) + deltaMs,   // freeze total work time
            breakMs: 0,
            phase: 'break', breakSecs,
            lastStart: now, paused: false,
            pomodoroCount: newCount,
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          setTimer(updated); setElapsed(0)
          const label = newCount % 4 === 0 ? '🎉 Grande pause 25 min !' : `Pause ${breakSecs / 60} min`
          toast.success(`🍅 Pomodoro ${newCount} terminé ! ${label}`, { duration: 6000 })
        } else {
          // Break done → pause, wait for user
          playBreakDone()
          const updated = {
            ...timer,
            breakMs: (timer.breakMs || 0) + deltaMs,
            paused: true, lastStart: null,
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
          setTimer(updated); setElapsed(curPhaseSecs)
          toast('☀️ Pause terminée — prêt pour le prochain Pomodoro ?', { duration: 8000 })
        }
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => clearInterval(intervalRef.current)
  }, [timer])

  // ── Actions ───────────────────────────────────────────────────────────────
  function start(task) {
    clearInterval(intervalRef.current)
    const t = {
      ...task,
      workMs: 0, breakMs: 0,
      lastStart: Date.now(), paused: false,
      phase: 'work', pomodoroCount: 0,
      breakSecs: SHORT_BREAK_SECS,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
    setTimer(t); setElapsed(0)
  }

  function pause() {
    if (!timer || timer.paused) return
    clearInterval(intervalRef.current)
    const now = Date.now(), deltaMs = timer.lastStart ? now - timer.lastStart : 0
    const updated = {
      ...timer,
      ...(timer.phase === 'work'
        ? { workMs: (timer.workMs || 0) + deltaMs }
        : { breakMs: (timer.breakMs || 0) + deltaMs }),
      paused: true, lastStart: null,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setTimer(updated)
    setElapsed(computeElapsedSecs(updated))
  }

  function resume() {
    if (!timer || !timer.paused) return
    const updated = { ...timer, paused: false, lastStart: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setTimer(updated)
  }

  // Skip break → start next work session immediately
  function skipBreak() {
    if (!timer) return
    clearInterval(intervalRef.current)
    const updated = {
      ...timer,
      phase: 'work', breakMs: 0,
      lastStart: Date.now(), paused: false,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setTimer(updated); setElapsed(0)
  }

  async function stop() {
    if (!timer) return
    clearInterval(intervalRef.current)
    const now = Date.now()
    // Total work = frozen workMs + any running work segment (work phase only)
    const finalWorkMs = (timer.workMs || 0) +
      (timer.phase === 'work' && !timer.paused && timer.lastStart
        ? now - timer.lastStart : 0)

    localStorage.removeItem(STORAGE_KEY)
    setTimer(null); setElapsed(0)

    if (!timer.projectId || finalWorkMs < 60_000) {
      if (finalWorkMs < 60_000) toast('Durée trop courte — non enregistré')
      return
    }
    const hours = parseFloat(Math.max(0.08, finalWorkMs / 3_600_000).toFixed(2))
    const entry = {
      employee_id: timer.employeeId, project_id: timer.projectId,
      task_id: timer.taskId || null, name: timer.taskName || 'Pomodoro',
      date: format(new Date(), 'yyyy-MM-dd'), unit_amount: hours,
    }
    if (!navigator.onLine) {
      queueAdd(entry)
      toast.success(`Hors-ligne — ${hours}h en attente de sync`, { duration: 5000 })
    } else {
      try {
        await api.createTimesheet(entry)
        qc.invalidateQueries({ queryKey: ['timesheets-today'] })
        qc.invalidateQueries({ queryKey: ['timesheets-2weeks'] })
        toast.success(`✅ ${hours}h enregistrées → ${timer.projectName}`)
      } catch {
        queueAdd(entry)
        toast.error(`Erreur réseau — ${hours}h sauvegardées localement`, { duration: 5000 })
      }
    }
  }

  function cancel() {
    clearInterval(intervalRef.current)
    localStorage.removeItem(STORAGE_KEY)
    setTimer(null); setElapsed(0)
  }

  return (
    <TimerContext.Provider value={{
      timer, elapsed,
      remaining: Math.max(0, phaseSecs - elapsed),
      progress:  Math.min(1, elapsed / (phaseSecs || 1)),
      phaseSecs,
      isRunning: !!timer,
      isPaused:  timer?.paused  || false,
      phase:     timer?.phase   || 'work',
      pomodoroCount: timer?.pomodoroCount || 0,
      runningTaskId: timer?.taskId || null,
      start, pause, resume, stop, cancel, skipBreak,
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

export function formatCountdown(secs) {
  const m = Math.floor(Math.max(0, secs) / 60)
  const s = Math.max(0, secs) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
