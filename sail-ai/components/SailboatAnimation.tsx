'use client'

import { motion, useAnimation } from 'framer-motion'
import { useEffect } from 'react'
import type { SailState } from '@/hooks/useSailState'

const INK   = '#0C0C0E'
const NAVY  = '#163450'
const GOLD  = '#C9A96E'
const LIGHT = 'rgba(12,12,14,0.14)'
const WAKE  = 'rgba(12,12,14,0.06)'

interface Props { state: SailState }

export function SailboatAnimation({ state }: Props) {
  const boatCtrl   = useAnimation()
  const sailCtrl   = useAnimation()
  const marinaCtrl = useAnimation()
  const wakeCtrl   = useAnimation()
  const flagCtrl   = useAnimation()

  useEffect(() => {
    if (state === 'IDLE') {
      boatCtrl.stop()
      sailCtrl.stop()
      boatCtrl.set({ x: 0, rotate: 0 })
      sailCtrl.start({ scaleY: 0.22, transition: { duration: 0.5 } })
      marinaCtrl.start({ opacity: 0, transition: { duration: 0.3 } })
      wakeCtrl.start({ opacity: 0, scaleX: 0, transition: { duration: 0.3 } })
      flagCtrl.start({ rotate: 0, transition: { duration: 0.3 } })
      return
    }

    if (state === 'THINKING') {
      sailCtrl.start({ scaleY: 1, transition: { duration: 0.7, ease: [0.34, 1.56, 0.64, 1] } })
      boatCtrl.start({
        rotate: [0, 2.5, -2.5, 2, -1.5, 0],
        transition: { duration: 2.4, ease: 'easeInOut', repeat: Infinity },
      })
      flagCtrl.start({
        rotate: [0, 15, -8, 12, 0],
        transition: { duration: 1.8, ease: 'easeInOut', repeat: Infinity },
      })
      marinaCtrl.start({ opacity: 0, transition: { duration: 0.2 } })
      wakeCtrl.start({ opacity: 0, transition: { duration: 0.2 } })
      return
    }

    if (state === 'STREAMING') {
      sailCtrl.start({ scaleY: 1, transition: { duration: 0.2 } })
      boatCtrl.start({
        x:      [0, 178, 0],
        rotate: [0, 1.5, -1, 1.2, -0.8, 0],
        transition: {
          x:      { duration: 4.8, ease: 'easeInOut', repeat: Infinity },
          rotate: { duration: 2.4, ease: 'easeInOut', repeat: Infinity },
        },
      })
      flagCtrl.start({
        rotate: [0, 20, -5, 18, -3, 20],
        transition: { duration: 1.2, ease: 'easeInOut', repeat: Infinity },
      })
      wakeCtrl.start({
        opacity: [0, 0.7, 0],
        scaleX:  [0.2, 1, 0.2],
        transition: { duration: 2.4, ease: 'easeInOut', repeat: Infinity },
      })
      return
    }

    if (state === 'COMPLETE') {
      boatCtrl.start({ x: 162, rotate: 0, transition: { duration: 1.0, ease: 'easeOut' } })
      sailCtrl.start({ scaleY: 0.28, transition: { duration: 0.55, delay: 0.5 } })
      flagCtrl.start({ rotate: 0, transition: { duration: 0.4, delay: 0.5 } })
      wakeCtrl.start({ opacity: 0, transition: { duration: 0.4 } })
      marinaCtrl.start({ opacity: 1, transition: { duration: 0.7, delay: 0.7 } })
    }
  }, [state, boatCtrl, sailCtrl, marinaCtrl, wakeCtrl, flagCtrl])

  return (
    <div
      className="relative w-full overflow-hidden flex items-end justify-start"
      style={{ height: 120 }}
    >
      <SeaBackground state={state} />

      <motion.div
        animate={marinaCtrl}
        initial={{ opacity: 0 }}
        className="absolute right-3 bottom-6"
      >
        <MarinaIcon />
      </motion.div>

      {/* Wake trail */}
      <motion.div
        animate={wakeCtrl}
        initial={{ opacity: 0, scaleX: 0 }}
        style={{
          position:     'absolute',
          bottom:       28,
          left:         18,
          width:        60,
          height:       6,
          background:   `linear-gradient(90deg, transparent, ${WAKE} 40%, ${WAKE})`,
          borderRadius: '50%',
          transformOrigin: 'left center',
        }}
      />

      {/* Boat */}
      <motion.div
        animate={boatCtrl}
        initial={{ x: 0, rotate: 0 }}
        className="absolute bottom-6 left-4"
        style={{ originX: 0.5, originY: 1 }}
      >
        <BoatSVG sailCtrl={sailCtrl} flagCtrl={flagCtrl} state={state} />
      </motion.div>

      {/* State label */}
      {state !== 'IDLE' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position:      'absolute',
            top:            8,
            right:          8,
            fontFamily:     'Inter, sans-serif',
            fontSize:       '0.58rem',
            letterSpacing:  '0.1em',
            textTransform:  'uppercase',
            color:          GOLD,
            display:        'flex',
            alignItems:     'center',
            gap:            '0.35rem',
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{
              display:      'inline-block',
              width:         5,
              height:        5,
              borderRadius: '50%',
              background:   GOLD,
            }}
          />
          {state === 'THINKING' ? 'Retrieving benchmarks'
            : state === 'STREAMING' ? 'Charting course'
            : 'Arrived'}
        </motion.div>
      )}
    </div>
  )
}

