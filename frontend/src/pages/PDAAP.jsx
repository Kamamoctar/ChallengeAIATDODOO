import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  Landmark, LayoutDashboard, Wrench, Users, AlertTriangle, Building2,
  X, Pencil, Plus, Clock,
} from 'lucide-react'
import { api } from '../api/odoo'

const STATUS = {
  'Fini':        { c: '#16a34a', bg: '#f0fdf4' },
  'En cours':    { c: '#2563eb', bg: '#eff6ff' },
  'Retardé':     { c: '#b45309', bg: '#fffbeb' },
  'Bloqué':      { c: '#dc2626', bg: '#fef2f2' },
  'Non démarré': { c: '#64748b', bg: '#f1f5f9' },
}
const STATUS_OPTS = Object.keys(STATUS)
const IMPACT = { 'Élevé': { c: '#dc2626', bg: '#fef2f2' }, 'Moyen': { c: '#b45309', bg: '#fffbeb' }, 'Faible': { c: '#16a34a', bg: '#f0fdf4' } }
const MIN_STATUS = {
  'Terminé':     { c: '#16a34a', bg: '#f0fdf4' },
  'En cours':    { c: '#2563eb', bg: '#eff6ff' },
  'Non démarré': { c: '#64748b', bg: '#f1f5f9' },
  'N/A':         { c: '#94a3b8', bg: '#f8fafc' },
}
const MIN_STATUS_OPTS = Object.keys(MIN_STATUS)
const ARB_STATUS = ['Ouvert', 'En traitement', 'Clos']

// Encode des métadonnées en base64 dans un <p> (résiste au nettoyeur HTML d'Odoo).
function pdaapMeta(obj) {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
  return `<p>PDAAP-META:${b64}</p>`
}

