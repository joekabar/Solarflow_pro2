/**
 * AgentWorkspace — main dialer page.
 * 4 tabs: Phone | Contact | Script | Wrapup
 * Campaign selector at the top.
 * Dial mode aware: Preview / Power / Manual.
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentStore }    from '../store/agentStore'
import { useCampaignStore } from '../store/campaignStore'
import { useDialerStore }   from '../store/dialerStore'
import { useTelephony }     from '../telephony/useTelephony'
import { useCallStore }     from '../store/callStore'

import PhoneTab   from '../components/tabs/PhoneTab'
import ContactTab from '../components/tabs/ContactTab'
import ScriptTab  from '../components/tabs/ScriptTab'
import WrapupTab  from '../components/tabs/WrapupTab'

const TABS = ['phone', 'contact', 'script', 'wrapup']
const TAB_LABELS = { phone: '📞 Phone', contact: '👤 Contact', script: '📋 Script', wrapup: '✅ Wrapup' }

export default function AgentWorkspace() {
  const navigate   = useNavigate()
  const user       = useAgentStore(s => s.user)
  const logout     = useAgentStore(s => s.logout)
  const { campaigns, activeCampaign, fetchCampaigns, setActiveCampaign } = useCampaignStore()
  const { status: dialerStatus, contact, queueMessage, fetchNextContact, reset } = useDialerStore()
  const telephony  = useTelephony()
  const callState  = useCallStore(s => s.callState)
  const [activeTab, setActiveTab] = useState('phone')

  useEffect(() => {
    fetchCampaigns()
    return () => reset()
  }, [])

  // Auto-switch to wrapup tab when call ends
  useEffect(() => {
    if (dialerStatus === 'wrapup') setActiveTab('wrapup')
    if (dialerStatus === 'previewing' || dialerStatus === 'in_call') setActiveTab('phone')
  }, [dialerStatus])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  // Hidden audio element for JsSIP remote stream
  return (
    <div style={styles.layout}>
      <audio id="remote-audio" autoPlay style={{ display: 'none' }} />

      {/* ── Top bar ── */}
      <div style={styles.topbar}>
        <span style={styles.brand}>📞 Call Forge</span>

        {/* Campaign selector */}
        <select
          value={activeCampaign?.id || ''}
          onChange={e => {
            const c = campaigns.find(c => c.id === e.target.value)
            setActiveCampaign(c || null)
            reset()
          }}
          style={{ ...styles.select, maxWidth: 260 }}
        >
          <option value="">— Selecteer campagne —</option>
          {campaigns.filter(c => c.status === 'active').map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Phone status indicator */}
        <div style={styles.phoneStatus}>
          <div style={{ ...styles.dot, background: telephony.status === 'ready' ? '#22c55e' : telephony.status === 'error' ? '#ef4444' : '#f59e0b' }} />
          <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>
            {telephony.status === 'ready' ? 'Phone Ready' : telephony.status === 'error' ? 'Phone Error' : 'Connecting...'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {user?.role !== 'agent' && (
            <button className="btn-secondary" onClick={() => navigate(user.role === 'admin' ? '/admin' : '/supervisor')} style={{ fontSize: 12, padding: '6px 12px' }}>
              {user?.role === 'admin' ? '⚙️ Admin' : '👥 Supervisor'}
            </button>
          )}
          <span style={{ color: 'var(--color-muted)', fontSize: 12 }}>{user?.full_name}</span>
          <button className="btn-secondary" onClick={handleLogout} style={{ fontSize: 12, padding: '6px 12px' }}>Logout</button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={styles.body}>
        {/* ── Tabs ── */}
        <div style={styles.tabs}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={styles.content}>
          {activeTab === 'phone'   && <PhoneTab   telephony={telephony} campaign={activeCampaign} />}
          {activeTab === 'contact' && <ContactTab contact={contact} />}
          {activeTab === 'script'  && <ScriptTab  contact={contact} campaign={activeCampaign} />}
          {activeTab === 'wrapup'  && <WrapupTab  contact={contact} campaign={activeCampaign} telephony={telephony} onDone={() => setActiveTab('phone')} />}
        </div>
      </div>
    </div>
  )
}

const styles = {
  layout:      { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' },
  topbar:      { display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', height: 54, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', flexShrink: 0 },
  brand:       { fontWeight: 700, fontSize: 18, marginRight: 8 },
  select:      { background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 6, padding: '6px 10px', fontSize: 13 },
  phoneStatus: { display: 'flex', alignItems: 'center', gap: 6 },
  dot:         { width: 8, height: 8, borderRadius: '50%' },
  body:        { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  tabs:        { display: 'flex', gap: 2, padding: '8px 16px 0', background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' },
  tab:         { background: 'none', border: 'none', color: 'var(--color-muted)', padding: '8px 16px', borderRadius: '6px 6px 0 0', fontSize: 13, cursor: 'pointer' },
  tabActive:   { background: 'var(--color-bg)', color: 'var(--color-text)', borderBottom: '2px solid var(--color-primary)' },
  content:     { flex: 1, overflow: 'auto', padding: 20 },
}
