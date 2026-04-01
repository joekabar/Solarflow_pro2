/**
 * VoIP Tiger adapter — JsSIP WebRTC browser calling.
 *
 * JsSIP registers with the VoIP Tiger PBX over WebSocket (port 8089).
 * All calls are browser-initiated (outbound SIP INVITE).
 * Recordings are handled server-side by VoIP Tiger.
 *
 * Uses the same library Adversus uses internally (confirmed from window.context):
 *   "sip_library": "jssip", "port": 8089
 */
import JsSIP from 'jssip'

export function createVoipTigerDevice(tokenRes, handlers) {
  // tokenRes contains: sip_domain, sip_username, sip_password, ws_url, caller_id
  const cfg = tokenRes

  if (!cfg.sip_domain || !cfg.sip_username || !cfg.sip_password || !cfg.ws_url) {
    handlers.onError?.('Missing SIP credentials — check telephony setup in admin panel')
    return null
  }

  // Suppress JsSIP console debug noise in production
  JsSIP.debug.disable('JsSIP:*')

  const ua = new JsSIP.UA({
    sockets:            [new JsSIP.WebSocketInterface(cfg.ws_url)],
    uri:                `sip:${cfg.sip_username}@${cfg.sip_domain}`,
    password:           cfg.sip_password,
    register:           true,
    register_expires:   300,
    user_agent:         'CallForgeDialer/1.0',
    // Audio quality settings (from Adversus analysis)
    // AGC=false, echoCancellation=true, noiseSuppression=true
  })

  let currentSession = null

  ua.on('registered', () => {
    console.log('[VoipTiger] SIP registered ✓')
    handlers.onReady?.()
  })

  ua.on('registrationFailed', (e) => {
    console.error('[VoipTiger] Registration failed:', e.cause)
    handlers.onError?.(e.cause)
  })

  ua.on('newRTCSession', (data) => {
    const session = data.session
    currentSession = session

    session.on('connecting', () => handlers.onRinging?.())
    session.on('progress',   () => handlers.onRinging?.())
    session.on('confirmed',  () => handlers.onCallStarted?.(session.id))
    session.on('ended',      () => {
      currentSession = null
      handlers.onCallEnded?.()
    })
    session.on('failed', (e) => {
      currentSession = null
      handlers.onCallFailed?.(e.cause)
    })
  })

  ua.start()

  return {
    call: (number) => {
      if (!ua.isRegistered()) {
        handlers.onError?.('SIP not registered — check your connection')
        return
      }

      const target = `sip:${number}@${cfg.sip_domain}`

      const session = ua.call(target, {
        mediaConstraints: {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl:  false,   // AGC off (matches Adversus)
          },
          video: false,
        },
        pcConfig: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        },
      })

      // Attach remote audio stream to an audio element
      session.connection?.addEventListener('addstream', (e) => {
        const audio = document.getElementById('remote-audio')
        if (audio) {
          audio.srcObject = e.stream
          audio.play().catch(console.error)
        }
      })
    },

    hangup: () => {
      if (currentSession) {
        try { currentSession.terminate() } catch {}
        currentSession = null
      }
    },

    mute: () => {
      if (currentSession) currentSession.mute()
    },

    unmute: () => {
      if (currentSession) currentSession.unmute()
    },

    hold: () => {
      if (currentSession) currentSession.hold()
    },

    unhold: () => {
      if (currentSession) currentSession.unhold()
    },

    sendDtmf: (digits) => {
      if (currentSession) currentSession.sendDTMF(digits)
    },

    disconnect: () => {
      try { ua.stop() } catch {}
      currentSession = null
    },

    isRegistered: () => ua.isRegistered(),
  }
}
