'use client'

/**
 * components/atoms/Avatar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * User / AI avatar with image fallback to initials.
 */

import React, { useState } from 'react'
import { cn }              from '@/lib/utils/cn'

interface AvatarProps {
  src?:       string | null
  name?:      string
  size?:      'xs' | 'sm' | 'md' | 'lg' | 'xl'
  shape?:     'circle' | 'square'
  className?: string
  alt?:       string
}

const sizeMap = {
  xs: 'h-6  w-6  text-[10px]',
  sm: 'h-8  w-8  text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function Avatar({ src, name = '', size = 'md', shape = 'circle', className, alt }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const showImage = src && !imgError
  const initials  = getInitials(name)

  return (
    <div
      className={cn(
        'relative flex-shrink-0 flex items-center justify-center overflow-hidden font-semibold',
        'bg-gradient-to-br from-[var(--gold)]/20 to-[var(--mint)]/20',
        'border border-white/10',
        shape === 'circle' ? 'rounded-full' : 'rounded-xl',
        sizeMap[size],
        className
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt ?? name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-[var(--gold)] select-none leading-none">{initials || '?'}</span>
      )}
    </div>
  )
}
