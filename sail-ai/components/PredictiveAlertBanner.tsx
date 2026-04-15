'use client'

/**
 * PredictiveAlertBanner
 *
 * Surfaces a PredictiveAlert — the system's pre-emptive warning that a
 * metric will deviate BEFORE it happens, with an autonomous micro-pivot
 * already computed and ready to act on.
 *
 * States:
 *   collapsed  — compact strip: pulsing dot · metric name · deviation · resolve ×
 *   expanded   — full card: shadow context + ActionMatrixCard for the micro-pivot
 *
 * Design rules:
 *   - Default: compact. User expands intentionally.
 *   - Drift colour (#F87171) used sparingly: dot + deviation value only.
 *   - No modal, no overlay. Inline expansion with AnimatePresence.
 *   - Resolved alerts animate out and are unmounted.
 */

import { useState }             from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ActionMatrixCard }     from './ActionMatrixCard'
import { useAetherisStore }     from '@/lib/aetherisStore'
import type { PredictiveAlert } from '@/types/architecture'
import { useLanguage }          from '@/lib/i18n/LanguageContext'

interface PredictiveAlertBannerProps {
  alert:    PredictiveAlert
  variant?: 'dark' | 'light'
}

export function PredictiveAlertBanner({
  alert,
  variant = 'dark',
}: PredictiveAlertBannerProps) {
  const [expanded, setExpanded] = useState(false)
  const resolveAlert = useAetherisStore((s) => s.resolveAlert)
  const { t }        = useLanguage()

  const isDark      = variant === 'dark'
  const deviationPct = Math.round(Math.abs(alert.forecastedDeviation))

  // Token shortcuts
  const bg     = isDark ? '#141420' : '#FFFFFF'
  const border = alert.isResolved
    ? (isDark ? 'rgba(226,226,232,0.06)' : 'rgba(0,0,0,0.06)')
    : (isDark ? 'rgba(248,113,113,0.20)' : 'rgba(248,113,113,0.22)')
  const textDim  = isDark ? '#9898B0' : '#71717A'
  const textGhost = isDark ? '#606078' : '#A1A1AA'

  function handleResolve(e: React.MouseEvent) {
    e.stopPropagation()
    resolveAlert(alert.metric)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: alert.isResolved ? 0.4 : 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{
        background:   bg,
        border:       `1px solid ${border}`,
        overflow:     'hidden',
        transition:   'border-color 0.3s',
      }}
    >
      {/* ── Collapsed header ── */}
      <div
        onClick={() => !alert.isResolved && setExpanded(e => !e)}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        10,
          padding:    '9px 14px',
          cursor:     alert.isResolved ? 'default' : 'pointer',
        }}
      >
        {/* Pulsing dot */}
        {!alert.isResolved ? (
          <motion.div
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 5, height: 5,
              borderRadius: '50%',
              background: '#F87171',
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: isDark ? '#606078' : '#D1D5DB', flexShrink: 0 }} />
        )}

        {/* Label */}
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.625rem',
          fontWeight:    600,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color:         alert.isResolved ? textGhost : '#F87171',
          flexShrink:    0,
        }}>
          {alert.isResolved ? t('aetheris.drift.resolved') : t('aetheris.drift.alert')}
        </span>

        {/* Rule */}
        <div style={{ width: 1, height: 10, background: isDark ? 'rgba(226,226,232,0.08)' : 'rgba(0,0,0,0.09)', flexShrink: 0 }} />

        {/* Metric name */}
        <span style={{
          fontFamily: 'Inter, sans-serif',
          fontSize:   '0.75rem',
          fontWeight: 500,
          color:      textDim,
          flex:       1,
          overflow:   'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {alert.metric}
        </span>

        {/* Deviation value */}
        {!alert.isResolved && (
          <span style={{
            fontFamily:    'Cormorant Garamond, Georgia, serif',
            fontSize:      '1rem',
            fontWeight:    600,
            color:         '#F87171',
            letterSpacing: '-0.02em',
            lineHeight:    1,
            flexShrink:    0,
          }}>
            {deviationPct > 0 ? `+${deviationPct}` : deviationPct}%
          </span>
        )}

        {/* Expand chevron */}
        {!alert.isResolved && (
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.625rem',
              color:      textGhost,
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            ▾
          </motion.span>
        )}

        {/* Resolve × button */}
        {!alert.isResolved && (
          <button
            onClick={handleResolve}
            style={{
              background:    'none',
              border:        'none',
              cursor:        'pointer',
              padding:       '0 2px',
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.75rem',
              color:         textGhost,
              lineHeight:    1,
              flexShrink:    0,
              transition:    'color 0.15s',
            }}
            title="Mark as resolved"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Expanded detail panel ── */}
      <AnimatePresence>
        {expanded && !alert.isResolved && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{    height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 16px' }}>
              {/* Hairline */}
              <div style={{ height: 1, background: isDark ? 'rgba(226,226,232,0.06)' : 'rgba(0,0,0,0.07)', marginBottom: 14 }} />

              {/* Shadow context */}
              {alert.shadowContext && (
                <p style={{
                  fontFamily:   'Inter, sans-serif',
                  fontSize:     '0.75rem',
                  color:        textGhost,
                  lineHeight:   1.55,
                  marginBottom: 14,
                  fontStyle:    'italic',
                }}>
                  {alert.shadowContext}
                </p>
              )}

              {/* Micro-pivot label */}
              <div style={{
                display:       'flex',
                alignItems:    'center',
                gap:           6,
                marginBottom:  10,
              }}>
                <div style={{ height: 1, flex: 1, background: isDark ? 'rgba(201,169,110,0.12)' : 'rgba(201,169,110,0.2)' }} />
                <span style={{
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.575rem',
                  fontWeight:    600,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  color:         '#C9A96E',
                }}>
                  {t('aetheris.drift.microPivot')}
                </span>
                <div style={{ height: 1, flex: 1, background: isDark ? 'rgba(201,169,110,0.12)' : 'rgba(201,169,110,0.2)' }} />
              </div>

              {/* The pre-solved ActionMatrixOption */}
              <ActionMatrixCard
                option={alert.autonomousMicroPivot}
                index={0}
                variant={variant}
                onSelect={() => resolveAlert(alert.metric)}
              />

              {/* Resolve CTA */}
              <button
                onClick={handleResolve}
                style={{
                  marginTop:     12,
                  display:       'inline-flex',
                  alignItems:    'center',
                  gap:           6,
                  padding:       '6px 14px',
                  background:    'none',
                  border:        `1px solid ${isDark ? 'rgba(74,222,128,0.2)' : 'rgba(21,128,61,0.2)'}`,
                  cursor:        'pointer',
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.625rem',
                  fontWeight:    600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color:         isDark ? '#4ADE80' : '#15803D',
                  transition:    'border-color 0.15s',
                }}
              >
                <span style={{ fontSize: '0.5rem' }}>✓</span>
                {t('aetheris.drift.markResolved')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Alert list — renders all active alerts with AnimatePresence ───────────────

interface AlertListProps {
  alerts:   PredictiveAlert[]
  variant?: 'dark' | 'light'
}

export function PredictiveAlertList({ alerts, variant = 'dark' }: AlertListProps) {
  if (!alerts.length) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <AnimatePresence mode="popLayout">
        {alerts.map(alert => (
          <PredictiveAlertBanner
            key={alert.metric}
            alert={alert}
            variant={variant}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}
