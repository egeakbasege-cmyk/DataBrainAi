'use client'

/**
 * SwanLoader — Typographic Swan Assembly Animation
 * ─────────────────────────────────────────────────────────────────────────────
 * A Matrix-style loading animation where strategic terminology falls from the
 * top of the screen and assembles into the silhouette of a swan.
 *
 * Mechanics:
 *   • 45 tokens each start at y = -80px and fall to their target position
 *   • Staggered delays build the swan outline over exactly 7 seconds
 *   • Animation loops seamlessly; hard cap at 2 full loops (≈ 14 seconds)
 *   • Each token: monospace strategic term in seafoam/teal palette
 *   • After assembly: 1.8s hold → 0.6s fade-out → restart
 *
 * Design: 520×360px swan (right-facing), centered in available width.
 * Colour palette: teal rgba(20,184,166) · gold rgba(201,169,110) · navy #0C1929
 */

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence }      from 'framer-motion'

// ── Strategic lexicon ──────────────────────────────────────────────────────────

interface Token {
  word:    string
  x:       number   // px within 520×360 container (from left)
  y:       number   // px (from top)
  color:   string
  size:    number   // font-size rem multiplier (0.8 = 0.55rem)
  delay:   number   // ms before this token starts falling
  opacity: number   // final opacity
}

// These positions trace the outline of a right-facing swan.
// Coordinates are within a 520 × 360 px container.
// Delay is calculated as (index / totalTokens) × BUILD_MS, then randomised ±40ms for organic feel.

const BUILD_MS = 7_000
const HOLD_MS  = 1_800
const FADE_MS  = 600
const LOOP_MS  = BUILD_MS + HOLD_MS + FADE_MS + 300 // ≈ 9.7s

const TEAL   = 'rgba(20,184,166,'
const GOLD   = 'rgba(201,169,110,'
const NAVY   = 'rgba(12,25,41,'

// Raw token definitions — (word, x, y, colour-key, opacity)
// colour-key: 'T'=teal, 'G'=gold, 'N'=navy
const RAW: [string, number, number, 'T'|'G'|'N', number][] = [
  // ─ BEAK ─
  ['APEX',          452, 87,  'G', 0.95],

  // ─ HEAD ─
  ['ALPHA',         426, 66,  'T', 0.90],
  ['SIGNAL',        416, 88,  'T', 0.80],
  ['PRIME',         400, 73,  'T', 0.85],
  ['DELTA',         396, 97,  'T', 0.75],

  // ─ NECK · UPPER ─
  ['VECTOR',        376, 110, 'T', 0.90],
  ['ΣIGMA',         356, 127, 'T', 0.80],

  // ─ NECK · MID ─
  ['BETA',          336, 146, 'T', 0.85],
  ['HORIZON',       316, 167, 'T', 0.90],

  // ─ NECK · LOWER ─
  ['THRESHOLD',     298, 190, 'T', 0.85],
  ['VELOCITY',      280, 213, 'T', 0.80],

  // ─ CHEST ─
  ['MOMENTUM',      264, 234, 'G', 0.90],
  ['CATALYST',      250, 254, 'G', 0.85],

  // ─ FRONT BODY ─
  ['LEVERAGE',      236, 271, 'T', 0.80],
  ['SYNTHESIS',     220, 284, 'T', 0.80],

  // ─ BODY BOTTOM ─
  ['MATRIX',        196, 294, 'T', 0.85],
  ['ANSOFF',        168, 302, 'G', 0.90],
  ['FORGE',         140, 304, 'T', 0.80],
  ['MERIDIAN',      112, 300, 'T', 0.75],

  // ─ BACK BODY ─
  ['PROTOCOL',       88, 287, 'T', 0.80],
  ['COMPOUND',       72, 270, 'T', 0.80],

  // ─ TAIL · CURVES UP ─
  ['ACCRUAL',        66, 249, 'T', 0.80],
  ['ZENITH',         68, 228, 'T', 0.85],
  ['EQUILIBRIUM',    78, 206, 'T', 0.80],
  ['RUNWAY',         96, 188, 'T', 0.80],
  ['TELEMETRY',     116, 172, 'G', 0.85],
  ['PIVOT',         140, 158, 'T', 0.80],
  ['BURN·RATE',     165, 148, 'T', 0.75],

  // ─ WING FOLD · INNER ─
  ['YIELD',         174, 276, 'G', 0.70],
  ['PRECISION',     198, 282, 'T', 0.70],
  ['DECISION·ENG',  222, 272, 'T', 0.70],
  ['ARCHITECTURE',  246, 258, 'T', 0.70],

  // ─ EYE ─
  ['●',             428,  78, 'N', 0.95],

  // ─ WATER RIPPLES ─
  ['~·~·~·~',        74, 330, 'T', 0.40],
  ['~·~·~·~·~',     152, 338, 'T', 0.35],
  ['~·~·~·~·~',     238, 332, 'T', 0.38],
  ['~·~·~·~·~',     318, 338, 'T', 0.35],
  ['~·~·~·~',       392, 332, 'T', 0.32],
  ['~·~·~',         450, 336, 'T', 0.28],

  // ─ AMBIENT SPORES ─ (tiny dots around the form)
  ['·',             302, 128, 'T', 0.30],
  ['·',             450, 130, 'G', 0.35],
  ['·',              54, 180, 'T', 0.28],
  ['·',             196, 152, 'T', 0.25],
  ['·',             480,  58, 'G', 0.40],
]

