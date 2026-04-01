/**
 * PhoneTab — renders the correct dialer component based on campaign dial_mode.
 */
import React from 'react'
import { useDialerStore } from '../../store/dialerStore'
import PreviewDialer from '../dialer/PreviewDialer'
import PowerDialer   from '../dialer/PowerDialer'
import ManualDialer  from '../dialer/ManualDialer'

export default function PhoneTab({ telephony, campaign }) {
  const dialerStatus = useDialerStore(s => s.status)
  const queueMessage = useDialerStore(s => s.queueMessage)

  if (!campaign) {
    return (
      <div style={styles.empty}>
        <p>Selecteer een campagne om te beginnen.</p>
      </div>
    )
  }

  const mode = campaign.dial_mode || 'preview'

  return (
    <div style={styles.wrap}>
      {mode === 'preview' && <PreviewDialer telephony={telephony} campaign={campaign} />}
      {mode === 'power'   && <PowerDialer   telephony={telephony} campaign={campaign} />}
      {mode === 'manual'  && <ManualDialer  telephony={telephony} campaign={campaign} />}

      {dialerStatus === 'idle' && queueMessage && (
        <div style={styles.queueMsg}>{queueMessage}</div>
      )}
    </div>
  )
}

const styles = {
  wrap:     { maxWidth: 480 },
  empty:    { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--color-muted)' },
  queueMsg: { marginTop: 16, padding: '10px 14px', background: '#2a2d3a', borderRadius: 8, color: 'var(--color-muted)', fontSize: 13 },
}
