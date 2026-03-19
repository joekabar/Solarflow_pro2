// frontend/src/routes.jsx
// ────────────────────────
// All protected routes. Each route is wrapped in RoleGuard.
// Unauthenticated users are redirected to /login.
// Wrong-role users are redirected to /unauthorized.

import { Routes, Route, Navigate } from 'react-router-dom'
import { useAgentStore } from './store/agentStore'
import AgentWorkspace  from './pages/AgentWorkspace'
import SupervisorPanel from './pages/SupervisorPanel'
import AdminPanel      from './pages/AdminPanel'
import ClientPortal    from './pages/ClientPortal'

function RoleGuard({ children, allowed }) {
  const { user } = useAgentStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowed.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export function Routes() {
  return (
    <Routes>
      {/* Agent workspace — the main dialer screen */}
      <Route
        path="/workspace"
        element={
          <RoleGuard allowed={['agent', 'supervisor', 'admin']}>
            <AgentWorkspace />
          </RoleGuard>
        }
      />

      {/* Supervisor live monitoring panel */}
      <Route
        path="/supervisor"
        element={
          <RoleGuard allowed={['supervisor', 'admin']}>
            <SupervisorPanel />
          </RoleGuard>
        }
      />

      {/* Admin panel — users, campaigns, billing, scripts */}
      <Route
        path="/admin/*"
        element={
          <RoleGuard allowed={['admin']}>
            <AdminPanel />
          </RoleGuard>
        }
      />

      {/* Client portal — read-only dashboard for paying customers */}
      <Route
        path="/portal"
        element={
          <RoleGuard allowed={['client', 'admin']}>
            <ClientPortal />
          </RoleGuard>
        }
      />

      {/* Default redirect based on role */}
      <Route path="/" element={<RoleRedirect />} />

      <Route
        path="/unauthorized"
        element={
          <div style={{ padding: '2rem', color: 'var(--color-text-primary)' }}>
            You don't have permission to view this page.
          </div>
        }
      />
    </Routes>
  )
}

// Sends each role to their home page after login
function RoleRedirect() {
  const { user } = useAgentStore()
  if (!user)           return <Navigate to="/login" replace />
  if (user.role === 'admin')      return <Navigate to="/admin" replace />
  if (user.role === 'supervisor') return <Navigate to="/supervisor" replace />
  if (user.role === 'client')     return <Navigate to="/portal" replace />
  return <Navigate to="/workspace" replace />
}
