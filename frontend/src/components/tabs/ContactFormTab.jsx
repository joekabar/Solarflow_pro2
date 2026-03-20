import { useState, useEffect } from 'react'
import { useCallStore }     from '../../store/callStore'
import { useCampaignStore } from '../../store/campaignStore'
import { useContacts }      from '../../hooks/useContacts'

const OUTCOMES = ['interested','callback','not_interested','voicemail','wrong_number','no_answer','dnc']

export default function ContactFormTab() {
  const { contact, callDurationSec } = useCallStore()
  const { campaign } = useCampaignStore()
  const { completeCall, loading } = useContacts()
  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState({})
  const [form, setForm] = useState({
    first_name:'', last_name:'', email:'',
    street_verified:'', city_verified:'', postal_code_verified:'',
    roof_type:'slanted', orientation:'south', ownership:'owner',
    monthly_bill:'', residents:'', notes:'', outcome:'interested', callback_at:'',
  })

  useEffect(() => {
    if (contact) {
      setForm(f => ({ ...f, first_name: contact.first_name||'', last_name: contact.last_name||'', email: contact.email||'',
        street_verified: contact.street_verified||'', city_verified: contact.city_verified||'', postal_code_verified: contact.postal_code_verified||'' }))
      setSaved(false); setErrors({})
    }
  }, [contact?.id])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSave() {
    const errs = {}
    if (!form.street_verified.trim()) errs.street = 'Required'
    if (!form.city_verified.trim())   errs.city   = 'Required'
    if (!form.postal_code_verified.trim()) errs.postal = 'Required'
    if (!form.outcome) errs.outcome = 'Required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    await completeCall({
      contact_id: contact.id, campaign_id: campaign.id, outcome: form.outcome,
      duration_sec: callDurationSec, notes: form.notes,
      callback_at: form.outcome === 'callback' ? form.callback_at : null,
      street_verified: form.street_verified, city_verified: form.city_verified,
      postal_code_verified: form.postal_code_verified,
    })
    setSaved(true)
  }

  const s = {
    wrap: { height:'100%', padding:12, overflowY:'auto' },
    card: { background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', padding:14 },
    grid: { display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)', gap:8 },
    sh:   { gridColumn:'1/-1', fontSize:10, fontWeight:500, color:'var(--color-text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', borderTop:'0.5px solid var(--color-border-tertiary)', paddingTop:8, marginTop:4 },
    fg:   { display:'flex', flexDirection:'column', gap:3 },
    fl:   { fontSize:11, color:'var(--color-text-secondary)' },
    fi:   (err) => ({ padding:'6px 8px', border:`0.5px solid ${err ? 'var(--color-border-danger)' : 'var(--color-border-secondary)'}`, borderRadius:7, fontSize:12, background:'var(--color-background-primary)', color:'var(--color-text-primary)', width:'100%' }),
    ab:   { background:'var(--color-background-secondary)', borderRadius:8, padding:10, gridColumn:'1/-1' },
    al:   { fontSize:10, fontWeight:500, color:'var(--color-text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8, display:'flex', alignItems:'center', gap:6 },
    at:   { padding:'2px 7px', borderRadius:20, fontSize:10, background:'var(--color-background-warning)', color:'var(--color-text-warning)' },
    oc:   { display:'flex', gap:5, flexWrap:'wrap', gridColumn:'1/-1' },
    ob:   (sel) => ({ padding:'5px 10px', borderRadius:7, border:'0.5px solid var(--color-border-secondary)', fontSize:11, cursor:'pointer', background: sel ? 'var(--color-background-success)' : 'var(--color-background-primary)', color: sel ? 'var(--color-text-success)' : 'var(--color-text-secondary)' }),
    btnP: { padding:'6px 14px', borderRadius:7, background:'#1d6fb8', color:'#fff', border:'none', fontSize:12, cursor:'pointer' },
    btn:  { padding:'6px 14px', borderRadius:7, border:'0.5px solid var(--color-border-secondary)', background:'var(--color-background-primary)', color:'var(--color-text-primary)', fontSize:12, cursor:'pointer' },
  }

  if (!contact) return (
    <div style={s.wrap}><div style={{ ...s.card, color:'var(--color-text-secondary)', fontSize:13, textAlign:'center', padding:40 }}>
      Load a contact from the Phone tab first.
    </div></div>
  )

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div style={{ fontSize:14, fontWeight:500 }}>{contact.first_name} {contact.last_name}</div>
          {saved && <span style={{ fontSize:12, color:'var(--color-text-success)' }}>✓ Saved</span>}
        </div>
        <div style={s.grid}>
          <div style={s.sh}>Contact details</div>
          <div style={s.fg}><div style={s.fl}>First name</div><input style={s.fi()} value={form.first_name} onChange={set('first_name')}/></div>
          <div style={s.fg}><div style={s.fl}>Last name</div><input style={s.fi()} value={form.last_name} onChange={set('last_name')}/></div>
          <div style={s.fg}><div style={s.fl}>Phone</div><input style={s.fi()} value={contact.phone_masked||''} readOnly/></div>
          <div style={s.fg}><div style={s.fl}>Email</div><input style={s.fi()} type="email" value={form.email} onChange={set('email')} placeholder="Ask and enter…"/></div>

          <div style={s.ab}>
            <div style={s.al}>Address — enter as told by prospect <span style={s.at}>Not pre-filled</span></div>
            <div style={s.grid}>
              <div style={{ ...s.fg, gridColumn:'1/-1' }}>
                <div style={s.fl}>Street + number *</div>
                <input style={s.fi(errors.street)} value={form.street_verified} onChange={set('street_verified')} placeholder="e.g. Koningsstraat 12"/>
                {errors.street && <span style={{ fontSize:10, color:'var(--color-text-danger)' }}>{errors.street}</span>}
              </div>
              <div style={s.fg}>
                <div style={s.fl}>City *</div>
                <input style={s.fi(errors.city)} value={form.city_verified} onChange={set('city_verified')} placeholder="e.g. Antwerp"/>
              </div>
              <div style={s.fg}>
                <div style={s.fl}>Postal code *</div>
                <input style={s.fi(errors.postal)} value={form.postal_code_verified} onChange={set('postal_code_verified')} placeholder="e.g. 2000"/>
              </div>
            </div>
          </div>

          <div style={s.sh}>Solar qualification</div>
          <div style={s.fg}><div style={s.fl}>Owner / renter</div><select style={s.fi()} value={form.ownership} onChange={set('ownership')}><option value="owner">Owner</option><option value="renter">Renter</option></select></div>
          <div style={s.fg}><div style={s.fl}>Roof type</div><select style={s.fi()} value={form.roof_type} onChange={set('roof_type')}><option value="slanted">Slanted tiles</option><option value="flat">Flat roof</option><option value="other">Other</option></select></div>
          <div style={s.fg}><div style={s.fl}>Orientation</div><select style={s.fi()} value={form.orientation} onChange={set('orientation')}><option value="south">South</option><option value="sw">South-West</option><option value="ew">East-West</option><option value="north">North</option></select></div>
          <div style={s.fg}><div style={s.fl}>Monthly bill (€)</div><input style={s.fi()} type="number" value={form.monthly_bill} onChange={set('monthly_bill')} placeholder="180"/></div>
          <div style={{ ...s.fg, gridColumn:'1/-1' }}><div style={s.fl}>Notes</div><textarea style={{ ...s.fi(), resize:'none' }} rows={2} value={form.notes} onChange={set('notes')}/></div>

          <div style={s.sh}>Call outcome</div>
          <div style={s.oc}>
            {OUTCOMES.map(o => <button key={o} style={s.ob(form.outcome===o)} onClick={() => setForm(f=>({...f,outcome:o}))}>{o.replace(/_/g,' ')}</button>)}
          </div>
          {form.outcome==='callback' && (
            <div style={{ ...s.fg, gridColumn:'1/-1' }}>
              <div style={s.fl}>Callback date & time</div>
              <input style={s.fi()} type="datetime-local" value={form.callback_at} onChange={set('callback_at')}/>
            </div>
          )}
          <div style={{ display:'flex', gap:7, justifyContent:'flex-end', marginTop:12, gridColumn:'1/-1' }}>
            <button style={s.btn}>Discard</button>
            <button style={s.btnP} onClick={handleSave} disabled={loading||saved}>
              {loading ? 'Saving…' : 'Save to database'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}