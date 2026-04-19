'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

export interface TrimPhase {
  phase:       string
  timeframe:   string
  metric:      string
  deltaTarget?: string
  actions:     string[]
}

export interface TrimDiagnostic {
  primaryMetric:    string
  calculatedTrend:  string
  rootCause:        string
}

export interface TrimSuccessIndicator {
  target:     string
  projection: string
}

export interface TrimResponse {
  trimTitle:        string
  summary:          string
  diagnostic?:      TrimDiagnostic
  phases:           TrimPhase[]
  successIndicator?: TrimSuccessIndicator
}

interface Props {
  response:  TrimResponse | null
  isLoading: boolean
}

const PHASE_COLORS = [
  { dot: '#1A5276', bar: 'rgba(26,82,118,0.12)',  border: 'rgba(26,82,118,0.25)'  },
  { dot: '#00695C', bar: 'rgba(0,105,92,0.10)',   border: 'rgba(0,105,92,0.22)'   },
  { dot: '#92400E', bar: 'rgba(146,64,14,0.09)',  border: 'rgba(146,64,14,0.22)'  },
  { dot: '#5B21B6', bar: 'rgba(91,33,182,0.08)',  border: 'rgba(91,33,182,0.20)'  },
]

export function TrimTimelineCard({ response, isLoading }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (isLoading) {
    return (
      <div style={{ padding: '1.5rem', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#C9A96E', flexShrink: 0 }}
          />
          <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#71717A' }}>
            TRIM is charting your course…
          </span>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', gap: '0.875rem', marginBottom: '1rem', opacity: 1 - i * 0.2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(12,12,14,0.1)', marginTop: 4, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 12, background: 'rgba(12,12,14,0.07)', borderRadius: 2, marginBottom: 6, width: `${60 + i * 10}%` }} />
              <div style={{ height: 8, background: 'rgba(12,12,14,0.05)', borderRadius: 2, width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!response) return null

  const phases = response.phases ?? []

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: response.diagnostic ? '1rem' : '1.25rem' }}>
        <p style={{
          fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#C9A96E', marginBottom: '0.375rem',
        }}>
          TRIM · Strategic Timeline
        </p>
        <h3 style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontStyle: 'italic', fontWeight: 600,
          fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
          color: '#0C0C0E', lineHeight: 1.2, margin: 0,
        }}>
          {response.trimTitle}
        </h3>
        {response.summary && (
          <p style={{ fontSize: '0.8rem', color: '#71717A', marginTop: '0.4rem', lineHeight: 1.55 }}>
            {response.summary}
          </p>
        )}
      </div>

      {/* Diagnostic block */}
      {response.diagnostic && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            marginBottom: '1.25rem',
            padding: '0.875rem 1rem',
            background: 'rgba(12,12,14,0.03)',
            border: '1px solid rgba(12,12,14,0.1)',
            borderRadius: 8,
          }}
        >
          <p style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#71717A', margin: '0 0 0.625rem' }}>
            DIAGNOSTIC · Root Cause
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A1A1AA', flexShrink: 0, minWidth: '6rem' }}>Primary</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0C0C0E' }}>{response.diagnostic.primaryMetric}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A1A1AA', flexShrink: 0, minWidth: '6rem' }}>Δ Trend</span>
              <span style={{ fontSize: '0.75rem', color: '#C9A96E', fontWeight: 500 }}>{response.diagnostic.calculatedTrend}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A1A1AA', flexShrink: 0, minWidth: '6rem' }}>Root Cause</span>
              <span style={{ fontSize: '0.75rem', color: '#71717A', fontStyle: 'italic' }}>{response.diagnostic.rootCause}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Vertical timeline */}
      <div style={{ position: 'relative' }}>
        {/* Connecting line */}
        <div style={{
          position: 'absolute', left: 3, top: 8, bottom: 8,
          width: 2, background: 'rgba(12,12,14,0.08)',
        }} />

        {phases.map((ph, i) => {
          const color = PHASE_COLORS[i % PHASE_COLORS.length]
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              style={{ display: 'flex', gap: '0.875rem', marginBottom: i < phases.length - 1 ? '0.875rem' : 0, position: 'relative' }}
            >
              {/* Dot */}
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: color.dot, flexShrink: 0, marginTop: 4,
                position: 'relative', zIndex: 1,
              }} />

              {/* Content */}
              <div style={{
                flex: 1, padding: '0.75rem 0.875rem',
                background: color.bar, border: `1px solid ${color.border}`,
                borderRadius: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0C0C0E' }}>
                    {ph.phase}
                  </span>
                  <span style={{
                    fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: '#71717A', background: 'rgba(12,12,14,0.06)',
                    padding: '2px 6px', borderRadius: 3, whiteSpace: 'nowrap',
                  }}>
                    {ph.timeframe}
                  </span>
                </div>

                {/* Metric */}
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.375rem',
                  marginBottom: (ph.deltaTarget || ph.actions?.length) ? '0.4rem' : 0,
                }}>
                  <span style={{ color: color.dot, fontSize: '0.7rem', marginTop: 1, flexShrink: 0 }}>◆</span>
                  <p style={{ fontSize: '0.75rem', color: '#0C0C0E', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
                    {ph.metric}
                  </p>
                </div>

                {/* Delta target */}
                {ph.deltaTarget && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    marginBottom: ph.actions?.length ? '0.4rem' : 0,
                    padding: '2px 8px', borderRadius: 3,
                    background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)',
                  }}>
                    <span style={{ fontSize: '0.6rem', color: '#C9A96E' }}>↗</span>
                    <span style={{ fontSize: '0.68rem', color: '#92400E', fontWeight: 500 }}>{ph.deltaTarget}</span>
                  </div>
                )}

                {/* Actions */}
                {ph.actions?.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: '0.875rem', listStyle: 'none' }}>
                    {ph.actions.map((a, j) => (
                      <li key={j} style={{
                        fontSize: '0.72rem', color: '#71717A',
                        lineHeight: 1.55, marginBottom: j < ph.actions.length - 1 ? '0.2rem' : 0,
                        paddingLeft: '0.25rem',
                      }}>
                        <span style={{ color: color.dot, marginRight: '0.3rem' }}>→</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Success Indicator */}
      {response.successIndicator && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: phases.length * 0.08 + 0.1 }}
          style={{
            marginTop: '1rem',
            padding: '0.875rem 1rem',
            background: 'rgba(26,82,118,0.06)',
            border: '1px solid rgba(26,82,118,0.2)',
            borderRadius: 8,
          }}
        >
          <p style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1A5276', margin: '0 0 0.5rem' }}>
            SUCCESS INDICATOR
          </p>
          <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.375rem', lineHeight: 1.45 }}>
            {response.successIndicator.target}
          </p>
          <p style={{ fontSize: '0.72rem', color: '#71717A', margin: 0, lineHeight: 1.55, fontStyle: 'italic' }}>
            {response.successIndicator.projection}
          </p>
        </motion.div>
      )}

      {/* Expand full visualization button */}
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.4rem 0.875rem',
            background: 'transparent',
            border: '1px solid rgba(201,169,110,0.4)',
            borderRadius: 5, cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.68rem', fontWeight: 600,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: '#C9A96E', transition: 'all 0.15s',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
            <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
          </svg>
          Expand Full Visualization →
        </button>
      </div>

      {/* Full visualization sheet/modal */}
      {expanded && (
        <>
          <div
            onClick={() => setExpanded(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60 }}
          />
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 'min(520px, 96vw)',
            background: '#FAFAF8',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.14)',
            zIndex: 61,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A96E', margin: '0 0 2px' }}>TRIM · Strategic Timeline</p>
                <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontWeight: 600, fontSize: '1.15rem', color: '#0C0C0E', margin: 0 }}>
                  {response.trimTitle}
                </h2>
              </div>
              <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#71717A', fontSize: '1.25rem', lineHeight: 1, padding: 0 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {response.summary && (
                <p style={{ fontSize: '0.82rem', color: '#71717A', marginBottom: '1.25rem', lineHeight: 1.6, borderLeft: '2px solid #C9A96E', paddingLeft: '0.75rem' }}>
                  {response.summary}
                </p>
              )}

              {/* Diagnostic in modal */}
              {response.diagnostic && (
                <div style={{ marginBottom: '1.25rem', padding: '0.875rem 1rem', background: 'rgba(12,12,14,0.03)', border: '1px solid rgba(12,12,14,0.1)', borderRadius: 8 }}>
                  <p style={{ fontSize: '0.57rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#71717A', margin: '0 0 0.5rem' }}>DIAGNOSTIC · Root Cause</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A1A1AA', minWidth: '5.5rem' }}>Primary</span>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#0C0C0E' }}>{response.diagnostic.primaryMetric}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A1A1AA', minWidth: '5.5rem' }}>Δ Trend</span>
                      <span style={{ fontSize: '0.75rem', color: '#C9A96E', fontWeight: 500 }}>{response.diagnostic.calculatedTrend}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A1A1AA', minWidth: '5.5rem' }}>Root Cause</span>
                      <span style={{ fontSize: '0.75rem', color: '#71717A', fontStyle: 'italic' }}>{response.diagnostic.rootCause}</span>
                    </div>
                  </div>
                </div>
              )}

              {phases.map((ph, i) => {
                const color = PHASE_COLORS[i % PHASE_COLORS.length]
                return (
                  <div key={i} style={{ marginBottom: '1.25rem', padding: '1rem 1.125rem', background: color.bar, border: `1px solid ${color.border}`, borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color.dot, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0C0C0E' }}>{ph.phase}</span>
                      </div>
                      <span style={{ fontSize: '0.65rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#71717A', background: 'rgba(12,12,14,0.07)', padding: '3px 8px', borderRadius: 4 }}>{ph.timeframe}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', marginBottom: ph.deltaTarget ? '0.4rem' : '0.625rem' }}>
                      <span style={{ color: color.dot, flexShrink: 0, marginTop: 1 }}>◆</span>
                      <p style={{ fontSize: '0.78rem', color: '#0C0C0E', margin: 0, lineHeight: 1.55, fontWeight: 500 }}>{ph.metric}</p>
                    </div>
                    {ph.deltaTarget && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.625rem', padding: '2px 8px', borderRadius: 3, background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.3)' }}>
                        <span style={{ fontSize: '0.6rem', color: '#C9A96E' }}>↗</span>
                        <span style={{ fontSize: '0.7rem', color: '#92400E', fontWeight: 500 }}>{ph.deltaTarget}</span>
                      </div>
                    )}
                    {ph.actions?.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none' }}>
                        {ph.actions.map((a, j) => (
                          <li key={j} style={{ display: 'flex', gap: '0.375rem', fontSize: '0.75rem', color: '#71717A', lineHeight: 1.55, marginBottom: j < ph.actions.length - 1 ? '0.3rem' : 0 }}>
                            <span style={{ color: color.dot, flexShrink: 0 }}>→</span>{a}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              })}

              {/* Success Indicator in modal */}
              {response.successIndicator && (
                <div style={{ padding: '1rem 1.125rem', background: 'rgba(26,82,118,0.06)', border: '1px solid rgba(26,82,118,0.2)', borderRadius: 8 }}>
                  <p style={{ fontSize: '0.57rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1A5276', margin: '0 0 0.5rem' }}>SUCCESS INDICATOR</p>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.4rem', lineHeight: 1.45 }}>{response.successIndicator.target}</p>
                  <p style={{ fontSize: '0.75rem', color: '#71717A', margin: 0, lineHeight: 1.55, fontStyle: 'italic' }}>{response.successIndicator.projection}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
