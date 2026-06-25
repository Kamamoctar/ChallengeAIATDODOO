import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { X, CalendarPlus } from 'lucide-react'
import { api } from '../api/odoo'

const EMPTY = {
  name: '', date: '', start_time: '09:00', end_time: '10:00',
  projectId: '', taskId: '', location: '', videocall: '', resourceTypeId: '',
}

export default function NewEventModal({ open, onClose, userId, defaultDate, onCreated }) {
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (open) setForm({ ...EMPTY, date: defaultDate || new Date().toISOString().slice(0, 10) })
  }, [open, defaultDate])

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'], queryFn: api.getProjects, staleTime: 300_000, enabled: open })
  const { data: resTypes = [] } = useQuery({
    queryKey: ['resource-types'], queryFn: api.getResourceTypes, staleTime: 300_000, enabled: open })
  const { data: tasks = [] } = useQuery({
    queryKey: ['proj-tasks', form.projectId], queryFn: () => api.getTasks(form.projectId),
    enabled: open && !!form.projectId })

  if (!open) return null

  async function submit() {
    if (!form.name.trim()) return toast.error('Donnez un titre au RDV')
    if (!form.date || !form.start_time || !form.end_time) return toast.error('Date et heures requises')
    if (form.end_time <= form.start_time) return toast.error("L'heure de fin doit être après le début")
    setSaving(true)
    try {
      const res = await api.createEvent({
        name: form.name.trim(), date: form.date,
        start_time: form.start_time, end_time: form.end_time,
        user_id: userId || undefined,
        project_id: form.projectId ? Number(form.projectId) : undefined,
        task_id: form.taskId ? Number(form.taskId) : undefined,
        location: form.location || undefined,
        videocall: form.videocall || undefined,
        resource_type_id: form.resourceTypeId ? Number(form.resourceTypeId) : undefined,
      })
      if (res.booking_error)
        toast(`RDV créé, mais la réservation n'a pas pu être confirmée (disponibilité).`, { icon: '⚠️', duration: 6000 })
      else
        toast.success('RDV créé' + (res.booking_id ? ' + ressource réservée' : ''))
      onCreated?.()
      onClose()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const label = { fontSize: '.72rem', color: 'var(--text-muted)', fontWeight: 700 }
  const input = { width: '100%', marginTop: 3, padding: '.5rem .6rem', borderRadius: 8,
    border: '1.5px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: '.9rem' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius)',
        width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.9rem 1.1rem',
          borderBottom: '1px solid var(--border)' }}>
          <CalendarPlus size={18} color="var(--primary)" />
          <div style={{ flex: 1, fontWeight: 800 }}>Nouveau rendez-vous</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
          <label style={label}>Titre *
            <input style={input} value={form.name} onChange={e => f('name', e.target.value)}
              placeholder="Ex. Réunion de cadrage" autoFocus />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: '.5rem' }}>
            <label style={label}>Date *
              <input type="date" style={input} value={form.date} onChange={e => f('date', e.target.value)} />
            </label>
            <label style={label}>Début *
              <input type="time" style={input} value={form.start_time} onChange={e => f('start_time', e.target.value)} />
            </label>
            <label style={label}>Fin *
              <input type="time" style={input} value={form.end_time} onChange={e => f('end_time', e.target.value)} />
            </label>
          </div>

          <label style={label}>Projet <span style={{ fontWeight: 400 }}>(optionnel)</span>
            <select style={input} value={form.projectId}
              onChange={e => { f('projectId', e.target.value); f('taskId', '') }}>
              <option value="">— Aucun —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>

          {form.projectId && (
            <label style={label}>Tâche <span style={{ fontWeight: 400 }}>(optionnel)</span>
              <select style={input} value={form.taskId} onChange={e => f('taskId', e.target.value)}>
                <option value="">— Aucune —</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
            <label style={label}>Lieu <span style={{ fontWeight: 400 }}>(optionnel)</span>
              <input style={input} value={form.location} onChange={e => f('location', e.target.value)}
                placeholder="Salle, adresse…" />
            </label>
            <label style={label}>Lien visio <span style={{ fontWeight: 400 }}>(optionnel)</span>
              <input style={input} value={form.videocall} onChange={e => f('videocall', e.target.value)}
                placeholder="https://…" />
            </label>
          </div>

          <label style={label}>Réserver une ressource <span style={{ fontWeight: 400 }}>(optionnel)</span>
            <select style={input} value={form.resourceTypeId} onChange={e => f('resourceTypeId', e.target.value)}>
              <option value="">— Aucune —</option>
              {resTypes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>

          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.3rem' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={saving}>
              {saving ? 'Création…' : 'Créer le RDV'}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          </div>
        </div>
      </div>
    </div>
  )
}
