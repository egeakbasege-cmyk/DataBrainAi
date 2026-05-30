'use client'

/**
 * components/atoms/Pill.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Clickable / selectable pill toggle. Used in mode selectors, tag filters.
 */

import React from 'react'
import { cn } from '@/lib/utils/cn'

interface PillProps {
  active?:    boolean
  color?:     string    // CSS color value for active state glow
  onClick?:   () => void
  children:   React.ReactNode
  disabled?:  boolean
  className?: string
}

export function Pill({ active, color = 'var(--gold)', onClick, children, disabled, className }: PillProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
        'border transition-all duration-200 ease-[var(--ease-spring)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        active
          ? 'bg-white/10 border-white/20 text-[var(--text-primary)]'
          : 'bg-transparent border-white/10 text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)]',
        className
      )}
      style={active && color ? {
        borderColor: `${color}40`,
        boxShadow:   `0 0 10px ${color}20`,
        color,
      } : undefined}
    >
      {children}
    </button>
  )
}
