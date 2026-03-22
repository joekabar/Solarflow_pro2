// frontend/src/telephony/adapters/twilioAdapter.js
// ─────────────────────────────────────────────────────────────
// Twilio-specific browser adapter.
//
// Wraps @twilio/voice-sdk into the standard device interface
// expected by useTelephony.js. If you swap to Asterisk (via SIP.js)
// or Vonage, you create a new adapter with the same shape — you
// never touch useTelephony.js or PhoneTab.jsx.
//
// Install: npm install @twilio/voice-sdk
// ─────────────────────────────────────────────────────────────

import { Device } from '@twilio/voice-sdk'

/**
 * Creates a Twilio Device and returns a normalized adapter object.
 *
 * @param {string} token - JWT access token from /api/telephony/token
 * @param {object} handlers - Event callbacks from useTelephony
 * @returns {object} - Normalized device adapter
 */
export async function createTwilioDevice(token, handlers) {
  const {
    onReady,
    onError,
    onIncoming,
    onConnect,
    onDisconnect,
    onCallState,
  } = handlers

  // ── Create device ────────────────────────────────────────
  const device = new Device(token, {
    // Recommended settings for a sales dialer
    closeProtection: true,          // Warn if closing tab during call
    codecPreferences: ['opus', 'pcmu'],  // Opus first for quality
    edge: 'dublin',                 // EU edge (closest to Belgium)
    enableImplicitSubscription: true,
    logLevel: 'warn',               // 'debug' for dev, 'warn' for prod
  })

  // ── Wire up events ───────────────────────────────────────

  device.on('registered', () => {
    console.log('[Twilio] Device registered')
    onReady?.()
  })

  device.on('error', (error) => {
    console.error('[Twilio] Device error:', error)
    onError?.(error)
  })

  device.on('incoming', (call) => {
    console.log('[Twilio] Incoming call from:', call.parameters.From)
    const wrappedConn = wrapConnection(call, handlers)
    onIncoming?.(wrappedConn)
  })

  device.on('tokenWillExpire', () => {
    console.log('[Twilio] Token will expire soon — refresh needed')
    // useTelephony handles this via its timer, but this is a safety net
  })

  // Register the device with Twilio
  await device.register()

  // ── Return normalized adapter ────────────────────────────

  return {
    /**
     * Make an outbound call from the browser.
     * @param {string} phoneNumber - E.164 number to call
     * @param {object} params - Extra params sent to TwiML webhook
     * @returns {object} - Normalized connection
     */
    makeCall: async (phoneNumber, params = {}) => {
      const call = await device.connect({
        params: {
          To:          phoneNumber,
          contact_id:  params.contact_id || '',
          campaign_id: params.campaign_id || '',
        },
      })

      const wrappedConn = wrapConnection(call, handlers)
      return wrappedConn
    },

    /**
     * Update the device token (for refresh).
     */
    updateToken: (newToken) => {
      device.updateToken(newToken)
    },

    /**
     * Destroy the device (cleanup on unmount).
     */
    destroy: () => {
      device.destroy()
    },

    /**
     * Get underlying Device for advanced usage.
     */
    _raw: device,
  }
}


/**
 * Wraps a Twilio Call object into the normalized connection interface.
 * This is what useTelephony stores in connectionRef.
 */
function wrapConnection(call, handlers) {
  const { onConnect, onDisconnect, onCallState } = handlers

  // Map Twilio call events → normalized states
  call.on('accept', () => {
    onConnect?.({ callId: call.parameters?.CallSid })
    onCallState?.('in_progress')
  })

  call.on('disconnect', () => {
    onDisconnect?.()
    onCallState?.('completed')
  })

  call.on('cancel', () => {
    onDisconnect?.()
    onCallState?.('cancelled')
  })

  call.on('reject', () => {
    onDisconnect?.()
    onCallState?.('completed')
  })

  call.on('error', (error) => {
    console.error('[Twilio] Call error:', error)
    onCallState?.('failed')
  })

  call.on('ringing', () => {
    onCallState?.('ringing')
  })

  // Return normalized connection
  return {
    callId: call.parameters?.CallSid,

    // Accept an incoming call
    accept: () => call.accept(),

    // Reject an incoming call
    reject: () => call.reject(),

    // Disconnect (hang up)
    disconnect: () => call.disconnect(),

    // Mute/unmute the microphone
    mute: (shouldMute) => call.mute(shouldMute),

    // Send DTMF tones
    sendDigits: (digits) => call.sendDigits(digits),

    // Get call status
    status: () => call.status(),

    // Access parameters (From, To, CallSid, etc.)
    parameters: call.parameters || {},

    // Raw Twilio Call for advanced usage
    _raw: call,
  }
}
