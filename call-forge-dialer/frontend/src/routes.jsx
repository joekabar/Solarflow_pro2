import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAgentStore } from './store/agentStore'

import LoginPage       from './pages/LoginPage'
import AgentWorkspace  from './pages/AgentWorkspace'
import AdminPanel      from './pages/AdminPanel'
import SupervisorPanel from './pages/SupervisorPanel'

function RequireAuth({ children }) {
  const token = useAgentStore(s => s.token)
  if (!token) return <Navigate to="/login" replace />
  return children
}

function RequireRole({ roles, children }) {
  const role = useAgentStore(s => s.user?.role)
  if (!roles.includes(role)) return <Navigate to="/" replace />
  return children
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/" element={
        <RequireAuth>
          <AgentWorkspace />
        </RequireAuth>
      } />

      <Route path="/supervisor" element={
        <RequireAuth>
          <RequireRole roles={['supervisor', 'admin']}>
            <SupervisorPanel />
          </RequireRole>
        </RequireAuth>
      } />

      <Route path="/admin" element={
        <RequireAuth>
          <RequireRole roles={['admin']}>
            <AdminPanel />
          </RequireRole>
        </RequireAuth>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
