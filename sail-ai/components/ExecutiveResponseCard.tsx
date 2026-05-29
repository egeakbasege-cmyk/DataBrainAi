'use client'

/**
 * ExecutiveResponseCard
 *
 * The primary output surface for a completed Aetheris analysis.
 * Composes: insight headline · ActionMatrix grid · execution horizons.
 *
 * Layout (dark variant):
 *   ┌──────────────────────────────────────────────┐
 *   │  Gold hairline                               │
 *   │  INSIGHT — large, white, high contrast       │
 *   ├──────────────────────────────────────────────┤
 *   │  ActionMatrix  [Card 1] [Card 2] [Card 3]    │
 *   ├──────────────────────────────────────────────┤
 *   │  Execution horizons  30d · 60d · 90d         │
 *   └──────────────────────────────────────────────┘
 *
 * Accepts an optional `isStreaming` flag — shows a skeleton loader
 * (not a spinner) while the response is in flight.
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ActionMatrixCard }  from './ActionMatrixCard'
import type { ExecutiveResponse } from '@/types/architecture'
import { useLanguage }       from '@/lib/i18n/LanguageContext'

interface ExecutiveResponseCardProps {
  response:    ExecutiveResponse | null
  isStreaming?: boolean
  variant?:    'dark' | 'light'
  /** Optional headline text used in the export filename / document title */
  headline?:   string
  /** Original query — injected into the exported document as a blockquote */
  query?:      string
}

// ── Skeleton block ─────────────────────────────────────────────────────────────
function SkeletonLine({ width = '100%', height = 14, mb = 8 }: { width?: string; height?: number; mb?: number }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        width,
        height,
        background:   'rgba(226,226,232,0.07)',
        marginBottom: mb,
      }}
    />
  )
}

