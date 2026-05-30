'use client'

/**
 * components/molecules/StreamingCursor.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Animated blinking cursor shown during AI streaming.
 * Disappears automatically when streaming stops.
 */

import React from 'react'
import { cn } from '@/lib/utils/cn'

interface StreamingCursorProps {
  active?:    boolean
  color?:     string
  className?: string
}

export function StreamingCursor({ active = true, color = 'var(--gold)', className }: StreamingCursorProps) {
  if (!active) return null

  return (
    <span
      aria-hidden="true"
      className={cn('inline-block w-[2px] h-[1em] ml-0.5 align-middle rounded-full animate-pulse', className)}
      style={{ backgroundColor: color, opacity: 0.9 }}
    />
  )
}
