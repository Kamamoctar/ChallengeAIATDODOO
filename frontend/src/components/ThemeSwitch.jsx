import { useTheme } from '../context/ThemeContext'

export default function ThemeSwitch({ iconOnly = false }) {
  const { isDark, toggle } = useTheme()

  /* Variante icône seule — en-tête de la sidebar */
  if (iconOnly) {
    return (
      <button
        onClick={toggle}
        title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        style={{
          width: 34, height: 34,
          borderRadius: 8,
          border: '1.5px solid var(--border)',
          background: 'var(--bg)',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
          flexShrink: 0,
          transition: 'border-color .15s, background .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
      >
        {isDark ? '☀️' : '🌙'}
      </button>
    )
  }

  /* Variante complète — barre mobile + éventuellement sidebar bas */
  return (
    <div
      onClick={toggle}
      className="theme-switch"
      role="switch"
      aria-checked={isDark}
      tabIndex={0}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggle()}
      title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
    >
      <span className="theme-switch-label">☀️</span>
      <div className={`theme-switch-track${isDark ? ' theme-switch-track--on' : ''}`}>
        <div className="theme-switch-thumb">
          <span>{isDark ? '🌙' : '☀️'}</span>
        </div>
      </div>
      <span className="theme-switch-label">🌙</span>
      <span className="theme-switch-text">
        {isDark ? 'Mode sombre' : 'Mode clair'}
      </span>
    </div>
  )
}
