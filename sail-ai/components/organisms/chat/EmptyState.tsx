'use client'

/**
 * components/organisms/chat/EmptyState.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-bleed empty state shown before the first message.
 * Uses design tokens — no hardcoded colors.
 */

import React              from 'react'
import { cn }             from '@/lib/utils/cn'
import { GoldDivider }    from '@/components/atoms/GoldDivider'
import { FollowUpChip }   from '@/components/molecules/FollowUpChip'
import { useChatStore }   from '@/stores/chatStore'
import { getModeColor, getMode } from '@/features/ai-pipeline/modeRouter'

const STARTERS: Record<string, string[]> = {
  upwind:    ['Give me a BLUF on our Q3 strategy', 'Identify the biggest risk in my market', 'Summarize my competitive position'],
  downwind:  ['Coach me through my next 30 days', 'Help me build momentum this week', 'What should I focus on today?'],
  sail:      ['Analyze my business model live', 'Stream insights on my market', 'What signals should I track?'],
  trim:      ['Build my 30-60-90 day roadmap', 'Plan my next product milestone', 'Set my quarterly OKRs'],
  catamaran: ['Compare two strategic options', 'Dual-track analysis: expand vs. consolidate', 'Pros and cons of my two paths'],
  operator:  ['Deep dive into my industry', 'Full intelligence report on my sector', 'Comprehensive competitive analysis'],
  synergy:   ['War-room session: all modes on my challenge', 'Fuse strategic + operational intelligence', 'Full-spectrum analysis'],
  scenario:  ['Simulate my best-case 12-month path', 'Model three growth scenarios', 'Predict impact of this decision'],
}

interface EmptyStateProps {
  className?: string
}

export function EmptyState({ className }: EmptyStateProps) {
  const mode      = useChatStore(s => s.mode)
  const setInput  = useChatStore(s => s.setInput)
  const descriptor = getMode(mode)
  const modeColor  = getModeColor(mode)
  const starters   = STARTERS[mode] ?? STARTERS.upwind

  return (
    <div className={cn('flex flex-col items-center justify-center flex-1 px-6 py-12 text-center', className)}>
      {/* Icon */}
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center text-3xl mb-6 border"
        style={{
          backgroundColor: `${modeColor}10`,
          borderColor:     `${modeColor}25`,
          color:           modeColor,
          boxShadow:       `0 0 32px ${modeColor}15`,
        }}
      >
        {descriptor.icon}
      </div>

      {/* Heading */}
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-1">{descriptor.label}</h2>
      <p className="text-sm text-[var(--text-muted)] mb-6 max-w-[320px]">{descriptor.tagline}</p>

      <GoldDivider glow className="w-24 mb-6" />

      {/* Starter chips */}
      <div className="flex flex-wrap gap-2 justify-center max-w-[480px]">
        {starters.map(s => (
          <FollowUpChip key={s} label={s} onClick={setInput} />
        ))}
      </div>
    </div>
  )
}
