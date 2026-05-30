'use client'

/**
 * components/organisms/response-cards/TrimTimelineCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * TRIM mode — 30/60/90-day milestone roadmap card.
 */

import React              from 'react'
import { AssistantCard }  from '@/components/molecules/AssistantCard'
import { Badge }          from '@/components/atoms/Badge'

interface Milestone {
  day:   30 | 60 | 90
  title: string
  items: string[]
}

interface TrimPayload {
  goal?:       string
  milestones?: Milestone[]
  rawText?:    string
}

interface TrimTimelineCardProps {
  payload:    TrimPayload
  className?: string
}

const dayColor: Record<number, string> = {
  30: 'var(--gold)',
  60: 'var(--mint)',
  90: '#7C3AED',
}

const dayLabel: Record<number, 'gold' | 'mint' | 'blue'> = {
  30: 'gold',
  60: 'mint',
  90: 'blue',
}

export function TrimTimelineCard({ payload, className }: TrimTimelineCardProps) {
  if (payload.rawText && !payload.milestones) {
    return (
      <AssistantCard mode="trim" title="Milestone Roadmap" className={className}>
        <p className="text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
          {payload.rawText}
        </p>
      </AssistantCard>
    )
  }

  return (
    <AssistantCard
      mode="trim"
      title="30 · 60 · 90 Roadmap"
      subtitle={payload.goal}
      className={className}
    >
      <div className="flex flex-col gap-5">
        {(payload.milestones ?? []).map(ms => (
          <div key={ms.day} className="flex gap-4">
            {/* Timeline spine */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold border"
                style={{
                  color:           dayColor[ms.day],
                  borderColor:     `${dayColor[ms.day]}35`,
                  backgroundColor: `${dayColor[ms.day]}10`,
                }}
              >
                {ms.day}
              </div>
              {ms.day !== 90 && (
                <div className="flex-1 w-px bg-white/8 min-h-[24px]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={dayLabel[ms.day]}>{ms.day}-Day</Badge>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">{ms.title}</h4>
              </div>
              <ul className="space-y-1.5">
                {ms.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                    <span style={{ color: dayColor[ms.day] }} className="flex-shrink-0 mt-0.5">▸</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </AssistantCard>
  )
}
