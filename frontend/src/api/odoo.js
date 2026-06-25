const BASE = import.meta.env.VITE_API_URL || ''

async function request(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  // Health
  getHealth: () => request('GET', '/api/health'),

  // Employees
  getEmployees: () => request('GET', '/api/employees'),

  // Projects
  getProjects: () => request('GET', '/api/projects'),
  getProjectsDetail: () => request('GET', '/api/projects/detail'),
  getProject: (id) => request('GET', `/api/projects/${id}`),
  createProject: (data) => request('POST', '/api/projects', data),
  updateProject: (id, data) => request('PUT', `/api/projects/${id}`, data),
  cloneProject: (templateId, data) => request('POST', `/api/projects/${templateId}/clone`, data),
  getProjectTaskTree: (id) => request('GET', `/api/projects/${id}/tasks/tree`),
  getTasks: (projectId) => request('GET', `/api/projects/${projectId}/tasks`),

  // Tasks
  getMyTasks: (userId) => request('GET', `/api/tasks/mine?user_id=${userId}`),
  rescheduleTask: (id, dates) => request('POST', `/api/tasks/${id}/reschedule`, dates),
  addDependency: (id, predecessorId) => request('POST', `/api/tasks/${id}/depend-on`, { predecessor_id: predecessorId }),
  removeDependency: (id, predecessorId) => request('POST', `/api/tasks/${id}/undepend`, { predecessor_id: predecessorId }),
  bulkSchedule: (items) => request('POST', `/api/tasks/bulk-schedule`, { items }),
  getManagedTasks: (userId) => request('GET', `/api/tasks/managed?user_id=${userId}`),
  getIndependentTasks: (userId) => request('GET', `/api/tasks/independent?user_id=${userId}`),
  getTask: (id) => request('GET', `/api/tasks/${id}`),
  createTask: (data) => request('POST', '/api/tasks', data),
  updateTask: (id, data) => request('PUT', `/api/tasks/${id}`, data),
  getAllStages: () => request('GET', '/api/tasks/stages/all'),

  // Calendar (semaine)
  getCalendarWeek: (userId, start, days = 7) =>
    request('GET', `/api/calendar/week?user_id=${userId}&start=${start}&days=${days}`),
  getResourceTypes: () => request('GET', '/api/calendar/resource-types'),
  createEvent: (data) => request('POST', '/api/calendar/event', data),

  // Timesheets
  getToday: (employeeId) => request('GET', `/api/timesheets/today?employee_id=${employeeId}`),
  getWeek: (employeeId, days = 7) => request('GET', `/api/timesheets/week?employee_id=${employeeId}&days=${days}`),
  createTimesheet: (data) => request('POST', '/api/timesheets', data),
  updateTimesheet: (id, data) => request('PUT', `/api/timesheets/${id}`, data),
  deleteTimesheet: (id) => request('DELETE', `/api/timesheets/${id}`),
}