function StreamingSkeleton() {
  return (
    <div style={{ padding: '24px 24px 20px' }}>
      <SkeletonLine width="85%" height={18} mb={10} />
      <SkeletonLine width="65%" height={18} mb={24} />
      <SkeletonLine width="40%" height={10} mb={12} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[0, 1].map(i => (
          <div key={i} style={{ border: '1px solid rgba(226,226,232,0.06)', padding: 14 }}>
            <SkeletonLine width="70%" height={12} mb={8} />
            <SkeletonLine width="100%" height={10} mb={6} />
            <SkeletonLine width="90%" height={10} mb={0} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Horizon section ────────────────────────────────────────────────────────────
interface HorizonSectionProps {
  horizons: NonNullable<ExecutiveResponse['executionHorizons']>
  isDark:   boolean
}

function HorizonSection({ horizons, isDark }: HorizonSectionProps) {
  const { t } = useLanguage()
  const HORIZON_LABELS = [
    { key: 'thirtyDays' as const, label: t('aetheris.horizon.thirty'), accentLight: '#A8873E', accentDark: '#C9A96E' },
    { key: 'sixtyDays'  as const, label: t('aetheris.horizon.sixty'),  accentLight: '#71717A', accentDark: '#9898B0' },
    { key: 'ninetyDays' as const, label: t('aetheris.horizon.ninety'), accentLight: '#3A3A3C', accentDark: '#B0B0BC' },
  ]
  const ruleColor  = isDark ? 'rgba(226,226,232,0.06)' : 'rgba(0,0,0,0.07)'
  const bodyColor  = isDark ? '#9898B0' : '#71717A'
  const itemBg     = isDark ? 'rgba(226,226,232,0.03)' : 'rgba(0,0,0,0.02)'
  const itemBorder = isDark ? 'rgba(226,226,232,0.07)' : 'rgba(0,0,0,0.07)'

  return (
    <div style={{ padding: '0 24px 24px' }}>
      <div style={{ height: 1, background: ruleColor, marginBottom: 20 }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {HORIZON_LABELS.map(({ key, label, accentLight, accentDark }, colIdx) => {
          const items  = horizons[key] ?? []
          const accent = isDark ? accentDark : accentLight
          if (!items.length) return null

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: colIdx * 0.08 }}
            >
              {/* Horizon label */}
              <div style={{ marginBottom: 10 }}>
                <span style={{
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.6rem',
                  fontWeight:    600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color:         accent,
                }}>
                  {label}
                </span>
              </div>

              {/* Items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding:    '7px 10px',
                      background: itemBg,
                      border:     `1px solid ${itemBorder}`,
                      borderLeft: `2px solid ${accent}`,
                    }}
                  >
                    <p style={{
                      fontFamily:  'Inter, sans-serif',
                      fontSize:    '0.72rem',
                      color:       bodyColor,
                      lineHeight:  1.5,
                      margin:      0,
                    }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

// ── Export helpers ─────────────────────────────────────────────────────────────

function buildExportPayload(
  response:  ExecutiveResponse,
  headline?: string,
  query?:    string,
) {
  return {
    _type:   'executive' as const,
    headline: headline ?? response.insight.slice(0, 80),
    signal:   response.insight,
    query,
    actions: response.matrixOptions?.map(opt => ({
      action:   `${opt.title}: ${opt.description}`,
      timeline: `${opt.implementationTimeDays} days`,
    })),
    target30: response.executionHorizons?.thirtyDays.join(' · '),
  }
}

async function downloadExport(payload: ReturnType<typeof buildExportPayload>) {
  const res = await fetch('/api/export', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Export failed')

  const blob     = await res.blob()
  const cd       = res.headers.get('Content-Disposition') ?? ''
  const match    = cd.match(/filename="([^"]+)"/)
  const filename = match?.[1] ?? 'sail-analysis.md'

  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

async function copyMarkdown(payload: ReturnType<typeof buildExportPayload>) {
  const res = await fetch('/api/export', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Export failed')
  const text = await res.text()
  await navigator.clipboard.writeText(text)
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ExecutiveResponseCard({
  response,
  isStreaming = false,
  variant    = 'dark',
  headline,
  query,
}: ExecutiveResponseCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [exportState,      setExportState]      = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [copyState,        setCopyState]        = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const isDark = variant === 'dark'
  const { t } = useLanguage()

  const handleDownload = useCallback(async () => {
    if (!response || exportState === 'loading') return
    setExportState('loading')
    try {
      await downloadExport(buildExportPayload(response, headline, query))
      setExportState('done')
      setTimeout(() => setExportState('idle'), 2000)
    } catch {
      setExportState('error')
      setTimeout(() => setExportState('idle'), 2500)
    }
  }, [response, headline, query, exportState])

  const handleCopy = useCallback(async () => {
    if (!response || copyState === 'loading') return
    setCopyState('loading')
    try {
      await copyMarkdown(buildExportPayload(response, headline, query))
      setCopyState('done')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 2500)
    }
  }, [response, headline, query, copyState])

  // Token shortcuts
  const cardBg      = isDark ? '#0E0E18'  : '#FFFFFF'
  const cardBorder  = isDark ? 'rgba(226,226,232,0.08)' : 'rgba(0,0,0,0.09)'
  const insightColor = isDark ? '#F0F0F4' : '#C9A96E'
  const sectionLabel = isDark ? '#606078' : '#A1A1AA'
  const ruleColor   = isDark ? 'rgba(226,226,232,0.06)' : 'rgba(0,0,0,0.07)'

  return (
    <div style={{
      background:  cardBg,
      border:      `1px solid ${cardBorder}`,
      boxShadow:   isDark ? 'inset 0 1px 0 rgba(226,226,232,0.06)' : 'inset 0 1px 0 rgba(201,169,110,0.10)',
      overflow:    'hidden',
    }}>
      {/* Gold hairline */}
      <div style={{
        height:     1,
        background: isDark
          ? 'linear-gradient(90deg, transparent 0%, rgba(201,169,110,0.25) 30%, rgba(201,169,110,0.4) 50%, rgba(201,169,110,0.25) 70%, transparent 100%)'
          : 'linear-gradient(90deg, transparent 0%, rgba(201,169,110,0.35) 50%, transparent 100%)',
      }} />

      <AnimatePresence mode="wait">
        {isStreaming || !response ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <StreamingSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* ── Insight ── */}
            <div style={{ padding: '24px 24px 20px' }}>
              <p style={{
                fontFamily:   'Cormorant Garamond, Georgia, serif',
                fontSize:     '1.375rem',
                fontWeight:   600,
                color:        insightColor,
                lineHeight:   1.4,
                letterSpacing:'-0.015em',
                marginBottom: 0,
              }}>
                {response.insight}
              </p>
            </div>

            {/* ── Action Matrix ── */}
            {response.matrixOptions && response.matrixOptions.length > 0 && (
              <div style={{ padding: '0 24px 20px' }}>
                <div style={{ height: 1, background: ruleColor, marginBottom: 18 }} />

                <span style={{
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.6rem',
                  fontWeight:    600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color:         sectionLabel,
                  display:       'block',
                  marginBottom:  12,
                }}>
                  {t('aetheris.matrix.title')}
                </span>

                <div style={{
                  display:             'grid',
                  gridTemplateColumns: `repeat(${Math.min(response.matrixOptions.length, 3)}, 1fr)`,
                  gap:                 8,
                }}>
                  {response.matrixOptions.map((opt, i) => (
                    <ActionMatrixCard
                      key={opt.id}
                      option={opt}
                      index={i}
                      isSelected={selectedOptionId === opt.id}
                      onSelect={setSelectedOptionId}
                      variant={variant}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Execution Horizons ── */}
            {response.executionHorizons && (
              <HorizonSection
                horizons={response.executionHorizons}
                isDark={isDark}
              />
            )}

            {/* ── Export footer ── */}
            <div style={{
              padding:        '10px 24px 16px',
              display:        'flex',
              alignItems:     'center',
              gap:            8,
              borderTop:      `1px solid ${isDark ? 'rgba(226,226,232,0.05)' : 'rgba(0,0,0,0.06)'}`,
              justifyContent: 'flex-end',
            }}>
              {/* Download .md */}
              <button
                onClick={handleDownload}
                disabled={exportState === 'loading'}
                title={t('export.downloadTitle')}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           5,
                  padding:       '5px 11px',
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.68rem',
                  fontWeight:    500,
                  letterSpacing: '0.04em',
                  color:         exportState === 'done'  ? '#14B8A6'
                               : exportState === 'error' ? '#DC2626'
                               : isDark ? '#9898B0' : '#71717A',
                  background:    isDark ? 'rgba(226,226,232,0.04)' : 'rgba(0,0,0,0.03)',
                  border:        `1px solid ${isDark ? 'rgba(226,226,232,0.09)' : 'rgba(0,0,0,0.09)'}`,
                  cursor:        exportState === 'loading' ? 'wait' : 'pointer',
                  transition:    'color 0.2s, border-color 0.2s',
                  whiteSpace:    'nowrap',
                }}
              >
                <span style={{ fontSize: '0.8rem' }}>
                  {exportState === 'loading' ? '…'
                 : exportState === 'done'    ? '✓'
                 : exportState === 'error'   ? '✕'
                 : '↓'}
                </span>
                {exportState === 'done'  ? t('export.downloaded')
               : exportState === 'error' ? t('export.error')
               : t('export.download')}
              </button>

              {/* Copy for Notion */}
              <button
                onClick={handleCopy}
                disabled={copyState === 'loading'}
                title={t('export.copyTitle')}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  gap:           5,
                  padding:       '5px 11px',
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.68rem',
                  fontWeight:    500,
                  letterSpacing: '0.04em',
                  color:         copyState === 'done'  ? '#14B8A6'
                               : copyState === 'error' ? '#DC2626'
                               : isDark ? '#9898B0' : '#71717A',
                  background:    isDark ? 'rgba(226,226,232,0.04)' : 'rgba(0,0,0,0.03)',
                  border:        `1px solid ${isDark ? 'rgba(226,226,232,0.09)' : 'rgba(0,0,0,0.09)'}`,
                  cursor:        copyState === 'loading' ? 'wait' : 'pointer',
                  transition:    'color 0.2s, border-color 0.2s',
                  whiteSpace:    'nowrap',
                }}
              >
                <span style={{ fontSize: '0.75rem' }}>
                  {copyState === 'done' ? '✓' : copyState === 'error' ? '✕' : '⎘'}
                </span>
                {copyState === 'done'  ? t('export.copied')
               : copyState === 'error' ? t('export.error')
               : t('export.copy')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
