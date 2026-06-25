import { Clock, Brain, Play, Square, Pause, Circle, X, Timer } from 'lucide-react'
import { useTimer, formatElapsed, POMODORO_CHOICES } from '../context/TimerContext'

export default function FloatingTimer() {
  const { timer, elapsed, isRunning, isPaused, autoStopped, pomodoros, estimateHours,
    pomodoroMin, setPomodoroMin, stop, pause, resume, cancel } = useTimer()

  if (!isRunning) return null

  // Comparaison au temps estimé de la tâche
  const estimateMin = Math.round((estimateHours || 0) * 60)
  const doneMin = Math.round(elapsed / 60)
  const overEstimate = estimateMin > 0 && doneMin > estimateMin

  if (autoStopped) {
    return (
      <div style={{
        position: 'fixed', bottom: '4.5rem', left: '.75rem', right: '.75rem', zIndex: 200,
        background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
        color: '#fff', borderRadius: 16, padding: '1rem 1.1rem',
        boxShadow: '0 8px 32px rgba(10,75,139,.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.35rem' }}>
          <div style={{ fontWeight: 800, fontSize: '.9rem' }}>
            <Timer size={15} style={{ verticalAlign: '-2px', marginRight: 5, flexShrink: 0 }} />
            Pomodoro {pomodoros} terminé !
          </div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{formatElapsed(elapsed)}</span>
        </div>
        <div style={{ fontSize: '.78rem', opacity: .9, marginBottom: '.6rem', lineHeight: 1.4 }}>
          Temps de prendre une pause <Brain size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} />.
          {estimateMin > 0 && (
            <span style={{ display: 'block', marginTop: 3, fontWeight: 700 }}>
              {doneMin} min faites / estimé {estimateMin} min
              {overEstimate ? ` — dépassement de ${doneMin - estimateMin} min` : ' — dans les temps'}
            </span>
          )}
        </div>
        {/* Réglage de la durée du pomodoro */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.7rem', fontSize: '.72rem' }}>
          <span style={{ opacity: .8 }}>Durée d'un pomodoro :</span>
          {POMODORO_CHOICES.map(m => (
            <button key={m} onClick={() => setPomodoroMin(m)}
              style={{ border: '1px solid rgba(255,255,255,.4)', borderRadius: 14, padding: '2px 9px',
                cursor: 'pointer', fontWeight: 700, fontSize: '.72rem',
                background: pomodoroMin === m ? '#fff' : 'transparent',
                color: pomodoroMin === m ? 'var(--primary)' : '#fff' }}>
              {m} min
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={resume}
            style={{ flex: 1, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)',
              borderRadius: 8, padding: '8px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.8rem' }}>
            <Play size={14} style={{ verticalAlign: '-2px', marginRight: 4, flexShrink: 0 }} />Continuer
          </button>
          <button onClick={stop}
            style={{ flex: 1, background: '#fff', border: 'none',
              borderRadius: 8, padding: '8px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, fontSize: '.8rem' }}>
            <Square size={14} fill="currentColor" style={{ verticalAlign: '-2px', marginRight: 4, flexShrink: 0 }} />Stop & enregistrer
          </button>
          <button onClick={cancel}
            style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
              borderRadius: 8, padding: '8px 10px', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: '.75rem' }}>
            <X size={14} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: '4.5rem', right: '.75rem', zIndex: 200,
      background: isPaused
        ? 'linear-gradient(135deg, #5a7080, var(--primary-dark))'
        : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
      color: '#fff', borderRadius: 50, padding: '.55rem .9rem',
      boxShadow: '0 4px 16px rgba(10,75,139,.45)',
      display: 'flex', alignItems: 'center', gap: '.5rem',
      fontSize: '.82rem', fontWeight: 700,
      transition: 'background .3s',
    }}>
      <span style={{ animation: isPaused ? 'none' : 'pulse 1.5s infinite', display: 'inline-flex' }}>
        {isPaused
          ? <Pause size={14} fill="currentColor" />
          : <Circle size={10} fill="#ef4444" color="#ef4444" />}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 46, textAlign: 'center' }}>
        {formatElapsed(elapsed)}
      </span>
      {pomodoros > 0 && (
        <span title={`${pomodoros} pomodoro(s) accomplis`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: '.72rem',
            background: 'rgba(255,255,255,.2)', borderRadius: 12, padding: '1px 7px' }}>
          <Timer size={12} /> {pomodoros}
        </span>
      )}
      {timer?.taskName && (
        <span style={{ fontSize: '.68rem', opacity: .75, maxWidth: 72,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {timer.taskName}
        </span>
      )}
      {isPaused
        ? <button onClick={resume}
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 20,
              padding: '.2rem .55rem', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.75rem', whiteSpace: 'nowrap' }}>
            <Play size={13} style={{ verticalAlign: '-2px', marginRight: 3, flexShrink: 0 }} />Reprendre
          </button>
        : <button onClick={pause}
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 20,
              padding: '.2rem .55rem', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.75rem' }}>
            <Pause size={13} fill="currentColor" />
          </button>
      }
      <button onClick={stop}
        style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 20,
          padding: '.2rem .55rem', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.75rem', whiteSpace: 'nowrap' }}>
        <Square size={13} fill="currentColor" style={{ verticalAlign: '-2px', marginRight: 3, flexShrink: 0 }} />Stop
      </button>
      <button onClick={cancel}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)',
          cursor: 'pointer', fontSize: '.75rem', padding: '0 .1rem', display: 'inline-flex', alignItems: 'center' }}>
        <X size={14} />
      </button>
    </div>
  )
}
