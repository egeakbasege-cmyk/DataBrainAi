'use client'

/**
 * AnsoffMatrix — Interactive 4-Quadrant Strategic Framework
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders Igor Ansoff's Product/Market Expansion Grid.
 * Highlights AI-determined quadrant placement with rationale and initiatives.
 *
 * Quadrants (clockwise from bottom-left):
 *   Market Penetration  (existing product × existing market)
 *   Market Development  (existing product × new market)
 *   Diversification     (new product × new market)
 *   Product Development (new product × existing market)
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type AnsoffQuadrant =
  | 'market-penetration'
  | 'market-development'
  | 'product-development'
  | 'diversification'

export interface AnsoffData {
  quadrant:    AnsoffQuadrant
  confidence:  number        // 0–1
  rationale:   string
  initiatives: string[]
  riskLevel?:  'low' | 'medium' | 'high' | 'very-high'
}

interface AnsoffMatrixProps {
  data?:     AnsoffData | null
  loading?:  boolean
  compact?:  boolean
}

// ── Quadrant metadata ──────────────────────────────────────────────────────────

const QUADRANTS: {
  id:        AnsoffQuadrant
  label:     string
  subLabel:  string
  risk:      string
  col:       number
  row:       number
  accent:    string
  accentDim: string
  bg:        string
}[] = [
  {
    id:        'market-penetration',
    label:     'Market Penetration',
    subLabel:  'Existing product · Existing market',
    risk:      'Lowest risk',
    col:       0,
    row:       1,
    accent:    '#14B8A6',
    accentDim: 'rgba(20,184,166,0.12)',
    bg:        'rgba(20,184,166,0.06)',
  },
  {
    id:        'market-development',
    label:     'Market Development',
    subLabel:  'Existing product · New market',
    risk:      'Medium risk',
    col:       1,
    row:       1,
    accent:    '#C9A96E',
    accentDim: 'rgba(201,169,110,0.12)',
    bg:        'rgba(201,169,110,0.06)',
  },
  {
    id:        'product-development',
    label:     'Product Development',
    subLabel:  'New product · Existing market',
    risk:      'Medium risk',
    col:       0,
    row:       0,
    accent:    '#6366F1',
    accentDim: 'rgba(99,102,241,0.12)',
    bg:        'rgba(99,102,241,0.06)',
  },
  {
    id:        'diversification',
    label:     'Diversification',
    subLabel:  'New product · New market',
    risk:      'Highest risk',
    col:       1,
    row:       0,
    accent:    '#F59E0B',
    accentDim: 'rgba(245,158,11,0.12)',
    bg:        'rgba(245,158,11,0.06)',
  },
]

// ── Skeleton ──────────────────────────────────────────────────────────────────

function AnsoffSkeleton({ compact }: { compact: boolean }) {
  return (
    <div style={{ padding: compact ? 0 : 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {[0, 1, 2, 3].map(i => (
          <motion.div
            key={i}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.1 }}
            style={{ height: compact ? 80 : 120, background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.07)' }}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AnsoffMatrix({ data, loading = false, compact = false }: AnsoffMatrixProps) {
  const [hovered, setHovered] = useState<AnsoffQuadrant | null>(null)

  const active = data?.quadrant ?? null
  const focus  = hovered ?? active

  return (
    <div style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      {/* Header */}
      {!compact && (
        <div style={{ marginBottom: 16 }}>
          <p style={{
            fontSize:      '0.6rem',
            fontWeight:    700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color:         '#A1A1AA',
            margin:        '0 0 4px',
          }}>
            Strategic Framework
          </p>
          <p style={{
            fontFamily:  'var(--font-cormorant), Georgia, serif',
            fontSize:    '1.1rem',
            fontWeight:  600,
            color:       '#0C0C0E',
            margin:      0,
            lineHeight:  1.3,
          }}>
            Ansoff Growth Matrix
          </p>
        </div>
      )}

      {loading ? (
        <AnsoffSkeleton compact={compact} />
      ) : (
        <>
          {/* Axis labels */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 6 }}>
            <div style={{ width: compact ? 80 : 100, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around' }}>
              {['Existing Market', 'New Market'].map(label => (
                <span key={label} style={{
                  fontSize: '0.6rem', fontWeight: 600, color: '#71717A',
                  letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Y-axis label */}
            <div style={{
              width:          compact ? 80 : 100,
              flexShrink:     0,
              display:        'flex',
              flexDirection:  'column',
              justifyContent: 'space-around',
              alignItems:     'flex-end',
              paddingRight:   8,
              gap:            8,
            }}>
              {['New Product', 'Existing Product'].map(label => (
                <span key={label} style={{
                  fontSize:      '0.6rem',
                  fontWeight:    600,
                  color:         '#71717A',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textAlign:     'right',
                  lineHeight:    1.3,
                }}>
                  {label}
                </span>
              ))}
            </div>

            {/* 2×2 Grid */}
            <div style={{
              flex:                1,
              display:             'grid',
              gridTemplateColumns: '1fr 1fr',
              gridTemplateRows:    '1fr 1fr',
              gap:                 8,
            }}>
              {QUADRANTS.map(q => {
                const isActive  = active === q.id
                const isFocused = focus  === q.id
                const opacity   = focus && !isFocused ? 0.45 : 1

                return (
                  <motion.div
                    key={q.id}
                    onMouseEnter={() => setHovered(q.id)}
                    onMouseLeave={() => setHovered(null)}
                    animate={{ opacity }}
                    transition={{ duration: 0.2 }}
                    style={{
                      gridColumn: q.col + 1,
                      gridRow:    q.row + 1,
                      padding:    compact ? '12px 14px' : '16px 18px',
                      background: isFocused ? q.bg : 'rgba(0,0,0,0.02)',
                      border:     `1px solid ${isFocused ? q.accent + '55' : 'rgba(0,0,0,0.08)'}`,
                      borderLeft: isActive ? `3px solid ${q.accent}` : undefined,
                      position:   'relative',
                      cursor:     'default',
                      transition: 'background 0.2s, border-color 0.2s',
                    }}
                  >
                    {/* Active badge */}
                    {isActive && (
                      <div style={{
                        position:  'absolute',
                        top:       8,
                        right:     8,
                        background: q.accent,
                        color:     '#FFF',
                        fontSize:  '0.55rem',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        padding:   '2px 6px',
                        textTransform: 'uppercase',
                      }}>
                        ← Current
                      </div>
                    )}

                    <p style={{
                      fontWeight:    600,
                      fontSize:      compact ? '0.72rem' : '0.8rem',
                      color:         isFocused ? q.accent : '#3A3A3C',
                      margin:        '0 0 4px',
                      lineHeight:    1.3,
                      transition:    'color 0.2s',
                      paddingRight:  isActive ? 60 : 0,
                    }}>
                      {q.label}
                    </p>

                    {!compact && (
                      <p style={{
                        fontSize:  '0.65rem',
                        color:     '#A1A1AA',
                        margin:    '0 0 6px',
                        lineHeight: 1.4,
                      }}>
                        {q.subLabel}
                      </p>
                    )}

                    <span style={{
                      fontSize:      '0.58rem',
                      fontWeight:    600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color:         q.accent,
                      opacity:       0.8,
                    }}>
                      {q.risk}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {data && (
              <motion.div
                key="detail"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.25 }}
                style={{ marginTop: 16 }}
              >
                {(() => {
                  const qMeta = QUADRANTS.find(q => q.id === data.quadrant)!
                  return (
                    <div style={{
                      padding:    '14px 18px',
                      background: qMeta.bg,
                      border:     `1px solid ${qMeta.accent}33`,
                      borderLeft: `3px solid ${qMeta.accent}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <p style={{
                          fontSize:      '0.6rem',
                          fontWeight:    700,
                          letterSpacing: '0.12em',
                          textTransform: 'uppercase',
                          color:         qMeta.accent,
                          margin:        0,
                        }}>
                          AI Placement Rationale
                        </p>
                        <span style={{
                          fontSize:   '0.6rem',
                          color:      '#A1A1AA',
                          fontWeight: 500,
                        }}>
                          {Math.round(data.confidence * 100)}% confidence
                        </span>
                      </div>

                      <p style={{
                        fontSize:   '0.8rem',
                        color:      '#3A3A3C',
                        lineHeight: 1.6,
                        margin:     '0 0 12px',
                      }}>
                        {data.rationale}
                      </p>

                      {data.initiatives.length > 0 && (
                        <>
                          <p style={{
                            fontSize:      '0.6rem',
                            fontWeight:    700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color:         '#71717A',
                            margin:        '0 0 8px',
                          }}>
                            Recommended Initiatives
                          </p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {data.initiatives.map((init, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <span style={{ color: qMeta.accent, fontSize: '0.75rem', flexShrink: 0, marginTop: 1 }}>→</span>
                                <p style={{ fontSize: '0.78rem', color: '#3A3A3C', lineHeight: 1.5, margin: 0 }}>
                                  {init}
                                </p>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
