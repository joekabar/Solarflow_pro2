// frontend/src/pages/AgentWorkspace.jsx
// ────────────────────────────────────────
// The main agent screen. Renders:
//   - TopBar (logo, current call, agent status)
//   - TrialBanner (countdown if on trial)
//   - LeftNav (icon sidebar)
//   - 4-tab workspace: Map · Phone · Contact Form · Agenda
//   - StatusBar (AI status, campaign stats, compliance)

import { useState, useEffect, useRef } from 'react'
import { useAgentStore }    from '../store/agentStore'
import { useCallStore }     from '../store/callStore'
import { useCampaignStore } from '../store/campaignStore'
import TopBar      from '../components/common/TopBar'
import LeftNav     from '../components/common/LeftNav'
import StatusBar   from '../components/common/StatusBar'
import TrialBanner from '../components/common/TrialBanner'
import MapTab         from '../components/tabs/MapTab'
import PhoneTab       from '../components/tabs/PhoneTab'
import ContactFormTab from '../components/tabs/ContactFormTab'
import AgendaTab      from '../components/tabs/AgendaTab'

const TABS = [
  { id: 'map',    label: 'Map view' },
  { id: 'phone',  label: 'Phone' },
  { id: 'form',   label: 'Contact form' },
  { id: 'agenda', label: 'Agenda' },
]

export default function AgentWorkspace() {
  const [activeTab, setActiveTab] = useState('map')
  const { user }                  = useAgentStore()
  const { contact, callStatus, callDurationSec, tickDuration } = useCallStore()
  const timerRef = useRef(null)

  // Call duration timer — ticks every second while a call is active
  useEffect(() => {
    if (callStatus === 'active') {
      timerRef.current = setInterval(tickDuration, 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [callStatus, tickDuration])

  // When a call starts, auto-switch to the phone tab
  useEffect(() => {
    if (callStatus === 'active') setActiveTab('phone')
  }, [callStatus])

  const s = {
    wrap:    { display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-background-tertiary)', overflow: 'hidden' },
    body:    { display: 'flex', flex: 1, overflow: 'hidden' },
    main:    { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
    tabs:    { display: 'flex', borderBottom: '0.5px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', padding: '0 12px', flexShrink: 0, overflowX: 'auto' },
    tab:     (active) => ({
               padding: '9px 14px', fontSize: '12px', cursor: 'pointer',
               borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
               color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
               fontWeight: active ? '500' : '400', whiteSpace: 'nowrap',
             }),
    content: { flex: 1, overflow: 'hidden' },
  }

  return (
    <div style={s.wrap}>
      <TrialBanner daysRemaining={user?.trial_days_remaining} />
      <TopBar />

      <div style={s.body}>
        <LeftNav />

        <div style={s.main}>
          <div style={s.tabs}>
            {TABS.map(t => (
              <div
                key={t.id}
                style={s.tab(activeTab === t.id)}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                {/* Show live dot on Phone tab when call is active */}
                {t.id === 'phone' && callStatus === 'active' && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', marginLeft: 6, verticalAlign: 'middle' }}/>
                )}
              </div>
            ))}
          </div>

          <div style={s.content}>
            {activeTab === 'map'    && <MapTab />}
            {activeTab === 'phone'  && <PhoneTab onTabChange={setActiveTab} />}
            {activeTab === 'form'   && <ContactFormTab />}
            {activeTab === 'agenda' && <AgendaTab />}
          </div>
        </div>
      </div>

      <StatusBar />
    </div>
  )
}
