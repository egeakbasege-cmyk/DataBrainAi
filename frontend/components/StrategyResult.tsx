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

export function StrategyResultView({ result, metrics, confidence, pipelineSteps }: Props) {
  const [auditOpen, setAuditOpen] = useState(false)

  return (
    <div className="space-y-4 animate-fade-up">
      {/* ── Headline card ── */}
      <div
        className="relative rounded-card p-6 border border-border overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0b1325 0%, #060c1a 100%)' }}
      >
        {/* Upside badge */}
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center px-3 py-1 rounded-pill text-xs font-mono font-semibold"
            style={{ background: '#f0c84020', color: '#f0c840', border: '1px solid #f0c84040' }}>
            {result.upside || metrics.upside_label}
          </span>
        </div>

        <h2 className="font-heading text-2xl text-white leading-snug pr-28 mb-4">
          {result.headline}
        </h2>

        <div className="absolute bottom-4 right-4">
          <ConfidenceBadge score={confidence} />
        </div>
      </div>

      {/* ── Key insight ── */}
      <div className="bg-card rounded-card border-l-4 px-5 py-4" style={{ borderColor: '#2bc4e8' }}>
        <p className="text-xs font-mono text-accent uppercase tracking-widest mb-2">Key Insight</p>
        <p className="text-gray-300 text-sm leading-relaxed font-sans">{result.signal}</p>
      </div>

      {/* ── Metrics panel ── */}
      <MetricsPanel metrics={metrics} />

      {/* ── 3-part strategy ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-mono text-muted uppercase tracking-widest">Your 3-Step Strategy</h3>
        {(result.actions || []).map((action, i) => (
          <div key={i} className="bg-card border border-border rounded-card p-5 hover:border-opacity-80 transition-all">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold"
                style={{ background: '#2bc4e820', color: '#2bc4e8' }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium text-sm mb-1">{action.title}</h4>
                <p className="text-muted text-sm leading-relaxed font-sans mb-2">{action.what}</p>
                <span className="text-xs font-mono px-2 py-0.5 rounded-chip"
                  style={{ background: '#2bc4e810', color: '#2bc4e880' }}>
                  metric: {action.metric_impact}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Do this week ── */}
      <div className="bg-card rounded-card border-l-4 px-5 py-4" style={{ borderColor: '#2de8a0' }}>
        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#2de8a0' }}>
          Do This Week
        </p>
        <p className="text-gray-300 text-sm leading-relaxed font-sans">{result.thisWeek}</p>
      </div>

      {/* ── Risk ── */}
      <div className="bg-card rounded-card border-l-4 px-5 py-4" style={{ borderColor: '#e09030' }}>
        <p className="text-xs font-mono uppercase tracking-widest mb-2" style={{ color: '#e09030' }}>
          Watch Out For
        </p>
        <p className="text-gray-300 text-sm leading-relaxed font-sans">{result.risk}</p>
      </div>

      {/* ── Pipeline audit trail ── */}
      {pipelineSteps && pipelineSteps.length > 0 && (
        <div className="bg-card border border-border rounded-card overflow-hidden">
          <button
            onClick={() => setAuditOpen(!auditOpen)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-surface/50 transition-colors"
          >
            <span className="text-xs font-mono text-muted uppercase tracking-widest">
              How this analysis was built
            </span>
            <span className="text-muted text-xs">{auditOpen ? '▲' : '▼'}</span>
          </button>

          {auditOpen && (
            <div className="px-5 pb-5 space-y-2 border-t border-border animate-fade-up">
              {pipelineSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-3 text-xs font-mono">
                  <span className="text-muted w-4 flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-accent">{step.step}</span>
                    {step.status && (
                      <span className="ml-2 text-muted">→ {step.status}</span>
                    )}
                    {step.confidence !== undefined && (
                      <span className="ml-2" style={{ color: '#f0c840' }}>
                        confidence: {(step.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                    {step.violations_caught !== undefined && (
                      <span className="ml-2" style={{ color: step.violations_caught > 0 ? '#2de8a0' : '#4a6080' }}>
                        {step.violations_caught} violations caught
                      </span>
                    )}
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
