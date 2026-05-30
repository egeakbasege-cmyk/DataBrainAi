'use client'

/**
 * components/molecules/ErrorBanner.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Inline error display with optional retry action.
 * Maps StreamError codes to user-friendly copy.
 */

import React                  from 'react'
import { cn }                 from '@/lib/utils/cn'
import { Button }             from '@/components/atoms/Button'
import type { StreamError }   from '@/features/ai-pipeline/types'

interface ErrorBannerProps {
  error:      StreamError | { message: string; retryable?: boolean }
  onRetry?:  () => void
  compact?:   boolean
  className?: string
}

const iconMap: Record<string, string> = {
  NETWORK:      '📶',
  TIMEOUT:      '⏱',
  RATE_LIMIT:   '🚦',
  UNAUTHORIZED: '🔐',
  SERVER_ERROR: '⚙️',
  ABORTED:      '✕',
  PARSE_ERROR:  '⚠️',
  UNKNOWN:      '⚠️',
}

export function ErrorBanner({ error, onRetry, compact, className }: ErrorBannerProps) {
  const code  = 'code' in error ? error.code : 'UNKNOWN'
  const icon  = iconMap[code] ?? '⚠️'
  const canRetry = error.retryable !== false && !!onRetry

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/8 text-red-300',
        compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm',
        className
      )}
    >
      <span className="flex-shrink-0 mt-0.5 text-base leading-none">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{error.message}</p>
        {canRetry && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onRetry}
            className="mt-1.5 text-red-300 border-red-500/20 hover:border-red-400/40 hover:text-red-200"
          >
            Try again
          </Button>
        )}
      </div>
    </div>
  )
}
