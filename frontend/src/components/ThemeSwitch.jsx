import { Sun, Moon } from 'lucide-react'
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
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
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
      <span className="theme-switch-label"><Sun size={14} /></span>
      <div className={`theme-switch-track${isDark ? ' theme-switch-track--on' : ''}`}>
        <div className="theme-switch-thumb">
          <span>{isDark ? <Moon size={11} /> : <Sun size={11} />}</span>
        </div>
      </div>
      <span className="theme-switch-label"><Moon size={14} /></span>
      <span className="theme-switch-text">
        {isDark ? 'Mode sombre' : 'Mode clair'}
      </span>
    </div>
  )
}
