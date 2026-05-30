'use client'

/**
 * components/atoms/Spinner.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Accessible loading spinner atom.
 */

import React from 'react'
import { cn } from '@/lib/utils/cn'

interface SpinnerProps {
  size?:      'xs' | 'sm' | 'md' | 'lg'
  color?:     'gold' | 'mint' | 'white' | 'muted'
  className?: string
  label?:     string   // sr-only aria label
}

const sizeMap = {
  xs: 'h-3 w-3 border',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[3px]',
}

const colorMap = {
  gold:  'border-[var(--gold)]/30 border-t-[var(--gold)]',
  mint:  'border-[var(--mint)]/30 border-t-[var(--mint)]',
  white: 'border-white/20 border-t-white',
  muted: 'border-white/10 border-t-white/40',
}

export function Spinner({ size = 'md', color = 'gold', className, label = 'Loading' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-block rounded-full animate-spin', sizeMap[size], colorMap[color], className)}
    />
  )
}
