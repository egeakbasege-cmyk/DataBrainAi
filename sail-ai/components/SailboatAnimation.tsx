'use client'

import { motion, useAnimation } from 'framer-motion'
import { useEffect } from 'react'
import type { SailState } from '@/hooks/useSailState'

const INK    = '#0C0C0E'
const NAVY   = '#163450'
const GOLD   = '#C9A96E'
const SILVER = '#94A3B8'
const FOAM   = 'rgba(255,255,255,0.55)'

interface Props { state: SailState }

export function SailboatAnimation({ state }: Props) {
  const boatCtrl   = useAnimation()
  const sailCtrl   = useAnimation()
  const jibCtrl    = useAnimation()
  const wakeCtrl   = useAnimation()
  const flagCtrl   = useAnimation()
  const marinaCtrl = useAnimation()

  useEffect(() => {
    if (state === 'IDLE') {
      boatCtrl.stop(); sailCtrl.stop(); jibCtrl.stop()
      boatCtrl.set({ x: 0, rotate: 0, y: 0 })
      sailCtrl.start({ d: SAIL_FLAT, transition: { duration: 0.5 } })
      jibCtrl.start({ d: JIB_FLAT, transition: { duration: 0.5 } })
      wakeCtrl.start({ opacity: 0, scaleX: 0, transition: { duration: 0.4 } })
      flagCtrl.start({ rotate: 0, transition: { duration: 0.3 } })
      marinaCtrl.start({ opacity: 0, transition: { duration: 0.3 } })
      return
    }

    if (state === 'THINKING') {
      sailCtrl.start({ d: SAIL_FULL, transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] } })
      jibCtrl.start({ d: JIB_FULL, transition: { duration: 0.8, ease: [0.34, 1.56, 0.64, 1] } })
      boatCtrl.start({
        rotate: [0, 1.8, -1.8, 1.4, -1.2, 0.8, -0.6, 0],
        y:      [0, -2, 1, -2.5, 1.5, -1.5, 0.8, 0],
        transition: { duration: 3.6, ease: 'easeInOut', repeat: Infinity },
      })
      flagCtrl.start({
        rotate: [0, 12, -6, 10, -4, 8, 0],
        transition: { duration: 2.2, ease: 'easeInOut', repeat: Infinity },
      })
      wakeCtrl.start({ opacity: 0, transition: { duration: 0.2 } })
      marinaCtrl.start({ opacity: 0, transition: { duration: 0.2 } })
      return
    }

    if (state === 'STREAMING') {
      sailCtrl.start({
        d: [SAIL_FULL, SAIL_GUST, SAIL_FULL, SAIL_EASE, SAIL_FULL],
        transition: { duration: 2.8, ease: 'easeInOut', repeat: Infinity },
      })
      jibCtrl.start({
        d: [JIB_FULL, JIB_GUST, JIB_FULL, JIB_EASE, JIB_FULL],
        transition: { duration: 2.8, ease: 'easeInOut', repeat: Infinity },
      })
      boatCtrl.start({
        x:      [0, 184, 0],
        y:      [0, -3, 2, -2, 1, -1, 0],
        rotate: [0, -1.5, 1.2, -1.8, 1.0, -0.8, 0],
        transition: {
          x:      { duration: 5.2, ease: 'easeInOut', repeat: Infinity },
          y:      { duration: 2.6, ease: 'easeInOut', repeat: Infinity },
          rotate: { duration: 2.6, ease: 'easeInOut', repeat: Infinity },
        },
      })
      flagCtrl.start({
        rotate: [0, 22, -4, 18, -6, 20, 0],
        transition: { duration: 1.4, ease: 'easeInOut', repeat: Infinity },
      })
      wakeCtrl.start({
        opacity: [0, 0.85, 0.6, 0.85, 0],
        scaleX:  [0.1, 1, 0.9, 1, 0.1],
        transition: { duration: 2.6, ease: 'easeInOut', repeat: Infinity },
      })
      marinaCtrl.start({ opacity: 0, transition: { duration: 0.2 } })
      return
    }

    if (state === 'COMPLETE' || state === 'CONVERSING') {
      boatCtrl.start({ x: 165, rotate: 0, y: 0, transition: { duration: 1.0, ease: 'easeOut' } })
      sailCtrl.start({ d: SAIL_FLAT, transition: { duration: 0.7, delay: 0.4 } })
      jibCtrl.start({ d: JIB_FLAT, transition: { duration: 0.7, delay: 0.4 } })
      flagCtrl.start({ rotate: 0, transition: { duration: 0.4, delay: 0.4 } })
      wakeCtrl.start({ opacity: 0, scaleX: 0, transition: { duration: 0.4 } })
      marinaCtrl.start({ opacity: 1, transition: { duration: 0.8, delay: 0.8 } })
    }
  }, [state, boatCtrl, sailCtrl, jibCtrl, wakeCtrl, flagCtrl, marinaCtrl])

  return (
    <div
      className="relative w-full overflow-hidden flex items-end justify-start"
      style={{ height: 144 }}
    >
      <SeaBackground state={state} />

      {/* Marina dock */}
      <motion.div
        animate={marinaCtrl}
        initial={{ opacity: 0 }}
        className="absolute right-3 bottom-5"
      >
        <MarinaIcon glowing={state === 'COMPLETE'} />
      </motion.div>

      {/* Wake — rendered behind boat */}
      <motion.svg
        animate={wakeCtrl}
        initial={{ opacity: 0, scaleX: 0 }}
        width="72" height="14"
        viewBox="0 0 72 14"
        style={{
          position:        'absolute',
          bottom:          26,
          left:            10,
          transformOrigin: 'right center',
        }}
      >
        <path d="M72 7 Q54 2 36 7 Q18 12 0 7" stroke={FOAM} strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
        <path d="M60 7 Q48 3.5 36 7 Q24 10.5 12 7" stroke={FOAM} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.35" />
        <path d="M50 5 Q40 2 30 5" stroke={FOAM} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.2" />
      </motion.svg>

      {/* Wind streaks — visible during STREAMING */}
      {state === 'STREAMING' && <WindStreaks />}

      {/* Sparkle particles — visible during THINKING */}
      {state === 'THINKING' && <SparkleParticles />}

      {/* Boat group */}
      <motion.div
        animate={boatCtrl}
        initial={{ x: 0, rotate: 0, y: 0 }}
        className="absolute left-5"
        style={{ originX: 0.5, originY: 0.85, bottom: 22 }}
      >
        <BoatSVG
          sailCtrl={sailCtrl}
          jibCtrl={jibCtrl}
          flagCtrl={flagCtrl}
          state={state}
        />
      </motion.div>

      {/* State label */}
      {state !== 'IDLE' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position:      'absolute',
            top:            8,
            right:          10,
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.58rem',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:         GOLD,
            display:       'flex',
            alignItems:    'center',
            gap:           '0.35rem',
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.25, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{
              display:      'inline-block',
              width:         5,
              height:        5,
              borderRadius: '50%',
              background:   GOLD,
            }}
          />
          {state === 'THINKING'    ? 'Retrieving benchmarks'
           : state === 'STREAMING' ? 'Charting course'
           : state === 'CONVERSING'? 'In dialogue'
           : 'Analysis complete'}
        </motion.div>
      )}
    </div>
  )
}

