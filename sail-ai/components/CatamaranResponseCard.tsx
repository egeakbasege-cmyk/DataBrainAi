'use client'

import { useState, useCallback } from 'react'
import type { CatamaranResponse } from '@/types/chat'
import { useLanguage }            from '@/lib/i18n/LanguageContext'

interface CatamaranResponseCardProps {
  response:   CatamaranResponse | null
  isStreaming?: boolean
  query?:     string
}

// ── Export helpers ─────────────────────────────────────────────────────────────

async function runExport(payload: Record<string, unknown>): Promise<string> {
  const res = await fetch('/api/export', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Export failed')
  return res.text()
}

function triggerDownload(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/markdown' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function CatamaranResponseCard({ response, isStreaming = false, query }: CatamaranResponseCardProps) {
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [copyState,   setCopyState]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const { t } = useLanguage()

  const buildPayload = useCallback(() => ({
    _type:               'catamaran' as const,
    catamaranTitle:      response?.catamaranTitle ?? 'Dual-Track Strategy',
    marketGrowth:        response?.marketGrowth       ? { actions: response.marketGrowth.actions,       target: response.marketGrowth.target       } : undefined,
    customerExperience:  response?.customerExperience ? { actions: response.customerExperience.actions, target: response.customerExperience.target  } : undefined,
    unifiedStrategy:     response?.unifiedStrategy,
    thirtyDayTarget:     response?.thirtyDayTarget,
    greatestRisk:        response?.greatestRisk,
    query,
  }), [response, query])

  const handleDownload = useCallback(async () => {
    if (!response || exportState === 'loading') return
    setExportState('loading')
    try {
      const md = await runExport(buildPayload())
      triggerDownload(md, `catamaran-${new Date().toISOString().slice(0, 10)}.md`)
      setExportState('done')
      setTimeout(() => setExportState('idle'), 2000)
    } catch { setExportState('error'); setTimeout(() => setExportState('idle'), 2500) }
  }, [response, buildPayload, exportState])

  const handleCopy = useCallback(async () => {
    if (!response || copyState === 'loading') return
    setCopyState('loading')
    try {
      const md = await runExport(buildPayload())
      await navigator.clipboard.writeText(md)
      setCopyState('done')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch { setCopyState('error'); setTimeout(() => setCopyState('idle'), 2500) }
  }, [response, buildPayload, copyState])
  if (isStreaming || !response) {
    return (
      <div style={{
        background:          'linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(8,9,13,0.80) 100%)',
        backdropFilter:      'blur(28px)',
        WebkitBackdropFilter:'blur(28px)',
        border:              '1px solid rgba(212,175,55,0.25)',
        borderRadius:         14,
        padding:              24,
        textAlign:           'center',
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid rgba(212,175,55,0.2)',
          borderTop: '3px solid #D4AF37',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px',
        }} />
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.60)' }}>
          Generating CATAMARAN analysis...
        </p>
      </div>
    )
  }

  const goldColor = '#D4AF37'
  
  // Safe access - tüm değerleri string/number olarak güvenli hale getir
  const title = String(response?.catamaranTitle || 'System Overhaul Plan')
  const summary = String(response?.executiveSummary || '')
  const marketGrowth = response?.marketGrowth || { trackTitle: '', actions: [], target: '' }
  const customerExperience = response?.customerExperience || { trackTitle: '', actions: [], target: '' }
  const unifiedStrategy = String(response?.unifiedStrategy || '')
  const thirtyDayTarget = String(response?.thirtyDayTarget || '')
  const greatestRisk = String(response?.greatestRisk || '')
  const confidenceIndex = Number(response?.confidenceIndex) || 0

  return (
    <div style={{
      background:          'linear-gradient(135deg, rgba(212,175,55,0.10) 0%, rgba(8,9,13,0.80) 60%, rgba(20,184,166,0.05) 100%)',
      backdropFilter:      'blur(28px)',
      WebkitBackdropFilter:'blur(28px)',
      border:              '1px solid rgba(212,175,55,0.25)',
      borderRadius:         14,
      overflow:            'hidden',
      boxShadow:           '0 8px 36px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
    }}>
      {/* Header */}
      <div style={{
        height: 2,
        background: `linear-gradient(90deg, transparent, ${goldColor}, transparent)`,
      }} />
      
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(212,175,55,0.12)' }}>
        <span style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '0.6rem',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: goldColor,
          padding: '3px 8px',
          background: 'rgba(212,175,55,0.1)',
          borderRadius: 4,
        }}>
          CATAMARAN
        </span>
        <h2 style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontSize: '1.5rem',
          fontWeight: 600,
          color: '#FFFFFF',
          margin: '8px 0 0',
        }}>
          {title}
        </h2>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(212,175,55,0.1)' }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.70)', lineHeight: 1.6, margin: 0 }}>
            {summary}
          </p>
        </div>
      )}

      {/* Dual Tracks */}
      <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Market Growth */}
        <div style={{
          background: 'rgba(212,175,55,0.04)',
          border: `1px solid ${goldColor}30`,
          borderRadius: 10,
          padding: 16,
        }}>
          <span style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: goldColor,
          }}>
            Market Growth
          </span>
          <h4 style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontSize: '1.05rem',
            fontWeight: 600,
            color: '#FFFFFF',
            margin: '6px 0 12px',
          }}>
            {marketGrowth.trackTitle || 'Market Track'}
          </h4>
          {(marketGrowth.actions || []).map((action, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${goldColor}15`,
              borderLeft: `3px solid ${goldColor}`,
              borderRadius: '0 6px 6px 0',
              padding: 10,
              marginBottom: 8,
            }}>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF', margin: '0 0 4px' }}>
                {String(action?.action || 'Action')}
              </p>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.60)', margin: 0 }}>
                {String(action?.impact || '')}
              </p>
            </div>
          ))}
          {marketGrowth.target && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: `${goldColor}10`, borderRadius: 6 }}>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', fontWeight: 600, color: goldColor }}>
                Target: {marketGrowth.target}
              </span>
            </div>
          )}
        </div>

        {/* Customer Experience */}
        <div style={{
          background: 'rgba(0,105,92,0.04)',
          border: '1px solid rgba(0,105,92,0.2)',
          borderRadius: 10,
          padding: 16,
        }}>
          <span style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '0.6rem',
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#00695C',
          }}>
            Customer Experience
          </span>
          <h4 style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontSize: '1.05rem',
            fontWeight: 600,
            color: '#FFFFFF',
            margin: '6px 0 12px',
          }}>
            {customerExperience.trackTitle || 'CX Track'}
          </h4>
          {(customerExperience.actions || []).map((action, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(0,105,92,0.15)',
              borderLeft: '3px solid #00695C',
              borderRadius: '0 6px 6px 0',
              padding: 10,
              marginBottom: 8,
            }}>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', fontWeight: 600, color: '#FFFFFF', margin: '0 0 4px' }}>
                {String(action?.action || 'Action')}
              </p>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.60)', margin: 0 }}>
                {String(action?.impact || '')}
              </p>
            </div>
          ))}
          {customerExperience.target && (
            <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(0,105,92,0.1)', borderRadius: 6 }}>
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', fontWeight: 600, color: '#00695C' }}>
                Target: {customerExperience.target}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Unified Strategy */}
      {unifiedStrategy && (
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{
            background: 'rgba(212,175,55,0.06)',
            border: '1px solid rgba(212,175,55,0.15)',
            borderRadius: 8,
            padding: 14,
          }}>
            <span style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#B8941F',
            }}>
              Unified Strategy
            </span>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              {unifiedStrategy}
            </p>
          </div>
        </div>
      )}

      {/* Bottom Info */}
      <div style={{ padding: '0 24px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12 }}>
        {thirtyDayTarget && (
          <div style={{ background: '#f8f8f8', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 6, padding: 12 }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.58rem', fontWeight: 700, color: 'rgba(255,255,255,0.50)', textTransform: 'uppercase' }}>
              30-Day Target
            </span>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', margin: '6px 0 0' }}>
              {thirtyDayTarget}
            </p>
          </div>
        )}
        {greatestRisk && (
          <div style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.12)', borderRadius: 6, padding: 12 }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.58rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>
              Greatest Risk
            </span>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.75)', margin: '6px 0 0' }}>
              {greatestRisk}
            </p>
          </div>
        )}
        <div style={{
          background: `linear-gradient(135deg, ${goldColor}15, ${goldColor}08)`,
          border: `1px solid ${goldColor}30`,
          borderRadius: 6,
          padding: 12,
          minWidth: 80,
          textAlign: 'center',
        }}>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.55rem', fontWeight: 700, color: '#B8941F', textTransform: 'uppercase' }}>
            Confidence
          </span>
          <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color: goldColor, margin: '4px 0 0' }}>
            {confidenceIndex}%
          </p>
        </div>
      </div>

      {/* Export footer */}
      <div style={{ padding: '10px 20px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid rgba(212,175,55,0.1)' }}>
        {([
          { state: exportState, label: t('export.download'), doneLabel: t('export.downloaded'), icon: '↓', onClick: handleDownload },
          { state: copyState,   label: t('export.copy'),     doneLabel: t('export.copied'),     icon: '⎘', onClick: handleCopy },
        ] as const).map(({ state, label, doneLabel, icon, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={state === 'loading'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px',
              fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', fontWeight: 500,
              color:      state === 'done' ? '#14B8A6' : state === 'error' ? '#DC2626' : '#71717A',
              background: 'rgba(0,0,0,0.03)',
              border:     '1px solid rgba(0,0,0,0.09)',
              cursor:     state === 'loading' ? 'wait' : 'pointer',
              transition: 'color 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '0.8rem' }}>{state === 'loading' ? '…' : state === 'done' ? '✓' : state === 'error' ? '✕' : icon}</span>
            {state === 'done' ? doneLabel : state === 'error' ? t('export.error') : label}
          </button>
        ))}
      </div>
    </div>
  )
}
