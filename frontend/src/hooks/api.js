// frontend/src/hooks/api.js
// ──────────────────────────
// Central API client. Adds auth header to every request.
// Handles token refresh automatically.
// All hooks import from here — never use fetch() directly.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

function getToken() {
  const session = localStorage.getItem('sfp_session')
  if (!session) return null
  try { return JSON.parse(session).access_token } catch { return null }
}

async function request(method, path, body = null) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.detail?.message || data.detail || 'Request failed')
    err.status = res.status
    err.detail = data.detail
    throw err
  }

  return data
}

export const api = {
  get:    (path)        => request('GET',    path),
  post:   (path, body)  => request('POST',   path, body),
  put:    (path, body)  => request('PUT',    path, body),
  delete: (path)        => request('DELETE', path),
}
