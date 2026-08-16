'use client'

/**
 * BcgMatrix — Interactive BCG Growth-Share Matrix
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the Boston Consulting Group's four-quadrant portfolio framework.
 *
 * Quadrants:
 *   Stars         (high growth, high share)
 *   Question Marks (high growth, low share)
 *   Cash Cows     (low growth, high share)
 *   Dogs          (low growth, low share)
 *
 * The bubble plot positions the business unit on a 2-axis scatter.
 * Falls back gracefully when data is null/loading.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type BcgQuadrant = 'star' | 'question-mark' | 'cash-cow' | 'dog'

export interface BcgData {
  quadrant:    BcgQuadrant
  /** Relative market share (0–100, 50 = parity with largest competitor) */
  marketShare: number
  /** Market growth rate (%) — can be negative */
  growthRate:  number
  confidence:  number
  rationale:   string
  actions:     string[]
}

interface BcgMatrixProps {
  data?:    BcgData | null
  loading?: boolean
  compact?: boolean
}

// ── Quadrant config ────────────────────────────────────────────────────────────

const BCG_QUADRANTS: {
  id:        BcgQuadrant
  emoji:     string
  label:     string
  strategy:  string
  col:       number   // 0=right (high share), 1=left (low share)
  row:       number   // 0=top (high growth), 1=bottom (low growth)
  accent:    string
  bg:        string
}[] = [
  {
    id:       'star',
    emoji:    '⭐',
    label:    'Star',
    strategy: 'Invest & grow',
    col:      0,
    row:      0,
    accent:   '#C9A96E',
    bg:       'rgba(201,169,110,0.07)',
  },
  {
    id:       'question-mark',
    emoji:    '❓',
    label:    'Question Mark',
    strategy: 'Invest or divest',
    col:      1,
    row:      0,
    accent:   '#6366F1',
    bg:       'rgba(99,102,241,0.07)',
  },
  {
    id:       'cash-cow',
    emoji:    '🐄',
    label:    'Cash Cow',
    strategy: 'Harvest & maintain',
    col:      0,
    row:      1,
    accent:   '#14B8A6',
    bg:       'rgba(20,184,166,0.07)',
  },
  {
    id:       'dog',
    emoji:    '🐕',
    label:    'Dog',
    strategy: 'Divest or reposition',
    col:      1,
    row:      1,
    accent:   '#71717A',
    bg:       'rgba(113,113,122,0.07)',
  },
]

// ── Bubble chart (SVG) ─────────────────────────────────────────────────────────

