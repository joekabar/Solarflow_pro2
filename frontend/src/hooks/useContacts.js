// frontend/src/hooks/useContacts.js
// ───────────────────────────────────
// Hook for all contact-related operations.
// Components never call the API directly — they use this hook.

import { useState, useCallback } from 'react'
import { useAgentStore }    from '../store/agentStore'
import { useCallStore }     from '../store/callStore'
import { useCampaignStore } from '../store/campaignStore'
import { api }              from './api'

export function useContacts() {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const { user }                       = useAgentStore()
  const { setContact, clearContact,
          setWaitSeconds, setCallStatus } = useCallStore()
  const { campaign, incrementCalls }   = useCampaignStore()

  // ── Request next contact ──────────────────────────────────
  const requestNextContact = useCallback(async () => {
    if (!campaign?.id) {
      setError('No campaign selected')
      return
    }

    setLoading(true)
    setError(null)
    setCallStatus('loading')

    try {
      const res = await api.post('/dialer/next-contact', {
        campaign_id: campaign.id,
      })

      if (res.status === 'queue_empty') {
        setCallStatus('idle')
        setError('No more contacts in this campaign right now.')
        return
      }

      setContact(res.contact)
      incrementCalls()

    } catch (err) {
      if (err.status === 429) {
        // Rate limited — start countdown timer
        const wait = Math.ceil(err.detail.wait_seconds)
        setWaitSeconds(wait)
        setCallStatus('idle')

        // Countdown updates every second
        const timer = setInterval(() => {
          setWaitSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(timer)
              return 0
            }
            return prev - 1
          })
        }, 1000)

      } else if (err.status === 402) {
        // Trial expired
        setError('trial_expired')
        setCallStatus('idle')
      } else if (err.status === 403 && err.detail?.error === 'outside_calling_hours') {
        setError(`Outside calling hours (${err.detail.message})`)
        setCallStatus('idle')
      } else {
        setError(err.message || 'Failed to load next contact')
        setCallStatus('idle')
      }
    } finally {
      setLoading(false)
    }
  }, [campaign, setContact, setCallStatus, setWaitSeconds, incrementCalls])

  // ── Complete call ─────────────────────────────────────────
  const completeCall = useCallback(async (payload) => {
    // payload: { contact_id, campaign_id, outcome, duration_sec,
    //            notes, callback_at, script_path,
    //            street_verified, city_verified, postal_code_verified }
    setLoading(true)
    try {
      const res = await api.post('/dialer/complete-call', payload)
      clearContact()
      return res
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [clearContact])

  return {
    loading,
    error,
    requestNextContact,
    completeCall,
  }
}
