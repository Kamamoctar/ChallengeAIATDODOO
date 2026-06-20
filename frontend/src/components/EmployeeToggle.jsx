import { useTeam } from '../context/TeamContext'

export default function EmployeeToggle() {
  const { members, active, setActive } = useTeam()
  if (members.length < 2) return null
  return (
    <div className="employee-toggle">
      {members.map(m => (
        <button
          key={m.id}
          className={active.id === m.id ? 'active' : ''}
          onClick={() => setActive(m.id)}
        >
          {m.name.split(' ')[0]}
        </button>
      ))}
    </div>
  )
}
