// frontend/src/pages/PlatformAdmin.jsx
// ──────────────────────────────────────
// Super admin dashboard for the SolarFlow Pro platform owner.
// Manages all organizations, users, trials across the entire platform.

import { useState, useEffect } from 'react'
import { useAgentStore } from '../store/agentStore'
import { api } from '../hooks/api'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'orgs',     label: 'Organisaties' },
  { id: 'users',    label: 'Alle gebruikers' },
]

const PLAN_COLORS = {
  trial:      { bg: 'var(--color-background-warning)', color: 'var(--color-text-warning)' },
  starter:    { bg: 'var(--color-background-info)', color: 'var(--color-text-info)' },
  pro:        { bg: 'var(--color-background-success)', color: 'var(--color-text-success)' },
  enterprise: { bg: '#e8e6f0', color: '#4a3d8f' },
}

export default function PlatformAdmin() {
  const [tab, setTab] = useState('overview')
  const { user } = useAgentStore()

  const s = {
    wrap:  { display: 'flex', flexDirection: 'column', height: '100vh', background: '#0f0f12' },
    hdr:   { background: '#1a1a22', borderBottom: '1px solid #2a2a35', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 10, height: 50 },
    logo:  { fontWeight: 600, fontSize: 15, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 },
    badge: { padding: '2px 8px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#7c3aed', color: '#fff', textTransform: 'uppercase', letterSpacing: '.08em' },
    sp:    { flex: 1 },
    user:  { fontSize: 12, color: '#888' },
    tabs:  { display: 'flex', gap: 0, background: '#1a1a22', borderBottom: '1px solid #2a2a35', padding: '0 24px' },
    tab:   (a) => ({ padding: '10px 16px', fontSize: 13, cursor: 'pointer', borderBottom: a ? '2px solid #7c3aed' : '2px solid transparent', color: a ? '#fff' : '#666', fontWeight: a ? 500 : 400 }),
    body:  { flex: 1, padding: 24, overflowY: 'auto' },
  }

  return (
    <div style={s.wrap}>
      <div style={s.hdr}>
        <span style={s.logo}>
          <span>SolarFlow Pro</span>
          <span style={s.badge}>Platform Admin</span>
        </span>
        <div style={s.sp} />
        <span style={s.user}>{user?.full_name}</span>
      </div>
      <div style={s.tabs}>
        {TABS.map(t => (
          <div key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</div>
        ))}
      </div>
      <div style={s.body}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'orgs'     && <OrgsTab />}
        {tab === 'users'    && <AllUsersTab />}
      </div>
    </div>
  )
}


// ── Overview Tab ─────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/platform/stats')
        setStats(res)
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const s = {
    grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
    card: { background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: 12, padding: 20 },
    cardTitle: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 12 },
    stat: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #2a2a35' },
    statLabel: { fontSize: 13, color: '#999' },
    statVal: { fontSize: 13, fontWeight: 600, color: '#fff' },
    bigNum: { fontSize: 36, fontWeight: 700, color: '#fff', lineHeight: 1 },
    bigLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  }

  if (loading) return <div style={{ color: '#666' }}>Laden...</div>
  if (!stats) return <div style={{ color: '#666' }}>Geen data</div>

  return (
    <>
      <div style={s.grid}>
        <div style={s.card}>
          <div style={s.cardTitle}>Organisaties</div>
          <div style={s.bigNum}>{stats.organizations.total}</div>
          <div style={s.bigLabel}>{stats.organizations.active} actief · {stats.organizations.trial} trial · {stats.organizations.paid} betaald</div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Gebruikers</div>
          <div style={s.bigNum}>{stats.users.total}</div>
          <div style={s.bigLabel}>{stats.users.agents} agents · {stats.users.admins} admins</div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Contacten</div>
          <div style={s.bigNum}>{stats.contacts.total}</div>
          <div style={s.bigLabel}>{stats.contacts.available} beschikbaar · {stats.contacts.called} gebeld</div>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Gesprekken</div>
          <div style={s.bigNum}>{stats.calls.total}</div>
          <div style={s.bigLabel}>{stats.calls.interested} geïnteresseerd · {stats.calls.conversion_rate}% conversie</div>
        </div>
      </div>
    </>
  )
}


