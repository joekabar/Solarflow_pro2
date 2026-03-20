export default function AgendaTab() {
  const today = new Date()
  const days  = ['Mo','Tu','We','Th','Fr','Sa','Su']
  const month = today.toLocaleString('en', { month:'long', year:'numeric' })
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastDay  = new Date(today.getFullYear(), today.getMonth()+1, 0)
  const startDow = (firstDay.getDay()+6) % 7
  const cells = Array.from({ length: Math.ceil((startDow+lastDay.getDate())/7)*7 }, (_,i) => {
    const d = i - startDow + 1
    return d >= 1 && d <= lastDay.getDate() ? d : null
  })
  const HAS_APPT = [3,7,10,14,18,21,28]

  const s = {
    wrap:  { height:'100%', padding:12, display:'grid', gridTemplateColumns:'minmax(0,1fr) minmax(0,200px)', gap:10, overflowY:'auto' },
    card:  { background:'var(--color-background-primary)', border:'0.5px solid var(--color-border-tertiary)', borderRadius:'var(--border-radius-lg)', overflow:'hidden' },
    chdr:  { display:'flex', alignItems:'center', gap:8, padding:'9px 12px', borderBottom:'0.5px solid var(--color-border-tertiary)' },
    btn:   { padding:'4px 8px', borderRadius:6, border:'0.5px solid var(--color-border-secondary)', background:'var(--color-background-primary)', color:'var(--color-text-primary)', fontSize:11, cursor:'pointer' },
    btnP:  { background:'#1d6fb8', color:'#fff', border:'none' },
    grid:  { display:'grid', gridTemplateColumns:'repeat(7,1fr)', textAlign:'center' },
    dh:    { padding:'6px 2px', fontSize:10, color:'var(--color-text-secondary)', fontWeight:500 },
    day:   (isToday) => ({ padding:'7px 2px', fontSize:12, borderBottom:'0.5px solid var(--color-border-tertiary)', background: isToday ? 'var(--color-background-info)' : 'transparent', color: isToday ? 'var(--color-text-info)' : 'var(--color-text-primary)', fontWeight: isToday ? 500 : 400 }),
    dot:   { width:4, height:4, borderRadius:'50%', background:'#3b82f6', margin:'1px auto 0' },
    appt:  { padding:8, background:'var(--color-background-info)', borderRadius:'0 7px 7px 0', borderLeft:'3px solid #3b82f6', marginBottom:7 },
    aptt:  { fontSize:12, fontWeight:500 },
    aptd:  { fontSize:10, color:'var(--color-text-secondary)' },
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.chdr}>
          <button style={s.btn}>← Prev</button>
          <div style={{ flex:1, textAlign:'center', fontWeight:500, fontSize:13 }}>{month}</div>
          <button style={s.btn}>Next →</button>
          <button style={{ ...s.btn, ...s.btnP }}>+ New appointment</button>
        </div>
        <div style={s.grid}>{days.map(d => <div key={d} style={s.dh}>{d}</div>)}</div>
        <div style={s.grid}>
          {cells.map((d,i) => d ? (
            <div key={i} style={s.day(d===today.getDate())}>
              {d}{HAS_APPT.includes(d) && <div style={s.dot}/>}
            </div>
          ) : <div key={i} style={s.day(false)}/>)}
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div style={s.card}>
          <div style={{ padding:'9px 12px', borderBottom:'0.5px solid var(--color-border-tertiary)', fontSize:10, fontWeight:500, color:'var(--color-text-secondary)', textTransform:'uppercase', letterSpacing:'.06em' }}>Today</div>
          <div style={{ padding:10 }}>
            <div style={s.appt}><div style={s.aptt}>Site visit — Pietersen</div><div style={s.aptd}>14:00 · Koningsstraat 12</div></div>
            <div style={{ ...s.appt, background:'var(--color-background-secondary)', borderLeftColor:'var(--color-border-secondary)' }}><div style={s.aptt}>Follow-up — Janssen</div><div style={s.aptd}>16:30 · +32 477 98 76 54</div></div>
          </div>
        </div>
        <div style={{ ...s.card, padding:12 }}>
          <div style={{ fontSize:10, fontWeight:500, color:'var(--color-text-secondary)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:8 }}>Google Calendar</div>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:12 }}><div style={{ width:6, height:6, borderRadius:'50%', background:'#22c55e' }}/><span>Synced</span></div>
          <button style={{ ...s.btn, marginTop:10, width:'100%' }}>Manage calendar →</button>
        </div>
      </div>
    </div>
  )
}