/**
 * WrapupTab — outcome form after a call ends.
 * Outcomes: success, vip_callback, callback_private, callback_shared,
 *           not_interested, unqualified, invalid, voicemail, busy, no_answer, dnc
 */
import React, { useState } from 'react'
import { useDialerStore } from '../../store/dialerStore'
import { useCallStore }   from '../../store/callStore'

const OUTCOMES = [
  { value: 'success',          label: '✅ Afspraak / Success',      needsAppointment: true },
  { value: 'vip_callback',     label: '⭐ VIP Terugbellen',         needsCallback: true },
  { value: 'callback_private', label: '📅 Terugbellen (prive)',     needsCallback: true },
  { value: 'callback_shared',  label: '📅 Terugbellen (gedeeld)',   needsCallback: true },
  { value: 'not_interested',   label: '👎 Niet geïnteresseerd' },
  { value: 'unqualified',      label: '🚫 Niet gekwalificeerd' },
  { value: 'voicemail',        label: '📱 Voicemail' },
  { value: 'invalid',          label: '❌ Verkeerd nummer' },
  { value: 'busy',             label: '📵 In gesprek' },
  { value: 'no_answer',        label: '🔕 Geen opname' },
  { value: 'dnc',              label: '🛑 Bel-mij-niet (DNC)' },
]

export default function WrapupTab({ contact, campaign, telephony, onDone }) {
  const { status, submitWrapup } = useDialerStore()
  const durationSec  = useCallStore(s => s.durationSec)
  const [outcome,    setOutcome]    = useState('')
  const [notes,      setNotes]      = useState('')
  const [callbackAt, setCallbackAt] = useState('')
  const [appointAt,  setAppointAt]  = useState('')
  const [location,   setLocation]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState(null)

  if (status !== 'wrapup') {
    return <div style={styles.empty}>Geen actieve wrapup.</div>
  }

  const selected = OUTCOMES.find(o => o.value === outcome)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!outcome) { setError('Selecteer een uitkomst'); return }
    if (selected?.needsCallback && !callbackAt) { setError('Vul een terugbeldatum in'); return }
    if (selected?.needsAppointment && !appointAt) { setError('Vul een afspraakdatum in'); return }

    setSubmitting(true)
    setError(null)

    await submitWrapup(
      campaign.id,
      {
        contact_id:               contact.id,
        outcome,
        notes,
        duration_sec:             durationSec || null,
        callback_at:              callbackAt || null,
        appointment_at:           appointAt  || null,
        appointment_location:     location   || null,
      },
      campaign.dial_mode,
      campaign.countdown_active ? campaign.countdown_duration_sec : 0,
    )

    setSubmitting(false)
    setOutcome(''); setNotes(''); setCallbackAt(''); setAppointAt(''); setLocation('')
    onDone?.()
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        Afhandelen — {contact?.first_name} {contact?.last_name}
        {durationSec > 0 && <span style={styles.duration}> ({formatDuration(durationSec)})</span>}
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Outcome buttons */}
        <div style={styles.outcomes}>
          {OUTCOMES.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOutcome(o.value)}
              style={{
                ...styles.outcomeBtn,
                ...(outcome === o.value ? styles.outcomeBtnSelected : {}),
              }}
            >
              {o.label}
            </button>
          ))}
        </div>

        {/* Callback date */}
        {selected?.needsCallback && (
          <div style={styles.field}>
            <label style={styles.label}>Terugbellen op *</label>
            <input type="datetime-local" value={callbackAt} onChange={e => setCallbackAt(e.target.value)} required />
          </div>
        )}

        {/* Appointment */}
        {selected?.needsAppointment && (
          <>
            <div style={styles.field}>
              <label style={styles.label}>Afspraakmomement *</label>
              <input type="datetime-local" value={appointAt} onChange={e => setAppointAt(e.target.value)} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Locatie / adres</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Straat, stad of online" />
            </div>
          </>
        )}

        {/* Notes */}
        <div style={styles.field}>
          <label style={styles.label}>Notities</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="Optionele gespreksnotities..."
          />
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button
          type="submit"
          className="btn-primary"
          disabled={!outcome || submitting}
          style={{ width: '100%', padding: 12 }}
        >
          {submitting ? 'Opslaan...' : '✓ Opslaan & Doorgaan'}
        </button>
      </form>
    </div>
  )
}

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const styles = {
  empty:              { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--color-muted)' },
  card:               { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 20, maxWidth: 600 },
  header:             { fontWeight: 700, fontSize: 18, marginBottom: 16 },
  duration:           { color: 'var(--color-muted)', fontSize: 14, fontWeight: 400 },
  form:               { display: 'flex', flexDirection: 'column', gap: 14 },
  outcomes:           { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 },
  outcomeBtn:         { background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 8, padding: '9px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13 },
  outcomeBtnSelected: { borderColor: 'var(--color-primary)', background: '#1e2a3a', color: '#fff' },
  field:              { display: 'flex', flexDirection: 'column', gap: 6 },
  label:              { fontSize: 13, color: 'var(--color-muted)' },
  error:              { background: '#3a1e1e', border: '1px solid #ef4444', borderRadius: 6, padding: '8px 12px', color: '#ef4444', fontSize: 13 },
}
