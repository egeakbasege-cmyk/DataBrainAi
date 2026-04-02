'use client'

import { useState } from 'react'
import { ConfidenceBadge } from './ConfidenceBadge'
import { MetricsPanel } from './MetricsPanel'

interface Action {
  title:         string
  what:          string
  metric_impact: string
}

interface Strategy {
  headline:  string
  signal:    string
  actions:   Action[]
  thisWeek:  string
  risk:      string
  upside:    string
}

interface Props {
  result:        Strategy
  metrics:       Record<string, any>
  confidence:    number
  pipelineSteps: any[]
}

const STEP_COLORS = ['#1ed48a', '#18b8e0', '#e8bb28'] as const

export function StrategyResultView({ result, metrics, confidence, pipelineSteps }: Props) {
  const [auditOpen, setAuditOpen] = useState(false)

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Headline ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-card"
        style={{
          background: 'linear-gradient(145deg, #0d1020 0%, #07080e 100%)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}>

        {/* Subtle gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, #1ed48a40, transparent)' }} />

        <div className="p-7 md:p-9">
          {/* Meta row */}
          <div className="flex items-center justify-between mb-5">
            <span className="font-mono text-2xs text-muted uppercase tracking-widest-2">
              Strategy output
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-2xs font-semibold px-3 py-1 rounded-pill"
                style={{ background: 'rgba(232,187,40,0.08)', color: '#e8bb28', border: '1px solid rgba(232,187,40,0.2)' }}>
                {result.upside || metrics.upside_label}
              </span>
              <ConfidenceBadge score={confidence} />
            </div>
          </div>

          {/* Headline */}
          <h2 className="font-heading text-ink leading-snug"
            style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', letterSpacing: '-0.01em' }}>
            {result.headline}
          </h2>
        </div>
      </div>

      {/* ── Signal / Key insight ──────────────────────── */}
      <div className="accent-block py-4" style={{ borderColor: '#18b8e0' }}>
        <p className="font-mono text-2xs text-accent uppercase tracking-widest mb-2">Key Signal</p>
        <p className="text-dim text-sm leading-relaxed font-sans" style={{ fontWeight: 300 }}>
          {result.signal}
        </p>
      </div>

      {/* ── Metrics ──────────────────────────────────── */}
      <MetricsPanel metrics={metrics} />

      {/* ── 3-Step strategy ──────────────────────────── */}
      <div className="space-y-2">
        <p className="font-mono text-2xs text-muted uppercase tracking-widest-2 mb-4">
          Your 3-step strategy
        </p>
        {(result.actions || []).map((action, i) => (
          <div key={i}
            className="group relative rounded-card p-5 card-hover"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>

            {/* Top accent line on hover */}
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-card transition-opacity duration-300"
              style={{
                background: `linear-gradient(90deg, transparent, ${STEP_COLORS[i]}60, transparent)`,
                opacity: 0,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            />

            <div className="flex gap-5">
              {/* Index */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: `${STEP_COLORS[i]}12`, border: `1px solid ${STEP_COLORS[i]}30` }}>
                <span className="font-mono text-2xs font-bold"
                  style={{ color: STEP_COLORS[i] }}>
                  {i + 1}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                <h4 className="font-heading text-ink leading-snug"
                  style={{ fontSize: '1.1rem' }}>
                  {action.title}
                </h4>
                <p className="text-dim text-sm leading-relaxed font-sans" style={{ fontWeight: 300 }}>
                  {action.what}
                </p>
                <span className="inline-block font-mono text-2xs px-2 py-0.5 rounded-chip"
                  style={{
                    background: `${STEP_COLORS[i]}0a`,
                    color:      `${STEP_COLORS[i]}80`,
                    border:     `1px solid ${STEP_COLORS[i]}20`,
                  }}>
                  ↗ {action.metric_impact}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Do this week + Risk ───────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="accent-block py-4 rounded-r-card"
          style={{ borderColor: '#1ed48a', background: 'rgba(30,212,138,0.03)' }}>
          <p className="font-mono text-2xs uppercase tracking-widest mb-2"
            style={{ color: '#1ed48a' }}>
            Do this week
          </p>
          <p className="text-dim text-sm leading-relaxed font-sans" style={{ fontWeight: 300 }}>
            {result.thisWeek}
          </p>
        </div>

        <div className="accent-block py-4 rounded-r-card"
          style={{ borderColor: '#d4821e', background: 'rgba(212,130,30,0.03)' }}>
          <p className="font-mono text-2xs uppercase tracking-widest mb-2"
            style={{ color: '#d4821e' }}>
            Watch out for
          </p>
          <p className="text-dim text-sm leading-relaxed font-sans" style={{ fontWeight: 300 }}>
            {result.risk}
          </p>
        </div>
      </div>

      {/* ── Pipeline audit trail ──────────────────────── */}
      {pipelineSteps && pipelineSteps.length > 0 && (
        <div className="rounded-card overflow-hidden"
          style={{ border: '1px solid var(--border)' }}>
          <button
            onClick={() => setAuditOpen(!auditOpen)}
            className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
            aria-expanded={auditOpen}
          >
            <span className="font-mono text-2xs text-muted uppercase tracking-widest">
              Pipeline audit trail
            </span>
            <span className="font-mono text-2xs text-muted">
              {auditOpen ? '▲' : '▼'}
            </span>
          </button>

          {auditOpen && (
            <div className="px-5 pb-5 space-y-3 border-t border-border animate-fade-in">
              {pipelineSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-4 py-1">
                  <span className="font-mono text-2xs text-muted w-4 flex-shrink-0 pt-0.5">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0 grid grid-cols-3 gap-4 text-2xs font-mono">
                    <span className="text-accent">{step.step}</span>
                    {step.status && (
                      <span className="text-muted">→ {step.status}</span>
                    )}
                    <div className="flex items-center gap-3">
                      {step.confidence !== undefined && (
                        <span style={{ color: '#e8bb28' }}>
                          {(step.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                      {step.violations_caught !== undefined && (
                        <span style={{ color: step.violations_caught > 0 ? '#1ed48a' : '#4d6178' }}>
                          {step.violations_caught} caught
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
