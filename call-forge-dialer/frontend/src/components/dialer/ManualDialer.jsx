/**
 * ManualDialer — free-form phone input. Agent types a number and calls.
 * No auto-advance. Agent clicks "Next Contact" explicitly.
 */
import React, { useState } from 'react'
import { useDialerStore } from '../../store/dialerStore'
import { useCallStore }   from '../../store/callStore'

export default function ManualDialer({ telephony, campaign }) {
  const [number, setNumber] = useState('')
  const { status, contact, fetchNextContact, startDialing, showWrapup } = useDialerStore()
  const callState   = useCallStore(s => s.callState)
  const durationSec = useCallStore(s => s.durationSec)

  function handleCall() {
    const target = number || contact?.phone
    if (!target) return
    startDialing()
    telephony.call(target)
  }

  function handleHangup() {
    telephony.hangup()
    showWrapup()
  }

  const isInCall = status === 'dialing' || status === 'in_call'

  return (
    <div style={styles.card}>
      <div style={styles.header}>Manual Dialer</div>

      {/* Phone input */}
      <div style={styles.field}>
        <label style={styles.label}>Telefoonnummer</label>
        <input
          type="tel"
          value={number}
          onChange={e => setNumber(e.target.value)}
          placeholder="+32470..."
          style={{ fontFamily: 'monospace', fontSize: 18 }}
          disabled={isInCall}
        />
      </div>

      {/* Show locked contact if any */}
      {contact && (
        <div style={styles.contactHint}>
          📌 Huidig contact: {contact.first_name} {contact.last_name} — {contact.phone}
          <button style={styles.useBtn} onClick={() => setNumber(contact.phone)}>Gebruik</button>
        </div>
      )}

      {!isInCall ? (
        <div style={styles.actions}>
          <button className="btn-success" onClick={handleCall} disabled={!number && !contact?.phone} style={{ flex: 2 }}>
            📞 Bellen
          </button>
          <button className="btn-secondary" onClick={() => fetchNextContact(campaign.id)} style={{ flex: 1 }}>
            Volgend contact
          </button>
        </div>
      ) : (
        <div>
          <div style={styles.callStatus}>
            {callState === 'ringing' ? '🔔 Overgaan...' : callState === 'in_progress' ? '🟢 In gesprek' : '📡 Verbinden...'}
          </div>
          {callState === 'in_progress' && (
            <div style={styles.timer}>{formatDuration(durationSec)}</div>
          )}
          <button className="btn-danger" onClick={handleHangup} style={{ width: '100%', marginTop: 12, padding: 12 }}>
            📵 Ophangen
          </button>
        </div>
      )}
    </div>
  )
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const styles = {
  card:        { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 20 },
  header:      { fontWeight: 700, fontSize: 16, marginBottom: 16 },
  field:       { marginBottom: 12 },
  label:       { fontSize: 13, color: 'var(--color-muted)', display: 'block', marginBottom: 6 },
  contactHint: { background: 'var(--color-bg)', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 },
  useBtn:      { background: 'none', border: '1px solid var(--color-border)', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: 'var(--color-text)', cursor: 'pointer' },
  actions:     { display: 'flex', gap: 10, marginTop: 16 },
  callStatus:  { fontSize: 18, fontWeight: 600, marginBottom: 8, marginTop: 12 },
  timer:       { fontSize: 28, fontFamily: 'monospace', color: 'var(--color-success)', margin: '8px 0' },
}
