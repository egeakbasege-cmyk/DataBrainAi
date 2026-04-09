'use client'

import { motion, useAnimation } from 'framer-motion'
import { useEffect } from 'react'
import type { SailState } from '@/hooks/useSailState'

const G  = '#0C0C0E'                  // ink
const GM = 'rgba(12,12,14,0.18)'
const GD = 'rgba(12,12,14,0.07)'
const GW = 'rgba(12,12,14,0.18)'

interface Props { state: SailState }

export function SailboatAnimation({ state }: Props) {
  const boatControls   = useAnimation()
  const sailControls   = useAnimation()
  const marinaControls = useAnimation()

  useEffect(() => {
    if (state === 'IDLE') {
      boatControls.stop()
      sailControls.stop()
      boatControls.set({ x: 0, rotate: 0 })
      sailControls.start({ scaleY: 0.28, transition: { duration: 0.4 } })
      marinaControls.start({ opacity: 0, transition: { duration: 0.3 } })
      return
    }
    if (state === 'THINKING') {
      sailControls.start({ scaleY: 1, transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] } })
      boatControls.start({
        rotate: [0, 2, -2, 2, -2, 0],
        transition: { duration: 2, ease: 'easeInOut', repeat: Infinity },
      })
      marinaControls.start({ opacity: 0, transition: { duration: 0.2 } })
      return
    }
    if (state === 'STREAMING') {
      sailControls.start({ scaleY: 1, transition: { duration: 0.2 } })
      boatControls.start({
        x:      [0, 175, 0],
        rotate: [0, 1.2, -0.8, 0],
        transition: {
          x:      { duration: 4.5, ease: 'easeInOut', repeat: Infinity },
          rotate: { duration: 2.2, ease: 'easeInOut', repeat: Infinity },
        },
      })
      return
    }
    if (state === 'COMPLETE') {
      boatControls.start({ x: 160, rotate: 0, transition: { duration: 0.9, ease: 'easeOut' } })
      sailControls.start({ scaleY: 0.35, transition: { duration: 0.5, delay: 0.4 } })
      marinaControls.start({ opacity: 1, transition: { duration: 0.7, delay: 0.6 } })
    }
  }, [state, boatControls, sailControls, marinaControls])

  return (
    <div className="relative w-full overflow-hidden flex items-end justify-start" style={{ height: 110 }}>
      <Waves state={state} />

      <motion.div
        animate={marinaControls}
        initial={{ opacity: 0 }}
        className="absolute right-4 bottom-5"
      >
        <MarinaIcon />
      </motion.div>

      <motion.div
        animate={boatControls}
        initial={{ x: 0, rotate: 0 }}
        className="absolute bottom-5 left-8"
        style={{ originX: 0.5, originY: 1 }}
      >
        <BoatIcon sailControls={sailControls} />
      </motion.div>
    </div>
  )
}

function Waves({ state }: { state: SailState }) {
  const moving = state === 'STREAMING'
  return (
    <svg className="absolute bottom-0 w-full" height="32" viewBox="0 0 400 32" preserveAspectRatio="none">
      <motion.path
        fill={GD}
        stroke={GW}
        strokeWidth="1"
        animate={moving ? {
          d: [
            'M0 16 Q50 6 100 16 Q150 26 200 16 Q250 6 300 16 Q350 26 400 16 L400 32 L0 32 Z',
            'M0 16 Q50 26 100 16 Q150 6 200 16 Q250 26 300 16 Q350 6 400 16 L400 32 L0 32 Z',
            'M0 16 Q50 6 100 16 Q150 26 200 16 Q250 6 300 16 Q350 26 400 16 L400 32 L0 32 Z',
          ],
        } : { d: 'M0 16 Q50 6 100 16 Q150 26 200 16 Q250 6 300 16 Q350 26 400 16 L400 32 L0 32 Z' }}
        transition={moving ? { duration: 2.8, repeat: Infinity, ease: 'easeInOut' } : {}}
      />
    </svg>
  )
}

function BoatIcon({ sailControls }: { sailControls: ReturnType<typeof useAnimation> }) {
  return (
    <svg width="72" height="54" viewBox="0 0 72 54" fill="none">
      {/* Hull */}
      <path d="M6 37 Q36 46 66 37 L62 33 Q36 41 10 33 Z" fill={G} />
      <path d="M10 33 L14 36 L58 36 L62 33" fill={G} opacity="0.35" />
      {/* Keel */}
      <path d="M36 38 L36 46 L30 46 Z" fill={G} opacity="0.4" />
      {/* Mast */}
      <line x1="36" y1="4" x2="36" y2="36" stroke={G} strokeWidth="1.8" strokeLinecap="round" />
      {/* Sails — scale from base */}
      <motion.g
        animate={sailControls}
        initial={{ scaleY: 0.28 }}
        style={{ transformBox: 'fill-box', transformOrigin: 'bottom center' }}
      >
        {/* Main sail */}
        <path d="M36 6 L60 33 L36 36 Z" fill={GM} stroke={G} strokeWidth="1.3" />
        {[14,20,26].map((y, i) => {
          const t  = (y - 6) / (33 - 6)
          const x2 = 36 + t * (60 - 36) - 1
          return <line key={y} x1={38} y1={y} x2={x2} y2={y + 0.5} stroke={G} strokeWidth="0.5" opacity={0.25 + i * 0.08} />
        })}
        {/* Foresail */}
        <path d="M36 8 L14 33 L36 36 Z" fill={GD} stroke={G} strokeWidth="0.9" />
        {[16,24,30].map((y, i) => {
          const t  = (y - 8) / (33 - 8)
          const x1 = 36 - t * (36 - 14) + 1
          return <line key={y} x1={x1} y1={y} x2={34} y2={y} stroke={G} strokeWidth="0.4" opacity={0.15 + i * 0.05} />
        })}
      </motion.g>
      {/* Rigging */}
      <line x1="36" y1="6" x2="14" y2="34" stroke={G} strokeWidth="0.5" opacity="0.2" />
      <line x1="36" y1="6" x2="58" y2="31" stroke={G} strokeWidth="0.5" opacity="0.15" />
      {/* Burgee — champagne */}
      <path d="M36 2 L44 5 L36 8 Z" fill="#C9A96E" opacity="0.85" />
      {/* Porthole */}
      <circle cx="46" cy="36" r="2.5" stroke={G} strokeWidth="0.7" fill="none" opacity="0.4" />
    </svg>
  )
}

function MarinaIcon() {
  return (
    <svg width="54" height="46" viewBox="0 0 54 46" fill="none">
      {/* Dock */}
      <rect x="0" y="33" width="54" height="4.5" rx="1.5" fill={GD} stroke={GW} strokeWidth="1" />
      {/* Posts */}
      <rect x="2"  y="28" width="4" height="13" rx="1" fill={GM} />
      <rect x="25" y="28" width="4" height="13" rx="1" fill={GM} />
      <rect x="48" y="28" width="4" height="13" rx="1" fill={GM} />
      {/* Lighthouse */}
      <rect x="20" y="8" width="14" height="22" rx="3" fill={GD} stroke={GW} strokeWidth="0.8" />
      <path d="M18 8 L27 0 L36 8 Z" fill={GM} />
      {/* Light */}
      <circle cx="27" cy="5" r="3" fill="#C9A96E" opacity="0.5" />
      {/* Stripes */}
      <rect x="20" y="15" width="14" height="2.5" rx="0.5" fill={GM} />
      <rect x="20" y="22" width="14" height="2.5" rx="0.5" fill={GM} />
    </svg>
  )
}
