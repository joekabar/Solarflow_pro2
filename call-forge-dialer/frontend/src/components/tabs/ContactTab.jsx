/**
 * ContactTab — displays full contact info during a call.
 */
import React from 'react'
import { useDialerStore } from '../../store/dialerStore'

export default function ContactTab() {
  const contact = useDialerStore(s => s.contact)

  if (!contact) {
    return <div style={styles.empty}>Geen actief contact.</div>
  }

  const customs = Object.entries(contact.custom_fields || {}).filter(([, v]) => v)

  return (
    <div style={styles.card}>
      <div style={styles.name}>{contact.first_name} {contact.last_name}</div>
      {contact.company && <div style={styles.company}>{contact.company}</div>}

      <div style={styles.section}>
        <Field label="Telefoon"   value={contact.phone} mono />
        <Field label="E-mail"     value={contact.email} />
        <Field label="Adres"      value={contact.address} />
        <Field label="Lead score" value={contact.lead_score ? `${contact.lead_score}/100` : null} />
        <Field label="Gebeld"     value={contact.call_count > 0 ? `${contact.call_count}× (${contact.last_outcome || '?'})` : 'Eerste keer'} />
        {contact.callback_at && (
          <Field label="Terugbellen" value={new Date(contact.callback_at).toLocaleString('nl-BE')} />
        )}
      </div>

      {customs.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Extra velden</div>
          {customs.map(([key, val]) => (
            <Field key={key} label={key.replace(/_/g, ' ')} value={val} />
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value, mono }) {
  if (!value) return null
  return (
    <div style={styles.field}>
      <span style={styles.label}>{label}</span>
      <span style={{ ...(mono ? { fontFamily: 'monospace', color: 'var(--color-primary)' } : {}) }}>{value}</span>
    </div>
  )
}

const styles = {
  empty:        { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--color-muted)' },
  card:         { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 20 },
  name:         { fontSize: 24, fontWeight: 700, marginBottom: 4 },
  company:      { color: 'var(--color-muted)', marginBottom: 16 },
  section:      { marginBottom: 16 },
  sectionTitle: { fontWeight: 600, color: 'var(--color-muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  field:        { display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--color-border)' },
  label:        { color: 'var(--color-muted)', fontSize: 13, minWidth: 120 },
}