/* ─── Sparkle particles — golden dots that pulse above mast during THINKING ─*/
function SparkleParticles() {
  const SPARKS = [
    { cx: 52, cy: 18, delay: 0.0, r: 2.2 },
    { cx: 60, cy: 10, delay: 0.35, r: 1.6 },
    { cx: 44, cy: 13, delay: 0.7,  r: 1.8 },
    { cx: 68, cy: 22, delay: 1.05, r: 1.4 },
    { cx: 56, cy: 6,  delay: 1.4,  r: 2.0 },
  ]
  return (
    <div
      className="absolute"
      style={{ left: 20, bottom: 22, pointerEvents: 'none' }}
    >
      <svg width="96" height="72" viewBox="0 0 96 72" fill="none">
        {SPARKS.map((s, i) => (
          <motion.circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill={GOLD}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.85, 0], scale: [0.5, 1.3, 0.5] }}
            transition={{ duration: 1.9, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
          />
        ))}
      </svg>
    </div>
  )
}

/* ─── Wind streaks — silver lines that sweep during STREAMING ───────────────*/
function WindStreaks() {
  const STREAKS = [
    { top: 20, width: 52, delay: 0.0,  opacity: 0.14 },
    { top: 32, width: 42, delay: 0.4,  opacity: 0.10 },
    { top: 13, width: 60, delay: 0.8,  opacity: 0.12 },
    { top: 44, width: 36, delay: 1.15, opacity: 0.08 },
    { top: 7,  width: 46, delay: 1.55, opacity: 0.11 },
  ]
  return (
    <>
      {STREAKS.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: [0, s.opacity, 0], x: [-20, 80, 180] }}
          transition={{ duration: 1.3, repeat: Infinity, delay: s.delay, ease: 'easeIn' }}
          style={{
            position:     'absolute',
            top:           s.top,
            left:          0,
            width:         s.width,
            height:        1.5,
            background:   `linear-gradient(90deg, transparent, ${SILVER}, transparent)`,
            borderRadius:  1,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  )
}

/* ─── Sail path keyframes ───────────────────────────────────────────────────*/
const SAIL_FLAT = 'M46 8 L46 46 L46 46 Z'
const SAIL_FULL = 'M46 8 C62 16 76 32 78 46 L46 46 Z'
const SAIL_GUST = 'M46 8 C68 14 84 30 82 46 L46 46 Z'
const SAIL_EASE = 'M46 8 C56 18 70 36 74 46 L46 46 Z'

const JIB_FLAT = 'M46 10 L46 46 L46 46 Z'
const JIB_FULL = 'M46 10 C36 22 20 36 16 44 L46 46 Z'
const JIB_GUST = 'M46 10 C32 20 14 34 12 44 L46 46 Z'
const JIB_EASE = 'M46 10 C38 24 22 38 18 44 L46 46 Z'

/* ─── Boat SVG ──────────────────────────────────────────────────────────────*/
function BoatSVG({
  sailCtrl,
  jibCtrl,
  flagCtrl,
  state,
}: {
  sailCtrl: ReturnType<typeof useAnimation>
  jibCtrl:  ReturnType<typeof useAnimation>
  flagCtrl: ReturnType<typeof useAnimation>
  state:    SailState
}) {
  return (
    <svg width="96" height="72" viewBox="0 0 96 72" fill="none">
      <defs>
        {/* Main sail — silver-tinted gradient for premium feel */}
        <linearGradient id="sailGrad" x1="46" y1="8" x2="80" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.22)" />
          <stop offset="50%"  stopColor="rgba(148,163,184,0.18)" />
          <stop offset="100%" stopColor="rgba(12,12,14,0.14)" />
        </linearGradient>
        {/* Jib — lighter silver tint */}
        <linearGradient id="jibGrad" x1="46" y1="10" x2="14" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(148,163,184,0.16)" />
        </linearGradient>
        {/* Hull gradient */}
        <linearGradient id="hullGrad" x1="48" y1="40" x2="48" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#1e4470" />
          <stop offset="100%" stopColor="#0d2235" />
        </linearGradient>
        {/* Hull gloss */}
        <linearGradient id="hullGloss" x1="20" y1="42" x2="76" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
          <stop offset="35%"  stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Rigging lines */}
      <line x1="46" y1="7"  x2="14" y2="44" stroke={INK} strokeWidth="0.7" opacity="0.15" />
      <line x1="46" y1="7"  x2="78" y2="40" stroke={INK} strokeWidth="0.7" opacity="0.12" />
      <line x1="46" y1="20" x2="22" y2="42" stroke={INK} strokeWidth="0.4" opacity="0.09" />
      <line x1="46" y1="7"  x2="16" y2="46" stroke={INK} strokeWidth="0.5" opacity="0.10" />

      {/* Main sail */}
      <motion.path
        animate={sailCtrl}
        initial={{ d: SAIL_FLAT }}
        fill="url(#sailGrad)"
        stroke={INK}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {/* Batten lines */}
      {[14, 22, 30, 38].map((y, i) => {
        const t  = (y - 8) / (46 - 8)
        const x2 = 46 + t * (78 - 46)
        return (
          <line
            key={y}
            x1={47} y1={y}
            x2={x2 - 1} y2={y + 0.5}
            stroke={INK}
            strokeWidth="0.4"
            opacity={0.10 + i * 0.04}
          />
        )
      })}

      {/* Jib */}
      <motion.path
        animate={jibCtrl}
        initial={{ d: JIB_FLAT }}
        fill="url(#jibGrad)"
        stroke={INK}
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* Mast */}
      <line x1="46" y1="4" x2="46" y2="48" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="46" cy="5" r="1.8" fill={GOLD} opacity="0.75" />

      {/* Boom */}
      <line x1="46" y1="46" x2="78" y2="46" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />

      {/* Flag */}
      <motion.path
        animate={flagCtrl}
        d="M46 2 L57 5.5 L46 9 Z"
        fill={GOLD}
        opacity="0.92"
        style={{ transformOrigin: '46px 5.5px' }}
      />

      {/* Hull */}
      <path d="M18 44 Q46 50 76 44 L72 42 Q46 48 22 42 Z" fill="rgba(255,255,255,0.07)" />
      <path d="M14 44 Q46 60 82 44 L78 48 Q46 64 18 48 Z" fill="url(#hullGrad)" />
      <path d="M20 44 Q46 58 76 44 L76 46 Q46 60 20 46 Z" fill="url(#hullGloss)" />
      {/* Gold waterline */}
      <path d="M16 47 Q46 62 80 47 L80 48.5 Q46 63.5 16 48.5 Z" fill={GOLD} opacity="0.40" />
      {/* Keel shadow */}
      <ellipse cx="48" cy="62" rx="20" ry="3.5" fill={INK} opacity="0.08" />

      {/* Portholes */}
      <circle cx="56" cy="46" r="2.4" stroke={INK} strokeWidth="0.8" fill="rgba(201,169,110,0.15)" opacity="0.55" />
      <circle cx="64" cy="46" r="2.1" stroke={INK} strokeWidth="0.7" fill="none" opacity="0.40" />
      <circle cx="72" cy="45" r="1.8" stroke={INK} strokeWidth="0.6" fill="none" opacity="0.30" />

      {/* Cockpit */}
      <ellipse cx="34" cy="44" rx="7" ry="2" fill={NAVY} opacity="0.7" />

      {/* Enhanced captain with peaked hat and telescope */}
      {state !== 'IDLE' && (
        <g transform="translate(22, 22)" opacity="0.92">
          {/* Body */}
          <path d="M4.5 14 C4 10.5 5 8.5 6 14 L7.5 18.5 L3 18.5 Z" fill={NAVY} />
          {/* Head */}
          <ellipse cx="5.5" cy="9.5" rx="2.6" ry="2.8" fill="#E8C99A" />
          {/* Peaked captain hat */}
          <path d="M3.2 8.2 L5.5 4.8 L7.8 8.2 Z" fill={NAVY} />
          <rect x="2.8" y="7.8" width="5.4" height="1.1" rx="0.4" fill={NAVY} />
          {/* Gold hat band */}
          <rect x="3.2" y="7.8" width="4.8" height="0.75" fill={GOLD} opacity="0.88" />
          {/* Telescope arm extended forward */}
          <line x1="7.5" y1="12.5" x2="12" y2="10" stroke={NAVY} strokeWidth="1.3" strokeLinecap="round" />
          {/* Telescope lens */}
          <circle cx="12.5" cy="9.6" r="1.5" stroke={NAVY} strokeWidth="0.9" fill="rgba(201,169,110,0.18)" />
        </g>
      )}
    </svg>
  )
}

