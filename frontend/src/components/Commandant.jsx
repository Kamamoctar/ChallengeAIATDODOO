import { useState, useRef, useEffect } from 'react'
import { X, Send } from 'lucide-react'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'

const SUGGESTIONS = ['Mes tâches en retard', 'Mes projets', 'Heures cette semaine', 'Avancement PDAAP']

// Mascotte « Commandant » : officier souriant (peau noire), képi militaire à étoile.
function CommandantMascot({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cm-skin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9a673e" /><stop offset="1" stopColor="#6e4426" />
        </linearGradient>
        <radialGradient id="cm-skinHi" cx="0.5" cy="0.38" r="0.62">
          <stop offset="0" stopColor="#ad7a4c" /><stop offset="1" stopColor="#8a5a36" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cm-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c4a73" /><stop offset="1" stopColor="#0a2238" />
        </linearGradient>
        <linearGradient id="cm-uni" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22344e" /><stop offset="1" stopColor="#16243a" />
        </linearGradient>
        <linearGradient id="cm-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe07a" /><stop offset="1" stopColor="#d6a521" />
        </linearGradient>
      </defs>

      {/* uniforme + épaulettes + col */}
      <path d="M7 64 C7 51 15 47 24 47 L40 47 C49 47 57 51 57 64 Z" fill="url(#cm-uni)" />
      <path d="M26 47 L32 56 L38 47 Z" fill="#e9eef3" />
      <path d="M26 47 L32 53 L29 47 Z" fill="#cfd8e0" /><path d="M38 47 L32 53 L35 47 Z" fill="#cfd8e0" />
      <path d="M32 50 L30 55 L32 60 L34 55 Z" fill="#8a1f2b" />
      <circle cx="24.5" cy="56" r="1.2" fill="url(#cm-gold)" /><circle cx="39.5" cy="56" r="1.2" fill="url(#cm-gold)" />
      <rect x="9" y="48" width="10" height="4.5" rx="2" fill="url(#cm-gold)" />
      <rect x="45" y="48" width="10" height="4.5" rx="2" fill="url(#cm-gold)" />
      <circle cx="13" cy="50.2" r="0.8" fill="#8a6510" /><circle cx="51" cy="50.2" r="0.8" fill="#8a6510" />

      {/* cou + oreilles + visage */}
      <path d="M27 41 H37 V49 Q32 51 27 49 Z" fill="#5e3a20" />
      <circle cx="19.5" cy="31" r="3" fill="url(#cm-skin)" /><circle cx="44.5" cy="31" r="3" fill="url(#cm-skin)" />
      <ellipse cx="32" cy="31" rx="13" ry="14" fill="url(#cm-skin)" />
      <ellipse cx="32" cy="29" rx="11" ry="12" fill="url(#cm-skinHi)" />

      {/* cheveux (tempes) */}
      <path d="M19.8 33.5 Q18.6 28 21.6 24.8" stroke="#150e07" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <path d="M44.2 33.5 Q45.4 28 42.4 24.8" stroke="#150e07" strokeWidth="2.6" strokeLinecap="round" fill="none" />

      {/* sourcils */}
      <path d="M24 27 Q27.6 25.3 30.5 26.9" stroke="#241509" strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M33.5 26.9 Q36.4 25.3 40 27" stroke="#241509" strokeWidth="1.7" strokeLinecap="round" fill="none" />

      {/* yeux */}
      <ellipse cx="27" cy="30.5" rx="2.4" ry="1.8" fill="#fff" />
      <ellipse cx="37" cy="30.5" rx="2.4" ry="1.8" fill="#fff" />
      <circle cx="27.3" cy="30.6" r="1.35" fill="#3a230f" /><circle cx="37.3" cy="30.6" r="1.35" fill="#3a230f" />
      <circle cx="27.3" cy="30.6" r="0.62" fill="#120c07" /><circle cx="37.3" cy="30.6" r="0.62" fill="#120c07" />
      <circle cx="27.85" cy="29.95" r="0.42" fill="#fff" /><circle cx="37.85" cy="29.95" r="0.42" fill="#fff" />

      {/* nez */}
      <path d="M32 31 Q33.3 33.6 31.4 34.6" stroke="#4f331c" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      {/* moustache + sourire + dents */}
      <path d="M28 36.3 Q32 34.7 36 36.3" stroke="#1f1308" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M26.5 37.2 Q32 42.6 37.5 37.2 Q32 39.6 26.5 37.2 Z" fill="#3a1f12" />
      <path d="M28.2 37.8 Q32 40 35.8 37.8 Q32 38.7 28.2 37.8 Z" fill="#fff" />

      {/* képi : dôme, bandeau, galon, visière, étoile */}
      <path d="M18 20 C17 6 47 6 46 20 Z" fill="url(#cm-cap)" />
      <path d="M19 12 C22 8 42 8 45 12 L45 15 C42 11 22 11 19 15 Z" fill="#ffffff" opacity="0.10" />
      <rect x="17" y="18.4" width="30" height="6.4" rx="2" fill="#0c2c47" />
      <rect x="17" y="23.3" width="30" height="1.7" fill="url(#cm-gold)" />
      <path d="M19 26 Q32 33 45 26 L45 24.4 Q32 30 19 24.4 Z" fill="#0a0f16" />
      <path d="M20 25.3 Q32 30.6 44 25.3" stroke="#33455a" strokeWidth="0.7" fill="none" />
      <polygon points="32,9 33.3,12.7 37.2,12.8 34.1,15.1 35.1,18.9 32,16.7 28.9,18.9 29.9,15.1 26.8,12.8 30.7,12.7"
        fill="url(#cm-gold)" stroke="#b8860b" strokeWidth="0.4" />
    </svg>
  )
}

