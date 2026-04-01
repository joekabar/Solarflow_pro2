/**
 * Agent auth store. Persisted in localStorage.
 * Holds JWT token + user profile (id, role, org_id, team_id).
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAgentStore = create(
  persist(
    (set, get) => ({
      token:        null,
      refreshToken: null,
      user:         null,   // { id, email, full_name, role, org_id, team_id, org_name }

      login: (data) => set({
        token:        data.access_token,
        refreshToken: data.refresh_token,
        user:         data.user,
      }),

      logout: () => set({ token: null, refreshToken: null, user: null }),

      updateUser: (updates) => set(s => ({
        user: { ...s.user, ...updates },
      })),

      isAdmin:      () => get().user?.role === 'admin',
      isSupervisor: () => ['admin', 'supervisor'].includes(get().user?.role),
    }),
    {
      name: 'dialer_session',
    }
  )
)
