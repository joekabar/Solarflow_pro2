/**
 * AdminPanel — teams, campaigns, telephony setup, user management.
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../hooks/api'

export default function AdminPanel() {
  const navigate  = useNavigate()
  const [tab, setTab] = useState('teams')

  return (
    <div style={styles.layout}>
      <div style={styles.topbar}>
        <span style={styles.brand}>📞 Call Forge — Admin</span>
        <button className="btn-secondary" onClick={() => navigate('/')} style={{ fontSize: 12, padding: '6px 12px' }}>← Workspace</button>
      </div>

      <div style={styles.body}>
        <div style={styles.sidebar}>
          {['teams', 'campaigns', 'telephony', 'users'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ ...styles.navBtn, ...(tab === t ? styles.navBtnActive : {}) }}
            >
              {t === 'teams' ? '👥 Teams' : t === 'campaigns' ? '📋 Campagnes' : t === 'telephony' ? '📞 Telefonie' : '👤 Gebruikers'}
            </button>
          ))}
        </div>

        <div style={styles.content}>
          {tab === 'teams'     && <TeamsTab />}
          {tab === 'campaigns' && <CampaignsTab />}
          {tab === 'telephony' && <TelephonyTab />}
          {tab === 'users'     && <UsersTab />}
        </div>
      </div>
    </div>
  )
}

// ── Teams ──────────────────────────────────────────────────────

function TeamsTab() {
  const [teams, setTeams] = useState([])
  const [name,  setName]  = useState('')

  useEffect(() => { api.get('/teams').then(setTeams).catch(console.error) }, [])

  async function createTeam() {
    if (!name.trim()) return
    const t = await api.post('/teams', { name })
    setTeams(prev => [...prev, t])
    setName('')
  }

  return (
    <div>
      <h2 style={styles.heading}>Teams</h2>
      <div style={styles.form}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Teamnaam" style={{ maxWidth: 260 }} />
        <button className="btn-primary" onClick={createTeam}>Aanmaken</button>
      </div>
      <div style={styles.list}>
        {teams.map(t => (
          <div key={t.id} style={styles.listItem}>
            <span style={{ fontWeight: 600 }}>{t.name}</span>
            <span style={{ color: 'var(--color-muted)', fontSize: 13 }}>{(t.user_profiles || []).length} leden</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Campaigns ──────────────────────────────────────────────────

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState([])

  useEffect(() => { api.get('/campaigns').then(setCampaigns).catch(console.error) }, [])

  return (
    <div>
      <h2 style={styles.heading}>Campagnes</h2>
      <div style={styles.list}>
        {campaigns.map(c => (
          <div key={c.id} style={styles.listItem}>
            <div>
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              <span style={{ ...styles.badge, marginLeft: 8 }}>{c.dial_mode}</span>
              <span style={{ ...styles.badge, marginLeft: 4, background: c.status === 'active' ? '#1e3a2f' : '#2a2a2a', color: c.status === 'active' ? '#22c55e' : '#94a3b8' }}>{c.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {c.status === 'active'
                ? <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => api.post(`/campaigns/${c.id}/pause`).then(() => setCampaigns(p => p.map(x => x.id === c.id ? { ...x, status: 'paused' } : x)))}>Pauzeren</button>
                : <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => api.post(`/campaigns/${c.id}/resume`).then(() => setCampaigns(p => p.map(x => x.id === c.id ? { ...x, status: 'active' } : x)))}>Hervatten</button>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Telephony ──────────────────────────────────────────────────

function TelephonyTab() {
  const [setup,    setSetup]    = useState(null)
  const [form,     setForm]     = useState({ provider: 'voiptiger', sip_domain: '', sip_username: '', sip_password: '', ws_url: '', phone_number: '' })
  const [saving,   setSaving]   = useState(false)
  const [message,  setMessage]  = useState(null)

  useEffect(() => {
    api.get('/telephony/setup').then(setSetup).catch(console.error)
  }, [])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setMessage(null)
    try {
      await api.post('/telephony/setup', form)
      setMessage({ type: 'success', text: 'Telefonie opgeslagen! Herlaad de agent workspace.' })
    } catch (e) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={styles.heading}>VoIP Tiger Instelling</h2>
      {setup?.configured && (
        <div style={{ ...styles.badge, background: '#1e3a2f', color: '#22c55e', marginBottom: 16, display: 'inline-block' }}>
          ✓ {setup.provider} geconfigureerd — {setup.sip_username}@{setup.sip_domain}
        </div>
      )}

      <form onSubmit={handleSave} style={styles.formVert}>
        <Field label="SIP Domain"    value={form.sip_domain}    onChange={v => setForm(p => ({...p, sip_domain: v}))}    placeholder="sip.voiptiger.com" />
        <Field label="SIP Gebruiker" value={form.sip_username}  onChange={v => setForm(p => ({...p, sip_username: v}))}  placeholder="gebruikersnaam" />
        <Field label="SIP Wachtwoord" value={form.sip_password} onChange={v => setForm(p => ({...p, sip_password: v}))}  placeholder="••••••••" type="password" />
        <Field label="WebSocket URL"  value={form.ws_url}       onChange={v => setForm(p => ({...p, ws_url: v}))}        placeholder="wss://sip.voiptiger.com:8089/ws" />
        <Field label="Beller-ID (E.164)" value={form.phone_number} onChange={v => setForm(p => ({...p, phone_number: v}))} placeholder="+3255..." />

        {message && (
          <div style={{ background: message.type === 'success' ? '#1e3a2f' : '#3a1e1e', color: message.type === 'success' ? '#22c55e' : '#ef4444', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
            {message.text}
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Opslaan...' : 'Opslaan'}
        </button>
      </form>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, color: 'var(--color-muted)' }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

// ── Users ──────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState([])
  const [teams, setTeams] = useState([])

  useEffect(() => {
    api.get('/teams/users/all').then(setUsers).catch(console.error)
    api.get('/teams').then(setTeams).catch(console.error)
  }, [])

  return (
    <div>
      <h2 style={styles.heading}>Gebruikers</h2>
      <table style={styles.table}>
        <thead>
          <tr style={styles.tr}>
            <th style={styles.th}>Naam</th>
            <th style={styles.th}>Rol</th>
            <th style={styles.th}>Team</th>
            <th style={styles.th}>Actief</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} style={styles.tr}>
              <td style={styles.td}>{u.full_name || '—'}</td>
              <td style={styles.td}><span style={styles.badge}>{u.role}</span></td>
              <td style={styles.td}>{teams.find(t => t.id === u.team_id)?.name || '—'}</td>
              <td style={styles.td}>{u.is_active ? '✓' : '✗'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const styles = {
  layout:      { display: 'flex', flexDirection: 'column', height: '100vh' },
  topbar:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 54, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' },
  brand:       { fontWeight: 700, fontSize: 18 },
  body:        { display: 'flex', flex: 1, overflow: 'hidden' },
  sidebar:     { width: 180, background: 'var(--color-surface)', borderRight: '1px solid var(--color-border)', padding: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  navBtn:      { background: 'none', border: 'none', color: 'var(--color-muted)', textAlign: 'left', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 14 },
  navBtnActive:{ background: 'var(--color-bg)', color: 'var(--color-text)' },
  content:     { flex: 1, padding: 24, overflow: 'auto' },
  heading:     { fontSize: 18, fontWeight: 700, marginBottom: 16 },
  form:        { display: 'flex', gap: 10, marginBottom: 16 },
  formVert:    { display: 'flex', flexDirection: 'column', gap: 14 },
  list:        { display: 'flex', flexDirection: 'column', gap: 8 },
  listItem:    { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  badge:       { background: 'var(--color-border)', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600 },
  table:       { width: '100%', borderCollapse: 'collapse' },
  tr:          { borderBottom: '1px solid var(--color-border)' },
  th:          { padding: '8px 12px', textAlign: 'left', fontSize: 12, color: 'var(--color-muted)', fontWeight: 600 },
  td:          { padding: '10px 12px', fontSize: 14 },
}
