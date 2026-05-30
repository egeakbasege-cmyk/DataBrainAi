'use client'

/**
 * components/atoms/Button.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Foundation button atom — never use <button> directly outside of atoms/.
 * All variants follow the design token system.
 */

import React, { forwardRef } from 'react'
import { cn }               from '@/lib/utils/cn'

export type ButtonVariant = 'gold' | 'mint' | 'ghost' | 'glass' | 'danger' | 'obsidian'
export type ButtonSize    = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant
  size?:     ButtonSize
  loading?:  boolean
  iconLeft?: React.ReactNode
  iconRight?:React.ReactNode
  fullWidth?:boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  gold:    'bg-[var(--gold)] text-[var(--obsidian)] hover:bg-[var(--gold-light)] active:bg-[var(--gold-deep)] shadow-[0_0_20px_rgba(201,169,110,0.25)] hover:shadow-[0_0_32px_rgba(201,169,110,0.4)]',
  mint:    'bg-[var(--mint)] text-[var(--obsidian)] hover:bg-[var(--tiffany)] active:brightness-95 shadow-[0_0_16px_rgba(0,255,204,0.18)]',
  ghost:   'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 border border-white/10 hover:border-white/20',
  glass:   'bg-white/5 backdrop-blur-[16px] border border-white/10 text-[var(--text-primary)] hover:bg-white/10 hover:border-white/20',
  danger:  'bg-red-600/90 text-white hover:bg-red-500 active:bg-red-700 shadow-[0_0_16px_rgba(220,38,38,0.25)]',
  obsidian:'bg-[var(--obsidian-card)] text-[var(--text-primary)] border border-white/8 hover:border-white/16',
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-6  px-2.5 text-xs  gap-1   rounded-md',
  sm: 'h-8  px-3   text-sm  gap-1.5 rounded-lg',
  md: 'h-10 px-4   text-sm  gap-2   rounded-xl',
  lg: 'h-12 px-6   text-base gap-2.5 rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'gold', size = 'md', loading, iconLeft, iconRight, fullWidth, className, children, disabled, ...props }, ref) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center font-medium select-none',
          'transition-all duration-[200ms] ease-[var(--ease-spring)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/50',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : iconLeft}
        {children && <span>{children}</span>}
        {!loading && iconRight}
      </button>
    )
  }
)

Button.displayName = 'Button'