/* ─── Sea background ────────────────────────────────────────────────────────*/
function SeaBackground({ state }: { state: SailState }) {
  const moving = state === 'STREAMING'
  const active = state !== 'IDLE'

  return (
    <svg
      className="absolute bottom-0 w-full"
      height="56"
      viewBox="0 0 480 56"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(12,12,14,0.00)" />
          <stop offset="40%"  stopColor="rgba(12,12,14,0.04)" />
          <stop offset="100%" stopColor="rgba(12,12,14,0.09)" />
        </linearGradient>
      </defs>

      {/* Deep ocean fill */}
      <rect x="0" y="30" width="480" height="26" fill="url(#seaGrad)" />

      {/* Silver horizon shimmer line */}
      <motion.line
        x1="0" y1="30" x2="480" y2="30"
        stroke={SILVER}
        strokeWidth="0.6"
        animate={active ? { opacity: [0.06, 0.18, 0.06] } : { opacity: 0.06 }}
        transition={active ? { duration: 3.5, repeat: Infinity, ease: 'easeInOut' } : {}}
      />

      {/* Layer 1 — far swells */}
      <motion.path
        fill="rgba(12,12,14,0.03)"
        animate={active ? {
          d: [
            'M0 36 Q80 28 160 36 Q240 44 320 36 Q400 28 480 36 L480 56 L0 56 Z',
            'M0 36 Q80 44 160 36 Q240 28 320 36 Q400 44 480 36 L480 56 L0 56 Z',
          ],
        } : { d: 'M0 36 Q80 28 160 36 Q240 44 320 36 Q400 28 480 36 L480 56 L0 56 Z' }}
        transition={active ? { duration: 4.2, repeat: Infinity, ease: 'easeInOut' } : {}}
      />

      {/* Layer 2 — mid swells */}
      <motion.path
        fill="rgba(12,12,14,0.05)"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="0.6"
        animate={active ? {
          d: [
            'M0 38 Q60 30 120 38 Q180 46 240 38 Q300 30 360 38 Q420 46 480 38 L480 56 L0 56 Z',
            'M0 38 Q60 46 120 38 Q180 30 240 38 Q300 46 360 38 Q420 30 480 38 L480 56 L0 56 Z',
          ],
        } : { d: 'M0 38 Q60 30 120 38 Q180 46 240 38 Q300 30 360 38 Q420 46 480 38 L480 56 L0 56 Z' }}
        transition={active ? { duration: 3.0, repeat: Infinity, ease: 'easeInOut' } : {}}
      />

      {/* Layer 3 — surface chop */}
      <motion.path
        fill="rgba(12,12,14,0.08)"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="0.8"
        animate={active ? {
          d: [
            'M0 42 Q40 36 80 42 Q120 48 160 42 Q200 36 240 42 Q280 48 320 42 Q360 36 400 42 Q440 48 480 42 L480 56 L0 56 Z',
            'M0 42 Q40 48 80 42 Q120 36 160 42 Q200 48 240 42 Q280 36 320 42 Q360 48 400 42 Q440 36 480 42 L480 56 L0 56 Z',
          ],
        } : { d: 'M0 42 Q40 36 80 42 Q120 48 160 42 Q200 36 240 42 Q280 48 320 42 Q360 36 400 42 Q440 48 480 42 L480 56 L0 56 Z' }}
        transition={active ? { duration: 1.9, repeat: Infinity, ease: 'easeInOut' } : {}}
      />

      {/* Foam crests — only when surging */}
      {moving && (
        <>
          <motion.path
            fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" strokeLinecap="round"
            animate={{ d: ['M60 40 Q80 36 100 40', 'M60 40 Q80 44 100 40'], opacity: [0.18, 0.32, 0.18] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="0.9" strokeLinecap="round"
            animate={{ d: ['M200 38 Q220 34 240 38', 'M200 38 Q220 42 240 38'], opacity: [0.14, 0.26, 0.14] }}
            transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
          />
          <motion.path
            fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8" strokeLinecap="round"
            animate={{ d: ['M340 41 Q360 37 380 41', 'M340 41 Q360 45 380 41'], opacity: [0.12, 0.22, 0.12] }}
            transition={{ duration: 2.7, repeat: Infinity, ease: 'easeInOut', delay: 1.4 }}
          />
        </>
      )}
    </svg>
  )
}

/* ─── Marina icon ───────────────────────────────────────────────────────────*/
function MarinaIcon({ glowing }: { glowing: boolean }) {
  return (
    <svg width="58" height="52" viewBox="0 0 58 52" fill="none">
      {/* Animated concentric gold rings from lighthouse — COMPLETE state */}
      {glowing && (
        <>
          <motion.circle
            cx="27" cy="5.5" fill="none" stroke={GOLD} strokeWidth="1.2"
            animate={{ r: [4, 11, 18], opacity: [0.5, 0.25, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.circle
            cx="27" cy="5.5" fill="none" stroke={GOLD} strokeWidth="0.8"
            animate={{ r: [4, 13, 22], opacity: [0.35, 0.15, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 0.9 }}
          />
        </>
      )}

      {/* Pier platform */}
      <rect x="2"  y="36" width="54" height="5"   rx="2"    fill="rgba(12,12,14,0.1)"  stroke="rgba(12,12,14,0.1)" strokeWidth="0.8" />
      {/* Mooring posts */}
      <rect x="4"  y="31" width="4.5" height="13" rx="1.2"  fill="rgba(12,12,14,0.10)" />
      <rect x="27" y="31" width="4.5" height="13" rx="1.2"  fill="rgba(12,12,14,0.10)" />
      <rect x="50" y="31" width="4.5" height="13" rx="1.2"  fill="rgba(12,12,14,0.10)" />
      {/* Post caps */}
      <rect x="3.5"  y="29.5" width="5.5" height="2" rx="1" fill={GOLD} opacity="0.55" />
      <rect x="26.5" y="29.5" width="5.5" height="2" rx="1" fill={GOLD} opacity="0.55" />
      <rect x="49.5" y="29.5" width="5.5" height="2" rx="1" fill={GOLD} opacity="0.55" />
      {/* Harbour building */}
      <rect x="19" y="9"  width="16" height="24" rx="3.5"   fill="rgba(12,12,14,0.09)" stroke="rgba(12,12,14,0.09)" strokeWidth="0.8" />
      {/* Roof */}
      <path d="M16 9 L27 2 L38 9 Z" fill="rgba(12,12,14,0.09)" stroke="rgba(12,12,14,0.07)" strokeWidth="0.7" />
      {/* Lighthouse beacon */}
      <circle cx="27" cy="5.5" r="3.5" fill={GOLD} opacity="0.50" />
      <circle cx="27" cy="5.5" r="2"   fill={GOLD} opacity="0.75" />
      <circle cx="27" cy="5.5" r="5.5" fill={GOLD} opacity="0.08" />
      {/* Windows */}
      <rect x="19" y="17" width="16" height="3"  rx="0.5" fill="rgba(12,12,14,0.06)" />
      <rect x="19" y="24" width="16" height="3"  rx="0.5" fill="rgba(12,12,14,0.06)" />
      <rect x="24" y="27" width="6"  height="6"  rx="1.5" fill="rgba(12,12,14,0.07)" />
      <rect x="24" y="12" width="6"  height="4"  rx="1"   fill="rgba(201,169,110,0.2)" stroke="rgba(12,12,14,0.1)" strokeWidth="0.5" />
    </svg>
  )
}
