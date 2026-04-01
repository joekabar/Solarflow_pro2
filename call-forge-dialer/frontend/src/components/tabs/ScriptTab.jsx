/**
 * ScriptTab — branching call script navigator.
 * Follows the JSONB tree: steps with branches (label → next step or outcome).
 * Tracks path taken for script_path in call_log.
 */
import React, { useState, useEffect } from 'react'
import { api } from '../../hooks/api'

export default function ScriptTab({ contact, campaign }) {
  const [script,      setScript]      = useState(null)
  const [currentStep, setCurrentStep] = useState(null)
  const [path,        setPath]        = useState([])    // [{step_id, label}]

  useEffect(() => {
    if (campaign?.script_id) {
      api.get(`/scripts/${campaign.script_id}`)
        .then(s => {
          setScript(s)
          setCurrentStep(s.content?.steps?.[0] || null)
          setPath([])
        })
        .catch(console.error)
    } else {
      setScript(null)
      setCurrentStep(null)
    }
  }, [campaign?.script_id])

  // Replace {first_name} etc. with actual contact values
  function interpolate(text) {
    if (!text || !contact) return text || ''
    return text
      .replace(/\{first_name\}/g, contact.first_name || '')
      .replace(/\{last_name\}/g,  contact.last_name  || '')
      .replace(/\{company\}/g,    contact.company    || '')
      .replace(/\{phone\}/g,      contact.phone      || '')
  }

  function followBranch(branch) {
    const newPath = [...path, { step_id: currentStep.id, label: branch.label }]
    setPath(newPath)

    if (branch.outcome) {
      // Terminal — show outcome reached
      setCurrentStep({ id: '__outcome__', outcome: branch.outcome })
    } else if (branch.next) {
      const nextStep = script.content.steps.find(s => s.id === branch.next)
      setCurrentStep(nextStep || null)
    }
  }

  function reset() {
    setCurrentStep(script?.content?.steps?.[0] || null)
    setPath([])
  }

  if (!campaign?.script_id) {
    return <div style={styles.empty}>Geen script gekoppeld aan deze campagne.</div>
  }
  if (!script) {
    return <div style={styles.empty}>Script laden...</div>
  }
  if (!currentStep) {
    return <div style={styles.empty}>Script leeg of ongeldig.</div>
  }

  // Outcome reached
  if (currentStep.id === '__outcome__') {
    return (
      <div style={styles.card}>
        <div style={styles.outcomeBadge}>✅ Uitkomst: {currentStep.outcome}</div>
        <div style={styles.pathSummary}>
          {path.map((p, i) => (
            <div key={i} style={styles.pathItem}>
              <span style={styles.pathStep}>{p.step_id}</span>
              <span style={styles.pathArrow}>→</span>
              <span>{p.label}</span>
            </div>
          ))}
        </div>
        <button className="btn-secondary" onClick={reset} style={{ marginTop: 12 }}>
          ↺ Opnieuw beginnen
        </button>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      {/* Progress breadcrumb */}
      {path.length > 0 && (
        <div style={styles.breadcrumb}>
          {path.map((p, i) => (
            <span key={i} style={styles.crumb}>{p.label} ›</span>
          ))}
        </div>
      )}

      {/* Script text */}
      <div style={styles.text}>{interpolate(currentStep.text)}</div>

      {/* Branches */}
      <div style={styles.branches}>
        {(currentStep.branches || []).map((branch, i) => (
          <button
            key={i}
            onClick={() => followBranch(branch)}
            style={styles.branch}
          >
            {branch.label}
            {branch.outcome && <span style={styles.outcomeHint}> → {branch.outcome}</span>}
          </button>
        ))}
      </div>

      <button className="btn-secondary" onClick={reset} style={{ marginTop: 16, fontSize: 12 }}>
        ↺ Reset script
      </button>
    </div>
  )
}

const styles = {
  empty:       { display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--color-muted)' },
  card:        { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, padding: 20 },
  breadcrumb:  { fontSize: 12, color: 'var(--color-muted)', marginBottom: 12 },
  crumb:       { marginRight: 4 },
  text:        { fontSize: 16, lineHeight: 1.6, marginBottom: 20, padding: 14, background: 'var(--color-bg)', borderRadius: 8, borderLeft: '3px solid var(--color-primary)' },
  branches:    { display: 'flex', flexDirection: 'column', gap: 8 },
  branch:      { background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)', borderRadius: 8, padding: '10px 14px', textAlign: 'left', cursor: 'pointer', fontSize: 14, transition: 'border-color 0.15s' },
  outcomeHint: { color: 'var(--color-primary)', fontSize: 12 },
  outcomeBadge: { background: '#1e3a2f', color: '#22c55e', borderRadius: 6, padding: '8px 14px', fontWeight: 600, marginBottom: 12 },
  pathSummary: { display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 },
  pathItem:    { display: 'flex', gap: 8, fontSize: 13, color: 'var(--color-muted)' },
  pathStep:    { color: 'var(--color-primary)' },
  pathArrow:   { color: 'var(--color-border)' },
}
