'use client'

import { motion, useAnimation } from 'framer-motion'
import { useEffect } from 'react'
import type { SailState } from '@/hooks/useSailState'

interface Props {
  state: SailState
}

export function SailboatAnimation({ state }: Props) {
  const boatControls   = useAnimation()
  const sailControls   = useAnimation()
  const marinaControls = useAnimation()

  useEffect(() => {
    if (state === 'IDLE') {
      boatControls.stop()
      sailControls.stop()
      boatControls.set({ x: 0, rotate: 0 })
      sailControls.start({ scaleY: 0.3, transition: { duration: 0.4 } })
      marinaControls.start({ opacity: 0, transition: { duration: 0.3 } })
      return
    }

    if (state === 'THINKING') {
      sailControls.start({ scaleY: 1, transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] } })
      boatControls.start({
        rotate: [0, 2, -2, 2, -2, 0],
        transition: { duration: 1.8, ease: 'easeInOut', repeat: Infinity },
      })
      marinaControls.start({ opacity: 0, transition: { duration: 0.2 } })
      return
    }

    if (state === 'STREAMING') {
      sailControls.start({ scaleY: 1, transition: { duration: 0.2 } })
      boatControls.start({
        x:       [0, 180, 0],
        rotate:  [0, 1.5, -1, 0],
        transition: {
          x:      { duration: 4, ease: 'easeInOut', repeat: Infinity },
          rotate: { duration: 2, ease: 'easeInOut', repeat: Infinity },
        },
      })
      return
    }

    if (state === 'COMPLETE') {
      boatControls.start({ x: 160, rotate: 0, transition: { duration: 0.8, ease: 'easeOut' } })
      sailControls.start({ scaleY: 0.4, transition: { duration: 0.5, delay: 0.4 } })
      marinaControls.start({ opacity: 1, transition: { duration: 0.6, delay: 0.6 } })
    }
  }, [state, boatControls, sailControls, marinaControls])

  return (
    <div
      className="relative w-full flex items-end justify-start overflow-hidden"
      style={{ height: 120 }}
    >
      {/* Ocean waves */}
      <Waves state={state} />

      {/* Marina dock — appears on COMPLETE */}
      <motion.div
        animate={marinaControls}
        initial={{ opacity: 0 }}
        className="absolute right-6 bottom-6"
      >
        <MarinaIcon />
      </motion.div>

      {/* Sailboat */}
      <motion.div
        animate={boatControls}
        initial={{ x: 0, rotate: 0 }}
        className="absolute bottom-6 left-10"
        style={{ originX: 0.5, originY: 1 }}
      >
        <BoatIcon sailControls={sailControls} />
      </motion.div>
    </div>
  )
}

/* ── Sub-components ───────────────────────────────────── */

function Waves({ state }: { state: SailState }) {
  const moving = state === 'STREAMING'
  return (
    <svg
      className="absolute bottom-0 w-full"
      height="36"
      viewBox="0 0 400 36"
      preserveAspectRatio="none"
    >
      <motion.path
        fill="rgba(192,57,43,0.08)"
        stroke="rgba(192,57,43,0.22)"
        strokeWidth="1"
        animate={moving ? {
          d: [
            'M0 18 Q50 8 100 18 Q150 28 200 18 Q250 8 300 18 Q350 28 400 18 L400 36 L0 36 Z',
            'M0 18 Q50 28 100 18 Q150 8 200 18 Q250 28 300 18 Q350 8 400 18 L400 36 L0 36 Z',
            'M0 18 Q50 8 100 18 Q150 28 200 18 Q250 8 300 18 Q350 28 400 18 L400 36 L0 36 Z',
          ],
        } : { d: 'M0 18 Q50 8 100 18 Q150 28 200 18 Q250 8 300 18 Q350 28 400 18 L400 36 L0 36 Z' }}
        transition={moving ? { duration: 2.5, repeat: Infinity, ease: 'easeInOut' } : {}}
      />
    </svg>
  )
}

function BoatIcon({ sailControls }: { sailControls: ReturnType<typeof useAnimation> }) {
  return (
    <svg width="72" height="56" viewBox="0 0 72 56" fill="none">
      {/* Hull */}
      <path d="M6 38 Q36 46 66 38 L62 34 Q36 41 10 34 Z" fill="#C0392B" />
      {/* Mast */}
      <line x1="36" y1="4" x2="36" y2="37" stroke="#C0392B" strokeWidth="2" strokeLinecap="round" />
      {/* Sails group — scales from base of mast */}
      <motion.g
        animate={sailControls}
        initial={{ scaleY: 0.3 }}
        style={{ transformBox: 'fill-box', transformOrigin: 'bottom center' }}
      >
        {/* Main sail */}
        <path d="M36 6 L60 34 L36 37 Z" fill="rgba(192,57,43,0.18)" stroke="#C0392B" strokeWidth="1.5" />
        {/* Circuit traces on main sail */}
        <line x1="42" y1="12" x2="42" y2="18" stroke="#C0392B" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="42" y1="18" x2="52" y2="18" stroke="#C0392B" strokeWidth="0.9" strokeLinecap="round" />
        <line x1="52" y1="18" x2="52" y2="24" stroke="#C0392B" strokeWidth="0.9" strokeLinecap="round" />
        <rect x="41" y="11" width="2" height="2" rx="0.5" fill="#C0392B" />
        <rect x="51" y="17" width="2" height="2" rx="0.5" fill="#C0392B" />
        <rect x="51" y="23" width="2" height="2" rx="0.5" fill="#C0392B" />
        {/* Foresail */}
        <path d="M36 8 L14 34 L36 37 Z" fill="rgba(192,57,43,0.09)" stroke="rgba(192,57,43,0.38)" strokeWidth="1" />
      </motion.g>
      {/* Flag */}
      <path d="M36 2 L44 5 L36 8 Z" fill="#C0392B" opacity="0.65" />
    </svg>
  )
}

function MarinaIcon() {
  return (
    <svg width="56" height="48" viewBox="0 0 56 48" fill="none">
      {/* Dock */}
      <rect x="0" y="34" width="56" height="5" rx="2" fill="rgba(192,57,43,0.22)" stroke="rgba(192,57,43,0.35)" strokeWidth="1" />
      {/* Posts */}
      <rect x="2"  y="30" width="4" height="14" rx="1" fill="rgba(192,57,43,0.28)" />
      <rect x="26" y="30" width="4" height="14" rx="1" fill="rgba(192,57,43,0.28)" />
      <rect x="50" y="30" width="4" height="14" rx="1" fill="rgba(192,57,43,0.28)" />
      {/* Lighthouse body */}
      <rect x="21" y="8" width="14" height="24" rx="3" fill="rgba(192,57,43,0.12)" stroke="rgba(192,57,43,0.28)" strokeWidth="1" />
      {/* Roof */}
      <path d="M19 8 L28 0 L37 8 Z" fill="rgba(192,57,43,0.3)" />
      {/* Light */}
      <circle cx="28" cy="5" r="3" fill="rgba(192,57,43,0.55)" />
      {/* Stripes */}
      <rect x="21" y="16" width="14" height="3" rx="1" fill="rgba(192,57,43,0.18)" />
      <rect x="21" y="24" width="14" height="3" rx="1" fill="rgba(192,57,43,0.18)" />
    </svg>
  )
}
