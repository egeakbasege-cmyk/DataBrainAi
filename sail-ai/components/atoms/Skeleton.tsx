'use client'

/**
 * components/atoms/Skeleton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shimmer skeleton atom for loading states.
 */

import React from 'react'
import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  width?:     string | number
  height?:    string | number
  rounded?:   'sm' | 'md' | 'lg' | 'full'
  className?: string
}

const roundedMap = {
  sm:   'rounded',
  md:   'rounded-lg',
  lg:   'rounded-2xl',
  full: 'rounded-full',
}

export function Skeleton({ width, height, rounded = 'md', className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white/5',
        roundedMap[rounded],
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
    >
      {/* Shimmer sweep */}
      <div
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)',
        }}
      />
    </div>
  )
}

// Pre-composed variants
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          height={14}
          className={i === lines - 1 ? 'w-3/4' : 'w-full'}
        />
      ))}
    </div>
  )
}
