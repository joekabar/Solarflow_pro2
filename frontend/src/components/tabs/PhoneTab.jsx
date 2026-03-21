// frontend/src/components/tabs/PhoneTab.jsx
// ──────────────────────────────────────────────
// Complete call management system.
// Script drives the call → outcome determines what form to show:
//   interested     → address + appointment date (required) + Google Calendar
//   callback       → callback date picker (required)
//   not_interested → quick save
//   voicemail/no_answer/wrong_number → quick save

import { useState, useEffect } from 'react'
import { useCallStore }     from '../../store/callStore'
import { useCampaignStore } from '../../store/campaignStore'
import { useContacts }      from '../../hooks/useContacts'
import ScriptPrompter       from '../script/ScriptPrompter'

export default function PhoneTab() {
  const { contact, callStatus, callDurationSec,
          waitSeconds, setCallStatus } = useCallStore()
  const { campaign }   = useCampaignStore()
  const { requestNextContact, completeCall, loading, error: contactError } = useContacts()

  const [outcome, setOutcome]     = useState(null)
  const [outcomeLbl, setOutcomeLbl] = useState('')
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  // Appointment form (interested)
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [street, setStreet]       = useState('')
  const [city, setCity]           = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [notes, setNotes]         = useState('')

  // Callback form
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('')

  // Calendar link after save
  const [calendarLink, setCalendarLink] = useState('')

  // Reset forms when contact changes
  useEffect(() => {
    if (contact) {
      setOutcome(null)
      setOutcomeLbl('')
      setError('')
      setAppointmentDate('')
      setAppointmentTime('')
      setStreet(contact.street_verified || '')
      setCity(contact.city_verified || '')
      setPostalCode(contact.postal_code_verified || '')
      setNotes('')
      setCallbackDate('')
      setCallbackTime('')
      setCalendarLink('')
    }
  }, [contact?.id])

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  function handleScriptOutcome(outcomeType, label) {
    setOutcome(outcomeType)
    setOutcomeLbl(label)
    setError('')
  }

  async function handleSave() {
    setError('')

    // Validate per outcome
    if (outcome === 'interested') {
      if (!street.trim()) { setError('Straat + huisnummer is verplicht'); return }
      if (!city.trim()) { setError('Stad/gemeente is verplicht'); return }
      if (!postalCode.trim()) { setError('Postcode is verplicht'); return }
      if (!appointmentDate) { setError('Afspraakdatum is verplicht'); return }
      if (!appointmentTime) { setError('Afspraaktijd is verplicht'); return }
    }

    if (outcome === 'callback') {
      if (!callbackDate) { setError('Terugbeldatum is verplicht'); return }
      if (!callbackTime) { setError('Terugbeltijd is verplicht'); return }
    }

    if (!contact || !campaign) return
    setSaving(true)

    try {
      const payload = {
        contact_id:  contact.id,
        campaign_id: campaign.id,
        outcome:     outcome,
        duration_sec: callDurationSec,
        notes:       notes || null,
        script_path: null,
      }

      if (outcome === 'interested') {
        payload.street_verified      = street.trim()
        payload.city_verified        = city.trim()
        payload.postal_code_verified = postalCode.trim()
        payload.appointment_at       = `${appointmentDate}T${appointmentTime}:00`
        payload.appointment_duration_min = 60
      }

      if (outcome === 'callback') {
        payload.callback_at = `${callbackDate}T${callbackTime}:00`
      }

      if (street.trim() && outcome !== 'interested') {
        payload.street_verified      = street.trim()
        payload.city_verified        = city.trim()
        payload.postal_code_verified = postalCode.trim()
      }

      const res = await completeCall(payload)

      // If calendar link is returned, show it
      if (res?.appointment?.calendar?.gcal_link) {
        setCalendarLink(res.appointment.calendar.gcal_link)
        // Don't auto-load next — let agent add to calendar first
        return
      }

      // Auto-load next contact
      await requestNextContact()

    } catch (e) {
      setError(e.message || 'Opslaan mislukt')
    } finally {
      setSaving(false)
    }
  }

  async function handleNextAfterCalendar() {
    setCalendarLink('')
    await requestNextContact()
  }

  const s = {
    wrap:  { height: '100%', padding: 12, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' },
    row:   { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 },
    card:  { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 14 },
    ct:    { fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 },
    phone: { fontSize: 20, fontWeight: 500, color: 'var(--color-text-primary)', textAlign: 'center', margin: '8px 0 4px', letterSpacing: 1 },
    timer: { fontSize: 26, fontWeight: 500, textAlign: 'center', margin: '4px 0 2px' },
    tlab:  { fontSize: 10, color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: 8 },
    ctrls: { display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' },
    btn:   { padding: '6px 12px', borderRadius: 7, border: '0.5px solid var(--color-border-secondary)', cursor: 'pointer', fontSize: 12, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' },
    btnP:  { padding: '8px 16px', borderRadius: 7, background: '#1d6fb8', color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 500, width: '100%' },
    btnD:  { padding: '8px 16px', borderRadius: 7, background: '#c53030', color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 500, width: '100%' },
    btnG:  { padding: '8px 16px', borderRadius: 7, background: '#22c55e', color: '#fff', border: 'none', fontSize: 13, cursor: 'pointer', fontWeight: 500, width: '100%' },
    empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, height: 300, color: 'var(--color-text-secondary)' },
    wait:  { background: 'var(--color-background-warning)', color: 'var(--color-text-warning)', borderRadius: 7, padding: '8px 12px', fontSize: 12, textAlign: 'center' },
    err:   { background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', borderRadius: 7, padding: '8px 12px', fontSize: 12 },
    fg:    { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 },
    fl:    { fontSize: 11, color: 'var(--color-text-secondary)' },
    fi:    { padding: '7px 10px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', width: '100%' },
    frow:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
    outBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 },
    outInt:   { background: 'var(--color-background-success)', color: 'var(--color-text-success)' },
    outCb:    { background: 'var(--color-background-warning)', color: 'var(--color-text-warning)' },
    outNeg:   { background: 'var(--color-background-danger)', color: 'var(--color-text-danger)' },
    outOth:   { background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' },
    calCard:  { background: 'var(--color-background-success)', border: '0.5px solid var(--color-border-success)', borderRadius: 8, padding: 16, textAlign: 'center' },
    addrBox:  { background: 'var(--color-background-secondary)', borderRadius: 8, padding: 12, marginBottom: 8 },
    addrLbl:  { fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 },
    addrTag:  { padding: '2px 7px', borderRadius: 20, fontSize: 10, background: 'var(--color-background-warning)', color: 'var(--color-text-warning)' },
  }

  const outcomeBadge = (o) => {
    const map = {
      interested: { ...s.outBadge, ...s.outInt, }, callback: { ...s.outBadge, ...s.outCb },
      not_interested: { ...s.outBadge, ...s.outNeg }, dnc: { ...s.outBadge, ...s.outNeg },
    }
    return map[o] || { ...s.outBadge, ...s.outOth }
  }

  const outcomeLabels = {
    interested: 'Geïnteresseerd — Afspraak', callback: 'Terugbellen',
    not_interested: 'Niet geïnteresseerd', voicemail: 'Voicemail',
    wrong_number: 'Verkeerd nummer', no_answer: 'Geen antwoord', dnc: 'Niet meer bellen',
  }

  // ── Calendar link screen ──
  if (calendarLink) return (
    <div style={s.wrap}>
      <div style={s.calCard}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, color: 'var(--color-text-success)' }}>
          Afspraak opgeslagen!
        </div>
        <div style={{ fontSize: 12, marginBottom: 16, color: 'var(--color-text-success)' }}>
          Klik hieronder om de afspraak toe te voegen aan Google Agenda.
        </div>
        <a href={calendarLink} target="_blank" rel="noopener noreferrer" style={{ ...s.btnP, display: 'inline-block', textDecoration: 'none', padding: '10px 24px', marginBottom: 12 }}>
          Toevoegen aan Google Agenda →
        </a>
        <div style={{ marginTop: 12 }}>
          <button style={s.btnG} onClick={handleNextAfterCalendar}>
            Volgend contact →
          </button>
        </div>
      </div>
    </div>
  )

  // ── Waiting screen ──
  if (!contact && waitSeconds > 0) return (
    <div style={s.wrap}><div style={s.empty}><div style={s.wait}>Volgend contact beschikbaar over {waitSeconds}s</div></div></div>
  )

  // ── No contact loaded ──
  if (!contact) return (
    <div style={s.wrap}>
      <div style={s.empty}>
        <div style={{ fontSize: 13 }}>{contactError || 'Geen contact geladen'}</div>
        <button style={{ ...s.btn, ...({ background: '#1d6fb8', color: '#fff', border: 'none' }) }} onClick={requestNextContact} disabled={loading}>
          {loading ? 'Laden…' : 'Volgend contact'}
        </button>
      </div>
    </div>
  )

  // ── Main call interface ──
  return (
    <div style={s.wrap}>
      <div style={s.row}>
        {/* Left column: Contact + call controls + outcome form */}
        <div style={s.card}>
          <div style={s.ct}>Huidig contact</div>
          <div style={{ background: 'var(--color-background-secondary)', borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 3 }}>{contact.first_name} {contact.last_name}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
              Lead score: <span style={{ color: 'var(--color-text-success)', fontWeight: 500 }}>{contact.lead_score}</span>
            </div>
          </div>
          <div style={s.phone}>{contact.phone_masked}</div>

          {/* Call status controls */}
          {callStatus !== 'active' ? (
            <>
              <div style={{ ...s.tlab, marginBottom: 6 }}>Bel dit nummer met uw telefoon en klik dan op Start</div>
              <div style={s.ctrls}>
                <button style={{ ...s.btn, background: '#1d6fb8', color: '#fff', border: 'none' }} onClick={() => setCallStatus('active')}>
                  Gesprek gestart — start timer
                </button>
                <button style={s.btn} onClick={requestNextContact} disabled={loading}>Overslaan</button>
              </div>
            </>
          ) : (
            <>
              <div style={s.timer}>{fmt(callDurationSec)}</div>
              <div style={s.tlab}>Gesprek bezig</div>

              {/* Outcome selected → show form */}
              {outcome && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={s.ct}>Resultaat</div>
                    <span style={outcomeBadge(outcome)}>{outcomeLabels[outcome]}</span>
                    <button style={{ ...s.btn, fontSize: 10, padding: '2px 6px' }} onClick={() => setOutcome(null)}>Wijzig</button>
                  </div>

                  {/* ── INTERESTED: Address + Appointment ── */}
                  {outcome === 'interested' && (
                    <>
                      <div style={s.addrBox}>
                        <div style={s.addrLbl}>Adres — vraag aan de prospect <span style={s.addrTag}>Verplicht</span></div>
                        <div style={s.fg}>
                          <div style={s.fl}>Straat + huisnummer *</div>
                          <input style={s.fi} value={street} onChange={e => setStreet(e.target.value)} placeholder="bv. Koningsstraat 12" />
                        </div>
                        <div style={s.frow}>
                          <div style={s.fg}>
                            <div style={s.fl}>Gemeente *</div>
                            <input style={s.fi} value={city} onChange={e => setCity(e.target.value)} placeholder="bv. Antwerpen" />
                          </div>
                          <div style={s.fg}>
                            <div style={s.fl}>Postcode *</div>
                            <input style={s.fi} value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="bv. 2000" />
                          </div>
                        </div>
                      </div>

                      <div style={s.ct}>Afspraak plannen</div>
                      <div style={s.frow}>
                        <div style={s.fg}>
                          <div style={s.fl}>Datum *</div>
                          <input style={s.fi} type="date" value={appointmentDate} onChange={e => setAppointmentDate(e.target.value)} />
                        </div>
                        <div style={s.fg}>
                          <div style={s.fl}>Tijd *</div>
                          <input style={s.fi} type="time" value={appointmentTime} onChange={e => setAppointmentTime(e.target.value)} />
                        </div>
                      </div>

                      <div style={s.fg}>
                        <div style={s.fl}>Notities</div>
                        <textarea style={{ ...s.fi, resize: 'none' }} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Extra opmerkingen..." />
                      </div>
                    </>
                  )}

                  {/* ── CALLBACK: Date picker ── */}
                  {outcome === 'callback' && (
                    <>
                      <div style={s.ct}>Terugbellen plannen</div>
                      <div style={s.frow}>
                        <div style={s.fg}>
                          <div style={s.fl}>Terugbeldatum *</div>
                          <input style={s.fi} type="date" value={callbackDate} onChange={e => setCallbackDate(e.target.value)} />
                        </div>
                        <div style={s.fg}>
                          <div style={s.fl}>Terugbeltijd *</div>
                          <input style={s.fi} type="time" value={callbackTime} onChange={e => setCallbackTime(e.target.value)} />
                        </div>
                      </div>
                      <div style={s.fg}>
                        <div style={s.fl}>Notities</div>
                        <textarea style={{ ...s.fi, resize: 'none' }} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reden terugbellen..." />
                      </div>
                    </>
                  )}

                  {/* ── OTHER OUTCOMES: Quick note ── */}
                  {!['interested', 'callback'].includes(outcome) && (
                    <div style={s.fg}>
                      <div style={s.fl}>Notities (optioneel)</div>
                      <textarea style={{ ...s.fi, resize: 'none' }} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optionele notities..." />
                    </div>
                  )}

                  {error && <div style={s.err}>{error}</div>}

                  <div style={{ marginTop: 8 }}>
                    <button style={s.btnP} onClick={handleSave} disabled={saving}>
                      {saving ? 'Opslaan…' : outcome === 'interested' ? 'Afspraak opslaan & volgende →' : outcome === 'callback' ? 'Terugbelmoment opslaan & volgende →' : 'Opslaan & volgend contact →'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Right column: Script */}
        <div style={s.card}>
          <ScriptPrompter onOutcome={handleScriptOutcome} />
        </div>
      </div>
    </div>
  )
}
