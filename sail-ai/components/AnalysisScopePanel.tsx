'use client'

/**
 * components/AnalysisScopePanel.tsx — Layer 5: Analysis Scope Panel
 * ──────────────────────────────────────────────────────────────────
 * Bloomberg Terminal-style collapsible panel that surfaces:
 *   - Injected defaults (what the router assumed when prompt was <80% clear)
 *   - Confidence score with visual indicator
 *   - Processing time, validation status, repair iterations
 *   - Live data indicator
 *   - Industry / revenue tier / time horizon / segment
 *
 * Design: dark glass, amber accents, monospace data typography.
 * Collapsed by default — one click to expand.
 */

import { useState }        from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ScopeMetadata } from '@/lib/pipeline/types'

interface AnalysisScopePanelProps {
  metadata:  ScopeMetadata
  className?: string
}

// ── Confidence color ──────────────────────────────────────────────────────────

function confidenceColor(score: number): string {
  if (score >= 0.8) return '#22c55e'  // green
  if (score >= 0.6) return '#f59e0b'  // amber
  return '#ef4444'                     // red
}

// ── Clarity bar ───────────────────────────────────────────────────────────────

function ClarityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  const color = score >= 0.8 ? '#22c55e' : score >= 0.6 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 80, height: 4, background: 'rgba(255,255,255,0.1)',
        borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: 11, color, fontFamily: 'monospace' }}>{pct}%</span>
    </div>
  )
}

// ── Row component ─────────────────────────────────────────────────────────────

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
      gap: 16,
    }}>
      <span style={{
        fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
        letterSpacing: '0.08em', whiteSpace: 'nowrap', flexShrink: 0,
        fontFamily: 'monospace',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 11, color: accent ? '#f59e0b' : 'rgba(255,255,255,0.85)',
        textAlign: 'right', fontFamily: 'monospace', wordBreak: 'break-word',
      }}>
        {value}
      </span>
    </div>
  )
}

// ── Injected defaults section ─────────────────────────────────────────────────

function InjectedDefaultsBlock({ defaults }: { defaults: Record<string, string> }) {
  const entries = Object.entries(defaults)
  if (entries.length === 0) return null
  return (
    <div style={{
      marginTop: 8, padding: '8px 10px',
      background: 'rgba(245,158,11,0.06)',
      border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: 6,
    }}>
      <div style={{
        fontSize: 9, color: '#f59e0b', textTransform: 'uppercase',
        letterSpacing: '0.1em', marginBottom: 6, fontFamily: 'monospace',
      }}>
        ⚡ Auto-inferred (prompt clarity &lt; 80%)
      </div>
      {entries.map(([key, val]) => (
        <Row key={key} label={key} value={val} accent />
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AnalysisScopePanel({ metadata, className = '' }: AnalysisScopePanelProps) {
  const [open, setOpen] = useState(false)

  const hasDefaults    = Object.keys(metadata.injectedDefaults).length > 0
  const confColor      = confidenceColor(metadata.confidenceScore)

  return (
    <div
      className={className}
      style={{
        border:       '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        background:   'rgba(10,10,20,0.7)',
        backdropFilter: 'blur(12px)',
        overflow:     'hidden',
        fontFamily:   'monospace',
      }}
    >
      {/* ── Header / toggle ── */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '10px 14px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Live indicator */}
          {metadata.liveDataUsed && (
            <span style={{
              fontSize: 9, background: 'rgba(34,197,94,0.15)',
              color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: 4, padding: '2px 6px', letterSpacing: '0.08em',
            }}>
              ● LIVE
            </span>
          )}
          {/* Injected badge */}
          {hasDefaults && (
            <span style={{
              fontSize: 9, background: 'rgba(245,158,11,0.15)',
              color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)',
              borderRadius: 4, padding: '2px 6px', letterSpacing: '0.08em',
            }}>
              ⚡ INFERRED
            </span>
          )}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.06em' }}>
            ANALYSIS SCOPE
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Confidence pill */}
          <span style={{
            fontSize: 10, color: confColor,
            border: `1px solid ${confColor}40`,
            borderRadius: 4, padding: '2px 7px',
          }}>
            {Math.round(metadata.confidenceScore * 100)}% conf
          </span>
          {/* Processing time */}
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            {metadata.processingMs}ms
          </span>
          {/* Chevron */}
          <span style={{
            fontSize: 10, color: 'rgba(255,255,255,0.3)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            display: 'inline-block',
          }}>
            ▾
          </span>
        </div>
      </button>

      {/* ── Expandable body ── */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px' }}>
              {/* Top hairline */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 10 }} />

              {/* Core metadata */}
              <Row label="Mode"         value={metadata.analysisMode.toUpperCase()} />
              <Row label="Domain"       value={metadata.domain} />
              <Row label="Industry"     value={metadata.inferredIndustry} />
              <Row label="Segment"      value={metadata.segment} />
              <Row label="Revenue Tier" value={metadata.revenueTier} />
              <Row label="Time Horizon" value={metadata.inferredTimeframe} />
              <Row label="Goal"         value={metadata.optimizationGoal} />

              {/* Clarity score */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '4px 0',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                <span style={{
                  fontSize: 10, color: 'rgba(255,255,255,0.4)',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  Clarity Score
                </span>
                <ClarityBar score={metadata.clarityScore} />
              </div>

              {/* Validation + repairs */}
              <Row
                label="Validation"
                value={metadata.validationPassed ? '✓ PASSED' : '✗ FAILED'}
              />
              {metadata.repairIterations > 0 && (
                <Row label="Repair Loops" value={`${metadata.repairIterations}×`} accent />
              )}

              {/* Live data */}
              <Row
                label="Live Search"
                value={metadata.liveDataUsed ? '● Active' : '○ Training data'}
              />

              {/* Injected defaults */}
              <InjectedDefaultsBlock defaults={metadata.injectedDefaults} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
