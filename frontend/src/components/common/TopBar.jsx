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
    bar:  { display:'flex', alignItems:'center', gap:10, padding:'0 14px', height:46, background:'var(--color-background-primary)', borderBottom:'0.5px solid var(--color-border-tertiary)', flexShrink:0 },
    logo: { display:'flex', alignItems:'center', gap:6, fontWeight:500, fontSize:14 },
    sq:   { width:22, height:22, background:'var(--color-background-info)', borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center' },
    pill: { display:'flex', alignItems:'center', gap:6, background:'var(--color-background-secondary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:20, padding:'3px 10px', fontSize:12 },
    dot:  (c) => ({ width:7, height:7, borderRadius:'50%', background:c, flexShrink:0 }),
    sp:   { flex:1 },
    info: { fontSize:12, color:'var(--color-text-secondary)', display:'flex', alignItems:'center', gap:6 },
    btn:  { padding:'4px 10px', borderRadius:6, border:'0.5px solid var(--color-border-secondary)', background:'var(--color-background-primary)', color:'var(--color-text-secondary)', fontSize:11, cursor:'pointer' },
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
            <span style={{ color:'var(--color-text-success)', fontWeight:500 }}>
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