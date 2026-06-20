import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useTimer, formatElapsed } from '../context/TimerContext'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'

export default function FloatingTimer() {
  const { timer, elapsed, isRunning, stop, cancel } = useTimer()
  const { active } = useTeam()
  const qc = useQueryClient()
  const [confirming, setConfirming] = useState(false)
  const [pendingEntry, setPendingEntry] = useState(null)

  const create = useMutation({
    mutationFn: api.createTimesheet,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets-today'] })
      qc.invalidateQueries({ queryKey: ['timesheets-week'] })
      toast.success(`⏱ ${pendingEntry?.unit_amount}h enregistrées !`)
      setConfirming(false)
      setPendingEntry(null)
    },
    onError: (e) => toast.error(e.message),
  })

  if (!isRunning) return null

  function handleStop() {
    const result = stop()
    if (!result) return
    const entry = {
      employee_id: active.id,
      project_id: result.projectId,
      task_id: result.taskId || null,
      name: result.taskName,
      date: format(new Date(), 'yyyy-MM-dd'),
      unit_amount: result.hours,
    }
    setPendingEntry(entry)
    setConfirming(true)
  }

  function handleConfirm() {
    create.mutate(pendingEntry)
  }

  if (confirming && pendingEntry) {
    return (
      <div style={{
        position: 'fixed', bottom: 72, left: 12, right: 12, zIndex: 200,
        background: '#1e293b', color: '#fff', borderRadius: 16, padding: '1rem',
        boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      }}>
        <div style={{ fontWeight: 700, marginBottom: '.5rem' }}>⏱ Enregistrer le temps ?</div>
        <div style={{ fontSize: '.85rem', color: '#94a3b8', marginBottom: '.75rem' }}>
          <strong>{pendingEntry.unit_amount}h</strong> · {timer?.taskName || pendingEntry.name}
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleConfirm} disabled={create.isPending}>
            {create.isPending ? '…' : 'Confirmer'}
          </button>
          <button className="btn btn-ghost" style={{ flex: 1, color: '#fff', borderColor: '#334155' }}
            onClick={() => { setConfirming(false); setPendingEntry(null) }}>
            Annuler
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed', bottom: 72, right: 12, zIndex: 200,
      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
      color: '#fff', borderRadius: 50, padding: '.6rem 1rem',
      boxShadow: '0 4px 16px rgba(99,102,241,.5)',
      display: 'flex', alignItems: 'center', gap: '.6rem',
      fontSize: '.85rem', fontWeight: 700,
    }}>
      <span style={{ animation: 'pulse 1.5s infinite' }}>🔴</span>
      <span>{formatElapsed(elapsed)}</span>
      <button onClick={handleStop}
        style={{ background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 20,
          padding: '.25rem .6rem', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
        ■ Stop
      </button>
      <button onClick={cancel}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.6)', cursor: 'pointer', fontSize: '.8rem' }}>
        ✕
      </button>
    </div>
  )
}
