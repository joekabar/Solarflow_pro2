/**
 * PowerDialer — same as Preview but auto-advances after wrapup with countdown.
 * Shows pause button during countdown.
 */
import React from 'react'
import { useDialerStore } from '../../store/dialerStore'
import { useCallStore }   from '../../store/callStore'

export default function PowerDialer({ telephony, campaign }) {
  const { status, contact, countdownSec, fetchNextContact, startDialing, showWrapup, skipContact, pauseCountdown } = useDialerStore()
  const callState   = useCallStore(s => s.callState)
  const durationSec = useCallStore(s => s.durationSec)

  function handleCall() {
    startDialing()
    telephony.call(contact.phone)
  }

  function handleHangup() {
    telephony.hangup()
    showWrapup()
  }

  // ── Idle ──
  if (status === 'idle') {
    return (
      <div style={styles.card}>
        <p style={styles.muted}>Power mode — klaar om te starten.</p>
        <button className="btn-primary" onClick={() => fetchNextContact(campaign.id)} style={{ marginTop: 16, width: '100%' }}>
          ▶ Starten
        </button>
      </div>
    )
  }

  // ── Countdown ──
  if (status === 'countdown') {
    return (
      <div style={styles.card}>
        <div style={styles.countdown}>{countdownSec}</div>
        <p style={styles.muted}>Volgende contact...</p>
        <button className="btn-secondary" onClick={pauseCountdown} style={{ marginTop: 16, width: '100%' }}>
          ⏸ Pauzeren
        </button>
      </div>
    )
  }

  // ── Loading ──
  if (status === 'loading_contact') {
    return <div style={styles.card}><p style={styles.muted}>Contact ophalen...</p></div>
  }

  // ── Previewing ──
  if (status === 'previewing' && contact) {
    return (
      <div style={styles.card}>
        <div style={styles.contactName}>{contact.first_name} {contact.last_name}</div>
        {contact.company && <div style={styles.company}>{contact.company}</div>}
        <div style={styles.phone}>{contact.phone}</div>

        <div style={styles.actions}>
          <button className="btn-success" onClick={handleCall} style={{ flex: 2 }}>📞 Bellen</button>
          <button className="btn-secondary" onClick={() => skipContact(campaign.id)} style={{ flex: 1 }}>Overslaan</button>
        </div>
      </div>
    )
  }

  // ── Dialing / In call ──
  if (status === 'dialing' || status === 'in_call') {
    return (
      <div style={styles.card}>
        <div style={styles.callStatus}>
          {callState === 'ringing' ? '🔔 Overgaan...' : callState === 'in_progress' ? '🟢 In gesprek' : '📡 Verbinden...'}
        </div>
        <div style={styles.contactName}>{contact?.first_name} {contact?.last_name}</div>
        <div style={styles.phone}>{contact?.phone}</div>
        {callState === 'in_progress' && <div style={styles.timer}>{formatDuration(durationSec)}</div>}
        <button className="btn-danger" onClick={handleHangup} style={{ width: '100%', marginTop: 12, padding: 12 }}>
          📵 Ophangen
        </button>
      </div>
    )
  }

  return null
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const styles = {
  card:        { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 20 },
  contactName: { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  company:     { color: 'var(--color-muted)', fontSize: 14, marginBottom: 4 },
  phone:       { fontSize: 18, color: 'var(--color-primary)', fontFamily: 'monospace', marginBottom: 8 },
  muted:       { color: 'var(--color-muted)' },
  actions:     { display: 'flex', gap: 10, marginTop: 20 },
  callStatus:  { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  timer:       { fontSize: 28, fontFamily: 'monospace', color: 'var(--color-success)', margin: '12px 0' },
  countdown:   { fontSize: 64, fontWeight: 700, color: 'var(--color-warning)', textAlign: 'center' },
}
