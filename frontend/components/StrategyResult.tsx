'use client'

import { useState } from 'react'
import { ConfidenceBadge } from './ConfidenceBadge'
import { MetricsPanel } from './MetricsPanel'
import { MetricsChart } from './MetricsChart'

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

export function StrategyResultView({ result, metrics, confidence, pipelineSteps }: Props) {
  const [auditOpen, setAuditOpen] = useState(false)

  return (
    <div className="space-y-4 animate-fade-up">

      {/* ── Headline card ─────────────────────────── */}
      <div className="bg-card rounded-card border border-border overflow-hidden"
        style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>

        {/* Yellow top accent line */}
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #FACC15, rgba(250,204,21,0.2))' }} />

        <div className="p-6 md:p-8">
          {/* Meta row */}
          <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
            <span className="font-sans text-xs font-medium text-muted uppercase tracking-widest-2">
              Strategy output
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-sans text-xs font-bold px-3 py-1 rounded-pill"
                style={{ background: '#FEFCE8', color: '#A16207', border: '1px solid #FEF08A' }}>
                {result.upside || metrics.upside_label}
              </span>
              <ConfidenceBadge score={confidence} />
            </div>
          </div>

          {/* Headline */}
          <h2 className="font-heading font-extrabold text-ink leading-snug"
            style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.85rem)', letterSpacing: '-0.02em' }}>
            {result.headline}
          </h2>
        </div>
      </div>

      {/* ── Key Signal ────────────────────────────── */}
      <div className="accent-block py-4" style={{ borderColor: '#FACC15' }}>
        <p className="font-sans text-xs font-semibold uppercase tracking-widest-2 mb-2"
          style={{ color: '#A16207' }}>
          Key Signal
        </p>
        <p className="font-sans text-sm text-dim leading-relaxed">
          {result.signal}
        </p>
      </div>

      {/* ── Metrics ───────────────────────────────── */}
      <MetricsPanel metrics={metrics} />
      <MetricsChart metrics={metrics} />

      {/* ── 3-Step strategy ───────────────────────── */}
      <div className="space-y-2">
        <p className="font-sans text-xs font-medium text-muted uppercase tracking-widest-2 mb-4">
          Your 3-step strategy
        </p>
        {(result.actions || []).map((action, i) => (
          <div key={i}
            className="bg-card rounded-card border border-border p-5 card-hover group"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

            <div className="flex gap-4">
              {/* Step number */}
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(250,204,21,0.12)', border: '1px solid rgba(250,204,21,0.3)' }}>
                <span className="font-heading font-bold text-sm"
                  style={{ color: '#92400E' }}>
                  {i + 1}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-2">
                <h4 className="font-heading font-bold text-ink leading-snug"
                  style={{ fontSize: '1.05rem' }}>
                  {action.title}
                </h4>
                <p className="font-sans text-sm text-dim leading-relaxed">
                  {action.what}
                </p>
                <span className="inline-block font-sans text-xs font-medium px-2.5 py-1 rounded-pill"
                  style={{
                    background: '#F5F5F7',
                    color:      '#6B7280',
                    border:     '1px solid #E5E7EB',
                  }}>
                  ↗ {action.metric_impact}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Do this week + Risk ───────────────────── */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="accent-block py-4 rounded-r-card"
          style={{ borderColor: '#16A34A', background: 'rgba(22,163,74,0.04)' }}>
          <p className="font-sans text-xs font-semibold uppercase tracking-widest-2 mb-2"
            style={{ color: '#15803D' }}>
            Do this week
          </p>
          <p className="font-sans text-sm text-dim leading-relaxed">
            {result.thisWeek}
          </p>
        </div>

        <div className="accent-block py-4 rounded-r-card"
          style={{ borderColor: '#F59E0B', background: 'rgba(245,158,11,0.04)' }}>
          <p className="font-sans text-xs font-semibold uppercase tracking-widest-2 mb-2"
            style={{ color: '#D97706' }}>
            Watch out for
          </p>
          <p className="font-sans text-sm text-dim leading-relaxed">
            {result.risk}
          </p>
        </div>
      </div>

      {/* ── Pipeline audit trail ──────────────────── */}
      {pipelineSteps && pipelineSteps.length > 0 && (
        <div className="rounded-card border border-border bg-card overflow-hidden">
          <button
            onClick={() => setAuditOpen(!auditOpen)}
            className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-surface"
            aria-expanded={auditOpen}>
            <span className="font-sans text-xs font-medium text-muted uppercase tracking-widest-2">
              Pipeline audit trail
            </span>
            <span className="font-sans text-xs text-muted">
              {auditOpen ? '▲' : '▼'}
            </span>
          </button>

          {auditOpen && (
            <div className="px-5 pb-5 space-y-2 border-t border-border animate-fade-in bg-surface">
              {pipelineSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-4 py-2">
                  <span className="font-sans text-xs text-muted w-4 flex-shrink-0 pt-0.5 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0 grid grid-cols-3 gap-3 text-xs font-sans">
                    <span className="text-ink font-medium">{step.step}</span>
                    {step.status && (
                      <span className="text-muted">→ {step.status}</span>
                    )}
                    <div className="flex items-center gap-3">
                      {step.confidence !== undefined && (
                        <span style={{ color: '#A16207' }}>
                          {(step.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                      {step.violations_caught !== undefined && (
                        <span style={{ color: step.violations_caught > 0 ? '#16A34A' : '#9CA3AF' }}>
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
