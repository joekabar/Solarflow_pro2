import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentStore } from '../store/agentStore'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const login    = useAgentStore(s => s.login)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Login mislukt')
      login(data)
      navigate('/')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>📞 Call Forge</h1>
        <p style={styles.sub}>Outbound Dialer Platform</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="agent@bedrijf.be"
              required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Wachtwoord</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '15px' }}
          >
            {loading ? 'Bezig...' : 'Inloggen'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page:  { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)' },
  card:  { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '40px', width: '100%', maxWidth: '400px' },
  title: { fontSize: '28px', fontWeight: '700', marginBottom: '4px', textAlign: 'center' },
  sub:   { color: 'var(--color-muted)', textAlign: 'center', marginBottom: '32px' },
  form:  { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '13px', fontWeight: '500', color: 'var(--color-muted)' },
  error: { background: '#3a1e1e', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px 12px', color: '#ef4444', fontSize: '13px' },
}
