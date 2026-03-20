import { create } from 'zustand'

export const useAgentStore = create((set) => ({
  user: null,

  setUser: (userData) => {
    localStorage.setItem('sfp_session', JSON.stringify(userData))
    set({ user: userData })
  },

  clearUser: () => {
    localStorage.removeItem('sfp_session')
    set({ user: null })
  },

  setTrialDays: (days) =>
    set((state) => ({
      user: state.user ? { ...state.user, trial_days_remaining: days } : null
    })),
}))