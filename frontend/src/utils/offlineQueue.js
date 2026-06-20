const QUEUE_KEY = 'atd_offline_queue'

export function queueAdd(entry) {
  const q = queueGet()
  q.push({ ...entry, _queued_at: new Date().toISOString() })
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

export function queueGet() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [] }
  catch { return [] }
}

export function queueRemove(index) {
  const q = queueGet()
  q.splice(index, 1)
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

export function queueCount() {
  return queueGet().length
}

export function queueClear() {
  localStorage.removeItem(QUEUE_KEY)
}
