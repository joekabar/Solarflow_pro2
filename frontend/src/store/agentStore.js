// frontend/src/store/agentStore.js
// ──────────────────────────────────
// Stores the logged-in agent's identity and session.
// Loaded once on login — persisted to localStorage.

import { create } from 'zustand'

export const useAgentStore = create((set) => ({
  user: null,   // null = not logged in

  setUser: (userData) => {
    // Persist to localStorage for page refresh survival
    localStorage.setItem('sfp_session', JSON.stringify(userData))
    set({ user: userData })
  },

  clearUser: () => {
    localStorage.removeItem('sfp_session')
    set({ user: null })
  },

  // Update trial days remaining (called after each API response)
  setTrialDays: (days) =>
    set((state) => ({
      user: state.user ? { ...state.user, trial_days_remaining: days } : null
    })),
}))


// frontend/src/store/callStore.js
// ─────────────────────────────────
// Single source of truth for the active call.
// Updated by the useCall hook — components only read from here.

import { create } from 'zustand'

export const useCallStore = create((set) => ({
  // Current contact being dialed / in call
  contact:        null,
  callStatus:     'idle',     // idle | loading | active | completed
  callStartedAt:  null,
  callDurationSec: 0,

  // Script state
  scriptStep:     'intro',    // current step ID in the script tree
  scriptHistory:  [],         // array of {stepId, branchLabel} choices made

  // Rate limiting — countdown shown on Next Contact button
  waitSeconds:    0,

  // Setters
  setContact:    (contact) => set({ contact, callStatus: 'active', callStartedAt: Date.now() }),
  clearContact:  ()         => set({ contact: null, callStatus: 'idle', callStartedAt: null, callDurationSec: 0, scriptStep: 'intro', scriptHistory: [] }),
  setCallStatus: (status)   => set({ callStatus: status }),
  setScriptStep: (step, branchLabel) => set((state) => ({
    scriptStep:    step,
    scriptHistory: [...state.scriptHistory, { step: state.scriptStep, branch: branchLabel }],
  })),
  setWaitSeconds: (n)       => set({ waitSeconds: n }),
  tickDuration:  ()         => set((state) => ({ callDurationSec: state.callDurationSec + 1 })),
}))


// frontend/src/store/campaignStore.js
// ─────────────────────────────────────
// Active campaign configuration for the current session.

import { create } from 'zustand'

export const useCampaignStore = create((set) => ({
  campaign:     null,
  dialingMode:  'manual',   // manual | power | predictive | preview
  callsToday:   0,
  reachedToday: 0,

  setCampaign:    (c)    => set({ campaign: c }),
  setDialingMode: (mode) => set({ dialingMode: mode }),
  incrementCalls: ()     => set((state) => ({ callsToday: state.callsToday + 1 })),
  incrementReached: ()   => set((state) => ({ reachedToday: state.reachedToday + 1 })),
}))
