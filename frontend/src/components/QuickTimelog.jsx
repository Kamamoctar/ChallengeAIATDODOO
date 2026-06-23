import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { Clock } from 'lucide-react'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'

const CHIPS = [0.25, 0.5, 1, 1.5, 2, 3, 4]

export default function QuickTimelog({ task, projectId, onClose }) {
  const { active } = useTeam()
  const qc = useQueryClient()
  const [hours, setHours] = useState(1)
  const [custom, setCustom] = useState('')
  const [desc, setDesc] = useState(task.name)
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const create = useMutation({
    mutationFn: api.createTimesheet,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets-today'] })
      qc.invalidateQueries({ queryKey: ['timesheets-week'] })
      toast.success('Temps enregistré !')
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })

  const finalHours = custom ? parseFloat(custom) : hours

  function submit() {
    if (!finalHours || finalHours <= 0) return toast.error('Entrez une durée')
    create.mutate({
      employee_id: active.id,
      project_id: projectId,
      task_id: task.id,
      name: desc || task.name,
      date,
      unit_amount: finalHours,
    })
  }

  return (
    <div style={{
      background: '#f0f4ff', border: '1px solid #c7d2fe',
      borderRadius: 10, padding: '.75rem', margin: '.25rem 0 .25rem 20px',
    }}>
      <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '.5rem' }}>
        <Clock size={14} style={{ verticalAlign: '-2px', flexShrink: 0 }} /> Logger du temps · {active.name.split(' ')[0]}
      </div>
      <div className="chip-group" style={{ marginBottom: '.4rem' }}>
        {CHIPS.map(h => (
          <button key={h} type="button"
            className={`chip ${hours === h && !custom ? 'selected' : ''}`}
            onClick={() => { setHours(h); setCustom('') }}
            style={{ padding: '.2rem .5rem', fontSize: '.78rem' }}>
            {h}h
          </button>
        ))}
      </div>
      <input type="number" step="0.25" min="0.25" value={custom}
        onChange={e => { setCustom(e.target.value); setHours(null) }}
        placeholder="Autre durée…"
        style={{ width: '100%', padding: '.4rem .6rem', border: '1px solid #c7d2fe',
          borderRadius: 6, fontSize: '.85rem', marginBottom: '.4rem' }} />
      <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
        placeholder="Description…"
        style={{ width: '100%', padding: '.4rem .6rem', border: '1px solid #c7d2fe',
          borderRadius: 6, fontSize: '.85rem', marginBottom: '.4rem' }} />
      <input type="date" value={date} onChange={e => setDate(e.target.value)}
        style={{ width: '100%', padding: '.4rem .6rem', border: '1px solid #c7d2fe',
          borderRadius: 6, fontSize: '.85rem', marginBottom: '.5rem' }} />
      <div style={{ display: 'flex', gap: '.4rem' }}>
        <button className="btn btn-primary" style={{ flex: 1, padding: '6px' }}
          onClick={submit} disabled={create.isPending}>
          {create.isPending ? '…' : 'Enregistrer'}
        </button>
        <button className="btn btn-ghost" style={{ padding: '6px 12px' }} onClick={onClose}>
          Annuler
        </button>
      </div>
    </div>
  )
}
