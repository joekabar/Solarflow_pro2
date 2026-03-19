// frontend/src/pages/AdminPanel.jsx
// Admin panel — users, campaigns, billing, scripts, reports
// Full implementation in Phase 4. Navigation structure is ready.

import { useState } from 'react'
import { useAgentStore } from '../store/agentStore'

const TABS = [
  { id: 'users',     label: 'Users'     },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'contacts',  label: 'Contacts'  },
  { id: 'scripts',   label: 'Scripts'   },
  { id: 'reports',   label: 'Reports'   },
  { id: 'settings',  label: 'Settings'  },
]

export default function AdminPanel() {
  const [tab, setTab]  = useState('users')
  const { user }       = useAgentStore()

  const s = {
    wrap:  { display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-background-tertiary)' },
    hdr:   { background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8, height: 46 },
    logo:  { fontWeight: 500, fontSize: 14, color: 'var(--color-text-primary)' },
    sp:    { flex: 1 },
    role:  { fontSize: 12, color: 'var(--color-text-secondary)' },
    tabs:  { display: 'flex', gap: 0, background: 'var(--color-background-primary)', borderBottom: '0.5px solid var(--color-border-tertiary)', padding: '0 24px' },
    tab:   (a) => ({ padding: '9px 14px', fontSize: 13, cursor: 'pointer', borderBottom: a ? '2px solid #3b82f6' : '2px solid transparent', color: a ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', fontWeight: a ? 500 : 400 }),
    body:  { flex: 1, padding: '24px', overflowY: 'auto' },
    card:  { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '24px' },
    title: { fontSize: 16, fontWeight: 500, marginBottom: 8 },
    desc:  { fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 },
  }

  const content = {
    users:     { title: 'User management',   desc: 'Invite agents, supervisors, and clients. Assign roles and manage access. Full implementation in Phase 4.' },
    campaigns: { title: 'Campaigns',         desc: 'Create and manage calling campaigns. Configure rate limits, calling hours, and assign lead pools. Full implementation in Phase 2.' },
    contacts:  { title: 'Contacts & leads',  desc: 'Import CSV/Excel lead files, view all contacts, manage DNC list, and compare original vs verified addresses. Import available now via API.' },
    scripts:   { title: 'Call scripts',      desc: 'Build and edit Dutch branching call scripts. Drag-and-drop script editor. Full implementation in Phase 3.' },
    reports:   { title: 'Reports',           desc: 'Campaign conversion rates, agent performance, call logs, and verified address quality dashboard. Full implementation in Phase 4.' },
    settings:  { title: 'Settings',          desc: `Organisation: ${user?.org_name || '—'} | Plan: ${user?.plan || '—'} | Country: ${user?.country || '—'}. Billing and subscription management in Phase 4.` },
  }

  const cur = content[tab]

  return (
    <div style={s.wrap}>
      <div style={s.hdr}>
        <span style={s.logo}>SolarFlow Pro — Admin</span>
        <div style={s.sp}/>
        <span style={s.role}>{user?.full_name} · {user?.role}</span>
      </div>
      <div style={s.tabs}>
        {TABS.map(t => (
          <div key={t.id} style={s.tab(tab === t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>
      <div style={s.body}>
        <div style={s.card}>
          <div style={s.title}>{cur.title}</div>
          <div style={s.desc}>{cur.desc}</div>
        </div>
      </div>
    </div>
  )
}
