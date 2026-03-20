import { useCampaignStore } from '../../store/campaignStore'

export default function StatusBar() {
  const { campaign, callsToday, reachedToday } = useCampaignStore()

  const s = {
    bar: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', height: 30, background: 'var(--color-background-primary)', borderTop: '0.5px solid var(--color-border-tertiary)', flexShrink: 0, fontSize: 10, color: 'var(--color-text-secondary)', overflow: 'hidden' },
    dot: (c) => ({ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }),
  }

  return (
    <div style={s.bar}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={s.dot('#22c55e')}/>
        <span>Lead scoring: on</span>
      </div>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>Campaign: {campaign?.name || 'No campaign selected'}</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>Calls today: {callsToday} · Reached: {reachedToday}</span>
      <div style={{ flex: 1 }}/>
      <span>DNC ✓</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>Calling hours: 09:00–20:00 ✓</span>
      <span style={{ opacity: 0.4 }}>·</span>
      <span>GDPR ✓</span>
    </div>
  )
}