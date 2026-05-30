'use client'

/**
 * components/molecules/FollowUpChip.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Suggested follow-up question chip.
 * Appears below completed assistant messages.
 */

import React    from 'react'
import { cn }   from '@/lib/utils/cn'

interface FollowUpChipProps {
  label:      string
  onClick:    (label: string) => void
  disabled?:  boolean
  className?: string
}

export function FollowUpChip({ label, onClick, disabled, className }: FollowUpChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onClick(label)}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium',
        'bg-white/4 border border-white/10 text-[var(--text-secondary)]',
        'hover:bg-white/8 hover:border-[var(--gold)]/30 hover:text-[var(--gold)]',
        'transition-all duration-200 ease-[var(--ease-spring)]',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--gold)]/50',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'text-left leading-snug',
        className
      )}
    >
      <span className="text-[var(--gold)]/60 flex-shrink-0">↗</span>
      {label}
    </button>
  )
}
