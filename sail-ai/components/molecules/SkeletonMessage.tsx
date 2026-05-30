'use client'

/**
 * components/molecules/SkeletonMessage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Skeleton placeholder for a message while initial response loads.
 */

import React   from 'react'
import { cn }  from '@/lib/utils/cn'
import { Skeleton } from '@/components/atoms/Skeleton'

interface SkeletonMessageProps {
  className?: string
}

export function SkeletonMessage({ className }: SkeletonMessageProps) {
  return (
    <div className={cn('flex gap-3', className)} aria-busy="true" aria-label="Loading response">
      {/* Avatar skeleton */}
      <Skeleton width={32} height={32} rounded="full" className="flex-shrink-0 mt-1" />

      {/* Content */}
      <div className="flex flex-col gap-2 flex-1 max-w-[70%]">
        {/* Header */}
        <div className="flex items-center gap-2 px-1">
          <Skeleton width={48} height={12} />
          <Skeleton width={56} height={16} rounded="full" />
        </div>
        {/* Bubble */}
        <div className="bg-[var(--obsidian-card)] border border-white/6 rounded-2xl rounded-tl-sm px-4 py-3 space-y-2">
          <Skeleton height={14} className="w-full" />
          <Skeleton height={14} className="w-5/6" />
          <Skeleton height={14} className="w-3/4" />
        </div>
      </div>
    </div>
  )
}