// ── Build token array with staggered delays ────────────────────────────────────

function buildTokens(): Token[] {
  const total = RAW.length
  return RAW.map(([word, x, y, col, opacity], idx) => {
    // Natural stagger: outline tokens first (head→tail→wing), then fill, then water
    const baseDelay = (idx / total) * BUILD_MS
    const jitter    = (Math.random() * 80) - 40 // ±40ms organic noise
    const color = col === 'T' ? `${TEAL}${opacity})` :
                  col === 'G' ? `${GOLD}${opacity})` :
                                `${NAVY}${opacity})`

    const size = word.length > 9 ? 0.72 : word.length > 5 ? 0.78 : 0.82

    return { word, x, y, color, size, delay: Math.max(0, baseDelay + jitter), opacity }
  })
}

// ── Individual falling token ───────────────────────────────────────────────────

function FallingToken({ token, visible }: { token: Token; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.span
          key={token.word + token.x}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            y:       { type: 'spring', stiffness: 120, damping: 18, delay: token.delay / 1000 },
            opacity: { duration: 0.25, delay: token.delay / 1000 },
          }}
          style={{
            position:      'absolute',
            left:          token.x,
            top:           token.y,
            color:         token.color,
            fontFamily:    '"JetBrains Mono", "Fira Code", "Courier New", monospace',
            fontSize:      `${token.size * 0.62}rem`,
            fontWeight:    600,
            letterSpacing: '0.06em',
            whiteSpace:    'nowrap',
            userSelect:    'none',
            lineHeight:    1,
            textShadow:    token.color.includes('184,166')
                             ? '0 0 8px rgba(20,184,166,0.35)'
                             : token.color.includes('201,169')
                             ? '0 0 8px rgba(201,169,110,0.4)'
                             : 'none',
          }}
        >
          {token.word}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface SwanLoaderProps {
  /** Text displayed below the swan while loading */
  label?: string
}

export function SwanLoader({ label = 'Synthesising intelligence…' }: SwanLoaderProps) {
  const [phase,    setPhase]    = useState<'building' | 'holding' | 'fading'>('building')
  const [loopKey,  setLoopKey]  = useState(0)
  const [visible,  setVisible]  = useState(true)

  // Regenerate tokens once per loop (captures fresh random jitter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tokens = useMemo(() => buildTokens(), [loopKey])

  useEffect(() => {
    // Phase schedule
    const holdTimer = setTimeout(() => setPhase('holding'), BUILD_MS)
    const fadeTimer = setTimeout(() => { setPhase('fading'); setVisible(false) }, BUILD_MS + HOLD_MS)
    const nextTimer = setTimeout(() => {
      setLoopKey(k => k + 1)
      setPhase('building')
      setVisible(true)
    }, LOOP_MS)

    return () => {
      clearTimeout(holdTimer)
      clearTimeout(fadeTimer)
      clearTimeout(nextTimer)
    }
  }, [loopKey])

  return (
    <div
      style={{
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        width:          '100%',
        padding:        '2rem 0 1rem',
        userSelect:     'none',
      }}
      aria-label="Loading analysis…"
      aria-live="polite"
    >
      {/* Container — 520×360, the swan lives here */}
      <div
        style={{
          position:  'relative',
          width:     520,
          maxWidth:  '100%',
          height:    360,
          overflow:  'visible',
        }}
      >
        {tokens.map((token, i) => (
          <FallingToken key={`${loopKey}-${i}`} token={token} visible={visible} />
        ))}
      </div>

      {/* Label */}
      <motion.p
        key={loopKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'fading' ? 0 : 0.7 }}
        transition={{ duration: 0.6, delay: phase === 'building' ? 1.2 : 0 }}
        style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.72rem',
          fontWeight:    500,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:         'rgba(20,184,166,0.7)',
          margin:        '-24px 0 0',
        }}
      >
        {label}
      </motion.p>

      {/* Pulsing dot beneath label */}
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          width:        6,
          height:       6,
          borderRadius: '50%',
          background:   'rgba(20,184,166,0.65)',
          marginTop:    10,
          flexShrink:   0,
        }}
      />
    </div>
  )
}
