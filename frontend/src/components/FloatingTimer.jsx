import { useTimer, formatElapsed } from '../context/TimerContext'

export default function FloatingTimer() {
  const { timer, elapsed, isRunning, isPaused, autoStopped, stop, pause, resume, cancel } = useTimer()

  if (!isRunning) return null

  if (autoStopped) {
    return (
      <div style={{
        position: 'fixed', bottom: '4.5rem', left: '.75rem', right: '.75rem', zIndex: 200,
        background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
        color: '#fff', borderRadius: 16, padding: '1rem 1.1rem',
        boxShadow: '0 8px 32px rgba(10,75,139,.4)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.35rem' }}>
          <div style={{ fontWeight: 800, fontSize: '.9rem' }}>⏰ 45 min de focus accomplis !</div>
          <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{formatElapsed(elapsed)}</span>
        </div>
        <div style={{ fontSize: '.78rem', opacity: .85, marginBottom: '.8rem', lineHeight: 1.4 }}>
          Temps de prendre une pause 🧘 — le temps sera enregistré quand vous stopperez.
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button onClick={resume}
            style={{ flex: 1, background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)',
              borderRadius: 8, padding: '8px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.8rem' }}>
            ▶ Continuer
          </button>
          <button onClick={stop}
            style={{ flex: 1, background: '#fff', border: 'none',
              borderRadius: 8, padding: '8px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, fontSize: '.8rem' }}>
            ■ Stop & enregistrer
          </button>
          <button onClick={cancel}
            style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)',
              borderRadius: 8, padding: '8px 10px', color: 'rgba(255,255,255,.7)', cursor: 'pointer', fontSize: '.75rem' }}>
            ✕
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
      <span style={{ animation: isPaused ? 'none' : 'pulse 1.5s infinite', fontSize: '.9rem' }}>
        {isPaused ? '⏸' : '🔴'}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', minWidth: 46, textAlign: 'center' }}>
        {formatElapsed(elapsed)}
      </span>
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
            ▶ Reprendre
          </button>
        : <button onClick={pause}
            style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 20,
              padding: '.2rem .55rem', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.75rem' }}>
            ⏸
          </button>
      }
      <button onClick={stop}
        style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 20,
          padding: '.2rem .55rem', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '.75rem', whiteSpace: 'nowrap' }}>
        ■ Stop
      </button>
      <button onClick={cancel}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.5)',
          cursor: 'pointer', fontSize: '.75rem', padding: '0 .1rem' }}>
        ✕
      </button>
    </div>
  )
}