function BubbleChart({ data, compact }: { data: BcgData | null; compact: boolean }) {
  const size = compact ? 160 : 220
  const pad  = 24

  // Market share → x (high share = left, mirrors BCG convention)
  // Growth rate   → y (high growth = top)
  const shareX = data
    ? pad + ((100 - data.marketShare) / 100) * (size - 2 * pad)
    : -999
  const growthY = data
    ? pad + ((100 - Math.max(0, Math.min(100, data.growthRate + 20))) / 140) * (size - 2 * pad)
    : -999

  const qMeta = data ? BCG_QUADRANTS.find(q => q.id === data.quadrant)! : null

  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      {/* Background quadrants */}
      {BCG_QUADRANTS.map(q => {
        const x = q.col === 0 ? pad : size / 2
        const y = q.row === 0 ? pad : size / 2
        const w = size / 2 - (q.col === 0 ? pad : 0)
        const h = size / 2 - (q.row === 0 ? pad : 0)
        return (
          <rect key={q.id} x={x} y={y} width={w} height={h}
            fill={q.bg} stroke={q.accent + '22'} strokeWidth={1} />
        )
      })}

      {/* Axis lines */}
      <line x1={size / 2} y1={pad} x2={size / 2} y2={size - pad}
        stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      <line x1={pad} y1={size / 2} x2={size - pad} y2={size / 2}
        stroke="rgba(0,0,0,0.12)" strokeWidth={1} />

      {/* Axis arrows */}
      <polygon points={`${pad},${pad + 4} ${pad - 4},${pad + 12} ${pad + 4},${pad + 12}`}
        fill="rgba(0,0,0,0.2)" />
      <polygon points={`${size - pad},${size / 2} ${size - pad - 8},${size / 2 - 4} ${size - pad - 8},${size / 2 + 4}`}
        fill="rgba(0,0,0,0.2)" />

      {/* Quadrant mini-labels */}
      {BCG_QUADRANTS.map(q => {
        const lx = q.col === 0 ? pad + 6 : size / 2 + 6
        const ly = q.row === 0 ? pad + 14 : size / 2 + 14
        return (
          <text key={q.id} x={lx} y={ly}
            fontSize={compact ? 8 : 9} fill={q.accent} fontFamily="Inter, sans-serif" fontWeight={600}>
            {q.emoji} {q.label}
          </text>
        )
      })}

      {/* Bubble */}
      {data && qMeta && (
        <>
          <motion.circle
            cx={shareX} cy={growthY} r={compact ? 10 : 14}
            fill={qMeta.accent + 'CC'}
            stroke={qMeta.accent} strokeWidth={2}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
          <motion.circle
            cx={shareX} cy={growthY} r={compact ? 4 : 5}
            fill="#FFFFFF"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
          />
        </>
      )}
    </svg>
  )
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function BcgSkeleton({ compact }: { compact: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        style={{ width: compact ? 160 : 220, height: compact ? 160 : 220, background: 'rgba(0,0,0,0.05)' }}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8 }}>
        {[80, 60, 90, 70].map((w, i) => (
          <motion.div key={i}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.1 }}
            style={{ height: 10, width: `${w}%`, background: 'rgba(0,0,0,0.05)' }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function BcgMatrix({ data, loading = false, compact = false }: BcgMatrixProps) {
  const [tab, setTab] = useState<'chart' | 'grid'>('chart')
  const qMeta = data ? BCG_QUADRANTS.find(q => q.id === data.quadrant) : null

  return (
    <div style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* Header */}
      {!compact && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A1A1AA', margin: '0 0 4px' }}>
              Strategic Framework
            </p>
            <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '1.1rem', fontWeight: 600, color: '#0C0C0E', margin: 0, lineHeight: 1.3 }}>
              BCG Growth-Share Matrix
            </p>
          </div>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 4 }}>
            {(['chart', 'grid'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding:    '4px 10px',
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize:   '0.65rem',
                fontWeight: 600,
                color:      tab === t ? '#0C0C0E' : '#A1A1AA',
                background: tab === t ? 'rgba(0,0,0,0.06)' : 'none',
                border:     '1px solid rgba(0,0,0,0.09)',
                cursor:     'pointer',
              }}>
                {t === 'chart' ? '◉ Chart' : '⊞ Grid'}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <BcgSkeleton compact={compact} />
      ) : tab === 'chart' ? (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          {/* Bubble chart */}
          <div style={{ position: 'relative' }}>
            {/* Y-axis label */}
            <div style={{
              position:  'absolute',
              left:      -32,
              top:       '50%',
              transform: 'translateY(-50%) rotate(-90deg)',
              fontSize:  '0.55rem',
              fontWeight: 600,
              color:     '#A1A1AA',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              Market Growth Rate
            </div>
            <BubbleChart data={data ?? null} compact={compact} />
            {/* X-axis label */}
            <p style={{ fontSize: '0.55rem', fontWeight: 600, color: '#A1A1AA', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', margin: '4px 0 0' }}>
              ← Relative Market Share →
            </p>
          </div>

          {/* Detail */}
          {data && qMeta && (
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              style={{ flex: 1, minWidth: 0 }}
            >
              <div style={{
                padding:    '12px 16px',
                background: qMeta.bg,
                border:     `1px solid ${qMeta.accent}33`,
                borderLeft: `3px solid ${qMeta.accent}`,
                marginBottom: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: compact ? '1.1rem' : '1.4rem' }}>{qMeta.emoji}</span>
                  <div>
                    <p style={{ fontSize: '0.78rem', fontWeight: 700, color: qMeta.accent, margin: 0 }}>{qMeta.label}</p>
                    <p style={{ fontSize: '0.62rem', color: '#A1A1AA', margin: '2px 0 0' }}>{qMeta.strategy}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA', margin: '0 0 2px' }}>Market Share</p>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0C0C0E', margin: 0 }}>{data.marketShare}%</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA', margin: '0 0 2px' }}>Growth Rate</p>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: data.growthRate >= 0 ? '#14B8A6' : '#DC2626', margin: 0 }}>
                      {data.growthRate >= 0 ? '+' : ''}{data.growthRate}%
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA', margin: '0 0 2px' }}>Confidence</p>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0C0C0E', margin: 0 }}>{Math.round(data.confidence * 100)}%</p>
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#3A3A3C', lineHeight: 1.6, margin: 0 }}>{data.rationale}</p>
              </div>

              {data.actions.length > 0 && (
                <div>
                  <p style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#71717A', margin: '0 0 8px' }}>
                    Recommended Actions
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {data.actions.map((a, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ color: qMeta.accent, fontSize: '0.75rem', flexShrink: 0, marginTop: 2 }}>→</span>
                        <p style={{ fontSize: '0.75rem', color: '#3A3A3C', lineHeight: 1.5, margin: 0 }}>{a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      ) : (
        /* Grid view */
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {BCG_QUADRANTS.map(q => {
              const isActive = data?.quadrant === q.id
              return (
                <motion.div
                  key={q.id}
                  animate={{ opacity: data && !isActive ? 0.5 : 1 }}
                  style={{
                    padding:    '14px 16px',
                    background: isActive ? q.bg : 'rgba(0,0,0,0.02)',
                    border:     `1px solid ${isActive ? q.accent + '44' : 'rgba(0,0,0,0.07)'}`,
                    borderLeft: isActive ? `3px solid ${q.accent}` : undefined,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '1.1rem' }}>{q.emoji}</span>
                    <div>
                      <p style={{ fontSize: '0.78rem', fontWeight: 700, color: isActive ? q.accent : '#3A3A3C', margin: 0 }}>{q.label}</p>
                      <p style={{ fontSize: '0.62rem', color: '#A1A1AA', margin: '1px 0 0' }}>{q.strategy}</p>
                    </div>
                    {isActive && (
                      <span style={{
                        marginLeft:    'auto',
                        fontSize:      '0.55rem',
                        fontWeight:    700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color:         '#FFF',
                        background:    q.accent,
                        padding:       '2px 6px',
                      }}>
                        You
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
          <AnimatePresence>
            {data && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ fontSize: '0.75rem', color: '#3A3A3C', lineHeight: 1.6, margin: '12px 0 0' }}
              >
                {data.rationale}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
