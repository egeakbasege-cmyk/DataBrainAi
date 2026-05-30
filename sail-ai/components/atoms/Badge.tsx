'use client'

/**
 * components/atoms/Badge.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Status / label chips. Dot-indicator variant included.
 */

import React from 'react'
import { cn } from '@/lib/utils/cn'

export type BadgeVariant = 'gold' | 'mint' | 'red' | 'amber' | 'blue' | 'ghost'

interface BadgeProps {
  variant?:   BadgeVariant
  dot?:       boolean
  children:   React.ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  gold:  'bg-[var(--gold)]/15 text-[var(--gold)] border-[var(--gold)]/30',
  mint:  'bg-[var(--mint)]/10 text-[var(--mint)] border-[var(--mint)]/25',
  red:   'bg-red-500/15 text-red-400 border-red-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  blue:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
  ghost: 'bg-white/5 text-[var(--text-secondary)] border-white/10',
}

const dotColors: Record<BadgeVariant, string> = {
  gold:  'bg-[var(--gold)]',
  mint:  'bg-[var(--mint)]',
  red:   'bg-red-400',
  amber: 'bg-amber-400',
  blue:  'bg-blue-400',
  ghost: 'bg-[var(--text-muted)]',
}

export function Badge({ variant = 'ghost', dot, children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}
