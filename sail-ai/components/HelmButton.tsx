'use client'

import { motion } from 'framer-motion'
import type { SailState } from '@/hooks/useSailState'

interface Props {
  state:    SailState
  onClick:  () => void
  disabled: boolean
}

export function HelmButton({ state, onClick, disabled }: Props) {
  const spinning = state === 'THINKING'
  const label =
    state === 'THINKING'   ? 'Charting course…' :
    state === 'STREAMING'  ? 'Reading the wind…' :
    state === 'COMPLETE'   ? 'Set a new course' :
                             'Chart course'

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      className="relative flex items-center gap-3 px-6 py-3 rounded-pill font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background:   disabled && state !== 'IDLE' && state !== 'COMPLETE' ? 'rgba(192,57,43,0.15)' : '#C0392B',
        color:        '#F1F5F9',
        border:       '1px solid rgba(192,57,43,0.4)',
        boxShadow:    disabled ? 'none' : '0 0 20px rgba(192,57,43,0.35)',
      }}
    >
      {/* Ship's wheel SVG */}
      <motion.span
        animate={spinning ? { rotate: 360 } : { rotate: 0 }}
        transition={spinning ? { duration: 2, repeat: Infinity, ease: 'linear' } : { duration: 0.5 }}
        style={{ display: 'inline-flex', flexShrink: 0 }}
      >
        <HelmSvg />
      </motion.span>

      {label}
    </motion.button>
  )
}

function HelmSvg() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.5" />
      {/* Inner hub */}
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      {/* Spokes — 6 spokes at 60° intervals */}
      <line x1="12" y1="2.5"  x2="12" y2="9.5"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="14.5" x2="12" y2="21.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2.5"  y1="12" x2="9.5"  y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4.4" y1="4.4"   x2="9.4"  y2="9.4"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14.6" y1="14.6" x2="19.6" y2="19.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19.6" y1="4.4"  x2="14.6" y2="9.4"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9.4"  y1="14.6" x2="4.4"  y2="19.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
