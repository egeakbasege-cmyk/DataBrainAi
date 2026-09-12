'use client'

/**
 * components/LiquidButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Marine-grade "liquid silver" CTA used across the Azulejo × Liquid Silver
 * system. A brushed-metal surface with a sheen that sweeps on hover and a
 * subtle press compression. Renders as a Next <Link> when `href` is set,
 * otherwise a native <button>.
 */

import Link from 'next/link'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type Variant = 'silver' | 'cobalt' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface LiquidButtonProps {
  children: ReactNode
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: Variant
  size?: Size
  disabled?: boolean
  fullWidth?: boolean
  iconRight?: ReactNode
  iconLeft?: ReactNode
  className?: string
  'aria-label'?: string
}

const sizes: Record<Size, string> = {
  sm: 'h-9  px-4  text-[0.66rem]',
  md: 'h-11 px-6  text-[0.72rem]',
  lg: 'h-14 px-9  text-[0.78rem]',
}

const variants: Record<Variant, string> = {
  silver:
    'azx-silver border border-[color:var(--azx-silver-lo)] text-[color:var(--azx-cobalt-deep)]',
  cobalt:
    'border border-[#0A4A99] text-[#EAF2FF] [background:linear-gradient(135deg,#062D63_0%,#0C4DA2_55%,#115FBD_100%)] shadow-[0_10px_28px_-14px_rgba(0,51,160,0.7)]',
  ghost:
    'border border-[color:var(--azx-grout-strong)] bg-white/60 text-[color:var(--azx-cobalt)] backdrop-blur-sm',
}

export function LiquidButton({
  children,
  href,
  onClick,
  type = 'button',
  variant = 'silver',
  size = 'md',
  disabled,
  fullWidth,
  iconRight,
  iconLeft,
  className = '',
  ...aria
}: LiquidButtonProps) {
  const base = [
    'group relative inline-flex items-center justify-center gap-2 overflow-hidden',
    'font-sans font-bold uppercase tracking-[0.14em] rounded-[3px] select-none',
    'transition-shadow duration-200 focus-visible:outline-none',
    'focus-visible:ring-2 focus-visible:ring-[color:var(--azx-cobalt)]/50 focus-visible:ring-offset-2',
    disabled ? 'opacity-45 pointer-events-none' : '',
    fullWidth ? 'w-full' : '',
    sizes[size],
    variants[variant],
    className,
  ].join(' ')

  const inner = (
    <>
      {/* sheen sweep — only for metallic surfaces */}
      {variant !== 'ghost' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-[18deg] bg-white/45 blur-[2px] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-hover:[animation:azx-sheen_0.9s_ease-out]"
        />
      )}
      {iconLeft && <span className="relative flex items-center">{iconLeft}</span>}
      <span className="relative">{children}</span>
      {iconRight && <span className="relative flex items-center">{iconRight}</span>}
    </>
  )

  const motionProps = {
    whileHover: disabled ? undefined : { y: -2 },
    whileTap: disabled ? undefined : { y: 0, scale: 0.985 },
    transition: { type: 'spring' as const, stiffness: 420, damping: 26 },
  }

  if (href && !disabled) {
    return (
      <motion.div {...motionProps} className={fullWidth ? 'w-full' : 'inline-flex'}>
        <Link href={href} className={base} aria-label={aria['aria-label']}>
          {inner}
        </Link>
      </motion.div>
    )
  }

  return (
    <motion.button
      {...motionProps}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={base}
      aria-label={aria['aria-label']}
    >
      {inner}
    </motion.button>
  )
}
