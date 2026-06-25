import { createContext, useContext, useState } from 'react'

const A_USER = parseInt(import.meta.env.VITE_EMPLOYEE_A_USER_ID || '0')
const B_USER = parseInt(import.meta.env.VITE_EMPLOYEE_B_USER_ID || '0')

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
// Profil de consultation : voit TOUS les projets (pas une personne réelle).
const MEMBER_ALL = { id: -1, name: 'AUTRE CHEF PROJET', short: 'Autres', label: 'C', all: true }

const TeamContext = createContext(null)

export function TeamProvider({ children }) {
  const saved = localStorage.getItem('activeEmployee')
  const [activeId, setActiveId] = useState(
    saved ? parseInt(saved) : MEMBER_A.id
  )

  const members = [MEMBER_A, MEMBER_B, MEMBER_ALL].filter(m => m.all || m.id > 0)
  const active = members.find(m => m.id === activeId) || members[0] || MEMBER_A

  // Identifiant utilisateur (res.users) du profil — 0 pour le profil « tous projets ».
  const userId = active.id === MEMBER_A.id ? A_USER
    : active.id === MEMBER_B.id ? B_USER : 0
  const isAll = !!active.all

  function setActive(id) {
    setActiveId(id)
    localStorage.setItem('activeEmployee', String(id))
  }

  return (
    <TeamContext.Provider value={{ members, active, setActive, userId, isAll }}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  return useContext(TeamContext)
}
