/**
 * useTelephony hook — provider-agnostic telephony interface.
 *
 * Fetches SIP config from /api/telephony/token, selects the right adapter,
 * and returns a unified { call, hangup, mute, ... } interface.
 *
 * Key difference from SolarFlow Pro: passes the full token response (not
 * just res.token) to adapters, so VoipTiger adapter can access sip_domain,
 * ws_url, sip_password etc. from the same response object.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../hooks/api'
import { useCallStore } from '../store/callStore'
import { createVoipTigerDevice } from './adapters/voiptigerAdapter'
import { createManualDevice }    from './adapters/manualAdapter'

const ADAPTER_MAP = {
  manual:    createManualDevice,
  voiptiger: createVoipTigerDevice,
}

export function useTelephony() {
  const [status, setStatus]   = useState('initializing')   // initializing | ready | error
  const [error,  setError]    = useState(null)
  const deviceRef             = useRef(null)
  const { callStarted, callEnded, setCallState } = useCallStore()

  const handlers = {
    onReady:       ()      => setStatus('ready'),
    onError:       (msg)   => { setStatus('error'); setError(msg) },
    onRinging:     ()      => setCallState('ringing'),
    onCallStarted: (id)    => { callStarted(id); setCallState('in_progress') },
    onCallEnded:   ()      => { callEnded(); setCallState('idle') },
    onCallFailed:  (cause) => { callEnded(); setStatus('ready'); console.warn('[telephony] Call failed:', cause) },
  }

  useEffect(() => {
    let cancelled = false

    async function init() {
      try {
        const res = await api.get('/telephony/token')
        if (cancelled) return

        const providerName = res.provider || 'manual'
        const createDevice = ADAPTER_MAP[providerName] || createManualDevice

        // Pass FULL response so VoipTiger adapter can access sip_domain, ws_url, etc.
        const device = createDevice(res, handlers)
        deviceRef.current = device
      } catch (e) {
        if (!cancelled) {
          setStatus('error')
          setError(e.message)
        }
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  const call = useCallback((number) => {
    deviceRef.current?.call(number)
  }, [])

  const hangup = useCallback(() => {
    deviceRef.current?.hangup()
  }, [])

  const mute = useCallback(() => {
    deviceRef.current?.mute()
  }, [])

  const unmute = useCallback(() => {
    deviceRef.current?.unmute()
  }, [])

  const sendDtmf = useCallback((digits) => {
    deviceRef.current?.sendDtmf(digits)
  }, [])

  return { status, error, call, hangup, mute, unmute, sendDtmf }
}
