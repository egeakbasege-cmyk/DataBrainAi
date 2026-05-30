'use client'

/**
 * components/organisms/response-cards/SynergyCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Synergy mode — multi-mode war-room fusion card.
 * Shows responses from multiple modes fused into one view.
 */

import React               from 'react'
import { AssistantCard }   from '@/components/molecules/AssistantCard'
import { ModeChip }        from '@/components/molecules/ModeChip'
import { GoldDivider }     from '@/components/atoms/GoldDivider'
import type { AnalysisMode } from '@/features/ai-pipeline/types'

interface ModeInsight {
  mode:    AnalysisMode
  insight: string
}

interface SynergyPayload {
  topic?:    string
  insights?: ModeInsight[]
  synthesis?: string
  action?:   string
  rawText?:  string
}

interface SynergyCardProps {
  payload:    SynergyPayload
  className?: string
}

export function SynergyCard({ payload, className }: SynergyCardProps) {
  if (payload.rawText && !payload.insights) {
    return (
      <AssistantCard mode="synergy" title="War-Room Fusion" className={className}>
        <p className="text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap">
          {payload.rawText}
        </p>
      </AssistantCard>
    )
  }

  return (
    <AssistantCard
      mode="synergy"
      title="War-Room Intelligence Fusion"
      subtitle={payload.topic}
      className={className}
    >
      {/* Per-mode insights */}
      {(payload.insights ?? []).map((item) => (
        <div key={item.mode} className="mb-4 last:mb-0">
          <div className="flex items-center gap-2 mb-1.5">
            <ModeChip mode={item.mode} size="sm" showLabel />
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed pl-1">
            {item.insight}
          </p>
        </div>
      ))}

      {/* Synthesis */}
      {payload.synthesis && (
        <>
          <GoldDivider label="Synthesis" className="my-4" />
          <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
            {payload.synthesis}
          </p>
        </>
      )}

      {/* Action */}
      {payload.action && (
        <div className="mt-4 rounded-xl border border-[var(--gold)]/20 bg-[var(--gold)]/6 px-3 py-2">
          <p className="text-[9px] font-mono tracking-widest text-[var(--gold)] uppercase mb-1">Next Action</p>
          <p className="text-xs text-[var(--text-secondary)]">{payload.action}</p>
        </div>
      )}
    </AssistantCard>
  )
}
