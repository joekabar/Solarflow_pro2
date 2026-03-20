import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAgentStore } from './store/agentStore'
import { AppRoutes } from './routes'
import LoginPage from './pages/LoginPage'

export default function App() {
  const { user, setUser, clearUser } = useAgentStore()

  useEffect(() => {
    const saved = localStorage.getItem('sfp_session')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
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
      <Route index         element={<Navigate to="/login" replace />} />
    </Routes>
  )
}