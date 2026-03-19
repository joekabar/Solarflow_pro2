// frontend/src/components/script/ScriptPrompter.jsx
// ────────────────────────────────────────────────────
// Renders the Dutch solar call script during a call.
// Agent clicks branch buttons to navigate the script tree.
// Every choice is recorded in callStore.scriptHistory.

import { useState, useEffect } from 'react'
import { useCallStore } from '../../store/callStore'
import { useAgentStore } from '../../store/agentStore'
import { api } from '../../hooks/api'

// Default script for trial / when no campaign script is loaded
const DEFAULT_SCRIPT = {
  steps: {
    intro: {
      text: 'Goedemiddag, spreek ik met de heer/mevrouw {last_name}? Ik bel namens {company} over zonnepanelen voor uw woning.',
      branches: [
        { label: 'Geïnteresseerd',    next: 'qualify'   },
        { label: 'Niet geïnteresseerd', next: 'objection' },
        { label: 'Terugbellen',       next: 'callback'  },
        { label: 'Verkeerd nummer',   outcome: 'wrong_number' },
      ],
    },
    qualify: {
      text: 'Geweldig! Bent u de eigenaar van uw woning?',
      branches: [
        { label: 'Ja, eigenaar',  next: 'roof'      },
        { label: 'Nee, huurder',  outcome: 'not_interested' },
      ],
    },
    roof: {
      text: 'Heeft u een schuin of plat dak? En weet u ruwweg in welke richting het dak ligt?',
      branches: [
        { label: 'Schuin, zuiden',    next: 'close' },
        { label: 'Schuin, andere richting', next: 'close' },
        { label: 'Plat dak',          next: 'close' },
      ],
    },
    close: {
      text: 'Uitstekend! Ik zou graag een afspraak plannen voor een vrijblijvende offerte aan huis. Wanneer schikt het u?',
      branches: [
        { label: 'Afspraak maken',    outcome: 'interested'    },
        { label: 'Eerst nadenken',    next: 'callback'         },
        { label: 'Toch niet',         outcome: 'not_interested' },
      ],
    },
    objection: {
      text: 'Dat begrijp ik. Mag ik vragen waarom niet? Misschien kan ik u meer informatie geven over de besparingen en premies.',
      branches: [
        { label: 'Te duur',        next: 'cost'         },
        { label: 'Al panelen',     outcome: 'not_interested' },
        { label: 'Geen interesse', outcome: 'not_interested' },
      ],
    },
    cost: {
      text: 'Wist u dat er momenteel premies beschikbaar zijn die de kostprijs flink verlagen? En de panelen verdienen zichzelf terug in 5 à 6 jaar.',
      branches: [
        { label: 'Toch geïnteresseerd', next: 'close'         },
        { label: 'Nog steeds niet',     outcome: 'not_interested' },
      ],
    },
    callback: {
      text: 'Geen probleem! Wanneer kan ik u beter terugbellen?',
      branches: [
        { label: 'Morgen ochtend',   outcome: 'callback' },
        { label: 'Morgen namiddag',  outcome: 'callback' },
        { label: 'Volgende week',    outcome: 'callback' },
      ],
    },
  },
}

function interpolate(text, contact) {
  if (!contact) return text
  return text
    .replace('{first_name}', contact.first_name || '')
    .replace('{last_name}',  contact.last_name  || '')
    .replace('{company}',    'SolarPro Belgium')
}

export default function ScriptPrompter() {
  const { contact, scriptStep, setScriptStep, scriptHistory } = useCallStore()
  const [script, setScript] = useState(DEFAULT_SCRIPT)
  const [stepHistory, setStepHistory] = useState(['intro'])

  // Reset to intro when a new contact loads
  useEffect(() => {
    if (contact) {
      setStepHistory(['intro'])
      setScriptStep('intro', null)
    }
  }, [contact?.id])

  const currentStep = script.steps[scriptStep] || script.steps['intro']

  function handleBranch(branch) {
    if (branch.outcome) {
      // Terminal branch — just show confirmation, call outcome handled in PhoneTab
      setScriptStep('__done__', branch.label)
      return
    }
    if (branch.next) {
      setStepHistory(h => [...h, branch.next])
      setScriptStep(branch.next, branch.label)
    }
  }

  function handleBack() {
    if (stepHistory.length <= 1) return
    const prev = stepHistory[stepHistory.length - 2]
    setStepHistory(h => h.slice(0, -1))
    setScriptStep(prev, null)
  }

  const s = {
    ct:      { fontSize: 10, fontWeight: 500, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 },
    prog:    { display: 'flex', gap: 3, marginBottom: 10 },
    pdot:    (active) => ({ width: 6, height: 6, borderRadius: '50%', background: active ? '#3b82f6' : 'var(--color-background-secondary)', flexShrink: 0 }),
    box:     { background: 'var(--color-background-secondary)', borderRadius: 7, padding: 10, borderLeft: '3px solid #3b82f6', borderRadius: '0 7px 7px 0', marginBottom: 10, fontSize: 12, lineHeight: 1.6, color: 'var(--color-text-primary)' },
    branches:{ display: 'flex', flexDirection: 'column', gap: 5 },
    bb:      { padding: '6px 10px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, fontSize: 11, cursor: 'pointer', background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', textAlign: 'left' },
    back:    { marginTop: 8, padding: '4px 8px', borderRadius: 6, border: '0.5px solid var(--color-border-tertiary)', background: 'transparent', color: 'var(--color-text-tertiary)', fontSize: 11, cursor: 'pointer' },
    done:    { background: 'var(--color-background-success)', border: '0.5px solid var(--color-border-success)', borderRadius: 7, padding: 10, fontSize: 12, color: 'var(--color-text-success)', textAlign: 'center' },
  }

  if (!contact) return (
    <div>
      <div style={s.ct}>Call script</div>
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Script loads when a contact is assigned.</div>
    </div>
  )

  if (scriptStep === '__done__') return (
    <div>
      <div style={s.ct}>Call script — step {stepHistory.length} / {Object.keys(script.steps).length}</div>
      <div style={s.done}>
        Script complete.<br/>
        Select an outcome in the Phone tab and save the form.
      </div>
    </div>
  )

  return (
    <div>
      <div style={s.ct}>
        Solar script — step {stepHistory.length} / {Object.keys(script.steps).length}
      </div>

      <div style={s.prog}>
        {Object.keys(script.steps).map((k, i) => (
          <div key={k} style={s.pdot(stepHistory.includes(k))}/>
        ))}
      </div>

      <div style={s.box}>
        {interpolate(currentStep.text, contact)}
      </div>

      <div style={s.branches}>
        {currentStep.branches.map((b, i) => (
          <button key={i} style={s.bb} onClick={() => handleBranch(b)}>
            {b.label} {b.outcome ? '→ end' : '→'}
          </button>
        ))}
      </div>

      {stepHistory.length > 1 && (
        <button style={s.back} onClick={handleBack}>← Back</button>
      )}
    </div>
  )
}
