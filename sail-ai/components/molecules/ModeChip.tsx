'use client'

/**
 * components/molecules/ModeChip.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Mode indicator chip — shows mode icon + label with mode color.
 * Used in message headers and mode selector UI.
 */

import React                from 'react'
import { cn }               from '@/lib/utils/cn'
import { getMode }          from '@/features/ai-pipeline/modeRouter'
import type { AnalysisMode } from '@/features/ai-pipeline/types'

interface ModeChipProps {
  mode:       AnalysisMode
  size?:      'sm' | 'md'
  showLabel?: boolean
  className?: string
  onClick?:   () => void
}

export function ModeChip({ mode, size = 'sm', showLabel = true, className, onClick }: ModeChipProps) {
  const descriptor = getMode(mode)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        'transition-all duration-200',
        'disabled:cursor-default disabled:pointer-events-none',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        'hover:brightness-110',
        className
      )}
      style={{
        color:           descriptor.color,
        borderColor:     `${descriptor.color}35`,
        backgroundColor: `${descriptor.color}12`,
      }}
    >
      <span aria-hidden="true">{descriptor.icon}</span>
      {showLabel && <span>{descriptor.label}</span>}
    </button>
  )
}
