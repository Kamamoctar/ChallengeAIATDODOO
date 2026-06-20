import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Select from 'react-select'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { api } from '../api/odoo'
import { useTeam } from '../context/TeamContext'
import EmployeeToggle from '../components/EmployeeToggle'

const HOUR_CHIPS = [0.5, 1, 1.5, 2, 3, 4, 6, 8]

export default function QuickEntry() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { active } = useTeam()

  const [project, setProject] = useState(null)
  const [task, setTask] = useState(null)
  const [hours, setHours] = useState(null)
  const [customHours, setCustomHours] = useState('')
  const [desc, setDesc] = useState('')
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
    staleTime: 300_000,
  })

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', project?.value],
    queryFn: () => api.getTasks(project.value),
    enabled: !!project,
  })

  const create = useMutation({
    mutationFn: api.createTimesheet,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timesheets-today'] })
      qc.invalidateQueries({ queryKey: ['timesheets-week'] })
      toast.success('Entrée enregistrée !')
      navigate('/')
    },
    onError: (e) => toast.error(e.message),
  })

  const finalHours = hours ?? (customHours ? parseFloat(customHours) : null)

  function handleSubmit(e) {
    e.preventDefault()
    if (!project) return toast.error('Choisissez un projet')
    if (!finalHours || finalHours <= 0) return toast.error('Entrez les heures')
    if (!desc.trim()) return toast.error('Ajoutez une description')

    create.mutate({
      employee_id: active.id,
      project_id: project.value,
      task_id: task?.value || null,
      name: desc.trim(),
      date: entryDate,
      unit_amount: finalHours,
    })
  }

  const projectOptions = projects.map(p => ({ value: p.id, label: p.name }))
  const taskOptions = tasks.map(t => ({ value: t.id, label: t.name }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <header className="nav-bar">
        <button onClick={() => navigate(-1)} style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>←</button>
        <span style={{ fontWeight: 700 }}>Nouvelle entrée</span>
        <EmployeeToggle />
      </header>

      <form className="page" onSubmit={handleSubmit}>
        <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Pour : <strong>{active.name}</strong>
        </div>

        <div className="form-group">
          <label>Projet *</label>
          <Select
            options={projectOptions}
            value={project}
            onChange={p => { setProject(p); setTask(null) }}
            placeholder="Rechercher un projet…"
            isClearable
            styles={selectStyles}
          />
        </div>

        <div className="form-group">
          <label>Tâche (optionnel)</label>
          <Select
            options={taskOptions}
            value={task}
            onChange={setTask}
            placeholder={project ? 'Rechercher une tâche…' : 'Choisissez d'abord un projet'}
            isDisabled={!project}
            isClearable
            styles={selectStyles}
          />
        </div>

        <div className="form-group">
          <label>Heures *</label>
          <div className="chip-group" style={{ marginBottom: '.5rem' }}>
            {HOUR_CHIPS.map(h => (
              <button type="button" key={h}
                className={`chip ${hours === h && !customHours ? 'selected' : ''}`}
                onClick={() => { setHours(h); setCustomHours('') }}>
                {h}h
              </button>
            ))}
          </div>
          <input
            type="number" step="0.25" min="0.25" max="24"
            placeholder="Autre valeur…"
            value={customHours}
            onChange={e => { setCustomHours(e.target.value); setHours(null) }}
          />
        </div>

        <div className="form-group">
          <label>Description *</label>
          <input
            type="text"
            placeholder="Ce que vous avez fait…"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Date</label>
          <input
            type="date"
            value={entryDate}
            onChange={e => setEntryDate(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={create.isPending}
          style={{ width: '100%', padding: '.85rem', fontSize: '1rem', marginTop: '.5rem' }}
        >
          {create.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}

const selectStyles = {
  control: (b) => ({ ...b, borderColor: 'var(--border)', borderRadius: 8, minHeight: 42, boxShadow: 'none' }),
  menu: (b) => ({ ...b, borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)' }),
}