/* ─── Sea background ─────────────────────────────── */
function SeaBackground({ state }: { state: SailState }) {
  const moving = state === 'STREAMING'
  return (
    <svg className="absolute bottom-0 w-full" height="44" viewBox="0 0 480 44" preserveAspectRatio="none">
      <motion.path
        fill="rgba(12,12,14,0.04)"
        animate={moving ? {
          d: [
            'M0 22 Q60 10 120 22 Q180 34 240 22 Q300 10 360 22 Q420 34 480 22 L480 44 L0 44 Z',
            'M0 22 Q60 34 120 22 Q180 10 240 22 Q300 34 360 22 Q420 10 480 22 L480 44 L0 44 Z',
          ],
        } : { d: 'M0 22 Q60 10 120 22 Q180 34 240 22 Q300 10 360 22 Q420 34 480 22 L480 44 L0 44 Z' }}
        transition={moving ? { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } : {}}
      />
      <motion.path
        fill="rgba(12,12,14,0.07)"
        stroke="rgba(12,12,14,0.1)"
        strokeWidth="0.8"
        animate={moving ? {
          d: [
            'M0 28 Q60 18 120 28 Q180 38 240 28 Q300 18 360 28 Q420 38 480 28 L480 44 L0 44 Z',
            'M0 28 Q60 38 120 28 Q180 18 240 28 Q300 38 360 28 Q420 18 480 28 L480 44 L0 44 Z',
          ],
        } : { d: 'M0 28 Q60 18 120 28 Q180 38 240 28 Q300 18 360 28 Q420 38 480 28 L480 44 L0 44 Z' }}
        transition={moving ? { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } : {}}
      />
    </svg>
  )
}

