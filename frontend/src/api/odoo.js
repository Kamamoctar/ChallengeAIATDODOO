const BASE = import.meta.env.VITE_API_URL || ''

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  getHealth: () => request('GET', '/api/health'),
  getEmployees: () => request('GET', '/api/employees'),
  getProjects: () => request('GET', '/api/projects'),
  getTasks: (projectId) => request('GET', `/api/projects/${projectId}/tasks`),
  getToday: (employeeId) => request('GET', `/api/timesheets/today?employee_id=${employeeId}`),
  getWeek: (employeeId, days = 7) => request('GET', `/api/timesheets/week?employee_id=${employeeId}&days=${days}`),
  createTimesheet: (data) => request('POST', '/api/timesheets', data),
  updateTimesheet: (id, data) => request('PUT', `/api/timesheets/${id}`, data),
  deleteTimesheet: (id) => request('DELETE', `/api/timesheets/${id}`),
}