// Rendu minimal : **gras** + retours à la ligne.
function renderText(text) {
  return String(text).split('\n').map((line, i) => (
    <div key={i}>
      {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={j}>{part.slice(2, -2)}</strong>
          : <span key={j}>{part}</span>
      )}
    </div>
  ))
}

export default function Commandant() {
  const { active, userId } = useTeam()
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([
    { from: 'bot', text: 'Bonjour, je suis **Commandant**. Posez-moi une question ou tapez **aide**.' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, open])

  async function send(text) {
    const message = (text ?? input).trim()
    if (!message || loading) return
    setMsgs(m => [...m, { from: 'me', text: message }])
    setInput(''); setLoading(true)
    try {
      const res = await api.commandant({
        message, user_id: userId, employee_id: active.id, employee_name: active.name,
      })
      setMsgs(m => [...m, { from: 'bot', text: res.reply || '…' }])
    } catch (e) {
      setMsgs(m => [...m, { from: 'bot', text: '⚠️ ' + e.message }])
    } finally { setLoading(false) }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button onClick={() => setOpen(o => !o)} aria-label="Commandant" title="Commandant"
        style={{ position: 'fixed', bottom: '4.5rem', left: '.75rem', zIndex: 200,
          width: 56, height: 56, borderRadius: '50%', border: '2px solid #f5c518', cursor: 'pointer',
          background: open ? 'linear-gradient(135deg, var(--primary), var(--primary-dark))'
            : 'linear-gradient(135deg, #6b7a3a, #3c4a22)',
          color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
        {open ? <X size={24} /> : <CommandantMascot size={40} />}
      </button>

      {/* Panneau de conversation */}
      {open && (
        <div style={{ position: 'fixed', bottom: '7.3rem', left: '.75rem', zIndex: 200,
          width: 'min(360px, calc(100vw - 1.5rem))', height: 'min(460px, calc(100vh - 9rem))',
          background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)',
          boxShadow: '0 10px 40px rgba(0,0,0,.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{ padding: '.7rem .9rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '.55rem',
            background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}>
            <span style={{ background: '#f5efe0', borderRadius: '50%', width: 30, height: 30, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CommandantMascot size={24} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '.92rem' }}>Commandant</div>
              <div style={{ fontSize: '.65rem', opacity: .85 }}>Assistant · {active.name.split(' ')[0]}</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><X size={18} /></button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start', maxWidth: '85%',
                background: m.from === 'me' ? 'var(--primary)' : 'var(--bg)',
                color: m.from === 'me' ? '#fff' : 'var(--text)',
                border: m.from === 'me' ? 'none' : '1px solid var(--border)',
                borderRadius: 12, padding: '.5rem .7rem', fontSize: '.82rem', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                {renderText(m.text)}
              </div>
            ))}
            {loading && <div style={{ alignSelf: 'flex-start', color: 'var(--text-muted)', fontSize: '.8rem' }}>Commandant écrit…</div>}
            <div ref={endRef} />
          </div>

          {/* Suggestions */}
          <div style={{ display: 'flex', gap: '.3rem', padding: '0 .6rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} disabled={loading}
                style={{ flexShrink: 0, fontSize: '.68rem', padding: '3px 8px', borderRadius: 999,
                  border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {s}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '.4rem', padding: '.6rem', borderTop: '1px solid var(--border)' }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Écrivez à Commandant…"
              style={{ flex: 1, padding: '.5rem .7rem', border: '1.5px solid var(--border)', borderRadius: 999, fontSize: '.85rem' }} />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
