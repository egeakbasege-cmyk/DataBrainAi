'use client'

/**
 * components/organisms/chat/ChatComposer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The bottom message input area:
 *   • Auto-growing textarea
 *   • File attachment display
 *   • Send / cancel streaming button
 *   • Character / token hint
 *
 * All state lives in chatStore — this is a pure display organism.
 */

import React, { useCallback, useRef, KeyboardEvent } from 'react'
import { cn }                                         from '@/lib/utils/cn'
import { Button }                                     from '@/components/atoms/Button'
import { FileAttachmentPill }                         from '@/components/molecules/FileAttachmentPill'
import { useChatStore, selectIsAnyActive }            from '@/stores/chatStore'

interface ChatComposerProps {
  onSubmit:  () => void
  onCancel?: () => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

export function ChatComposer({
  onSubmit, onCancel, disabled, className, placeholder,
}: ChatComposerProps) {
  const input       = useChatStore(s => s.input)
  const setInput    = useChatStore(s => s.setInput)
  const attachment  = useChatStore(s => s.attachment)
  const fileError   = useChatStore(s => s.fileError)
  const setAttach   = useChatStore(s => s.setAttachment)
  const isStreaming = useChatStore(selectIsAnyActive)
  const mode        = useChatStore(s => s.mode)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const defaultPlaceholder = placeholder ?? `Ask ${mode.charAt(0).toUpperCase() + mode.slice(1)} anything…`

  // Auto-grow
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [setInput])

  // Submit on Enter (not Shift+Enter)
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
      e.preventDefault()
      if (input.trim()) onSubmit()
    }
  }, [input, isStreaming, onSubmit])

  const canSubmit = input.trim().length > 0 && !disabled

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* File error */}
      {fileError && (
        <p className="text-xs text-red-400 px-1">{fileError}</p>
      )}

      {/* Attachment preview */}
      {attachment && (
        <FileAttachmentPill
          attachment={attachment}
          onRemove={() => setAttach(null)}
          className="ml-1"
        />
      )}

      {/* Input row */}
      <div
        className={cn(
          'flex items-end gap-2 rounded-2xl border px-4 py-3',
          'bg-white/4 backdrop-blur-[12px]',
          'border-white/10 focus-within:border-[var(--gold)]/30',
          'transition-[border-color,box-shadow] duration-200',
          'focus-within:shadow-[0_0_24px_rgba(201,169,110,0.08)]'
        )}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={defaultPlaceholder}
          disabled={disabled || isStreaming}
          rows={1}
          aria-label="Message input"
          className={cn(
            'flex-1 resize-none bg-transparent outline-none',
            'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'leading-relaxed max-h-[200px] overflow-y-auto',
            'scrollbar-thin scrollbar-thumb-white/10',
            'disabled:opacity-50'
          )}
        />

        {/* Action button */}
        {isStreaming ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex-shrink-0 mb-0.5 border-red-500/30 text-red-400 hover:border-red-400/50 hover:text-red-300"
            aria-label="Cancel generation"
          >
            ■ Stop
          </Button>
        ) : (
          <Button
            variant="gold"
            size="sm"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex-shrink-0 mb-0.5"
            aria-label="Send message"
          >
            Send ↵
          </Button>
        )}
      </div>

      {/* Hint */}
      <p className="text-[10px] text-[var(--text-muted)] text-center select-none">
        {isStreaming ? 'Streaming… press Stop to cancel' : 'Enter to send · Shift+Enter for new line'}
      </p>
    </div>
  )
}
