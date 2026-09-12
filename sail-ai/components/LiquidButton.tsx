'use client'

/**
 * components/LiquidButton.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * True "liquid mercury" CTA for the Azulejo × Liquid Silver system.
 *   • a LIVING metallic chrome gradient whose highlight travels continuously
 *   • a mercury RIPPLE that spawns from the exact pointer-down coordinates
 *   • a physical SQUISH on press (flattens + widens, then springs back)
 * Renders as a Next <Link> when `href` is set, otherwise a native <button>.
 */

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useCallback, useRef, useState, type ReactNode } from 'react'

type Variant = 'silver' | 'cobalt' | 'ghost' | 'gold' | 'glass'
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

interface RippleT { id: number; x: number; y: number }

const SIZES: Record<Size, { padding: string; font: string; height: string }> = {
  sm: { padding: '0 1.1rem',  font: '0.66rem',  height: '2.25rem' },
  md: { padding: '0 1.5rem',  font: '0.72rem',  height: '2.6rem'  },
  lg: { padding: '0 1.9rem',  font: '0.8125rem', height: '3.05rem' },
}

/* Living chrome surfaces — animated by sliding background-position. */
const SILVER_SURFACE =
  'linear-gradient(105deg,#ffffff 0%,#e8edf3 18%,#b6c1cf 34%,#f6f9fc 50%,#adb8c7 66%,#dce3eb 82%,#ffffff 100%)'
const COBALT_SURFACE =
  'linear-gradient(105deg,#052a5e 0%,#0c4da2 22%,#3a97f5 42%,#0a4796 58%,#0ABAB5 78%,#052a5e 100%)'
const GOLD_SURFACE =
  'linear-gradient(105deg,#B8860B 0%,#D4AF37 22%,#F9E29D 44%,#D4AF37 60%,#C9A96E 80%,#B8860B 100%)'

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
  const [ripples, setRipples] = useState<RippleT[]>([])
  const idRef = useRef(0)

  const spawnRipple = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const id = idRef.current++
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }])
    window.setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 680)
  }, [])

  const isGhost  = variant === 'ghost'
  const isGlass  = variant === 'glass'
  const isCobalt = variant === 'cobalt'
  const isGold   = variant === 'gold'
  const isFlat   = isGhost || isGlass
  const dims     = SIZES[size]

  const surface = isFlat
    ? 'transparent'
    : isCobalt ? COBALT_SURFACE : isGold ? GOLD_SURFACE : SILVER_SURFACE
  const textColor = isGlass
    ? '#F4E9C8'
    : isGhost
    ? 'var(--azx-cobalt, #0A7E79)'
    : isCobalt
    ? '#E2F6F4'
    : isGold
    ? '#1A102F'
    : '#0A3B38'
  const rippleColor = isGold ? 'rgba(26,16,47,0.28)' : isFlat || isCobalt ? 'rgba(255,255,255,0.55)' : 'rgba(10,59,56,0.32)'

  const baseStyle: React.CSSProperties = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    width: fullWidth ? '100%' : undefined,
    height: dims.height,
    padding: dims.padding,
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    fontSize: dims.font,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    color: textColor,
    textDecoration: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    border: isGlass
      ? '1px solid rgba(201,169,110,0.42)'
      : isGhost ? '1.5px solid rgba(10,126,121,0.32)'
      : isGold ? '1px solid rgba(249,226,157,0.7)'
      : '1px solid rgba(255,255,255,0.55)',
    borderRadius: 999,
    overflow: 'hidden',
    isolation: 'isolate',
    background: surface,
    backgroundSize: isFlat ? 'auto' : '220% 100%',
    backgroundColor: isGlass ? 'rgba(31,19,53,0.55)' : isGhost ? 'rgba(255,255,255,0.6)' : undefined,
    backdropFilter: isFlat ? 'blur(10px)' : undefined,
    WebkitBackdropFilter: isFlat ? 'blur(10px)' : undefined,
    opacity: disabled ? 0.45 : 1,
    boxShadow: isFlat
      ? 'none'
      : isCobalt
      ? 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,18,50,0.5), 0 12px 26px -12px rgba(10,126,121,0.65)'
      : isGold
      ? 'inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -3px 6px rgba(138,109,59,0.55), 0 14px 30px -12px rgba(212,175,55,0.55)'
      : 'inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -3px 6px rgba(100,116,139,0.5), 0 12px 26px -14px rgba(15,23,42,0.55)',
    WebkitTapHighlightColor: 'transparent',
  }

  const inner = (
    <>
      {/* travelling chrome highlight */}
      {!isFlat && (
        <motion.span
          aria-hidden
          style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit',
            background: 'linear-gradient(105deg, transparent 32%, rgba(255,255,255,0.8) 48%, transparent 64%)',
            mixBlendMode: 'overlay', zIndex: 1, pointerEvents: 'none',
          }}
          initial={{ x: '-130%' }}
          animate={{ x: ['-130%', '130%'] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1.1 }}
        />
      )}

      {/* mercury ripples from the pointer-down point */}
      <AnimatePresence>
        {ripples.map(r => (
          <motion.span
            key={r.id}
            aria-hidden
            initial={{ scale: 0, opacity: 0.65 }}
            animate={{ scale: 4.2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.68, ease: 'easeOut' }}
            style={{
              position: 'absolute', left: r.x, top: r.y,
              width: 120, height: 120, marginLeft: -60, marginTop: -60,
              borderRadius: '50%', background: rippleColor,
              filter: 'blur(2px)', zIndex: 2, pointerEvents: 'none',
            }}
          />
        ))}
      </AnimatePresence>

      {iconLeft && <span style={{ position: 'relative', zIndex: 3, display: 'inline-flex' }}>{iconLeft}</span>}
      <span style={{ position: 'relative', zIndex: 3 }}>{children}</span>
      {iconRight && <span style={{ position: 'relative', zIndex: 3, display: 'inline-flex' }}>{iconRight}</span>}
    </>
  )

  const motionProps = {
    style: baseStyle,
    onPointerDown: disabled ? undefined : spawnRipple,
    whileHover: disabled ? undefined : { scale: 1.03, backgroundPositionX: isGhost ? undefined : '100%' },
    whileTap: disabled ? undefined : { scaleX: 1.06, scaleY: 0.86, borderRadius: 44 },
    transition: { type: 'spring' as const, stiffness: 440, damping: 16, mass: 0.7 },
  }

  if (href && !disabled) {
    // The visible label lives in `inner`, so give the overlay link its own
    // accessible name — otherwise the CTA is an unnamed link to crawlers and
    // assistive tech, which is why navigation felt unreliable/undirected.
    const linkLabel = aria['aria-label'] ?? (typeof children === 'string' ? children : undefined)
    return (
      <motion.div {...motionProps} className={className}>
        <Link
          href={href}
          aria-label={linkLabel}
          style={{ position: 'absolute', inset: 0, zIndex: 4 }}
        />
        {inner}
      </motion.div>
    )
  }

  return (
    <motion.button
      {...motionProps}
      className={className}
      type={type}
      disabled={disabled}
      aria-label={aria['aria-label']}
      onClick={onClick}
    >
      {inner}
    </motion.button>
  )
}
