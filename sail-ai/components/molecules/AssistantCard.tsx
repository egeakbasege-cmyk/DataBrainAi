'use client'

/**
 * components/molecules/AssistantCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Glassmorphic card wrapper for structured AI responses.
 * Used by all response-card organisms as their outer shell.
 */

import React         from 'react'
import { cn }        from '@/lib/utils/cn'
import { ModeChip }  from '@/components/molecules/ModeChip'
import { GoldDivider } from '@/components/atoms/GoldDivider'
import { getModeColor } from '@/features/ai-pipeline/modeRouter'
import type { AnalysisMode } from '@/features/ai-pipeline/types'

interface AssistantCardProps {
  mode:       AnalysisMode
  title?:     string
  subtitle?:  string
  footer?:    React.ReactNode
  actions?:   React.ReactNode
  children:   React.ReactNode
  className?: string
}

export function AssistantCard({
  mode, title, subtitle, footer, actions, children, className
}: AssistantCardProps) {
  const modeColor = getModeColor(mode)

  return (
    <article
      className={cn(
        'rounded-2xl border overflow-hidden',
        'bg-[var(--obsidian-card)] backdrop-blur-[var(--glass-blur)]',
        className
      )}
      style={{ borderColor: `${modeColor}18` }}
    >
      {/* Header */}
      {(title || subtitle) && (
        <>
          <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <ModeChip mode={mode} size="sm" />
                {title && (
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
                    {title}
                  </h3>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-[var(--text-muted)] pl-1">{subtitle}</p>
              )}
            </div>
            {actions && <div className="flex-shrink-0">{actions}</div>}
          </header>
          <GoldDivider glow={false} className="mx-5 opacity-50" />
        </>
      )}

      {/* Body */}
      <div className="px-5 py-4">{children}</div>

      {/* Footer */}
      {footer && (
        <>
          <GoldDivider glow={false} className="mx-5 opacity-30" />
          <footer className="px-5 py-3 text-xs text-[var(--text-muted)]">{footer}</footer>
        </>
      )}
    </article>
  )
}
