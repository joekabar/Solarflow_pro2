/**
 * API helper. Attaches Authorization header from agentStore.
 * All requests go through /api proxy → backend.
 */
import { useAgentStore } from '../store/agentStore'

export async function apiFetch(path, options = {}) {
  const token = useAgentStore.getState().token

  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    const err  = new Error(body.detail || body.message || 'API error')
    err.status = res.status
    err.body   = body
    throw err
  }

  return res.json()
}

export const api = {
  get:    (path)         => apiFetch(path),
  post:   (path, body)   => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)         => apiFetch(path, { method: 'DELETE' }),
}
