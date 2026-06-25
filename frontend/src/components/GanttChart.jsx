import { useMemo, useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { parseISO, differenceInCalendarDays, addDays, format, isSameDay, isWeekend } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import { Link2, X, Download, Upload } from 'lucide-react'
import { api } from '../api/odoo'

const DAY_W = 34            // largeur d'un jour (px)
const ROW_H = 40
const HEADER_H = 38
const LABEL_W = 200
const fmt = (d) => format(d, 'yyyy-MM-dd')

export default function GanttChart({ projectId }) {
  const qc = useQueryClient()
  const [preview, setPreview] = useState(null)   // { id, start, end } pendant un glisser
  const [linkFrom, setLinkFrom] = useState(null) // tâche prédécesseur en cours de liaison
  const [busy, setBusy] = useState(false)
  const dragRef = useRef(null)

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['project-tree', projectId],
    queryFn: () => api.getProjectTaskTree(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  })

  const nameById = useMemo(() => Object.fromEntries(tasks.map(t => [t.id, t.name])), [tasks])

  const dated = useMemo(() => tasks
    .filter(t => t.date_deadline || t.date_start)
    .map(t => {
      const start = parseISO(t.date_start || t.date_deadline)
      let end = parseISO(t.date_deadline || t.date_start)
      if (end < start) end = start
      return { ...t, _start: start, _end: end }
    })
    .sort((a, b) => a._start - b._start), [tasks])

  const rowIndex = useMemo(() => Object.fromEntries(dated.map((t, i) => [t.id, i])), [dated])

  // ----- Reschedule (après un glisser) -----
  async function commit(id, start, end) {
    setBusy(true)
    try {
      const res = await api.rescheduleTask(id, { date_start: fmt(start), date_deadline: fmt(end) })
      if (res.count > 1) toast.success(`${res.count} tâches replanifiées (cascade)`)
      await qc.invalidateQueries({ queryKey: ['project-tree', projectId] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false); setPreview(null) }
  }

  // ----- Glisser-déposer -----
  function onMove(e) {
    const dr = dragRef.current
    if (!dr) return
    const delta = Math.round((e.clientX - dr.startX) / DAY_W)
    let start = dr.origStart, end = dr.origEnd
    if (dr.mode === 'move') { start = addDays(dr.origStart, delta); end = addDays(dr.origEnd, delta) }
    else if (dr.mode === 'start') { start = addDays(dr.origStart, delta); if (start > end) start = end }
    else if (dr.mode === 'end') { end = addDays(dr.origEnd, delta); if (end < start) end = start }
    dr.curStart = start; dr.curEnd = end
    setPreview({ id: dr.id, start, end })
  }
  function onUp() {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    document.body.style.userSelect = ''
    const dr = dragRef.current
    dragRef.current = null
    if (dr && (dr.curStart - dr.origStart !== 0 || dr.curEnd - dr.origEnd !== 0)) {
      commit(dr.id, dr.curStart, dr.curEnd)
    } else {
      setPreview(null)
    }
  }
  function startDrag(e, t, mode) {
    if (linkFrom) return            // en mode liaison, le clic sert à relier (voir onBarClick)
    e.preventDefault(); e.stopPropagation()
    dragRef.current = { id: t.id, mode, startX: e.clientX,
      origStart: t._start, origEnd: t._end, curStart: t._start, curEnd: t._end }
    setPreview({ id: t.id, start: t._start, end: t._end })
    document.body.style.userSelect = 'none'
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  useEffect(() => () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }, [])

  // ----- Liaison (créer une dépendance) -----
  async function onBarClick(t) {
    if (!linkFrom) return
    if (linkFrom.id === t.id) { setLinkFrom(null); return }
    setBusy(true)
    try {
      await api.addDependency(t.id, linkFrom.id)   // t dépend de linkFrom
      toast.success(`« ${t.name} » dépend désormais de « ${linkFrom.name} »`)
      await qc.invalidateQueries({ queryKey: ['project-tree', projectId] })
    } catch (e) { toast.error(e.message) }
    finally { setBusy(false); setLinkFrom(null) }
  }
  async function removeDep(taskId, predId) {
    try {
      await api.removeDependency(taskId, predId)
      toast('Dépendance supprimée')
      qc.invalidateQueries({ queryKey: ['project-tree', projectId] })
    } catch (e) { toast.error(e.message) }
  }

  // ----- Export / import Excel -----
  const fileRef = useRef(null)

  function exportExcel() {
    const rows = dated.map(t => ({
      ID: t.id,
      'Tâche': t.name,
      'Début': format(t._start, 'yyyy-MM-dd'),
      'Fin': format(t._end, 'yyyy-MM-dd'),
      'Durée (j)': differenceInCalendarDays(t._end, t._start) + 1,
      'Bloqué par': (t.depend_on_ids || []).map(id => nameById[id]).filter(Boolean).join(' ; '),
      'Étape': Array.isArray(t.stage_id) ? t.stage_id[1] : '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 8 }, { wch: 42 }, { wch: 12 }, { wch: 12 }, { wch: 9 }, { wch: 32 }, { wch: 18 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Chronogramme')
    XLSX.writeFile(wb, `chronogramme_projet_${projectId}.xlsx`)
  }

  function toISO(v) {
    if (!v) return null
    if (v instanceof Date) return format(v, 'yyyy-MM-dd')
    if (typeof v === 'number') {
      const dc = XLSX.SSF.parse_date_code(v)
      if (dc) return `${dc.y}-${String(dc.m).padStart(2, '0')}-${String(dc.d).padStart(2, '0')}`
    }
    return String(v).trim().slice(0, 10)
  }

  async function importExcel(file) {
    setBusy(true)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws)
      const items = rows.map(r => ({
        id: Number(r.ID ?? r.id),
        date_start: toISO(r['Début'] ?? r['Debut'] ?? r.date_start),
        date_deadline: toISO(r['Fin'] ?? r.date_deadline),
      })).filter(it => it.id && (it.date_start || it.date_deadline))
      if (!items.length) { toast.error('Aucune ligne valide (colonnes ID, Début, Fin attendues)'); return }
      const res = await api.bulkSchedule(items)
      toast.success(`${res.updated} tâche(s) mises à jour depuis Excel`)
      await qc.invalidateQueries({ queryKey: ['project-tree', projectId] })
    } catch (e) { toast.error('Import impossible : ' + e.message) }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  if (!projectId) return (
    <div className="empty-state" style={{ padding: '2.5rem' }}>
      <p>Sélectionnez un projet ci-dessus</p>
      <p style={{ fontSize: '.8rem' }}>Le chronogramme s'affiche projet par projet.</p>
    </div>
  )
  if (isLoading) return <div className="loading">Chargement du chronogramme…</div>
  if (!dated.length) return (
    <div className="empty-state" style={{ padding: '2.5rem' }}>
      <p>Aucune tâche datée dans ce projet</p>
      <p style={{ fontSize: '.8rem' }}>Ajoutez une date de début/fin aux tâches pour les placer sur la frise.</p>
    </div>
  )

  // Plage de dates (avec marge à droite pour pouvoir glisser)
  const minStart = dated.reduce((m, t) => (t._start < m ? t._start : m), dated[0]._start)
  const maxEnd = dated.reduce((m, t) => (t._end > m ? t._end : m), dated[0]._end)
  const rangeStart = addDays(minStart, -2)
  const rangeEnd = addDays(maxEnd, 21)
  const totalDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1
  const days = Array.from({ length: totalDays }, (_, i) => addDays(rangeStart, i))
  const today = new Date()
  const TIMELINE_W = totalDays * DAY_W
  const off = (d) => differenceInCalendarDays(d, rangeStart)

  const posOf = (t) => (preview && preview.id === t.id ? { start: preview.start, end: preview.end } : { start: t._start, end: t._end })

  // Flèches de dépendance (prédécesseur -> successeur)
  const arrows = []
  dated.forEach(t => {
    const sPos = posOf(t)
    const sx = off(sPos.start) * DAY_W
    const sy = rowIndex[t.id] * ROW_H + ROW_H / 2
    ;(t.depend_on_ids || []).forEach(pid => {
      if (rowIndex[pid] === undefined) return
      const p = dated[rowIndex[pid]]
      const pPos = posOf(p)
      const px = (off(pPos.end) + 1) * DAY_W
      const py = rowIndex[pid] * ROW_H + ROW_H / 2
      arrows.push({ key: `${pid}-${t.id}`, px, py, sx, sy })
    })
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Barre d'info / mode liaison */}
      <div style={{ padding: '.45rem 1rem', borderBottom: '1px solid var(--border)',
        background: linkFrom ? 'var(--warning-light)' : 'var(--surface)', fontSize: '.76rem',
        color: linkFrom ? '#92400e' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        {linkFrom ? (
          <>
            <Link2 size={14} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>Cliquez la tâche qui doit <b>suivre</b> « {linkFrom.name} »…</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setLinkFrom(null)}>Annuler</button>
          </>
        ) : (
          <>
            <span style={{ flex: 1 }}>Glissez une barre pour la déplacer, ses bords pour l'allonger. Bouton <Link2 size={12} style={{ verticalAlign: '-2px' }} /> pour créer une dépendance.{busy ? ' · enregistrement…' : ''}</span>
            <button className="btn btn-ghost btn-sm" onClick={exportExcel} title="Télécharger le chronogramme en Excel">
              <Download size={13} style={{ verticalAlign: '-2px' }} /> Excel
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}
              title="Importer un chronogramme Excel modifié" disabled={busy}>
              <Upload size={13} style={{ verticalAlign: '-2px' }} /> Importer
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={e => e.target.files[0] && importExcel(e.target.files[0])} />
          </>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ width: LABEL_W + TIMELINE_W, position: 'relative' }}>
          {/* En-tête jours */}
          <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 5 }}>
            <div style={{ width: LABEL_W, height: HEADER_H, flexShrink: 0, position: 'sticky', left: 0, zIndex: 6,
              background: 'var(--surface)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', padding: '0 .6rem', fontWeight: 700, fontSize: '.72rem' }}>Tâche</div>
            <div style={{ position: 'relative', height: HEADER_H, width: TIMELINE_W,
              background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
              {days.map((day, i) => (
                <div key={i} style={{ position: 'absolute', left: i * DAY_W, width: DAY_W, top: 0, bottom: 0,
                  textAlign: 'center', fontSize: '.56rem', color: 'var(--text-muted)',
                  borderLeft: day.getDate() === 1 ? '2px solid var(--border)' : '1px solid var(--border)',
                  background: isSameDay(day, today) ? 'rgba(124,58,237,.12)' : isWeekend(day) ? 'var(--bg)' : 'transparent' }}>
                  <div style={{ fontWeight: 700, fontSize: '.64rem' }}>{format(day, 'd')}</div>
                  <div>{format(day, 'EEEEE', { locale: fr })}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Corps : lignes + barres + flèches */}
          <div style={{ display: 'flex', position: 'relative' }}>
            {/* Colonne libellés (sticky) */}
            <div style={{ width: LABEL_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 4, background: 'var(--surface)',
              borderRight: '1px solid var(--border)' }}>
              {dated.map(t => {
                const preds = (t.depend_on_ids || []).filter(pid => rowIndex[pid] !== undefined)
                return (
                  <div key={t.id} style={{ height: ROW_H, borderBottom: '1px solid var(--border)',
                    padding: '0 .5rem', display: 'flex', alignItems: 'center', gap: '.35rem', overflow: 'hidden' }}>
                    <button title="Créer une dépendance depuis cette tâche"
                      onClick={() => setLinkFrom(linkFrom?.id === t.id ? null : t)}
                      style={{ flexShrink: 0, background: linkFrom?.id === t.id ? 'var(--primary)' : 'transparent',
                        color: linkFrom?.id === t.id ? '#fff' : 'var(--text-muted)', border: '1px solid var(--border)',
                        borderRadius: 5, cursor: 'pointer', padding: '2px 4px', lineHeight: 0 }}>
                      <Link2 size={12} />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '.74rem', fontWeight: 600, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                      {preds.length > 0 && (
                        <div style={{ fontSize: '.58rem', color: 'var(--text-muted)', whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {preds.map(pid => (
                            <span key={pid}>← {nameById[pid]}
                              <button onClick={() => removeDep(t.id, pid)} title="Retirer ce lien"
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)',
                                  padding: '0 2px' }}>✕</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Zone timeline */}
            <div style={{ position: 'relative', width: TIMELINE_W, height: dated.length * ROW_H }}>
              {/* colonnes week-end / aujourd'hui */}
              {days.map((day, i) => (isWeekend(day) || isSameDay(day, today)) && (
                <div key={i} style={{ position: 'absolute', left: i * DAY_W, width: DAY_W, top: 0, bottom: 0,
                  background: isSameDay(day, today) ? 'rgba(124,58,237,.08)' : 'rgba(0,0,0,.025)' }} />
              ))}

              {/* flèches de dépendance */}
              <svg style={{ position: 'absolute', inset: 0, width: TIMELINE_W, height: dated.length * ROW_H,
                pointerEvents: 'none', zIndex: 1 }}>
                <defs>
                  <marker id="gantt-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L6,3 L0,6 Z" fill="var(--text-muted)" />
                  </marker>
                </defs>
                {arrows.map(a => {
                  const midX = Math.max(a.px + 8, a.sx - 8)
                  return (
                    <path key={a.key} markerEnd="url(#gantt-arrow)" fill="none"
                      stroke="var(--text-muted)" strokeWidth="1.4"
                      d={`M ${a.px} ${a.py} H ${midX} V ${a.sy} H ${a.sx}`} />
                  )
                })}
              </svg>

              {/* barres */}
              {dated.map(t => {
                const pos = posOf(t)
                const left = off(pos.start) * DAY_W
                const width = (differenceInCalendarDays(pos.end, pos.start) + 1) * DAY_W
                const overdue = pos.end < today
                const top = rowIndex[t.id] * ROW_H + 9
                return (
                  <div key={t.id}
                    onMouseDown={e => startDrag(e, t, 'move')}
                    onClick={() => onBarClick(t)}
                    title={linkFrom ? 'Cliquer pour relier' : 'Glisser pour déplacer · bords pour redimensionner'}
                    style={{ position: 'absolute', left, width, top, height: ROW_H - 18, borderRadius: 6, zIndex: 2,
                      cursor: linkFrom ? 'pointer' : 'grab', userSelect: 'none',
                      background: overdue ? 'var(--danger)' : 'var(--primary)', color: '#fff', fontSize: '.62rem',
                      display: 'flex', alignItems: 'center', padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden',
                      boxShadow: '0 1px 3px rgba(0,0,0,.3)',
                      outline: linkFrom?.id === t.id ? '2px solid var(--warning)' : 'none' }}>
                    {/* poignée gauche */}
                    <span onMouseDown={e => startDrag(e, t, 'start')}
                      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, cursor: 'ew-resize' }} />
                    {format(pos.start, 'd MMM', { locale: fr })} → {format(pos.end, 'd MMM', { locale: fr })}
                    {/* poignée droite */}
                    <span onMouseDown={e => startDrag(e, t, 'end')}
                      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 7, cursor: 'ew-resize' }} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
