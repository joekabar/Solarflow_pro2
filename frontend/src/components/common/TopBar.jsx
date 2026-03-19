// frontend/src/components/common/TopBar.jsx
import { useAgentStore }    from '../../store/agentStore'
import { useCallStore }     from '../../store/callStore'
import { useCampaignStore } from '../../store/campaignStore'
import { useNavigate }      from 'react-router-dom'
import { api }              from '../../hooks/api'

export default function TopBar() {
  const { user, clearUser }  = useAgentStore()
  const { contact, callStatus, callDurationSec } = useCallStore()
  const { campaign }         = useCampaignStore()
  const navigate             = useNavigate()

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  async function logout() {
    try { await api.post('/auth/logout') } catch {}
    clearUser()
    navigate('/login')
  }

  const now = new Date()
  const clock = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  const s = {
    bar:    { display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 46, background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0 },
    logo:   { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, fontSize: 14 },
    sq:     { width: 22, height: 22, background: 'var(--color-background-info)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    pill:   { display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 20, padding: '3px 10px', fontSize: 12 },
    dot:    (c) => ({ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }),
    sp:     { flex: 1 },
    info:   { fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 },
    btn:    { padding: '4px 10px', borderRadius: 6, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', fontSize: 11, cursor: 'pointer' },
  }

  return (
    <div style={s.bar}>
      <div style={s.logo}>
        <div style={s.sq}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <polygon points="6,1 11,10 1,10" fill="white" opacity="0.9"/>
          </svg>
        </div>
        SolarFlow Pro
      </div>

      {contact && (
        <div style={s.pill}>
          <div style={s.dot('#22c55e')}/>
          <span>{contact.first_name} {contact.last_name} · {contact.phone_masked}</span>
          {callStatus === 'active' && (
            <span style={{ color: 'var(--color-text-success)', fontWeight: 500 }}>
              {formatTime(callDurationSec)}
            </span>
          )}
        </div>
      )}

      <div style={s.sp}/>

      <div style={s.info}>
        <div style={s.dot('#22c55e')}/>
        <span>Ready</span>
        <span>·</span>
        <span>{user?.full_name}</span>
        <span>·</span>
        <span>{clock}</span>
      </div>

      <button style={s.btn} onClick={logout}>Sign out</button>
    </div>
  )
}


// frontend/src/components/common/LeftNav.jsx
import { useNavigate, useLocation } from 'react-router-dom'
import { useAgentStore } from '../../store/agentStore'

const NAV_ITEMS = [
  { icon: 'grid',     path: '/workspace',  roles: ['agent','supervisor','admin'] },
  { icon: 'contacts', path: '/admin/contacts', roles: ['admin','supervisor'] },
  { icon: 'campaigns',path: '/admin/campaigns',roles: ['admin','supervisor'] },
  { icon: 'reports',  path: '/admin/reports',  roles: ['admin','supervisor','client'] },
  { icon: 'settings', path: '/admin/settings', roles: ['admin'] },
]

function Icon({ name }) {
  const icons = {
    grid:      <><rect x="1" y="1" width="5" height="5" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="5" height="5" rx="1.5" fill="currentColor" opacity=".4"/><rect x="1" y="9" width="5" height="5" rx="1.5" fill="currentColor" opacity=".4"/><rect x="9" y="9" width="5" height="5" rx="1.5" fill="currentColor" opacity=".4"/></>,
    contacts:  <><circle cx="7" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M2 13c0-2.8 2.2-4.5 5-4.5s5 1.7 5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/></>,
    campaigns: <><path d="M2 7h10M2 4h7M2 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></>,
    reports:   <><rect x="2" y="9" width="2.5" height="4" rx="1" fill="currentColor" opacity=".4"/><rect x="6.5" y="5" width="2.5" height="8" rx="1" fill="currentColor" opacity=".7"/><rect x="11" y="1" width="2.5" height="12" rx="1" fill="currentColor"/></>,
    settings:  <><circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.4" fill="none"/><path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></>,
  }
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      {icons[name]}
    </svg>
  )
}

export default function LeftNav() {
  const { user }     = useAgentStore()
  const navigate     = useNavigate()
  const { pathname } = useLocation()

  const s = {
    nav:  { width: 48, background: 'var(--color-background-primary)', borderRight: '0.5px solid var(--color-border-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 2, flexShrink: 0 },
    item: (active) => ({ width: 34, height: 34, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: active ? 'var(--color-text-info)' : 'var(--color-text-secondary)', background: active ? 'var(--color-background-info)' : 'transparent' }),
  }

  const visible = NAV_ITEMS.filter(i => i.roles.includes(user?.role))

  return (
    <div style={s.nav}>
      {visible.map(item => (
        <div key={item.path} style={s.item(pathname.startsWith(item.path))} onClick={() => navigate(item.path)}>
          <Icon name={item.icon}/>
        </div>
      ))}
    </div>
  )
}


// frontend/src/components/common/TrialBanner.jsx
export default function TrialBanner({ daysRemaining }) {
  if (daysRemaining === null || daysRemaining === undefined) return null
  const urgent = daysRemaining <= 2

  return (
    <div style={{
      background: urgent ? 'var(--color-background-warning)' : 'var(--color-background-info)',
      color:      urgent ? 'var(--color-text-warning)'      : 'var(--color-text-info)',
      padding:    '6px 16px', fontSize: 12,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      borderBottom: '0.5px solid var(--color-border-tertiary)', flexShrink: 0,
    }}>
      <span>
        Trial: <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining</strong>
        {urgent ? ' — upgrade now to keep your data and call history' : ''}
      </span>
      <a href="/billing" style={{ fontSize: 11, fontWeight: 500, color: 'inherit' }}>
        Upgrade →
      </a>
    </div>
  )
}


// frontend/src/components/common/StatusBar.jsx
import { useCampaignStore } from '../../store/campaignStore'

export default function StatusBar() {
  const { campaign, callsToday, reachedToday } = useCampaignStore()

  const s = {
    bar: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', height: 30, background: 'var(--color-background-primary)', borderTop: '0.5px solid var(--color-border-tertiary)', flexShrink: 0, fontSize: 10, color: 'var(--color-text-secondary)', overflow: 'hidden' },
    dot: (c) => ({ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }),
    sep: { opacity: 0.4 },
    sp:  { flex: 1 },
  }

  return (
    <div style={s.bar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={s.dot('#22c55e')}/>
        <span>Lead scoring: on</span>
      </div>
      <span style={s.sep}>·</span>
      <span>Campaign: {campaign?.name || 'No campaign selected'}</span>
      <span style={s.sep}>·</span>
      <span>Calls today: {callsToday} · Reached: {reachedToday}</span>
      <div style={s.sp}/>
      <span>DNC ✓</span>
      <span style={s.sep}>·</span>
      <span>Calling hours: 09:00–20:00 ✓</span>
      <span style={s.sep}>·</span>
      <span>GDPR ✓</span>
    </div>
  )
}
