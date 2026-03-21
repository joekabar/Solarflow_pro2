// frontend/src/pages/LoginPage.jsx
// ──────────────────────────────────
// Login and signup page.
// No Twilio setup required during trial — agents use their own phone.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAgentStore } from '../store/agentStore'
import { api } from '../hooks/api'

export default function LoginPage() {
  const [mode,    setMode]    = useState('login')   // 'login' | 'signup'
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const { setUser } = useAgentStore()
  const navigate    = useNavigate()

  const [form, setForm] = useState({
    email: '', password: '', full_name: '', org_name: '', country: 'BE',
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/auth/login', {
        email: form.email, password: form.password,
      })
      console.log('Login response:', res)
      setUser({
        access_token:  res.access_token,
        refresh_token: res.refresh_token,
        ...res.user,
      })
      // Route to correct page based on role
      // Platform admin gets redirected to super admin dashboard
      const dest = res.user.is_platform_admin
        ? '/platform'
        : {
            admin: '/admin', supervisor: '/supervisor',
            client: '/portal', agent: '/workspace',
          }[res.user.role] || '/workspace'
      navigate(dest)
    } catch (err) {
      setError(err.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/signup', {
        email:     form.email,
        password:  form.password,
        full_name: form.full_name,
        org_name:  form.org_name,
        country:   form.country,
      })
      // Auto-login after signup
      await handleLogin(e)
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  const s = {
    wrap:   { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-background-tertiary)' },
    card:   { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', padding: '32px', width: '100%', maxWidth: '400px' },
    logo:   { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' },
    sq:     { width: '28px', height: '28px', background: 'var(--color-background-info)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    name:   { fontSize: '16px', fontWeight: '500', color: 'var(--color-text-primary)' },
    title:  { fontSize: '18px', fontWeight: '500', color: 'var(--color-text-primary)', marginBottom: '4px' },
    sub:    { fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px' },
    label:  { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' },
    ltext:  { fontSize: '11px', color: 'var(--color-text-secondary)' },
    input:  { padding: '8px 10px', border: '0.5px solid var(--color-border-secondary)', borderRadius: '7px', fontSize: '13px', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', width: '100%' },
    btn:    { width: '100%', padding: '9px', borderRadius: '7px', border: 'none', background: '#1d6fb8', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', marginTop: '4px' },
    err:    { background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', borderRadius: '7px', padding: '8px 10px', fontSize: '12px', marginBottom: '12px' },
    switch: { textAlign: 'center', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '16px' },
    link:   { color: 'var(--color-text-info)', cursor: 'pointer', textDecoration: 'underline' },
    trial:  { background: 'var(--color-background-success)', color: 'var(--color-text-success)', borderRadius: '7px', padding: '8px 10px', fontSize: '11px', marginBottom: '16px', lineHeight: '1.5' },
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={s.logo}>
          <div style={s.sq}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <polygon points="7,1 13,12 1,12" fill="white" opacity="0.9"/>
            </svg>
          </div>
          <span style={s.name}>SolarFlow Pro</span>
        </div>

        {mode === 'signup' && (
          <div style={s.trial}>
            7-day free trial — no credit card needed.<br/>
            Use your own phone to make calls during the trial.
          </div>
        )}

        <div style={s.title}>{mode === 'login' ? 'Welcome back' : 'Start your free trial'}</div>
        <div style={s.sub}>{mode === 'login' ? 'Sign in to your account' : '7 days, all features, no card required'}</div>

        {error && <div style={s.err}>{error}</div>}

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
          {mode === 'signup' && (
            <>
              <label style={s.label}>
                <span style={s.ltext}>Full name</span>
                <input style={s.input} value={form.full_name} onChange={set('full_name')} required placeholder="Jan Janssen"/>
              </label>
              <label style={s.label}>
                <span style={s.ltext}>Company name</span>
                <input style={s.input} value={form.org_name} onChange={set('org_name')} required placeholder="Solar Company BV"/>
              </label>
              <label style={s.label}>
                <span style={s.ltext}>Country</span>
                <select style={s.input} value={form.country} onChange={set('country')}>
                  <option value="BE">Belgium</option>
                  <option value="NL">Netherlands</option>
                  <option value="FR">France</option>
                  <option value="DE">Germany</option>
                </select>
              </label>
            </>
          )}
          <label style={s.label}>
            <span style={s.ltext}>Email</span>
            <input style={s.input} type="email" value={form.email} onChange={set('email')} required placeholder="jan@company.be"/>
          </label>
          <label style={s.label}>
            <span style={s.ltext}>Password</span>
            <input style={s.input} type="password" value={form.password} onChange={set('password')} required placeholder="••••••••" minLength={8}/>
          </label>
          <button style={s.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Start free trial'}
          </button>
        </form>

        <div style={s.switch}>
          {mode === 'login'
            ? <span>No account? <span style={s.link} onClick={() => setMode('signup')}>Start free trial</span></span>
            : <span>Already have an account? <span style={s.link} onClick={() => setMode('login')}>Sign in</span></span>
          }
        </div>
      </div>
    </div>
  )
}
