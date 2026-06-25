import { Play, Square, Pause, X, SkipForward } from 'lucide-react'
import { useTimer, formatCountdown, formatElapsed } from '../context/TimerContext'

// ── SVG circular progress ring ────────────────────────────────────────────────
function ProgressRing({ progress, isBreak, size = 88 }) {
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - Math.min(1, Math.max(0, progress)))
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      style={{ position: 'absolute', inset: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,.12)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={isBreak ? '#6ee7b7' : 'rgba(255,255,255,.88)'}
        strokeWidth={6}
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset .7s ease' }} />
    </svg>
  )
}

// ── Pomodoro dots ─────────────────────────────────────────────────────────────
function PomodoroDots({ count }) {
  const dots = []
  for (let i = 0; i < 4; i++) {
    dots.push(
      <span key={i} style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: i < (count % 4 || (count > 0 && count % 4 === 0 ? 4 : 0))
          ? 'rgba(255,255,255,.9)'
          : 'rgba(255,255,255,.2)',
        marginRight: 3,
        transition: 'background .3s',
      }} />
    )
  }
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, marginBottom: '.2rem' }}>{dots}</div>
}

const BTN = {
  background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)',
  borderRadius: 8, padding: '6px 10px', color: '#fff',
  cursor: 'pointer', fontWeight: 700, fontSize: '.78rem',
  display: 'flex', alignItems: 'center', gap: '.3rem', whiteSpace: 'nowrap',
}
const BTN_WHITE = {
  ...BTN, background: 'rgba(255,255,255,.92)', color: 'var(--primary)',
  border: 'none', flex: 1, justifyContent: 'center',
}
const BTN_GHOST = {
  background: 'none', border: 'none', color: 'rgba(255,255,255,.5)',
  cursor: 'pointer', padding: '6px 6px', display: 'flex', alignItems: 'center',
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FloatingTimer() {
  const {
    timer, elapsed, remaining, progress,
    isRunning, isPaused, phase, pomodoroCount,
    stop, pause, resume, cancel, skipBreak,
  } = useTimer()

  if (!isRunning) return null

  const isBreak = phase === 'break'
  const isBreakDone = isBreak && isPaused
  const RING_SIZE = 96

  const gradient = isBreak
    ? 'linear-gradient(135deg, #065f46, #059669)'
    : isPaused
    ? 'linear-gradient(135deg, #334155, #1e40af)'
    : 'linear-gradient(135deg, var(--primary), var(--primary-dark))'

  return (
    <div style={{
      position: 'fixed', bottom: '4.5rem', right: '.75rem', zIndex: 200,
      background: gradient,
      color: '#fff', borderRadius: 20, padding: '.85rem 1rem',
      boxShadow: '0 8px 32px rgba(0,0,0,.35)',
      width: 210, transition: 'background .4s',
    }}>

      {/* Top: pomodoro dots + cycle label */}
      <div style={{ textAlign: 'center', marginBottom: '.2rem' }}>
        <PomodoroDots count={pomodoroCount} />
        <div style={{ fontSize: '.6rem', opacity: .65, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
          {pomodoroCount > 0 && `${pomodoroCount} pomodoro${pomodoroCount > 1 ? 's' : ''} · `}
          {isBreakDone ? 'pause terminée' : isBreak ? 'pause' : isPaused ? 'en pause' : 'focus'}
        </div>
      </div>

      {/* Ring with countdown */}
      <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, margin: '.3rem auto' }}>
        <ProgressRing progress={progress} isBreak={isBreak} size={RING_SIZE} />
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontSize: '1.45rem', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-.02em', lineHeight: 1,
          }}>
            {isBreakDone
              ? '☀️'
              : formatCountdown(remaining)}
          </span>
          {!isBreakDone && (
            <span style={{ fontSize: '.55rem', opacity: .6, fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>
              {isBreak ? `/ ${(timer?.breakSecs || 300) / 60} min` : '/ 25 min'}
            </span>
          )}
        </div>
      </div>

      {/* Task name */}
      {timer?.taskName && (
        <div style={{
          textAlign: 'center', fontSize: '.7rem', opacity: .7,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          marginBottom: '.55rem',
        }}>
          {timer.taskName}
        </div>
      )}

      {/* Break-done state */}
      {isBreakDone ? (
        <div>
          <div style={{ textAlign: 'center', fontSize: '.72rem', fontWeight: 700, marginBottom: '.5rem', opacity: .9 }}>
            Prêt pour le suivant ?
          </div>
          <div style={{ display: 'flex', gap: '.4rem' }}>
            <button onClick={skipBreak} style={BTN_WHITE}>
              <Play size={13} fill="currentColor" /> Démarrer
            </button>
            <button onClick={stop} style={{ ...BTN, flex: 1, justifyContent: 'center' }}>
              <Square size={13} fill="currentColor" /> Stop
            </button>
          </div>
        </div>
      ) : isBreak ? (
        /* Break in progress */
        <div style={{ display: 'flex', gap: '.4rem' }}>
          {isPaused
            ? <button onClick={resume} style={{ ...BTN, flex: 1, justifyContent: 'center' }}>
                <Play size={13} fill="currentColor" /> Reprendre pause
              </button>
            : <button onClick={pause} style={{ ...BTN, flex: 1, justifyContent: 'center' }}>
                <Pause size={13} fill="currentColor" /> Pause
              </button>
          }
          <button onClick={skipBreak} title="Sauter la pause"
            style={{ ...BTN, padding: '6px 8px' }}>
            <SkipForward size={14} />
          </button>
          <button onClick={stop} title="Arrêter et enregistrer" style={BTN_GHOST}>
            <Square size={13} fill="currentColor" color="rgba(255,255,255,.6)" />
          </button>
        </div>
      ) : (
        /* Work in progress */
        <div style={{ display: 'flex', gap: '.4rem' }}>
          {isPaused
            ? <button onClick={resume} style={BTN_WHITE}>
                <Play size={13} fill="currentColor" /> Reprendre
              </button>
            : <button onClick={pause} style={{ ...BTN, flex: 1, justifyContent: 'center' }}>
                <Pause size={13} fill="currentColor" /> Pause
              </button>
          }
          <button onClick={stop} style={{ ...BTN, padding: '6px 9px' }}
            title={`Stop · enregistre ${formatElapsed(elapsed)}`}>
            <Square size={13} fill="currentColor" />
          </button>
          <button onClick={cancel} style={BTN_GHOST} title="Annuler (sans enregistrer)">
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
