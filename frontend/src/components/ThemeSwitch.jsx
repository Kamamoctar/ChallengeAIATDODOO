import { useTheme } from '../context/ThemeContext'

export default function ThemeSwitch({ compact = false }) {
  const { isDark, toggle } = useTheme()

  if (compact) {
    return (
      <button
        onClick={toggle}
        className={`theme-switch-pill${isDark ? ' theme-switch-pill--dark' : ''}`}
        title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        aria-label="Changer le thème"
      >
        <span className="theme-switch-pill-icon">☀️</span>
        <span className={`theme-switch-pill-thumb${isDark ? ' theme-switch-pill-thumb--dark' : ''}`} />
        <span className="theme-switch-pill-icon">🌙</span>
      </button>
    )
  }

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
        {isDark ? 'Sombre' : 'Clair'}
      </span>
    </div>
  )
}
