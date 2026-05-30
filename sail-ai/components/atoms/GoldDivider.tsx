'use client'

/**
 * components/atoms/GoldDivider.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Decorative horizontal rule with optional gold gradient glow.
 * Used as section separator in premium UI sections.
 */

import React from 'react'
import { cn } from '@/lib/utils/cn'

interface GoldDividerProps {
  glow?:      boolean
  label?:     string
  className?: string
}

export function GoldDivider({ glow = true, label, className }: GoldDividerProps) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[var(--gold)]/30" />
        <span className="text-xs font-mono text-[var(--text-muted)] tracking-widest uppercase">
          {label}
        </span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[var(--gold)]/30" />
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className="h-px w-full"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, var(--gold) 50%, transparent 100%)',
          opacity: 0.25,
        }}
      />
      {glow && (
        <div
          className="absolute inset-x-[25%] top-0 h-px"
          style={{
            background: 'var(--gold)',
            opacity: 0.15,
            filter: 'blur(4px)',
          }}
        />
      )}
    </div>
  )
}
