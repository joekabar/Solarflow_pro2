/**
 * SupervisorPanel — team live view + reports.
 * Shows only this supervisor's team data.
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentStore } from '../store/agentStore'
import { api } from '../hooks/api'

const STATE_COLORS = {
  available: '#22c55e', on_call: '#3b82f6', wrapup: '#f59e0b',
  break: '#a78bfa', offline: '#64748b',
}

export default function SupervisorPanel() {
  const navigate   = useNavigate()
  const user       = useAgentStore(s => s.user)
  const [agents,   setAgents]   = useState([])
  const [campaigns,setCampaigns]= useState([])
  const [teamStats,setTeamStats]= useState([])

  useEffect(() => {
    api.get('/teams').then(teams => {
      if (teams.length > 0) {
        const myTeam = teams.find(t => t.id === user?.team_id) || teams[0]
        setAgents(myTeam.user_profiles || [])
      }
    }).catch(console.error)

    api.get('/campaigns').then(setCampaigns).catch(console.error)
    api.get('/reports/team-stats').then(setTeamStats).catch(console.error)
  }, [])

  return (
    <div style={styles.layout}>
      <div style={styles.topbar}>
        <span style={styles.brand}>📞 Call Forge — Supervisor</span>
        <button className="btn-secondary" onClick={() => navigate('/')} style={{ fontSize: 12, padding: '6px 12px' }}>← Workspace</button>
      </div>

      <div style={styles.body}>
        <h2 style={styles.sectionTitle}>Live Agent Status</h2>
        <div style={styles.agentGrid}>
          {agents.map(agent => (
            <div key={agent.id} style={styles.agentCard}>
              <div style={styles.agentDot(STATE_COLORS['offline'])} />
              <div>
                <div style={{ fontWeight: 600 }}>{agent.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-muted)' }}>{agent.role}</div>
              </div>
            </div>
          ))}
          {agents.length === 0 && <p style={{ color: 'var(--color-muted)' }}>Geen agenten gevonden.</p>}
        </div>

        <h2 style={{ ...styles.sectionTitle, marginTop: 32 }}>Team Statistieken</h2>
        {teamStats.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr style={styles.tr}>
                <th style={styles.th}>Agent</th>
                <th style={styles.th}>Gesprekken</th>
                <th style={styles.th}>Gem. duur</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.map(s => (
                <tr key={s.agent_id} style={styles.tr}>
                  <td style={styles.td}>{s.full_name}</td>
                  <td style={styles.td}>{s.total_calls}</td>
                  <td style={styles.td}>{formatDuration(s.avg_duration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--color-muted)' }}>Nog geen statistieken beschikbaar.</p>
        )}
      </div>
    </div>
  )
}

function formatDuration(sec) {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const styles = {
  layout:       { display: 'flex', flexDirection: 'column', height: '100vh' },
  topbar:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 54, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' },
  brand:        { fontWeight: 700, fontSize: 18 },
  body:         { flex: 1, padding: 24, overflow: 'auto' },
  sectionTitle: { fontSize: 16, fontWeight: 700, marginBottom: 12 },
  agentGrid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 },
  agentCard:    { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', gap: 12 },
  agentDot:     (color) => ({ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }),
  table:        { width: '100%', borderCollapse: 'collapse' },
  tr:           { borderBottom: '1px solid var(--color-border)' },
  th:           { padding: '8px 12px', textAlign: 'left', fontSize: 12, color: 'var(--color-muted)', fontWeight: 600 },
  td:           { padding: '10px 12px', fontSize: 14 },
}