/* ─── Boat SVG ───────────────────────────────────── */
function BoatSVG({
  sailCtrl,
  flagCtrl,
  state,
}: {
  sailCtrl: ReturnType<typeof useAnimation>
  flagCtrl: ReturnType<typeof useAnimation>
  state:    SailState
}) {
  return (
    <svg width="88" height="68" viewBox="0 0 88 68" fill="none">

      {/* Mast */}
      <line x1="44" y1="5" x2="44" y2="46" stroke={INK} strokeWidth="2" strokeLinecap="round" />

      {/* Sails */}
      <motion.g
        animate={sailCtrl}
        initial={{ scaleY: 0.22 }}
        style={{ transformBox: 'fill-box', transformOrigin: 'bottom center' }}
      >
        {/* Main sail */}
        <path d="M44 7 L74 43 L44 46 Z" fill={LIGHT} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
        {[13, 20, 28, 36].map((y, i) => {
          const t  = (y - 7) / (43 - 7)
          const x2 = 44 + t * (74 - 44) - 1
          return (
            <line key={y} x1={46} y1={y} x2={x2} y2={y + 0.5}
              stroke={INK} strokeWidth="0.45" opacity={0.18 + i * 0.06} />
          )
        })}
        {/* Foresail */}
        <path d="M44 9 L16 43 L44 46 Z" fill={WAKE} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
        {[17, 26, 35].map((y, i) => {
          const t  = (y - 9) / (43 - 9)
          const x1 = 44 - t * (44 - 16) + 1
          return <line key={y} x1={x1} y1={y} x2={42} y2={y}
            stroke={INK} strokeWidth="0.35" opacity={0.12 + i * 0.05} />
        })}
      </motion.g>

      {/* Animated flag */}
      <motion.path
        animate={flagCtrl}
        d="M44 2 L54 5.5 L44 9 Z"
        fill={GOLD}
        opacity="0.9"
        style={{ transformOrigin: '44px 5.5px' }}
      />

      {/* Rigging */}
      <line x1="44" y1="6"  x2="16" y2="44" stroke={INK} strokeWidth="0.6" opacity="0.18" />
      <line x1="44" y1="6"  x2="72" y2="40" stroke={INK} strokeWidth="0.6" opacity="0.14" />
      <line x1="44" y1="18" x2="22" y2="40" stroke={INK} strokeWidth="0.4" opacity="0.1"  />

      {/* Hull */}
      <path d="M10 45 Q44 56 78 45 L74 41 Q44 51 14 41 Z" fill={NAVY} />
      <path d="M14 41 Q44 49 74 41 L72 39 Q44 47 16 39 Z" fill="rgba(255,255,255,0.06)" />
      <path d="M12 47 Q44 57 76 47 L74 46 Q44 55 14 46 Z" fill={GOLD} opacity="0.35" />
      <path d="M44 50 L40 58 L48 58 Z" fill={NAVY} opacity="0.6" />

      {/* Portholes */}
      <circle cx="54" cy="44" r="2.2" stroke={INK} strokeWidth="0.7" fill="none" opacity="0.4" />
      <circle cx="54" cy="44" r="0.9" fill="rgba(201,169,110,0.25)" />
      <circle cx="62" cy="44" r="2"   stroke={INK} strokeWidth="0.6" fill="none" opacity="0.3" />

      {/* Captain on deck (shown when active) */}
      {state !== 'IDLE' && (
        <g transform="translate(38, 30)" opacity="0.85">
          <path d="M4 10 Q5 7.5 6 10 L7 14 L3 14 Z" fill={NAVY} />
          <ellipse cx="5" cy="7.5" rx="2.2" ry="2.5" fill="#E8C99A" />
          <rect x="3" y="3.5" width="4" height="2.5" rx="0.5" fill={NAVY} />
          <rect x="2.5" y="5.8" width="5" height="0.8" rx="0.3" fill={NAVY} />
          <rect x="3" y="5.8" width="4" height="0.6" rx="0" fill={GOLD} opacity="0.8" />
        </g>
      )}
    </svg>
  )
}

/* ─── Marina icon ────────────────────────────────── */
function MarinaIcon() {
  return (
    <svg width="58" height="50" viewBox="0 0 58 50" fill="none">
      <rect x="2"  y="35" width="54" height="5"   rx="2"   fill={LIGHT} stroke="rgba(12,12,14,0.1)" strokeWidth="0.8" />
      <rect x="4"  y="30" width="4.5" height="13" rx="1.2" fill={LIGHT} />
      <rect x="27" y="30" width="4.5" height="13" rx="1.2" fill={LIGHT} />
      <rect x="50" y="30" width="4.5" height="13" rx="1.2" fill={LIGHT} />
      <rect x="3.5"  y="28.5" width="5.5" height="2" rx="1" fill={GOLD} opacity="0.55" />
      <rect x="26.5" y="28.5" width="5.5" height="2" rx="1" fill={GOLD} opacity="0.55" />
      <rect x="49.5" y="28.5" width="5.5" height="2" rx="1" fill={GOLD} opacity="0.55" />
      <rect x="19" y="8"  width="16" height="24" rx="3.5" fill={LIGHT} stroke="rgba(12,12,14,0.1)" strokeWidth="0.8" />
      <path d="M16 8 L27 1 L38 8 Z" fill={LIGHT} stroke="rgba(12,12,14,0.08)" strokeWidth="0.7" />
      <circle cx="27" cy="5" r="3.5" fill={GOLD} opacity="0.5" />
      <circle cx="27" cy="5" r="2"   fill={GOLD} opacity="0.7" />
      <circle cx="27" cy="5" r="5.5" fill={GOLD} opacity="0.1" />
      <rect x="19" y="16" width="16" height="3"  rx="0.5" fill="rgba(12,12,14,0.06)" />
      <rect x="19" y="23" width="16" height="3"  rx="0.5" fill="rgba(12,12,14,0.06)" />
      <rect x="24" y="26" width="6"  height="6"  rx="1.5" fill="rgba(12,12,14,0.07)" />
      <rect x="24" y="11" width="6"  height="4"  rx="1"   fill="rgba(201,169,110,0.2)" stroke="rgba(12,12,14,0.1)" strokeWidth="0.5" />
    </svg>
  )
}
