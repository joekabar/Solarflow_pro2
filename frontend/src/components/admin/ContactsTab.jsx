// frontend/src/components/admin/ContactsTab.jsx
// ──────────────────────────────────────────────────
// Contact management + CSV/Excel import for admin panel.
// Supports drag-and-drop and file picker.
// Shows import results (imported, skipped, errors).

import { useState, useEffect, useRef } from 'react'
import { api } from '../../hooks/api'

export default function ContactsTab() {
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [contacts, setContacts] = useState([])
  const [contactCount, setContactCount] = useState(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    loadCampaigns()
  }, [])

  useEffect(() => {
    if (selectedCampaign) loadContacts()
  }, [selectedCampaign])

  async function loadCampaigns() {
    try {
      const res = await api.get('/campaigns')
      setCampaigns(res.campaigns || [])
      if (res.campaigns?.length > 0) {
        setSelectedCampaign(res.campaigns[0].id)
      }
    } catch (e) {
      setError('Kan campagnes niet laden')
    }
  }

  async function loadContacts() {
    // We don't have a dedicated contacts list endpoint yet,
    // so we show the count from import results and campaign info
    setContactCount(null)
  }

  async function handleUpload(file) {
    if (!file) return
    if (!selectedCampaign) {
      setError('Selecteer eerst een campagne')
      return
    }

    const validTypes = ['.csv', '.xlsx', '.xls']
    const ext = '.' + file.name.split('.').pop().toLowerCase()
    if (!validTypes.includes(ext)) {
      setError('Ongeldig bestandstype. Gebruik .csv, .xlsx of .xls')
      return
    }

    setUploading(true)
    setError('')
    setImportResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('campaign_id', selectedCampaign)

      // Use raw fetch for multipart upload
      const session = localStorage.getItem('sfp_session')
      const token = session ? JSON.parse(session).access_token : null
      const BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const res = await fetch(`${BASE_URL}/contacts/import`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Import mislukt')
      }

      setImportResult(data)
    } catch (e) {
      setError(e.message || 'Import mislukt')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (file) handleUpload(file)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleUpload(file)
  }

  function handleDragOver(e) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    setDragOver(false)
  }

  const campaignName = campaigns.find(c => c.id === selectedCampaign)?.name || ''

  const s = {
    card:     { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 'var(--border-radius-lg)', overflow: 'hidden' },
    hdr:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '0.5px solid var(--color-border-tertiary)' },
    title:    { fontSize: 16, fontWeight: 500 },
    body:     { padding: 20 },

    // Campaign selector
    selWrap:  { marginBottom: 16 },
    selLabel: { fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 4 },
    select:   { padding: '8px 10px', border: '0.5px solid var(--color-border-secondary)', borderRadius: 7, fontSize: 13, background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', width: '100%', maxWidth: 360 },

    // Drop zone
    dropzone: {
      border: `2px dashed ${dragOver ? '#3b82f6' : 'var(--color-border-secondary)'}`,
      borderRadius: 12,
      padding: '36px 20px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      background: dragOver ? 'var(--color-background-info)' : 'var(--color-background-secondary)',
      marginBottom: 16,
    },
    dropIcon: { fontSize: 32, marginBottom: 8, opacity: 0.5 },
    dropText: { fontSize: 13, color: 'var(--color-text-primary)', fontWeight: 500, marginBottom: 4 },
    dropSub:  { fontSize: 11, color: 'var(--color-text-secondary)' },
    dropBtn:  { display: 'inline-block', marginTop: 10, padding: '7px 16px', borderRadius: 7, background: '#1d6fb8', color: '#fff', border: 'none', fontSize: 12, cursor: 'pointer', fontWeight: 500 },

    // Upload progress
    progress: { padding: '16px 20px', background: 'var(--color-background-info)', borderRadius: 8, fontSize: 12, color: 'var(--color-text-info)', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
    spinner:  { width: 16, height: 16, border: '2px solid var(--color-border-info)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },

    // Results
    results:  { background: 'var(--color-background-secondary)', borderRadius: 8, padding: 16, marginBottom: 16 },
    resTitle: { fontSize: 13, fontWeight: 500, marginBottom: 10 },
    resGrid:  { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 },
    resStat:  { background: 'var(--color-background-primary)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' },
    resNum:   (color) => ({ fontSize: 22, fontWeight: 600, color, lineHeight: 1.2 }),
    resLabel: { fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 },
    resMsg:   { marginTop: 10, fontSize: 12, color: 'var(--color-text-success)', background: 'var(--color-background-success)', padding: '8px 12px', borderRadius: 7 },

    // Error
    err:      { background: 'var(--color-background-danger)', color: 'var(--color-text-danger)', borderRadius: 7, padding: '8px 12px', fontSize: 12, marginBottom: 12 },

    // Column guide
    guide:    { marginTop: 8, background: 'var(--color-background-secondary)', borderRadius: 8, padding: 14 },
    guideT:   { fontSize: 12, fontWeight: 500, marginBottom: 8 },
    guideRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
    guideTag: { padding: '3px 8px', borderRadius: 5, fontSize: 10, background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', border: '0.5px solid var(--color-border-tertiary)' },
  }

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={s.card}>
        <div style={s.hdr}>
          <div style={s.title}>Contacten importeren</div>
        </div>

        <div style={s.body}>
          {error && <div style={s.err}>{error}</div>}

          {/* Campaign selector */}
          <div style={s.selWrap}>
            <div style={s.selLabel}>Selecteer campagne voor import</div>
            <select
              style={s.select}
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
            >
              {campaigns.length === 0 && <option value="">Geen campagnes — maak er eerst een aan</option>}
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
              ))}
            </select>
          </div>

          {/* Drop zone */}
          {uploading ? (
            <div style={s.progress}>
              <div style={s.spinner} />
              Bezig met importeren… Dit kan even duren bij grote bestanden.
            </div>
          ) : (
            <div
              style={s.dropzone}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileRef.current?.click()}
            >
              <div style={s.dropIcon}>📄</div>
              <div style={s.dropText}>
                Sleep een CSV of Excel bestand hierheen
              </div>
              <div style={s.dropSub}>
                of klik om een bestand te kiezen
              </div>
              <div style={s.dropSub}>
                Ondersteunde formaten: .csv, .xlsx, .xls
              </div>
              <button
                style={s.dropBtn}
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
              >
                Bestand kiezen
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {/* Import results */}
          {importResult && (
            <div style={s.results}>
              <div style={s.resTitle}>Import resultaat — {campaignName}</div>
              <div style={s.resGrid}>
                <div style={s.resStat}>
                  <div style={s.resNum('#22c55e')}>{importResult.stats?.imported || 0}</div>
                  <div style={s.resLabel}>Geïmporteerd</div>
                </div>
                <div style={s.resStat}>
                  <div style={s.resNum('var(--color-text-warning)')}>{importResult.stats?.skipped_duplicate || 0}</div>
                  <div style={s.resLabel}>Duplicaten overgeslagen</div>
                </div>
                <div style={s.resStat}>
                  <div style={s.resNum('var(--color-text-danger)')}>{importResult.stats?.skipped_dnc || 0}</div>
                  <div style={s.resLabel}>DNC overgeslagen</div>
                </div>
                <div style={s.resStat}>
                  <div style={s.resNum('var(--color-text-secondary)')}>{importResult.stats?.skipped_no_phone || 0}</div>
                  <div style={s.resLabel}>Geen telefoonnummer</div>
                </div>
                <div style={s.resStat}>
                  <div style={s.resNum('var(--color-text-danger)')}>{importResult.stats?.errors || 0}</div>
                  <div style={s.resLabel}>Fouten</div>
                </div>
                <div style={s.resStat}>
                  <div style={s.resNum('var(--color-text-primary)')}>{importResult.stats?.total_rows || 0}</div>
                  <div style={s.resLabel}>Totale rijen</div>
                </div>
              </div>
              {importResult.message && (
                <div style={s.resMsg}>{importResult.message}</div>
              )}
            </div>
          )}

          {/* Column guide */}
          <div style={s.guide}>
            <div style={s.guideT}>Verwachte kolommen (flexibel — Nederlandse namen worden herkend)</div>
            <div style={s.guideRow}>
              {[
                'first_name / voornaam',
                'last_name / achternaam / naam',
                'phone / telefoon / gsm / tel',
                'email / e-mail',
                'street / straat / adres',
                'city / stad / gemeente',
                'postal_code / postcode',
                'lead_score / score',
              ].map(col => (
                <span key={col} style={s.guideTag}>{col}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 8, lineHeight: 1.5 }}>
              Het adres uit het bestand wordt opgeslagen als origineel adres en is <strong>niet zichtbaar voor agenten</strong>.
              Agenten vragen het adres tijdens het gesprek en typen het geverifieerde adres in.
              Duplicaten (zelfde telefoonnummer) en nummers op de DNC-lijst worden automatisch overgeslagen.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
