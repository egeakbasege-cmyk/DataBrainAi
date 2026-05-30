'use client'

/**
 * components/molecules/ChatBubble.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Single message bubble — user or assistant.
 * Handles markdown rendering, streaming cursor, copy action.
 */

import React, { useCallback, useState } from 'react'
import { cn }                           from '@/lib/utils/cn'
import { Avatar }                       from '@/components/atoms/Avatar'
import { ModeChip }                     from '@/components/molecules/ModeChip'
import { StreamingCursor }              from '@/components/molecules/StreamingCursor'
import { timeAgo }                      from '@/lib/utils/format'
import type { ChatMessage }             from '@/stores/chatStore'
import type { AnalysisMode }            from '@/features/ai-pipeline/types'
import { getModeColor }                 from '@/features/ai-pipeline/modeRouter'

interface ChatBubbleProps {
  message:    ChatMessage
  userAvatar?: string | null
  userName?:  string
  className?: string
}

export function ChatBubble({ message, userAvatar, userName = 'You', className }: ChatBubbleProps) {
  const isUser      = message.role === 'user'
  const isStreaming = message.status === 'streaming'
  const isError     = message.status === 'error'
  const modeColor   = getModeColor(message.mode as AnalysisMode)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  return (
    <div
      className={cn(
        'group flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <Avatar src={userAvatar} name={userName} size="sm" />
        ) : (
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center text-sm border"
            style={{
              borderColor:     `${modeColor}35`,
              backgroundColor: `${modeColor}12`,
              color:           modeColor,
            }}
          >
            ◎
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={cn('flex flex-col gap-1.5 max-w-[78%]', isUser && 'items-end')}>
        {/* Header */}
        <div className={cn('flex items-center gap-2 px-1', isUser && 'flex-row-reverse')}>
          <span className="text-xs text-[var(--text-muted)] font-medium">
            {isUser ? userName : 'SAIL AI'}
          </span>
          {!isUser && (
            <ModeChip mode={message.mode as AnalysisMode} size="sm" />
          )}
          <span className="text-[10px] text-[var(--text-muted)]/60">
            {timeAgo(message.createdAt)}
          </span>
        </div>

        {/* Content */}
        <div
          className={cn(
            'relative px-4 py-3 rounded-2xl text-sm leading-relaxed',
            isUser
              ? 'bg-white/8 border border-white/10 text-[var(--text-primary)] rounded-tr-sm'
              : 'bg-[var(--obsidian-card)] border border-white/6 text-[var(--text-primary)] rounded-tl-sm',
            isError && 'border-red-500/30 bg-red-500/6'
          )}
          style={!isUser ? { borderColor: `${modeColor}15` } : undefined}
        >
          {isError ? (
            <p className="text-red-300 text-sm">{message.error ?? 'Something went wrong.'}</p>
          ) : (
            <>
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
              {isStreaming && <StreamingCursor color={modeColor} />}
            </>
          )}
        </div>

        {/* Actions — appear on hover */}
        {!isStreaming && message.content && !isError && (
          <div className={cn(
            'flex gap-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150',
            isUser && 'flex-row-reverse'
          )}>
            <button
              onClick={handleCopy}
              className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2 py-0.5 rounded"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
