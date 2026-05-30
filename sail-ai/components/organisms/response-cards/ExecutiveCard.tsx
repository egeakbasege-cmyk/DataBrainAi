'use client'

/**
 * components/organisms/response-cards/ExecutiveCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Upwind mode response — BLUF executive intelligence card.
 * Expects structured JSON: { bluf, keyPoints, recommendation, risk }
 */

import React                 from 'react'
import { cn }                from '@/lib/utils/cn'
import { AssistantCard }     from '@/components/molecules/AssistantCard'
import { Badge }             from '@/components/atoms/Badge'
import { GoldDivider }       from '@/components/atoms/GoldDivider'

interface ExecutivePayload {
  bluf?:           string
  keyPoints?:      string[]
  recommendation?: string
  risk?:           string
  timeframe?:      string
  confidence?:     'High' | 'Medium' | 'Low'
  rawText?:        string   // fallback if JSON parse fails
}

interface ExecutiveCardProps {
  payload:    ExecutivePayload
  className?: string
}

const confidenceVariant: Record<string, 'gold' | 'amber' | 'red'> = {
  High:   'gold',
  Medium: 'amber',
  Low:    'red',
}

export function ExecutiveCard({ payload, className }: ExecutiveCardProps) {
  if (payload.rawText && !payload.bluf) {
    return (
      <AssistantCard mode="upwind" title="Executive Brief" className={className}>
        <p className="text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
          {payload.rawText}
        </p>
      </AssistantCard>
    )
  }

  return (
    <AssistantCard
      mode="upwind"
      title="Executive Brief"
      subtitle={payload.timeframe}
      actions={
        payload.confidence
          ? <Badge variant={confidenceVariant[payload.confidence] ?? 'ghost'} dot>
              {payload.confidence} confidence
            </Badge>
          : undefined
      }
      className={className}
    >
      {/* BLUF */}
      {payload.bluf && (
        <div className="mb-4">
          <p className="text-[10px] font-mono tracking-widest text-[var(--gold)] uppercase mb-2">BLUF</p>
          <p className="text-sm font-medium leading-relaxed text-[var(--text-primary)]">{payload.bluf}</p>
        </div>
      )}

      {/* Key points */}
      {payload.keyPoints && payload.keyPoints.length > 0 && (
        <>
          <GoldDivider glow={false} className="my-3 opacity-40" />
          <div className="mb-4">
            <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase mb-2">
              Key Points
            </p>
            <ul className="space-y-2">
              {payload.keyPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-[var(--gold)] flex-shrink-0 mt-0.5">◦</span>
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Recommendation */}
      {payload.recommendation && (
        <>
          <GoldDivider glow={false} className="my-3 opacity-40" />
          <div className={cn('mb-3', payload.risk && 'mb-4')}>
            <p className="text-[10px] font-mono tracking-widest text-[var(--text-muted)] uppercase mb-2">
              Recommendation
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{payload.recommendation}</p>
          </div>
        </>
      )}

      {/* Risk */}
      {payload.risk && (
        <div className="rounded-xl border border-red-500/15 bg-red-500/6 px-3 py-2">
          <p className="text-[10px] font-mono tracking-widest text-red-400 uppercase mb-1">Risk</p>
          <p className="text-xs text-red-300/80 leading-relaxed">{payload.risk}</p>
        </div>
      )}
    </AssistantCard>
  )
}
