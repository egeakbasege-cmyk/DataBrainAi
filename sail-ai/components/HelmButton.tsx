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
    state === 'THINKING'  ? 'Charting course…' :
    state === 'STREAMING' ? 'Reading the wind…' :
    state === 'COMPLETE'  ? 'New analysis' :
                            'Chart course'

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <motion.span
        animate={spinning ? { rotate: 360 } : { rotate: 0 }}
        transition={spinning ? { duration: 3, repeat: Infinity, ease: 'linear' } : { duration: 0.4 }}
        style={{ display: 'inline-flex', flexShrink: 0 }}
      >
        <HelmSVG />
      </motion.span>
      {label}
    </motion.button>
  )
}

function HelmSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9.5"  stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="2.5"  stroke="currentColor" strokeWidth="1.4" />
      <line x1="12" y1="2.5"  x2="12" y2="9.5"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="12" y1="14.5" x2="12" y2="21.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="2.5"  y1="12" x2="9.5"  y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="14.5" y1="12" x2="21.5" y2="12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="4.9"  y1="4.9"  x2="9.4"  y2="9.4"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="14.6" y1="14.6" x2="19.1" y2="19.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="19.1" y1="4.9"  x2="14.6" y2="9.4"  stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="9.4"  y1="14.6" x2="4.9"  y2="19.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
