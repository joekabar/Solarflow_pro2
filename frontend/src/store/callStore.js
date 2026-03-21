// frontend/src/store/callStore.js
// ─────────────────────────────────
// Stores current call state — contact, status, duration.

import { create } from 'zustand'

export const useCallStore = create((set, get) => ({
  contact: null,
  callStatus: 'idle',       // idle | active | wrapup
  callDurationSec: 0,
  callStartedAt: null,
  _timer: null,

  setContact: (c) => set({ contact: c }),

  startCall: () => {
    const now = Date.now()
    const timer = setInterval(() => {
      set({ callDurationSec: Math.floor((Date.now() - now) / 1000) })
    }, 1000)
    set({ callStatus: 'active', callStartedAt: now, callDurationSec: 0, _timer: timer })
  },

  endCall: () => {
    const { _timer } = get()
    if (_timer) clearInterval(_timer)
    set({ callStatus: 'wrapup', _timer: null })
  },

  resetCall: () => {
    const { _timer } = get()
    if (_timer) clearInterval(_timer)
    set({ contact: null, callStatus: 'idle', callDurationSec: 0, callStartedAt: null, _timer: null })
  },
}))
