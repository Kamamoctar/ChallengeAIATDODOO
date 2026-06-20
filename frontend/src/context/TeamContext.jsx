import { createContext, useContext, useState } from 'react'

const MEMBER_A = {
  id: parseInt(import.meta.env.VITE_EMPLOYEE_A_ID || '0'),
  name: import.meta.env.VITE_EMPLOYEE_A_NAME || 'Membre A',
  label: 'A',
}
const MEMBER_B = {
  id: parseInt(import.meta.env.VITE_EMPLOYEE_B_ID || '0'),
  name: import.meta.env.VITE_EMPLOYEE_B_NAME || 'Membre B',
  label: 'B',
}

const TeamContext = createContext(null)

export function TeamProvider({ children }) {
  const saved = localStorage.getItem('activeEmployee')
  const [activeId, setActiveId] = useState(
    saved ? parseInt(saved) : MEMBER_A.id
  )

  const members = [MEMBER_A, MEMBER_B].filter(m => m.id > 0)
  const active = members.find(m => m.id === activeId) || members[0] || MEMBER_A

  function setActive(id) {
    setActiveId(id)
    localStorage.setItem('activeEmployee', String(id))
  }

  return (
    <TeamContext.Provider value={{ members, active, setActive }}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  return useContext(TeamContext)
}
