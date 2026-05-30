'use client'

/**
 * components/organisms/response-cards/SailStreamCard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Streaming text response card for SAIL / Downwind / Operator / Scenario modes.
 * Renders live markdown as text streams in.
 */

import React                    from 'react'
import { cn }                   from '@/lib/utils/cn'
import { AssistantCard }        from '@/components/molecules/AssistantCard'
import { StreamingCursor }      from '@/components/molecules/StreamingCursor'
import { Spinner }              from '@/components/atoms/Spinner'
import { getModeColor }         from '@/features/ai-pipeline/modeRouter'
import type { AnalysisMode }    from '@/features/ai-pipeline/types'

interface SailStreamCardProps {
  mode:        AnalysisMode
  text:        string
  isStreaming: boolean
  isConnecting?:boolean
  title?:      string
  className?:  string
}

export function SailStreamCard({
  mode, text, isStreaming, isConnecting, title, className
}: SailStreamCardProps) {
  const modeColor = getModeColor(mode)

  return (
    <AssistantCard
      mode={mode}
      title={title}
      className={cn(
        'transition-[border-color] duration-500',
        isStreaming && 'shadow-[0_0_32px_rgba(0,0,0,0.4)]',
        className
      )}
      footer={
        isStreaming
          ? <span style={{ color: modeColor }} className="font-mono text-[10px] animate-pulse">● STREAMING</span>
          : text
            ? <span className="text-[var(--text-muted)]">Generation complete · {text.split(/\s+/).length} words</span>
            : null
      }
    >
      {isConnecting && !text ? (
        <div className="flex items-center gap-3 py-2 text-[var(--text-muted)] text-sm">
          <Spinner size="sm" color="gold" />
          <span>Connecting to intelligence…</span>
        </div>
      ) : (
        <div
          className={cn(
            'prose prose-invert prose-sm max-w-none',
            'prose-p:leading-relaxed prose-p:text-[var(--text-primary)]',
            'prose-headings:text-[var(--text-primary)] prose-headings:font-semibold',
            'prose-code:text-[var(--mint)] prose-code:bg-white/6 prose-code:px-1 prose-code:rounded',
            'prose-strong:text-[var(--text-primary)]',
            'prose-ul:text-[var(--text-secondary)] prose-ol:text-[var(--text-secondary)]',
          )}
        >
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--text-primary)]">
            {text}
            {isStreaming && <StreamingCursor color={modeColor} />}
          </p>
        </div>
      )}
    </AssistantCard>
  )
}
