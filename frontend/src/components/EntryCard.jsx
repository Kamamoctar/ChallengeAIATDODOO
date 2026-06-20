import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { api } from '../api/odoo'

export default function EntryCard({ entry, queryKey }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [hours, setHours] = useState(String(entry.unit_amount))

  const update = useMutation({
    mutationFn: (data) => api.updateTimesheet(entry.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); setEditing(false); toast.success('Mis à jour') },
    onError: (e) => toast.error(e.message),
  })

  const del = useMutation({
    mutationFn: () => api.deleteTimesheet(entry.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey }); toast.success('Supprimé') },
    onError: (e) => toast.error(e.message),
  })

  const projectName = Array.isArray(entry.project_id) ? entry.project_id[1] : (entry.project_id || '—')

  return (
    <div className="entry-card">
      <div className="entry-info">
        <div className="entry-project">{projectName}</div>
        <div className="entry-desc">{entry.name}</div>
        <div className="entry-date">{entry.date}</div>
      </div>
      {editing ? (
        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          <input
            type="number" step="0.5" min="0.5" max="24"
            value={hours} onChange={e => setHours(e.target.value)}
            style={{ width: 60, padding: '4px 8px', border: '1.5px solid var(--primary)', borderRadius: 6, textAlign: 'center' }}
          />
          <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '.8rem' }}
            onClick={() => update.mutate({ unit_amount: parseFloat(hours) })}>
            ✓
          </button>
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '.8rem' }}
            onClick={() => setEditing(false)}>✕</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <span className="entry-hours">{entry.unit_amount}h</span>
          <button onClick={() => setEditing(true)} style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>✏️</button>
          <button onClick={() => { if (confirm('Supprimer ?')) del.mutate() }}
            style={{ color: 'var(--danger)', fontSize: '1rem' }}>🗑️</button>
        </div>
      )}
    </div>
  )
}
