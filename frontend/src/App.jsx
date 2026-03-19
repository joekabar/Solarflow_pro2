// frontend/src/App.jsx
// ─────────────────────
// Root component. Listens to auth state and routes accordingly.
// If the user has a valid session, they go to their role's page.
// If not, they go to /login.

import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAgentStore } from './store/agentStore'
import { Routes as AppRoutes } from './routes'
import LoginPage from './pages/LoginPage'

export default function App() {
  const { user, setUser, clearUser } = useAgentStore()

  // On mount, check localStorage for a saved session
  useEffect(() => {
    const saved = localStorage.getItem('sfp_session')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Check token expiry (JWT exp claim)
        const payload = JSON.parse(atob(parsed.access_token.split('.')[1]))
        if (payload.exp * 1000 > Date.now()) {
          setUser(parsed)
        } else {
          clearUser()
        }
      } catch {
        clearUser()
      }
    }
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*"     element={<AppRoutes />} />
    </Routes>
  )
}
