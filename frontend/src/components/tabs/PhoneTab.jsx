import { useState } from 'react'
import { useCallStore }     from '../../store/callStore'
import { useCampaignStore } from '../../store/campaignStore'
import { useContacts }      from '../../hooks/useContacts'
import ScriptPrompter       from '../script/ScriptPrompter'

export default function PhoneTab({ onTabChange }) {
  const { contact, callStatus, callDurationSec,
          waitSeconds, setCallStatus } = useCallStore()
  const { campaign }   = useCampaignStore()
  const { requestNextContact, completeCall, loading } = useContacts()
  const [outcome, setOutcome] = useState('')

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`

  async function handleComplete(o) {
    if (!contact || !campaign) return
    await completeCall({ contact_id: contact.id, campaign_id: campaign.id, outcome: o, duration_sec: callDurationSec })
    setOutcome('')
    onTabChange?.('map')
  }

  const s = {
    wrap:  { height:'100%', padding:12, display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:10, overflowY:'auto' },
    card:  { background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:14 },
    ct:    { fontSize:10, fontWeight:500, color:'var(--color-text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 },
    phone: { fontSize:20, fontWeight:500, color:'var(--color-text-primary)', textAlign:'center', margin:'10px 0 4px', letterSpacing:1 },
    timer: { fontSize:26, fontWeight:500, textAlign:'center', margin:'4px 0 2px' },
    tlab:  { fontSize:10, color:'var(--color-text-secondary)', textAlign:'center', marginBottom:10 },
    ctrls: { display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' },
    btn:   { padding:'6px 12px', borderRadius:7, border:'0.5px solid var(--color-border-secondary)', cursor:'pointer', fontSize:12, background:'var(--color-background-primary)', color:'var(--color-text-primary)' },
    btnP:  { background:'#1d6fb8', color:'#fff', border:'none' },
    btnD:  { background:'#c53030', color:'#fff', border:'none' },
    ob:    (sel) => ({ padding:'5px 10px', borderRadius:7, border:'0.5px solid var(--color-border-secondary)', fontSize:11, cursor:'pointer', background: sel ? 'var(--color-background-success)' : 'var(--color-background-primary)', color: sel ? 'var(--color-text-success)' : 'var(--color-text-secondary)' }),
    empty: { gridColumn:'1/-1', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, height:300, color:'var(--color-text-secondary)' },
    wait:  { background:'var(--color-background-warning)', color:'var(--color-text-warning)', borderRadius:7, padding:'8px 12px', fontSize:12, textAlign:'center' },
  }

  if (!contact && waitSeconds > 0) return (
    <div style={s.wrap}><div style={s.empty}><div style={s.wait}>Next contact available in {waitSeconds}s</div></div></div>
  )

  if (!contact) return (
    <div style={s.wrap}>
      <div style={s.empty}>
        <div style={{ fontSize:13 }}>No contact loaded</div>
        <button style={{ ...s.btn, ...s.btnP }} onClick={requestNextContact} disabled={loading}>
          {loading ? 'Loading…' : 'Get next contact'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.ct}>Current contact</div>
        <div style={{ background:'var(--color-background-secondary)', borderRadius:8, padding:10, marginBottom:10 }}>
          <div style={{ fontSize:15, fontWeight:500, marginBottom:3 }}>{contact.first_name} {contact.last_name}</div>
          <div style={{ fontSize:11, color:'var(--color-text-secondary)' }}>
            Lead score: <span style={{ color:'var(--color-text-success)', fontWeight:500 }}>{contact.lead_score}</span>
          </div>
        </div>
        <div style={s.phone}>{contact.phone_masked}</div>
        <div style={{ ...s.tlab, marginBottom:6 }}>
          {callStatus === 'idle' ? 'Dial this number on your phone, then click Start' : ''}
        </div>
        {callStatus !== 'active' ? (
          <div style={s.ctrls}>
            <button style={{ ...s.btn, ...s.btnP }} onClick={() => setCallStatus('active')}>Call started — start timer</button>
            <button style={s.btn} onClick={requestNextContact} disabled={loading}>Skip</button>
          </div>
        ) : (
          <>
            <div style={s.timer}>{fmt(callDurationSec)}</div>
            <div style={s.tlab}>Call in progress</div>
            <div style={s.ct}>Call outcome</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {['interested','callback','not_interested','voicemail','wrong_number','no_answer'].map(o => (
                <button key={o} style={s.ob(outcome === o)} onClick={() => setOutcome(o)}>
                  {o.replace(/_/g,' ')}
                </button>
              ))}
            </div>
            {outcome && (
              <div style={{ ...s.ctrls, marginTop:10 }}>
                <button style={{ ...s.btn, ...s.btnD }} onClick={() => handleComplete(outcome)}>
                  Save outcome & next contact
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <div style={s.card}><ScriptPrompter /></div>
    </div>
  )
}