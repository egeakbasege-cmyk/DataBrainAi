'use client'

/**
 * /vault — Data Vault
 *
 * Sovereign Intelligence Memory Hub.
 * Shows the user everything Sail AI knows about their business — sector,
 * stored metrics, diagnostic context, and analysis session history.
 * Full edit and delete control: "Sovereign" means the data is theirs.
 */

import { useState, useEffect }       from 'react'
import Link                           from 'next/link'
import { useSession }                 from 'next-auth/react'
import { useRouter }                  from 'next/navigation'
import { motion, AnimatePresence }    from 'framer-motion'
import { useBusinessContext }          from '@/lib/context/BusinessContext'
import type { BusinessMetric, BusinessSession } from '@/lib/context/BusinessContext'
import { Nav }                        from '@/components/Nav'
import { useLanguage }                from '@/lib/i18n/LanguageContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}

const EASE = [0.22, 1, 0.36, 1] as const

// ── Section wrapper ───────────────────────────────────────────────────────────

function VaultSection({
  title, subtitle, children, action,
}: {
  title:     string
  subtitle?: string
  children:  React.ReactNode
  action?:   React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      style={{
        background:   '#FFFFFF',
        border:       '1px solid rgba(12,12,14,0.09)',
        borderRadius: '12px',
        overflow:     'hidden',
        marginBottom: '1.5rem',
      }}
    >
      {/* Section header */}
      <div style={{
        padding:        '1.25rem 1.75rem',
        borderBottom:   '1px solid rgba(12,12,14,0.07)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h2 style={{
            fontFamily:    'var(--font-cormorant), Georgia, serif',
            fontSize:      '1.1rem',
            fontWeight:    600,
            color:         '#0C0C0E',
            margin:        0,
            letterSpacing: '-0.01em',
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', color: '#71717A', margin: '2px 0 0', fontWeight: 300 }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
      <div style={{ padding: '1.5rem 1.75rem' }}>
        {children}
      </div>
    </motion.div>
  )
}

// ── Metric row ────────────────────────────────────────────────────────────────

function MetricRow({
  metric, onDelete, onEdit,
}: {
  metric:   BusinessMetric
  onDelete: () => void
  onEdit:   (label: string, value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [label,   setLabel]   = useState(metric.label)
  const [value,   setValue]   = useState(metric.value)

  function save() {
    if (label.trim() && value.trim()) {
      onEdit(label.trim(), value.trim())
    }
    setEditing(false)
  }

  return (
    <div style={{
      display:       'flex',
      alignItems:    'center',
      gap:           '0.75rem',
      padding:       '0.625rem 0',
      borderBottom:  '1px solid rgba(12,12,14,0.05)',
    }}>
      <span style={{ color: '#C9A96E', fontSize: '0.55rem', flexShrink: 0 }}>◆</span>

      {editing ? (
        <>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            style={{
              flex:       1,
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:   '0.8rem',
              border:     'none',
              borderBottom: '1px solid #C9A96E',
              outline:    'none',
              padding:    '2px 0',
              color:      '#0C0C0E',
              background: 'transparent',
            }}
            placeholder="Metric name"
          />
          <input
            value={value}
            onChange={e => setValue(e.target.value)}
            style={{
              width:      '120px',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:   '0.8rem',
              border:     'none',
              borderBottom: '1px solid #C9A96E',
              outline:    'none',
              padding:    '2px 0',
              color:      '#0C0C0E',
              background: 'transparent',
              textAlign:  'right',
            }}
            placeholder="Value"
          />
          <button onClick={save} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C9A96E', fontSize: '0.75rem', fontWeight: 700, padding: '0 4px' }}>
            Save
          </button>
          <button onClick={() => setEditing(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A1A1AA', fontSize: '0.72rem', padding: '0 4px' }}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <span style={{ flex: 1, fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8rem', color: '#0C0C0E' }}>
            {metric.label}
          </span>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8rem', fontWeight: 600, color: '#0C0C0E' }}>
            {metric.value}
          </span>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', color: '#A1A1AA', minWidth: 60, textAlign: 'right' }}>
            {formatDate(metric.addedAt)}
          </span>
          <button
            onClick={() => setEditing(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#A1A1AA', fontSize: '0.65rem', padding: '0 4px', opacity: 0.7 }}
            aria-label="Edit metric"
          >
            ✎
          </button>
          <button
            onClick={onDelete}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '0.65rem', padding: '0 4px', opacity: 0.7 }}
            aria-label="Delete metric"
          >
            ✕
          </button>
        </>
      )}
    </div>
  )
}

// ── Session row ───────────────────────────────────────────────────────────────

function SessionRow({ session }: { session: BusinessSession }) {
  return (
    <div style={{
      padding:      '0.75rem 0',
      borderBottom: '1px solid rgba(12,12,14,0.05)',
      display:      'flex',
      gap:          '0.875rem',
      alignItems:   'flex-start',
    }}>
      <div style={{
        width:        28,
        height:       28,
        borderRadius: '50%',
        background:   'rgba(201,169,110,0.1)',
        border:       '1px solid rgba(201,169,110,0.25)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
        flexShrink:   0,
        marginTop:    2,
      }}>
        <span style={{ fontSize: '0.6rem' }}>⚡</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily:   'var(--font-inter), sans-serif',
          fontSize:     '0.8rem',
          color:        '#0C0C0E',
          margin:       '0 0 2px',
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
        }}>
          {session.summary}
        </p>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.62rem', color: '#A1A1AA', margin: 0 }}>
          {formatDate(session.createdAt)}
        </p>
      </div>
    </div>
  )
}

// ── Add metric form ───────────────────────────────────────────────────────────

function AddMetricForm({ onAdd }: { onAdd: (label: string, value: string) => void }) {
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [open,  setOpen]  = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !value.trim()) return
    onAdd(label.trim(), value.trim())
    setLabel('')
    setValue('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '0.5rem',
          padding:       '0.5rem 0.875rem',
          background:    'transparent',
          border:        '1px dashed rgba(201,169,110,0.4)',
          borderRadius:  '6px',
          cursor:        'pointer',
          fontFamily:    'var(--font-inter), sans-serif',
          fontSize:      '0.72rem',
          color:         '#C9A96E',
          fontWeight:    600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginTop:     '0.75rem',
        }}
      >
        + Add Metric
      </button>
    )
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginTop: '0.75rem', flexWrap: 'wrap' }}>
      <div style={{ flex: 2, minWidth: 140 }}>
        <label style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.62rem', color: '#71717A', display: 'block', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Metric
        </label>
        <input
          autoFocus
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g. Monthly Revenue"
          style={{ width: '100%', padding: '0.5rem 0', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(12,12,14,0.2)', outline: 'none', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.85rem', color: '#0C0C0E', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 100 }}>
        <label style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.62rem', color: '#71717A', display: 'block', marginBottom: 4, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Value
        </label>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="e.g. $42K"
          style={{ width: '100%', padding: '0.5rem 0', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(12,12,14,0.2)', outline: 'none', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.85rem', color: '#0C0C0E', boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#0C0C0E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
          Save
        </button>
        <button type="button" onClick={() => setOpen(false)} style={{ padding: '0.5rem 0.75rem', background: 'transparent', color: '#71717A', border: '1px solid rgba(12,12,14,0.15)', borderRadius: '6px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const { data: session, status } = useSession()
  const router                    = useRouter()
  const { t }                     = useLanguage()
  const {
    profile, setSector, addMetric, removeMetric, clearProfile,
  } = useBusinessContext()

  const [sectorEdit,    setSectorEdit]    = useState(false)
  const [sectorDraft,   setSectorDraft]   = useState('')
  const [clearConfirm,  setClearConfirm]  = useState(false)
  const [clearLoading,  setClearLoading]  = useState(false)
  const [savedFlash,    setSavedFlash]    = useState(false)

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  function handleSectorSave() {
    if (sectorDraft.trim()) setSector(sectorDraft.trim())
    setSectorEdit(false)
    flashSaved()
  }

  function handleAddMetric(label: string, value: string) {
    addMetric(label, value)
    flashSaved()
  }

  function handleEditMetric(oldLabel: string, newLabel: string, newValue: string) {
    // Rename = drop the old key first, then upsert under the new label.
    if (oldLabel !== newLabel) removeMetric(oldLabel)
    addMetric(newLabel, newValue)
    flashSaved()
  }

  function handleDeleteMetric(label: string) {
    removeMetric(label)
    flashSaved()
  }

  async function handleClearAll() {
    setClearLoading(true)
    await fetch('/api/profile', { method: 'DELETE' }).catch(() => undefined)
    clearProfile()
    setClearConfirm(false)
    setClearLoading(false)
  }

  function flashSaved() {
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }

  // Legacy rows persisted by the old sentinel-based delete are filtered out on read.
  const displayMetrics = profile.metrics.filter(m => m.value !== '\x00DELETE' && m.value !== '')

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(201,169,110,0.3)', borderTopColor: '#C9A96E', animation: 'spin 0.8s linear infinite' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <Nav />

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0  }}
          transition={{ duration: 0.45, ease: EASE }}
          style={{ marginBottom: '2.5rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0.875rem' }}>
            <div style={{ width: 28, height: 1, background: '#C9A96E', opacity: 0.6 }} />
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A96E' }}>
              Sovereign Intelligence
            </span>
          </div>
          <h1 style={{
            fontFamily:    'var(--font-cormorant), Georgia, serif',
            fontSize:      'clamp(1.6rem, 3vw, 2.1rem)',
            fontWeight:    600,
            color:         '#0C0C0E',
            margin:        '0 0 0.5rem',
            lineHeight:    1.1,
          }}>
            Data Vault
          </h1>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.82rem', color: '#71717A', margin: 0, fontWeight: 300, lineHeight: 1.65 }}>
            Everything Sail AI has stored about your business. Full edit and delete control — your context, your rules.
          </p>
        </motion.div>

        {/* Status bar */}
        <AnimatePresence>
          {savedFlash && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0  }}
              exit={{    opacity: 0, y: -8  }}
              style={{
                background:   'rgba(16,185,129,0.08)',
                border:       '1px solid rgba(16,185,129,0.25)',
                borderRadius: '8px',
                padding:      '0.625rem 1rem',
                marginBottom: '1rem',
                fontFamily:   'var(--font-inter), sans-serif',
                fontSize:     '0.75rem',
                color:        '#10B981',
                fontWeight:   600,
              }}
            >
              ✓ Changes saved — synced to your account
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 1. SECTOR ─────────────────────────────────────────────────── */}
        <VaultSection
          title="Business Sector"
          subtitle="Used to calibrate benchmarks and sector-specific terminology"
        >
          {sectorEdit ? (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
              <input
                autoFocus
                value={sectorDraft}
                onChange={e => setSectorDraft(e.target.value)}
                placeholder="e.g. E-Commerce · Shopify · DTC Apparel"
                onKeyDown={e => e.key === 'Enter' && handleSectorSave()}
                style={{ flex: 1, padding: '0.5rem 0', background: 'transparent', border: 'none', borderBottom: '1px solid #C9A96E', outline: 'none', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9rem', color: '#0C0C0E' }}
              />
              <button onClick={handleSectorSave} style={{ padding: '0.5rem 1rem', background: '#0C0C0E', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                Save
              </button>
              <button onClick={() => setSectorEdit(false)} style={{ padding: '0.5rem 0.75rem', background: 'transparent', color: '#71717A', border: '1px solid rgba(12,12,14,0.15)', borderRadius: '6px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {profile.sector ? (
                <span style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '1.1rem', fontStyle: 'italic', color: '#0C0C0E', flex: 1 }}>
                  {profile.sector}
                </span>
              ) : (
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.82rem', color: '#A1A1AA', flex: 1, fontStyle: 'italic' }}>
                  Not set — AI uses generic benchmarks
                </span>
              )}
              <button
                onClick={() => { setSectorDraft(profile.sector); setSectorEdit(true) }}
                style={{ padding: '0.4rem 0.875rem', background: 'transparent', border: '1px solid rgba(201,169,110,0.35)', borderRadius: '6px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.7rem', fontWeight: 600, color: '#C9A96E', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                {profile.sector ? 'Edit' : 'Set Sector'}
              </button>
            </div>
          )}
        </VaultSection>

        {/* ── 2. METRICS ────────────────────────────────────────────────── */}
        <VaultSection
          title="Stored Metrics"
          subtitle={`${displayMetrics.length} metric${displayMetrics.length !== 1 ? 's' : ''} on record — injected into every AI prompt`}
        >
          {displayMetrics.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8rem', color: '#A1A1AA', margin: 0, fontStyle: 'italic' }}>
              No metrics stored. Add your key KPIs below — CVR, ROAS, MRR, AOV, etc.
            </p>
          ) : (
            displayMetrics.map(m => (
              <MetricRow
                key={m.label + m.addedAt}
                metric={m}
                onDelete={() => handleDeleteMetric(m.label)}
                onEdit={(newLabel, newValue) => handleEditMetric(m.label, newLabel, newValue)}
              />
            ))
          )}
          <AddMetricForm onAdd={handleAddMetric} />
        </VaultSection>

        {/* ── 3. DIAGNOSTIC ─────────────────────────────────────────────── */}
        {profile.diagnosticPrompt && (
          <VaultSection
            title="Diagnostic Profile"
            subtitle="Full business context captured via 7P diagnostic — injected as priority context"
          >
            <div style={{
              background:   'rgba(201,169,110,0.04)',
              border:       '1px solid rgba(201,169,110,0.15)',
              borderRadius: '8px',
              padding:      '1rem',
              fontFamily:   'var(--font-inter), sans-serif',
              fontSize:     '0.78rem',
              color:        '#3A3A3C',
              lineHeight:   1.7,
              whiteSpace:   'pre-wrap',
              maxHeight:    '200px',
              overflow:     'auto',
            }}>
              {profile.diagnosticPrompt}
            </div>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.65rem', color: '#A1A1AA', margin: '0.75rem 0 0', fontStyle: 'italic' }}>
              Re-run the onboarding diagnostic to update this profile.
            </p>
          </VaultSection>
        )}

        {/* ── 4. SESSION HISTORY ────────────────────────────────────────── */}
        <VaultSection
          title="Analysis History"
          subtitle={`${profile.sessions.length} session${profile.sessions.length !== 1 ? 's' : ''} — your most recent strategy analyses`}
          action={
            <Link
              href="/chat"
              style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.7rem', fontWeight: 700, color: '#C9A96E', textDecoration: 'none', letterSpacing: '0.08em', textTransform: 'uppercase' }}
            >
              New Analysis →
            </Link>
          }
        >
          {profile.sessions.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8rem', color: '#A1A1AA', margin: 0, fontStyle: 'italic' }}>
              No sessions yet. Start a new analysis to build your history.
            </p>
          ) : (
            profile.sessions.slice().reverse().map(s => (
              <SessionRow key={s.id} session={s} />
            ))
          )}
        </VaultSection>

        {/* ── 5. DANGER ZONE ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            border:       '1px solid rgba(239,68,68,0.2)',
            borderRadius: '12px',
            padding:      '1.5rem 1.75rem',
          }}
        >
          <h3 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '1rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.375rem' }}>
            Clear All Data
          </h3>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', color: '#71717A', margin: '0 0 1rem', fontWeight: 300, lineHeight: 1.65 }}>
            Permanently removes your sector, stored metrics, and diagnostic profile from both this device and your account. Analysis history remains.
          </p>

          <AnimatePresence mode="wait">
            {!clearConfirm ? (
              <motion.button
                key="trigger"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setClearConfirm(true)}
                style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '6px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', fontWeight: 600, color: '#EF4444', cursor: 'pointer', letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Clear All Stored Data
              </motion.button>
            ) : (
              <motion.div
                key="confirm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}
              >
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', color: '#EF4444', fontWeight: 600 }}>
                  Are you sure? This cannot be undone.
                </span>
                <button
                  onClick={handleClearAll}
                  disabled={clearLoading}
                  style={{ padding: '0.5rem 1rem', background: '#EF4444', border: 'none', borderRadius: '6px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', fontWeight: 700, color: '#FFFFFF', cursor: clearLoading ? 'wait' : 'pointer', opacity: clearLoading ? 0.6 : 1 }}
                >
                  {clearLoading ? 'Clearing…' : 'Yes, clear everything'}
                </button>
                <button
                  onClick={() => setClearConfirm(false)}
                  style={{ padding: '0.5rem 0.875rem', background: 'transparent', border: '1px solid rgba(12,12,14,0.15)', borderRadius: '6px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', color: '#71717A', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>
    </div>
  )
}
