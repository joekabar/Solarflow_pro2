// frontend/src/components/tabs/AgendaTab.jsx
// ──────────────────────────────────────────────
// Shows real appointments from the database.
// Simple list view — calendar integration comes in Sprint 6.

import { useState, useEffect } from 'react'
import { api } from '../../hooks/api'

export default function AgendaTab() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAppointments() }, [])

  async function loadAppointments() {
    setLoading(true)
    try {
      const res = await api.get('/appointments')
      setAppointments(res.appointments || [])
    } catch (e) {
      console.error('Failed to load appointments:', e)
    } finally {
      setLoading(false)
    }
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const todayAppts = appointments.filter(a => a.scheduled_at?.startsWith(todayStr))
  const upcomingAppts = appointments.filter(a => a.scheduled_at > today.toISOString() && !a.scheduled_at?.startsWith(todayStr))
  const pastAppts = appointments.filter(a => a.scheduled_at < today.toISOString() && !a.scheduled_at?.startsWith(todayStr))

  const s = {
    wrap:  { height: '100%', padding: 12, overflowY: 'auto' },
    card:  { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden', marginBottom: 12 },
    hdr:   { padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    count: { fontSize: 10, color: 'var(--color-text-secondary)', background: 'var(--color-background-secondary)', padding: '2px 8px', borderRadius: 20 },
    empty: { padding: '24px 14px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 12 },
    appt:  { padding: '10px 14px', borderBottom: '0.5px solid var(--color-border-tertiary)', display: 'flex', gap: 10, alignItems: 'flex-start' },
    time:  { fontSize: 18, fontWeight: 500, color: 'var(--color-text-primary)', minWidth: 50, lineHeight: 1.2 },
    info:  { flex: 1 },
    title: { fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 2 },
    addr:  { fontSize: 11, color: 'var(--color-text-secondary)' },
    badge: (status) => ({
      display: 'inline-block', padding: '2px 7px', borderRadius: 20, fontSize: 9, fontWeight: 500,
      background: status === 'scheduled' ? 'var(--color-background-info)' : status === 'completed' ? 'var(--color-background-success)' : 'var(--color-background-secondary)',
      color: status === 'scheduled' ? 'var(--color-text-info)' : status === 'completed' ? 'var(--color-text-success)' : 'var(--color-text-secondary)',
    }),
  }

  function formatTime(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  function renderAppt(a) {
    return (
      <div key={a.id} style={s.appt}>
        <div style={s.time}>{formatTime(a.scheduled_at)}</div>
        <div style={s.info}>
          <div style={s.title}>{a.title || 'Afspraak'}</div>
          {a.address && <div style={s.addr}>{a.address}</div>}
          {a.notes && <div style={{ ...s.addr, fontStyle: 'italic', marginTop: 2 }}>{a.notes}</div>}
        </div>
        <span style={s.badge(a.status)}>{a.status}</span>
      </div>
    )
  }

  if (loading) return (
    <div style={s.wrap}><div style={{ ...s.card, padding: 24, textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 12 }}>Laden…</div></div>
  )

  return (
    <div style={s.wrap}>
      {/* Today */}
      <div style={s.card}>
        <div style={s.hdr}>
          <span>Vandaag — {today.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <span style={s.count}>{todayAppts.length}</span>
        </div>
        {todayAppts.length === 0 ? (
          <div style={s.empty}>Geen afspraken vandaag</div>
        ) : (
          todayAppts.map(renderAppt)
        )}
      </div>

      {/* Upcoming */}
      <div style={s.card}>
        <div style={s.hdr}>
          <span>Komende afspraken</span>
          <span style={s.count}>{upcomingAppts.length}</span>
        </div>
        {upcomingAppts.length === 0 ? (
          <div style={s.empty}>Geen komende afspraken</div>
        ) : (
          upcomingAppts.slice(0, 10).map(a => (
            <div key={a.id} style={s.appt}>
              <div style={{ ...s.time, fontSize: 11, minWidth: 70, color: 'var(--color-text-secondary)' }}>{formatDate(a.scheduled_at)}</div>
              <div style={s.info}>
                <div style={s.title}>{a.title || 'Afspraak'}</div>
                {a.address && <div style={s.addr}>{a.address}</div>}
              </div>
              <span style={s.badge(a.status)}>{a.status}</span>
            </div>
          ))
        )}
      </div>

      {/* Past */}
      {pastAppts.length > 0 && (
        <div style={s.card}>
          <div style={s.hdr}>
            <span>Afgelopen</span>
            <span style={s.count}>{pastAppts.length}</span>
          </div>
          {pastAppts.slice(0, 5).map(a => (
            <div key={a.id} style={{ ...s.appt, opacity: 0.6 }}>
              <div style={{ ...s.time, fontSize: 11, minWidth: 70, color: 'var(--color-text-tertiary)' }}>{formatDate(a.scheduled_at)}</div>
              <div style={s.info}>
                <div style={{ ...s.title, color: 'var(--color-text-secondary)' }}>{a.title || 'Afspraak'}</div>
                {a.address && <div style={s.addr}>{a.address}</div>}
              </div>
              <span style={s.badge(a.status)}>{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