// ── Organizations Tab ───────────────────────────────────────
function OrgsTab() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [extendOrg, setExtendOrg] = useState(null)
  const [extendDays, setExtendDays] = useState(7)

  useEffect(() => { loadOrgs() }, [])

  async function loadOrgs() {
    setLoading(true)
    try {
      const res = await api.get('/platform/organizations')
      setOrgs(res.organizations || [])
    } catch (e) { setError('Laden mislukt') }
    finally { setLoading(false) }
  }

  async function handleToggleActive(org) {
    try {
      await api.put(`/platform/organizations/${org.id}`, { is_active: !org.is_active })
      await loadOrgs()
    } catch (e) { setError(e.message) }
  }

  async function handleChangePlan(orgId, plan) {
    try {
      await api.put(`/platform/organizations/${orgId}`, { plan })
      await loadOrgs()
    } catch (e) { setError(e.message) }
  }

  async function handleExtendTrial() {
    if (!extendOrg) return
    try {
      await api.post(`/platform/organizations/${extendOrg.id}/extend-trial`, { days: extendDays })
      setExtendOrg(null)
      await loadOrgs()
    } catch (e) { setError(e.message) }
  }

  const s = {
    card:  { background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: 12, overflow: 'hidden' },
    hdr:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #2a2a35' },
    title: { fontSize: 15, fontWeight: 500, color: '#fff' },
    row:   { display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px 80px 80px 160px', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #2a2a35', gap: 8 },
    rowH:  { display: 'grid', gridTemplateColumns: '1fr 80px 100px 80px 80px 80px 160px', padding: '8px 20px', borderBottom: '1px solid #2a2a35', gap: 8, background: '#15151d' },
    th:    { fontSize: 10, fontWeight: 500, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em' },
    name:  { fontSize: 13, fontWeight: 500, color: '#fff' },
    sub:   { fontSize: 11, color: '#666' },
    badge: (plan) => {
      const c = PLAN_COLORS[plan] || PLAN_COLORS.trial
      return { display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 500, background: c.bg, color: c.color }
    },
    btn:   { padding: '4px 8px', borderRadius: 5, border: '1px solid #2a2a35', background: '#1a1a22', color: '#999', fontSize: 10, cursor: 'pointer' },
    btnP:  { padding: '4px 8px', borderRadius: 5, background: '#7c3aed', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer' },
    btnD:  { padding: '4px 8px', borderRadius: 5, background: '#c53030', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer' },
    btnG:  { padding: '4px 8px', borderRadius: 5, background: '#22c55e', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer' },
    err:   { background: '#2d1515', color: '#f87171', borderRadius: 7, padding: '8px 12px', fontSize: 12, margin: '0 20px 8px' },
    actions: { display: 'flex', gap: 3, flexWrap: 'wrap' },
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    modal: { background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: 12, padding: 24, width: 360 },
    mTitle: { fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 14 },
    fi: { padding: '7px 10px', border: '1px solid #2a2a35', borderRadius: 7, fontSize: 13, background: '#0f0f12', color: '#fff', width: '100%' },
    fl: { fontSize: 11, color: '#666', marginBottom: 4 },
    fg: { marginBottom: 12 },
    mfoot: { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 },
  }

  const formatDate = (d) => {
    if (!d) return '—'
    const dt = new Date(d)
    const now = new Date()
    const diff = Math.ceil((dt - now) / (1000 * 60 * 60 * 24))
    const str = dt.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
    if (diff < 0) return `${str} (verlopen)`
    return `${str} (${diff}d)`
  }

  if (loading) return <div style={{ color: '#666' }}>Laden...</div>

  return (
    <>
      {error && <div style={s.err}>{error}</div>}
      <div style={s.card}>
        <div style={s.hdr}>
          <div style={s.title}>Alle organisaties ({orgs.length})</div>
        </div>
        <div style={s.rowH}>
          <div style={s.th}>Naam</div>
          <div style={s.th}>Plan</div>
          <div style={s.th}>Trial einde</div>
          <div style={s.th}>Users</div>
          <div style={s.th}>Contacts</div>
          <div style={s.th}>Camps</div>
          <div style={s.th}>Acties</div>
        </div>
        {orgs.map(o => (
          <div key={o.id} style={{ ...s.row, opacity: o.is_active ? 1 : 0.5 }}>
            <div>
              <div style={s.name}>{o.name}</div>
              <div style={s.sub}>{o.country} · {o.id.slice(0, 8)}…</div>
            </div>
            <div>
              <select style={{ ...s.fi, padding: '2px 4px', fontSize: 10 }}
                value={o.plan} onChange={(e) => handleChangePlan(o.id, e.target.value)}>
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div style={s.sub}>{formatDate(o.trial_ends_at)}</div>
            <div style={s.sub}>{o.user_count}</div>
            <div style={s.sub}>{o.contact_count}</div>
            <div style={s.sub}>{o.campaign_count}</div>
            <div style={s.actions}>
              <button style={s.btnP} onClick={() => { setExtendOrg(o); setExtendDays(7) }}>+Trial</button>
              {o.is_active
                ? <button style={s.btnD} onClick={() => handleToggleActive(o)}>Blokkeer</button>
                : <button style={s.btnG} onClick={() => handleToggleActive(o)}>Activeer</button>
              }
            </div>
          </div>
        ))}
      </div>

      {extendOrg && (
        <div style={s.overlay} onClick={(e) => e.target === e.currentTarget && setExtendOrg(null)}>
          <div style={s.modal}>
            <div style={s.mTitle}>Trial verlengen — {extendOrg.name}</div>
            <div style={s.fg}>
              <div style={s.fl}>Aantal dagen toevoegen</div>
              <input style={s.fi} type="number" min="1" max="365" value={extendDays}
                onChange={e => setExtendDays(Number(e.target.value))} />
            </div>
            <div style={s.sub}>Huidige trial eindigt: {formatDate(extendOrg.trial_ends_at)}</div>
            <div style={s.mfoot}>
              <button style={s.btn} onClick={() => setExtendOrg(null)}>Annuleren</button>
              <button style={s.btnP} onClick={handleExtendTrial}>Verlengen</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


// ── All Users Tab ───────────────────────────────────────────
function AllUsersTab() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await api.get('/platform/users')
      setUsers(res.users || [])
    } catch (e) { setError('Laden mislukt') }
    finally { setLoading(false) }
  }

  async function handleToggleActive(u) {
    try {
      await api.put(`/platform/users/${u.id}`, { is_active: !u.is_active })
      await loadUsers()
    } catch (e) { setError(e.message) }
  }

  async function handleTogglePlatformAdmin(u) {
    const action = u.is_platform_admin ? 'platform admin rechten verwijderen' : 'platform admin maken'
    if (!confirm(`${u.full_name} ${action}?`)) return
    try {
      await api.put(`/platform/users/${u.id}`, { is_platform_admin: !u.is_platform_admin })
      await loadUsers()
    } catch (e) { setError(e.message) }
  }

  async function handleRoleChange(userId, role) {
    try {
      await api.put(`/platform/users/${userId}`, { role })
      await loadUsers()
    } catch (e) { setError(e.message) }
  }

  const s = {
    card:  { background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: 12, overflow: 'hidden' },
    hdr:   { padding: '14px 20px', borderBottom: '1px solid #2a2a35' },
    title: { fontSize: 15, fontWeight: 500, color: '#fff' },
    row:   { display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 140px', alignItems: 'center', padding: '10px 20px', borderBottom: '1px solid #2a2a35', gap: 8 },
    rowH:  { display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 140px', padding: '8px 20px', borderBottom: '1px solid #2a2a35', gap: 8, background: '#15151d' },
    th:    { fontSize: 10, fontWeight: 500, color: '#555', textTransform: 'uppercase', letterSpacing: '.06em' },
    name:  { fontSize: 13, fontWeight: 500, color: '#fff' },
    sub:   { fontSize: 11, color: '#666' },
    fi:    { padding: '2px 4px', border: '1px solid #2a2a35', borderRadius: 5, fontSize: 10, background: '#0f0f12', color: '#fff' },
    btn:   { padding: '4px 8px', borderRadius: 5, border: '1px solid #2a2a35', background: '#1a1a22', color: '#999', fontSize: 10, cursor: 'pointer' },
    btnP:  { padding: '4px 8px', borderRadius: 5, background: '#7c3aed', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer' },
    btnD:  { padding: '4px 8px', borderRadius: 5, background: '#c53030', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer' },
    btnG:  { padding: '4px 8px', borderRadius: 5, background: '#22c55e', color: '#fff', border: 'none', fontSize: 10, cursor: 'pointer' },
    paBadge: { padding: '2px 6px', borderRadius: 20, fontSize: 9, fontWeight: 600, background: '#7c3aed', color: '#fff' },
    err: { background: '#2d1515', color: '#f87171', borderRadius: 7, padding: '8px 12px', fontSize: 12, marginBottom: 8 },
    actions: { display: 'flex', gap: 3, flexWrap: 'wrap' },
    dot: (a) => ({ width: 6, height: 6, borderRadius: '50%', background: a ? '#22c55e' : '#c53030', display: 'inline-block', marginRight: 4 }),
  }

  if (loading) return <div style={{ color: '#666' }}>Laden...</div>

  return (
    <>
      {error && <div style={s.err}>{error}</div>}
      <div style={s.card}>
        <div style={s.hdr}>
          <div style={s.title}>Alle gebruikers ({users.length})</div>
        </div>
        <div style={s.rowH}>
          <div style={s.th}>Naam / Organisatie</div>
          <div style={s.th}>Rol</div>
          <div style={s.th}>Status</div>
          <div style={s.th}>Plan</div>
          <div style={s.th}>Acties</div>
        </div>
        {users.map(u => (
          <div key={u.id} style={{ ...s.row, opacity: u.is_active ? 1 : 0.5 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={s.name}>{u.full_name || 'Naamloos'}</span>
                {u.is_platform_admin && <span style={s.paBadge}>SUPER</span>}
              </div>
              <div style={s.sub}>{u.organizations?.name || '—'}</div>
            </div>
            <div>
              <select style={s.fi} value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                <option value="agent">Agent</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <span style={s.dot(u.is_active)} />
              <span style={{ fontSize: 11, color: u.is_active ? '#22c55e' : '#c53030' }}>
                {u.is_active ? 'Actief' : 'Inactief'}
              </span>
            </div>
            <div style={s.sub}>{u.organizations?.plan || '—'}</div>
            <div style={s.actions}>
              <button
                style={u.is_platform_admin ? s.btnD : s.btnP}
                onClick={() => handleTogglePlatformAdmin(u)}
              >
                {u.is_platform_admin ? '- Super' : '+ Super'}
              </button>
              {u.is_active
                ? <button style={s.btnD} onClick={() => handleToggleActive(u)}>Block</button>
                : <button style={s.btnG} onClick={() => handleToggleActive(u)}>Actief</button>
              }
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
