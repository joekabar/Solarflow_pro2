/**
 * Call state store.
 * Tracks the active call: call_id, state, duration, muted, held.
 */
import { create } from 'zustand'

export const useCallStore = create((set, get) => ({
  callId:       null,
  callState:    'idle',   // idle | initiating | ringing | in_progress | completed | failed
  isMuted:      false,
  isHeld:       false,
  durationSec:  0,
  startTime:    null,
  _timer:       null,

  setCallState: (state) => set({ callState: state }),

  callStarted: (callId) => {
    const timer = setInterval(() => {
      const { startTime } = get()
      if (startTime) {
        set({ durationSec: Math.floor((Date.now() - startTime) / 1000) })
      }
    }, 1000)
    set({ callId, callState: 'in_progress', startTime: Date.now(), durationSec: 0, _timer: timer })
  },

  callEnded: () => {
    const { _timer } = get()
    if (_timer) clearInterval(_timer)
    set({ callState: 'idle', isMuted: false, isHeld: false, startTime: null, _timer: null })
  },

  toggleMute: () => set(s => ({ isMuted: !s.isMuted })),
  toggleHold: () => set(s => ({ isHeld: !s.isHeld })),

  reset: () => {
    const { _timer } = get()
    if (_timer) clearInterval(_timer)
    set({ callId: null, callState: 'idle', isMuted: false, isHeld: false, durationSec: 0, startTime: null, _timer: null })
  },
}))
