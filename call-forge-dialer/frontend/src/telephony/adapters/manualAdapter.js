/**
 * Manual adapter — no browser phone.
 * Agents dial on their own phone. App only tracks timing/outcomes.
 */
export function createManualDevice(_tokenRes, handlers) {
  handlers.onReady?.()

  return {
    call:       (_number) => handlers.onCallStarted?.('manual-call'),
    hangup:     ()        => handlers.onCallEnded?.(),
    mute:       ()        => {},
    unmute:     ()        => {},
    hold:       ()        => {},
    unhold:     ()        => {},
    sendDtmf:   (_digits) => {},
    disconnect: ()        => {},
  }
}