const SUBTABS = [
  { key: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
  { key: 'chantiers', label: 'Chantiers', icon: Wrench },
  { key: 'acteurs', label: 'Acteurs & Gouvernance', icon: Users },
  { key: 'arbitrages', label: 'Arbitrages', icon: AlertTriangle },
  { key: 'ministeres', label: 'Ministères', icon: Building2 },
]

function StatusChip({ status }) {
  const s = STATUS[status] || STATUS['Non démarré']
  return <span style={{ fontSize: '.66rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999,
    color: s.c, background: s.bg, whiteSpace: 'nowrap' }}>{status || '—'}</span>
}

function Bar({ pct, color = 'var(--primary)' }) {
  return (
    <div style={{ height: 7, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width .4s' }} />
    </div>
  )
}

export default function PDAAP() {
  const qc = useQueryClient()
  const [sub, setSub] = useState('overview')
  const [editCh, setEditCh] = useState(null)     // chantier en édition
  const [editArb, setEditArb] = useState(null)   // arbitrage en édition
  const [editMin, setEditMin] = useState(null)   // ministère (vue 360)
  const [mStatus, setMStatus] = useState('all')
  const [mInteg, setMInteg] = useState('all')
  const [mSearch, setMSearch] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['pdaap'], queryFn: api.getPdaap, staleTime: 60_000 })

  if (isLoading) return <div className="loading" style={{ padding: '2rem' }}>Chargement du PDAAP…</div>
  const d = data || {}
  const chantiers = d.chantiers || [], acteurs = d.acteurs || [], gouvernance = d.gouvernance || []
  const arbitrages = d.arbitrages || [], ministeres = d.ministeres || [], kpis = d.kpis || {}
  const integrators = d.integrators || [], statusCounts = d.statusCounts || {}
  const filteredMin = ministeres.filter(m =>
    (mStatus === 'all' || m.status === mStatus) &&
    (mInteg === 'all' || m.integrator === mInteg) &&
    (!mSearch || `${m.name} ${m.chefs || ''} ${m.short || ''}`.toLowerCase().includes(mSearch.toLowerCase())))

  async function saveChantier(form) {
    try {
      await api.updateTask(form.id, {
        name: `[PDAAP-CHANTIER] ${form.name}`,
        description: pdaapMeta({ order: form.order, actor: form.actor, status: form.status,
          progress: Number(form.progress) || 0, deadline: form.deadline, nextAction: form.nextAction }),
      })
      toast.success('Chantier mis à jour')
      qc.invalidateQueries({ queryKey: ['pdaap'] }); setEditCh(null)
    } catch (e) { toast.error(e.message) }
  }

  async function saveArbitrage(form) {
    try {
      const meta = { order: form.order, impact: form.impact, detail: form.detail,
        mitigation: form.mitigation, status: form.status, owner: form.owner, due: form.due }
      if (form.id) {
        await api.updateTask(form.id, { name: `[PDAAP-ARBITRAGE] ${form.name}`, description: pdaapMeta(meta) })
      } else {
        await api.createTask({ name: `[PDAAP-ARBITRAGE] ${form.name}`, project_id: d.project_id, description: pdaapMeta(meta) })
      }
      toast.success('Arbitrage enregistré')
      qc.invalidateQueries({ queryKey: ['pdaap'] }); setEditArb(null)
    } catch (e) { toast.error(e.message) }
  }

  async function saveMinistere(form) {
    try {
      const meta = {
        order: form.order, short: form.short, services: form.services,
        startDate: form.startDate, endDate: form.endDate, status: form.status,
        chefs: form.chefs, integrator: form.integrator, projectId: form.projectId || null,
        chantiers: (form.chantiers || []).map(c => ({ name: c.name, status: c.status, progress: Number(c.progress) || 0 })),
      }
      await api.updateTask(form.id, { name: `[PDAAP-MIN] ${form.name}`, description: pdaapMeta(meta) })
      toast.success('Ministère mis à jour')
      qc.invalidateQueries({ queryKey: ['pdaap'] }); setEditMin(null)
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* En-tête programme */}
      <header style={{ padding: '1rem 1.25rem', color: '#fff',
        background: 'linear-gradient(120deg, #0a4b8b, #139cbc)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
          <Landmark size={22} />
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>PDAAP</div>
            <div style={{ fontSize: '.74rem', opacity: .85 }}>Digitalisation Accélérée des Administrations Publiques</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, lineHeight: 1 }}>{d.health ?? 0}%</div>
            <div style={{ fontSize: '.66rem', opacity: .85 }}>santé globale</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', marginTop: '.8rem', flexWrap: 'wrap' }}>
          {[[kpis.weeks, 'sem./ministère'], [kpis.chantiers, 'chantiers'], [kpis.acteurs, 'acteurs'],
            [kpis.ministeres, 'ministères'], [kpis.arbitrages_ouverts, 'arbitrages ouverts']].map(([v, l], i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.15)', borderRadius: 8, padding: '.4rem .7rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{v ?? '—'}</div>
              <div style={{ fontSize: '.62rem', opacity: .9 }}>{l}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Sous-onglets */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        display: 'flex', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {SUBTABS.map(t => {
          const on = sub === t.key
          return (
            <button key={t.key} onClick={() => setSub(t.key)}
              style={{ flexShrink: 0, padding: '.6rem .85rem', border: 'none', cursor: 'pointer',
                fontSize: '.76rem', fontWeight: on ? 800 : 600, background: 'transparent',
                color: on ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: on ? '2.5px solid var(--primary)' : '2.5px solid transparent',
                display: 'flex', alignItems: 'center', gap: '.35rem' }}>
              <t.icon size={14} fill={on ? 'currentColor' : 'none'} /> {t.label}
            </button>
          )
        })}
      </div>

      <main className="page">
        {/* ── VUE D'ENSEMBLE ── */}
        {sub === 'overview' && (
          <>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-title">Avancement des 7 chantiers</div>
              {chantiers.map(c => (
                <div key={c.id} style={{ marginBottom: '.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.78rem', marginBottom: 3 }}>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                      <StatusChip status={c.status} /><b>{c.progress ?? 0}%</b>
                    </span>
                  </div>
                  <Bar pct={c.progress ?? 0} color={(STATUS[c.status] || {}).c} />
                </div>
              ))}
            </div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div className="card-title">Arbitrages critiques</div>
              {arbitrages.filter(a => a.impact === 'Élevé' && a.status !== 'Clos').slice(0, 4).map(a => (
                <div key={a.id} style={{ padding: '.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '.83rem', fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>→ {a.mitigation}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">Prochaines instances de gouvernance</div>
              {gouvernance.map(g => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0',
                  borderBottom: '1px solid var(--border)', fontSize: '.82rem' }}>
                  <span style={{ fontWeight: 600 }}>{g.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{g.frequency} · {g.nextDate || '—'}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── CHANTIERS ── */}
        {sub === 'chantiers' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '.75rem' }}>
            {chantiers.map(c => (
              <div key={c.id} className="card" style={{ borderTop: `3px solid ${(STATUS[c.status] || {}).c || 'var(--border)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.4rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '.88rem' }}>{c.name}</div>
                  <button onClick={() => setEditCh({ ...c })} className="btn btn-ghost btn-sm" style={{ padding: '3px 6px' }}>
                    <Pencil size={13} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', margin: '.5rem 0' }}>
                  <StatusChip status={c.status} /><b style={{ fontSize: '.85rem' }}>{c.progress ?? 0}%</b>
                </div>
                <Bar pct={c.progress ?? 0} color={(STATUS[c.status] || {}).c} />
                <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '.5rem' }}>
                  <div>👤 {c.actor || '—'}</div>
                  <div><Clock size={11} style={{ verticalAlign: '-1px' }} /> {c.deadline || '—'}</div>
                  <div style={{ marginTop: '.25rem', color: 'var(--text)' }}>➜ {c.nextAction || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ACTEURS & GOUVERNANCE ── */}
        {sub === 'acteurs' && (
          <>
            <div className="section-title">Écosystème des acteurs</div>
            <div className="card" style={{ marginBottom: '1rem' }}>
              {acteurs.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '.5rem 0',
                  borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 700, fontSize: '.85rem' }}>{a.name}</span>
                  <span style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>{a.role}</span>
                </div>
              ))}
            </div>
            <div className="section-title">Gouvernance à 3 niveaux</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '.75rem' }}>
              {gouvernance.map(g => (
                <div key={g.id} className="card">
                  <div style={{ fontWeight: 800, fontSize: '.9rem', color: 'var(--primary)' }}>{g.name}</div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-muted)', marginTop: '.3rem' }}>{g.role}</div>
                  <div style={{ fontSize: '.72rem', marginTop: '.4rem' }}>
                    <b>{g.frequency}</b> · prochaine : {g.nextDate || '—'}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── ARBITRAGES ── */}
        {sub === 'arbitrages' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
              <span style={{ fontSize: '.8rem', color: 'var(--text-muted)' }}>{arbitrages.length} point(s) d'attention</span>
              <button className="btn btn-primary btn-sm" onClick={() => setEditArb({ impact: 'Élevé', status: 'Ouvert', order: arbitrages.length })}>
                <Plus size={14} style={{ verticalAlign: '-2px' }} /> Ajouter
              </button>
            </div>
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem', minWidth: 600 }}>
                <thead><tr style={{ background: 'var(--bg)' }}>
                  {['Point d\'attention', 'Impact', 'Mitigation', 'Statut', 'Resp.', 'Délai', ''].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '.66rem', fontWeight: 700,
                      color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {arbitrages.map(a => {
                    const im = IMPACT[a.impact] || {}
                    return (
                      <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600, maxWidth: 200 }}>{a.name}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <span style={{ fontSize: '.66rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, color: im.c, background: im.bg }}>{a.impact}</span>
                        </td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)', maxWidth: 200 }}>{a.mitigation}</td>
                        <td style={{ padding: '8px 10px' }}>{a.status}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{a.owner || '—'}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{a.due || '—'}</td>
                        <td style={{ padding: '6px' }}>
                          <button onClick={() => setEditArb({ ...a })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }}>
                            <Pencil size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── MINISTÈRES (onboarding) ── */}
        {sub === 'ministeres' && (
          <>
            {/* Carte des intégrateurs */}
            <div className="section-title">Intégrateurs</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '.6rem', marginBottom: '.9rem' }}>
              {integrators.map(it => (
                <div key={it.integrator} className="card" style={{ padding: '.7rem .85rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '.85rem' }}>{it.integrator}</div>
                  <div style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>{it.count} ministère(s) · {it.avgProgress}% moyen</div>
                  <div style={{ marginTop: 5 }}><Bar pct={it.avgProgress} /></div>
                </div>
              ))}
            </div>

            {/* Compteurs de statut */}
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.6rem' }}>
              {['Terminé', 'En cours', 'Non démarré', 'N/A'].map(s => {
                const st = MIN_STATUS[s]
                return <span key={s} style={{ fontSize: '.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: st.c, background: st.bg }}>
                  {statusCounts[s] || 0} {s}
                </span>
              })}
            </div>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.6rem', alignItems: 'center' }}>
              <input value={mSearch} onChange={e => setMSearch(e.target.value)} placeholder="Rechercher un ministère / chef…"
                style={{ flex: '1 1 160px', padding: '.4rem .6rem', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '.82rem' }} />
              <select value={mStatus} onChange={e => setMStatus(e.target.value)} style={selStyle}>
                <option value="all">Tous statuts</option>
                {MIN_STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <select value={mInteg} onChange={e => setMInteg(e.target.value)} style={selStyle}>
                <option value="all">Tous intégrateurs</option>
                {integrators.map(it => <option key={it.integrator}>{it.integrator}</option>)}
              </select>
            </div>

            {/* Tableau */}
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem', minWidth: 700 }}>
                <thead><tr style={{ background: 'var(--bg)' }}>
                  {['#', 'Ministère', 'Statut', 'Serv.', 'Démarrage', 'Fin', 'Chefs ATD', 'Intégrateur', 'Avanc.', ''].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredMin.map(m => {
                    const s = MIN_STATUS[m.status] || MIN_STATUS['Non démarré']
                    return (
                      <tr key={m.id} onClick={() => setEditMin({ ...m, chantiers: (m.chantiers || []).map(c => ({ ...c })) })}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                        <td style={tdStyle}>{m.order}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 230, whiteSpace: 'normal' }}>{m.name}</td>
                        <td style={tdStyle}><span style={{ fontSize: '.64rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: s.c, background: s.bg }}>{m.status}</span></td>
                        <td style={tdStyle}>{m.services}</td>
                        <td style={tdStyle}>{m.startDate || '—'}</td>
                        <td style={tdStyle}>{m.endDate || '—'}</td>
                        <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{m.chefs}</td>
                        <td style={tdStyle}>{m.integrator}</td>
                        <td style={{ ...tdStyle, minWidth: 90 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ flex: 1 }}><Bar pct={m.progress} color={s.c} /></div>
                            <b style={{ fontSize: '.72rem' }}>{m.progress}%</b>
                          </div>
                        </td>
                        <td style={tdStyle}><Pencil size={13} color="var(--primary)" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', marginTop: '.4rem' }}>
              {filteredMin.length} / {ministeres.length} ministères · cliquez une ligne pour la vue 360
            </div>
          </>
        )}
      </main>

      {/* ── MODALE ÉDITION CHANTIER ── */}
      {editCh && <ChantierModal c={editCh} onClose={() => setEditCh(null)} onSave={saveChantier} />}
      {editArb && <ArbitrageModal a={editArb} onClose={() => setEditArb(null)} onSave={saveArbitrage} />}
      {editMin && <MinistereModal m={editMin} onClose={() => setEditMin(null)} onSave={saveMinistere} />}
    </div>
  )
}

function Modal({ title, children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)',
        width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '.85rem 1.1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ flex: 1, fontWeight: 800 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>
        <div style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '.6rem' }}>{children}</div>
      </div>
    </div>
  )
}

const lbl = { fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 700 }
const inp = { width: '100%', marginTop: 3, padding: '.5rem .6rem', borderRadius: 8,
  border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '.9rem' }
const selStyle = { padding: '.4rem .5rem', border: '1.5px solid var(--border)', borderRadius: 8,
  fontSize: '.8rem', background: 'var(--surface)', color: 'var(--text)' }
const thStyle = { padding: '8px 10px', textAlign: 'left', fontSize: '.62rem', fontWeight: 700,
  color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }
const tdStyle = { padding: '7px 10px', whiteSpace: 'nowrap' }

// Vue 360 d'un ministère : ses infos + ses 7 chantiers éditables.
function MinistereModal({ m, onClose, onSave }) {
  const [f, setF] = useState(m)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const setCh = (i, k, v) => setF(p => ({ ...p, chantiers: p.chantiers.map((c, j) => j === i ? { ...c, [k]: v } : c) }))
  const avg = f.chantiers?.length ? Math.round(f.chantiers.reduce((s, c) => s + (Number(c.progress) || 0), 0) / f.chantiers.length) : 0
  return (
    <Modal title={`360° — ${m.name}`} onClose={onClose}>
      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', fontSize: '.74rem', color: 'var(--text-muted)' }}>
        <span><b>Intégrateur :</b> {f.integrator}</span>
        <span><b>Chefs ATD :</b> {f.chefs}</span>
        <span><b>Services :</b> {f.services}</span>
        <span><b>{f.startDate || '—'} → {f.endDate || '—'}</b></span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
        <label style={lbl}>Statut du ministère
          <select style={inp} value={f.status} onChange={e => set('status', e.target.value)}>
            {MIN_STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
        <div style={{ alignSelf: 'flex-end', textAlign: 'right' }}>
          <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>Avancement 360</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>{avg}%</div>
        </div>
      </div>

      <div style={{ fontWeight: 800, fontSize: '.8rem', marginTop: '.3rem' }}>Les 7 chantiers</div>
      {(f.chantiers || []).map((c, i) => {
        const st = STATUS[c.status] || STATUS['Non démarré']
        return (
          <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '.5rem .6rem',
            borderLeft: `3px solid ${st.c}` }}>
            <div style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.35rem' }}>{c.name}</div>
            <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
              <select value={c.status} onChange={e => setCh(i, 'status', e.target.value)}
                style={{ ...selStyle, flex: 1 }}>
                {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <input type="number" min="0" max="100" value={c.progress ?? 0}
                onChange={e => setCh(i, 'progress', e.target.value)}
                style={{ width: 70, padding: '.35rem .4rem', border: '1.5px solid var(--border)', borderRadius: 8, fontSize: '.82rem' }} />
              <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>%</span>
            </div>
          </div>
        )
      })}
      <button className="btn btn-primary" onClick={() => onSave(f)}>Enregistrer la fiche 360</button>
    </Modal>
  )
}

function ChantierModal({ c, onClose, onSave }) {
  const [f, setF] = useState(c)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <Modal title={`Chantier — ${c.name}`} onClose={onClose}>
      <label style={lbl}>Statut
        <select style={inp} value={f.status || ''} onChange={e => set('status', e.target.value)}>
          {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
        </select>
      </label>
      <label style={lbl}>Avancement (%)
        <input type="number" min="0" max="100" style={inp} value={f.progress ?? 0} onChange={e => set('progress', e.target.value)} />
      </label>
      <label style={lbl}>Acteur responsable
        <input style={inp} value={f.actor || ''} onChange={e => set('actor', e.target.value)} />
      </label>
      <label style={lbl}>Échéance
        <input type="date" style={inp} value={f.deadline || ''} onChange={e => set('deadline', e.target.value)} />
      </label>
      <label style={lbl}>Prochaine action
        <input style={inp} value={f.nextAction || ''} onChange={e => set('nextAction', e.target.value)} />
      </label>
      <button className="btn btn-primary" onClick={() => onSave(f)}>Enregistrer</button>
    </Modal>
  )
}

function ArbitrageModal({ a, onClose, onSave }) {
  const [f, setF] = useState(a)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  return (
    <Modal title={a.id ? 'Modifier l\'arbitrage' : 'Nouvel arbitrage'} onClose={onClose}>
      <label style={lbl}>Point d'attention *
        <input style={inp} value={f.name || ''} onChange={e => set('name', e.target.value)} placeholder="Ex. Salle d'analyse non identifiée" />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
        <label style={lbl}>Impact
          <select style={inp} value={f.impact || 'Élevé'} onChange={e => set('impact', e.target.value)}>
            {Object.keys(IMPACT).map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label style={lbl}>Statut
          <select style={inp} value={f.status || 'Ouvert'} onChange={e => set('status', e.target.value)}>
            {ARB_STATUS.map(s => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      <label style={lbl}>Détail / impact
        <input style={inp} value={f.detail || ''} onChange={e => set('detail', e.target.value)} />
      </label>
      <label style={lbl}>Mitigation
        <input style={inp} value={f.mitigation || ''} onChange={e => set('mitigation', e.target.value)} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
        <label style={lbl}>Responsable
          <input style={inp} value={f.owner || ''} onChange={e => set('owner', e.target.value)} />
        </label>
        <label style={lbl}>Délai
          <input type="date" style={inp} value={f.due || ''} onChange={e => set('due', e.target.value)} />
        </label>
      </div>
      <button className="btn btn-primary" onClick={() => { if (!f.name?.trim()) { toast.error('Donnez un intitulé'); return } onSave(f) }}>
        Enregistrer
      </button>
    </Modal>
  )
}
