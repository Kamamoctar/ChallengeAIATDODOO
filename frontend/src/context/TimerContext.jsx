import { createContext, useContext, useState, useEffect, useRef } from 'react'

const TimerContext = createContext(null)
const STORAGE_KEY = 'odoo_timer'

export function TimerProvider({ children }) {
  const [timer, setTimer] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null } catch { return null }
  })
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef(null)

  useEffect(() => {
    if (timer?.startTime) {
      const tick = () => setElapsed(Math.floor((Date.now() - timer.startTime) / 1000))
      tick()
      intervalRef.current = setInterval(tick, 1000)
    } else {
      clearInterval(intervalRef.current)
      setElapsed(0)
    }
    return () => clearInterval(intervalRef.current)
  }, [timer])

  function start(task) {
    const t = { ...task, startTime: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(t))
    setTimer(t)
  }

  function stop() {
    if (!timer) return null
    const hours = elapsed / 3600
    const result = { ...timer, hours: Math.max(0.25, parseFloat(hours.toFixed(2))) }
    localStorage.removeItem(STORAGE_KEY)
    setTimer(null)
    return result
  }

  function cancel() {
    localStorage.removeItem(STORAGE_KEY)
    setTimer(null)
  }

  const isRunning = !!timer
  const runningTaskId = timer?.taskId || null

  return (
    <TimerContext.Provider value={{ timer, elapsed, isRunning, runningTaskId, start, stop, cancel }}>
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
