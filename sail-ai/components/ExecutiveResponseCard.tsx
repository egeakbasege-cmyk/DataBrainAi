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

import { useState }          from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ActionMatrixCard }  from './ActionMatrixCard'
import type { ExecutiveResponse } from '@/types/architecture'

interface ExecutiveResponseCardProps {
  response:    ExecutiveResponse | null
  isStreaming?: boolean
  variant?:    'dark' | 'light'
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
const HORIZON_LABELS = [
  { key: 'thirtyDays' as const, label: '30-Day Sprint',  accentLight: '#A8873E', accentDark: '#C9A96E' },
  { key: 'sixtyDays'  as const, label: '60-Day Build',   accentLight: '#71717A', accentDark: '#9898B0' },
  { key: 'ninetyDays' as const, label: '90-Day Horizon', accentLight: '#3A3A3C', accentDark: '#B0B0BC' },
]

interface HorizonSectionProps {
  horizons: NonNullable<ExecutiveResponse['executionHorizons']>
  isDark:   boolean
}

function HorizonSection({ horizons, isDark }: HorizonSectionProps) {
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

export function ExecutiveResponseCard({
  response,
  isStreaming = false,
  variant    = 'dark',
}: ExecutiveResponseCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const isDark = variant === 'dark'

  // Token shortcuts
  const cardBg      = isDark ? '#0E0E18'  : '#FFFFFF'
  const cardBorder  = isDark ? 'rgba(226,226,232,0.08)' : 'rgba(0,0,0,0.09)'
  const insightColor = isDark ? '#F0F0F4' : '#0C0C0E'
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
                  Action Matrix
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
