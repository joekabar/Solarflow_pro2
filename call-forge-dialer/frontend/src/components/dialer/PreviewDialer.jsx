/**
 * PreviewDialer — shows contact card, agent clicks "Call" or "Skip".
 */
import React from 'react'
import { useDialerStore } from '../../store/dialerStore'
import { useCallStore }   from '../../store/callStore'

export default function PreviewDialer({ telephony, campaign }) {
  const { status, contact, fetchNextContact, startDialing, showWrapup, skipContact } = useDialerStore()
  const callState  = useCallStore(s => s.callState)
  const durationSec = useCallStore(s => s.durationSec)

  function handleNextContact() {
    fetchNextContact(campaign.id)
  }

  function handleCall() {
    if (!contact?.phone) return
    startDialing()
    telephony.call(contact.phone)
  }

  function handleHangup() {
    telephony.hangup()
    showWrapup()
  }

  function handleSkip() {
    skipContact(campaign.id)
  }

  // ── Idle ──
  if (status === 'idle') {
    return (
      <div style={styles.card}>
        <p style={styles.muted}>Klaar om te bellen.</p>
        <button className="btn-primary" onClick={handleNextContact} style={{ marginTop: 16, width: '100%' }}>
          Volgend contact ophalen
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
        <div style={styles.contactName}>
          {contact.first_name} {contact.last_name}
        </div>
        {contact.company && <div style={styles.company}>{contact.company}</div>}
        <div style={styles.phone}>{contact.phone}</div>
        {contact.email && <div style={styles.detail}>{contact.email}</div>}
        {contact.call_count > 0 && (
          <div style={styles.detail}>Eerder gebeld: {contact.call_count}× — {contact.last_outcome || '?'}</div>
        )}

        <div style={styles.actions}>
          <button className="btn-success" onClick={handleCall} style={{ flex: 2 }}>
            📞 Bellen
          </button>
          <button className="btn-secondary" onClick={handleSkip} style={{ flex: 1 }}>
            Overslaan
          </button>
        </div>
      </div>
    )
  }

  // ── Dialing / In call ──
  if (status === 'dialing' || status === 'in_call') {
    const isConnected = callState === 'in_progress'
    return (
      <div style={styles.card}>
        <div style={styles.callStatus}>
          {callState === 'ringing'     && '🔔 Overgaan...'}
          {callState === 'initiating'  && '📡 Verbinden...'}
          {callState === 'in_progress' && '🟢 In gesprek'}
        </div>
        <div style={styles.contactName}>{contact?.first_name} {contact?.last_name}</div>
        <div style={styles.phone}>{contact?.phone}</div>
        {isConnected && (
          <div style={styles.timer}>{formatDuration(durationSec)}</div>
        )}

        <div style={styles.callControls}>
          <button className="btn-secondary" onClick={() => telephony.mute()}>🔇 Mute</button>
          <button className="btn-secondary" onClick={() => telephony.sendDtmf('0')}>🔢 DTMF</button>
        </div>

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
  card:         { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 20 },
  contactName:  { fontSize: 22, fontWeight: 700, marginBottom: 4 },
  company:      { color: 'var(--color-muted)', fontSize: 14, marginBottom: 4 },
  phone:        { fontSize: 18, color: 'var(--color-primary)', fontFamily: 'monospace', marginBottom: 8 },
  detail:       { fontSize: 13, color: 'var(--color-muted)', marginBottom: 4 },
  muted:        { color: 'var(--color-muted)' },
  actions:      { display: 'flex', gap: 10, marginTop: 20 },
  callStatus:   { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  timer:        { fontSize: 28, fontFamily: 'monospace', color: 'var(--color-success)', margin: '12px 0' },
  callControls: { display: 'flex', gap: 8, marginTop: 12 },
}
