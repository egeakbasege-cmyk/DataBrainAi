'use client'

/**
 * components/organisms/chat/GuideRail.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Left-rail mode selector + context controls.
 * Collapses to icon-only on mobile.
 */

import React        from 'react'
import { cn }       from '@/lib/utils/cn'
import { Pill }     from '@/components/atoms/Pill'
import { GoldDivider } from '@/components/atoms/GoldDivider'
import { useChatStore } from '@/stores/chatStore'
import { useUIStore }   from '@/stores/uiStore'
import { ALL_MODES, PRIMARY_MODES, EXTENDED_MODES } from '@/features/ai-pipeline/modeRouter'
import type { AnalysisMode } from '@/features/ai-pipeline/types'

interface GuideRailProps {
  className?: string
}

export function GuideRail({ className }: GuideRailProps) {
  const mode    = useChatStore(s => s.mode)
  const setMode = useChatStore(s => s.setMode)
  const isOpen  = useUIStore(s => s.isGuideRailOpen)

  if (!isOpen) return null

  return (
    <aside
      className={cn(
        'flex flex-col gap-4 w-[200px] flex-shrink-0',
        'py-4 px-3',
        'border-r border-white/6',
        'bg-[var(--obsidian)]/80 backdrop-blur-[12px]',
        className
      )}
    >
      {/* Brand mark */}
      <div className="px-1">
        <p className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-muted)] uppercase">
          Intelligence Mode
        </p>
      </div>

      <GoldDivider glow={false} />

      {/* Primary modes */}
      <div className="flex flex-col gap-1">
        <p className="text-[9px] font-mono tracking-widest text-[var(--text-muted)] uppercase px-1 mb-1">
          Core
        </p>
        {PRIMARY_MODES.map(m => {
          const descriptor = ALL_MODES.find(d => d.id === m)!
          return (
            <Pill
              key={m}
              active={mode === m}
              color={descriptor.color}
              onClick={() => setMode(m as AnalysisMode)}
              className="w-full justify-start px-3"
            >
              <span>{descriptor.icon}</span>
              <span>{descriptor.label}</span>
            </Pill>
          )
        })}
      </div>

      <GoldDivider glow={false} />

      {/* Extended modes */}
      <div className="flex flex-col gap-1">
        <p className="text-[9px] font-mono tracking-widest text-[var(--text-muted)] uppercase px-1 mb-1">
          Extended
        </p>
        {EXTENDED_MODES.map(m => {
          const descriptor = ALL_MODES.find(d => d.id === m)!
          return (
            <Pill
              key={m}
              active={mode === m}
              color={descriptor.color}
              onClick={() => setMode(m as AnalysisMode)}
              className="w-full justify-start px-3"
            >
              <span>{descriptor.icon}</span>
              <span>{descriptor.label}</span>
            </Pill>
          )
        })}
      </div>
    </aside>
  )
}
