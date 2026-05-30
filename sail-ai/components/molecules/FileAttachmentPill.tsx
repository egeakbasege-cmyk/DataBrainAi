'use client'

/**
 * components/molecules/FileAttachmentPill.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact attached-file indicator in the chat composer.
 * Shows file name, size, and a dismiss button.
 */

import React    from 'react'
import { cn }   from '@/lib/utils/cn'
import { formatBytes } from '@/lib/utils/format'
import type { Attachment } from '@/stores/chatStore'

interface FileAttachmentPillProps {
  attachment: Attachment
  onRemove?:  () => void
  className?: string
}

const mimeIcons: Record<string, string> = {
  'application/pdf':    '📄',
  'text/plain':         '📃',
  'text/csv':           '📊',
  'application/json':   '{ }',
  'image/png':          '🖼',
  'image/jpeg':         '🖼',
  'image/webp':         '🖼',
  'image/gif':          '🖼',
}

export function FileAttachmentPill({ attachment, onRemove, className }: FileAttachmentPillProps) {
  const icon = attachment.isImage
    ? (mimeIcons[attachment.mimeType] ?? '🖼')
    : (mimeIcons[attachment.mimeType] ?? '📎')

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-xl',
        'bg-white/6 border border-white/12 max-w-[260px]',
        className
      )}
    >
      {/* Thumbnail / icon */}
      {attachment.isImage && attachment.preview ? (
        <img
          src={attachment.preview}
          alt={attachment.name}
          className="h-7 w-7 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <span className="text-base flex-shrink-0 leading-none">{icon}</span>
      )}

      {/* Info */}
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-[var(--text-primary)] truncate leading-tight">
          {attachment.name}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] leading-tight">
          {formatBytes(attachment.size)}
        </span>
      </div>

      {/* Dismiss */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove attachment"
          className="flex-shrink-0 ml-1 h-4 w-4 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  )
}
