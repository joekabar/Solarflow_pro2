// frontend/src/components/admin/CampaignsTab.jsx
// ──────────────────────────────────────────────────
// Campaign management for admin panel.
// Create, edit, pause, and delete campaigns.

import { useState, useEffect } from 'react'
import { api } from '../../hooks/api'

const COUNTRIES = [
  { value: 'BE', label: 'Belgium' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
]

const STATUS_COLORS = {
  active:    { bg: 'var(--color-background-success)', color: 'var(--color-text-success)', border: 'var(--color-border-success)' },
  paused:    { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)', border: 'var(--color-border-warning)' },
  completed: { bg: 'var(--color-background-secondary)', color: 'var(--color-text-tertiary)', border: 'var(--color-border-tertiary)' },
}

export default function CampaignsTab() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [error, setError]         = useState('')
  const [form, setForm] = useState({
    name: '', country: 'BE',
    contact_interval_sec: '',
    calling_hours_start: '09:00',
    calling_hours_end: '20:00',
  })

  useEffect(() => { loadCampaigns() }, [])

  async function loadCampaigns() {
    setLoading(true)
    try {
      const res = await api.get('/campaigns')
      setCampaigns(res.campaigns || [])
    } catch (e) {
      setError('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', country: 'BE', contact_interval_sec: '', calling_hours_start: '09:00', calling_hours_end: '20:00' })
    setShowForm(true)
    setError('')
  }

  function openEdit(c) {
    setEditing(c)
    setForm({
      name: c.name,
      country: c.country,
      contact_interval_sec: c.contact_interval_sec || '',
      calling_hours_start: c.calling_hours_start || '09:00',
      calling_hours_end: c.calling_hours_end || '20:00',
    })
    setShowForm(true)
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Campagnenaam is verplicht'); return }
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        country: form.country,
        calling_hours_start: form.calling_hours_start,
        calling_hours_end: form.calling_hours_end,
      }
      if (form.contact_interval_sec) {
        payload.contact_interval_sec = Number(form.contact_interval_sec)
      }

      if (editing) {
        await api.put(`/campaigns/${editing.id}`, payload)
      } else {
        await api.post('/campaigns', payload)
      }
      setShowForm(false)
      setEditing(null)
      await loadCampaigns()
    } catch (e) {
      setError(e.message || 'Failed to save')
    }
  }

  async function handleToggleStatus(c) {
    const newStatus = c.status === 'active' ? 'paused' : 'active'
    try {
      await api.put(`/campaigns/${c.id}`, { status: newStatus })
      await loadCampaigns()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(c) {
    if (!confirm(`Campagne "${c.name}" verwijderen? Contacten worden niet verwijderd.`)) return
    try {
      await api.delete(`/campaigns/${c.id}`)
      await loadCampaigns()
    } catch (e) {
      setError(e.message)
    }
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const s = {
    card:  { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' },
    hdr:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border-tertiary)' },
    title: { fontSize: 16, fontWeight: 500 },
    btnP:  { padding: '7px 14px', borderRadius: 7, background: '#1d6fb8', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 500 },
    btn:   { padding: '5px 10px', borderRadius: 6, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', fontSize: 11, cursor: 'pointer' },
    btnD:  { padding: '5px 10px', borderRadius: 6, border: '0.5px solid var(--color-border-danger)', background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', fontSize: 11, cursor: 'pointer' },
    row:   { display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 150px', alignItems: 'center', padding: '12px 20px', borderBottom: '0.5px solid var(--color-border-tertiary)', gap: 12 },
    rowH:  { display: 'grid', gridTemplateColumns: '1fr 80px 100px 120px 150px', padding: '8px 20px', borderBottom: '0.5px solid var(--color-border-tertiary)', gap: 12, background: 'var(--color-background-secondary)' },
    th:    { fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em' },
    name:  { fontSize: 13, fontWeight: 500 },
    sub:   { fontSize: 11, color: 'var(--color-text-secondary)' },
    badge: (status) => {
      const c = STATUS_COLORS[status] || STATUS_COLORS.completed
      return { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: c.bg, color: c.color, border: `0.5px solid ${c.border}` }
    },
    actions: { display: 'flex', gap: 4 },
    empty: { padding: '40px 20px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13 },
    err:   { background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', borderRadius: 7, padding: '8px 12px', fontSize: 12, margin: '0 20px 12px' },

    // Form styles
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modal:   { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: 24, width: '100%', maxWidth: 440 },
    mTitle:  { fontSize: 15, fontWeight: 500, marginBottom: 16 },
    fg:      { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 },
    fl:      { fontSize: 11, color: 'var(--color-text-secondary)' },
    fi:      { padding: '7px 10px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', width: '100%' },
    frow:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
    ffoot:   { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 },
  }

  return (
    <>
      <div style={s.card}>
        <div style={s.hdr}>
          <div style={s.title}>Campagnes</div>
          <button style={s.btnP} onClick={openCreate}>+ Nieuwe campagne</button>
        </div>

        {error && <div style={s.err}>{error}</div>}

        {campaigns.length > 0 && (
          <div style={s.rowH}>
            <div style={s.th}>Naam</div>
            <div style={s.th}>Land</div>
            <div style={s.th}>Status</div>
            <div style={s.th}>Beluren</div>
            <div style={s.th}>Acties</div>
          </div>
        )}

        {loading ? (
          <div style={s.empty}>Laden…</div>
        ) : campaigns.length === 0 ? (
          <div style={s.empty}>
            Nog geen campagnes. Klik op "+ Nieuwe campagne" om te beginnen.
          </div>
        ) : (
          campaigns.map(c => (
            <div key={c.id} style={s.row}>
              <div>
                <div style={s.name}>{c.name}</div>
                <div style={s.sub}>
                  {c.contact_interval_sec ? `${c.contact_interval_sec}s interval` : '45s interval (standaard)'}
                </div>
              </div>
              <div style={s.sub}>{COUNTRIES.find(x => x.value === c.country)?.label || c.country}</div>
              <div><span style={s.badge(c.status)}>{c.status}</span></div>
              <div style={s.sub}>{c.calling_hours_start} – {c.calling_hours_end}</div>
              <div style={s.actions}>
                <button style={s.btn} onClick={() => openEdit(c)}>Bewerk</button>
                <button style={s.btn} onClick={() => handleToggleStatus(c)}>
                  {c.status === 'active' ? 'Pauze' : 'Activeer'}
                </button>
                <button style={s.btnD} onClick={() => handleDelete(c)}>×</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div style={s.modal}>
            <div style={s.mTitle}>
              {editing ? `Campagne bewerken: ${editing.name}` : 'Nieuwe campagne'}
            </div>

            <div style={s.fg}>
              <div style={s.fl}>Campagnenaam *</div>
              <input style={s.fi} value={form.name} onChange={set('name')} placeholder="bv. Zonnepanelen Antwerpen" autoFocus />
            </div>

            <div style={s.frow}>
              <div style={s.fg}>
                <div style={s.fl}>Land</div>
                <select style={s.fi} value={form.country} onChange={set('country')}>
                  {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div style={s.fg}>
                <div style={s.fl}>Contact interval (sec)</div>
                <input style={s.fi} type="number" min="10" max="300" value={form.contact_interval_sec} onChange={set('contact_interval_sec')} placeholder="45 (standaard)" />
              </div>
            </div>

            <div style={s.frow}>
              <div style={s.fg}>
                <div style={s.fl}>Beluren start</div>
                <input style={s.fi} type="time" value={form.calling_hours_start} onChange={set('calling_hours_start')} />
              </div>
              <div style={s.fg}>
                <div style={s.fl}>Beluren einde</div>
                <input style={s.fi} type="time" value={form.calling_hours_end} onChange={set('calling_hours_end')} />
              </div>
            </div>

            {error && <div style={{ ...s.err, margin: '12px 0 0' }}>{error}</div>}

            <div style={s.ffoot}>
              <button style={s.btn} onClick={() => setShowForm(false)}>Annuleren</button>
              <button style={s.btnP} onClick={handleSave}>
                {editing ? 'Opslaan' : 'Campagne aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
