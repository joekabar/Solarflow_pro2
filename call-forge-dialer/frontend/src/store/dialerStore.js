/**
 * Dialer state machine store.
 *
 * States:
 *   idle → loading_contact → previewing → dialing → in_call → wrapup → idle
 *                                                                       ↓ (power mode)
 *                                                               loading_contact
 */
import { create } from 'zustand'
import { api } from '../hooks/api'

export const useDialerStore = create((set, get) => ({
  status:          'idle',         // idle | loading_contact | previewing | dialing | in_call | wrapup | countdown
  contact:         null,
  queueMessage:    null,
  error:           null,
  countdownSec:    0,
  _countdownTimer: null,

  // Fetch next contact from the queue
  fetchNextContact: async (campaignId) => {
    set({ status: 'loading_contact', error: null, queueMessage: null })
    try {
      const res = await api.post('/dialer/next-contact', { campaign_id: campaignId })
      if (res.status === 'queue_empty') {
        set({ status: 'idle', contact: null, queueMessage: res.message })
      } else {
        set({ status: 'previewing', contact: res.contact })
      }
    } catch (e) {
      set({ status: 'idle', error: e.message })
    }
  },

  // Agent clicks "Call"
  startDialing: () => set({ status: 'dialing' }),

  // Call connected
  callConnected: () => set({ status: 'in_call' }),

  // Call ended → show wrapup form
  showWrapup: () => set({ status: 'wrapup' }),

  // Skip contact (no call)
  skipContact: async (campaignId) => {
    const { contact } = get()
    if (contact) {
      await api.post('/dialer/complete-call', {
        contact_id:  contact.id,
        campaign_id: campaignId,
        outcome:     'skip',
      }).catch(console.error)
    }
    set({ status: 'idle', contact: null })
  },

  // Submit wrapup outcome → optionally auto-advance (power mode)
  submitWrapup: async (campaignId, payload, dialMode, countdownDuration) => {
    try {
      await api.post('/dialer/complete-call', { campaign_id: campaignId, ...payload })
    } catch (e) {
      console.error('[dialer] complete-call error:', e)
    }

    if (dialMode === 'power' && countdownDuration > 0) {
      // Power mode: show countdown then auto-fetch
      set({ status: 'countdown', countdownSec: countdownDuration, contact: null })
      get()._startCountdown(campaignId, countdownDuration)
    } else if (dialMode === 'power') {
      // Power mode, no countdown — fetch immediately
      set({ contact: null })
      get().fetchNextContact(campaignId)
    } else {
      set({ status: 'idle', contact: null })
    }
  },

  _startCountdown: (campaignId, seconds) => {
    const { _countdownTimer } = get()
    if (_countdownTimer) clearInterval(_countdownTimer)

    let remaining = seconds
    const timer = setInterval(() => {
      remaining -= 1
      set({ countdownSec: remaining })
      if (remaining <= 0) {
        clearInterval(timer)
        set({ _countdownTimer: null })
        get().fetchNextContact(campaignId)
      }
    }, 1000)

    set({ _countdownTimer: timer })
  },

  pauseCountdown: () => {
    const { _countdownTimer } = get()
    if (_countdownTimer) clearInterval(_countdownTimer)
    set({ status: 'idle', contact: null, countdownSec: 0, _countdownTimer: null })
  },

  reset: () => {
    const { _countdownTimer } = get()
    if (_countdownTimer) clearInterval(_countdownTimer)
    set({ status: 'idle', contact: null, queueMessage: null, error: null, countdownSec: 0, _countdownTimer: null })
  },
}))
