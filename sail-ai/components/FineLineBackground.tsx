'use client'

/**
 * FineLineBackground
 * ─────────────────────────────────────────────────────────────────────────────
 * Metallic-silver hero backdrop inspired by the Mercedes-AMG "one star" livery:
 * a polished silver field scattered with mid-size three-pointed tri-stars that
 * disperse (dense → sparse) across the panel, plus a few minimal line "tattoos"
 * — a marine sailboat, a money coin, and a business growth chart — etched in
 * faint gold within the mobile-visible band so they read on phones and desktop.
 *
 * The stars are now individually rendered (not a static pattern) so each one can
 * gently drift, twinkle, and — for roughly half the field, chosen at random —
 * fade fully out and back in on its own cadence. Every star carries a purple
 * glow plus a dark-purple drop shadow. The scatter is generated from a fixed
 * seed so the server and client render identically (no hydration mismatch), and
 * all motion is disabled under `prefers-reduced-motion`.
 *
 * Pure inline SVG + CSS: crisp at any DPR, tiny payload, zero layout shift.
 * Fixed and aria-hidden so it never intercepts pointer or a11y focus.
 */

// Mercedes-style tri-star centred at (0,0): mid size, tip radius ~11.
const TRISTAR = 'M0,-11 L1.9,-1.1 L9.5,5.5 L0,2.2 L-9.5,5.5 L-1.9,-1.1 Z'

const VW = 1440
const VH = 900

/** Deterministic PRNG (mulberry32) so SSR and client generate the same field. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Star {
  x:        number
  y:        number
  rot:      number
  scale:    number
  opacity:  number
  bright:   boolean
  disappears: boolean
  animDur:  number
  animDelay: number
  driftDur: number
  driftDelay: number
}

/**
 * Build the scatter once at module load. Density and base opacity are weighted
 * toward the top-right and fade toward the lower-left, matching the original
 * dispersion. About half the stars are flagged to fully disappear/reappear.
 */
const STARS: Star[] = (() => {
  const rand = mulberry32(0x5a11a1)
  const out: Star[] = []
  const TARGET = 150

  let guard = 0
  while (out.length < TARGET && guard < TARGET * 8) {
    guard++
    const x = rand() * VW
    const y = rand() * VH

    // Brightness increases toward the right and toward the top.
    const xn = x / VW
    const yn = y / VH
    const bias = Math.min(1, Math.max(0, xn * 0.62 + (1 - yn) * 0.38))

    // Rejection sampling: keep denser where the field is bright.
    if (rand() > bias * 0.9 + 0.12) continue

    out.push({
      x,
      y,
      rot:        rand() * 360,
      scale:      0.42 + rand() * 0.62,
      opacity:    0.28 + bias * 0.55,
      bright:     rand() < 0.32,
      disappears: rand() < 0.5,
      animDur:    (rand() < 0.5 ? 5 : 8) + rand() * 5,
      animDelay:  -rand() * 12,
      driftDur:   7 + rand() * 9,
      driftDelay: -rand() * 10,
    })
  }
  return out
})()

export function FineLineBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background:
          'radial-gradient(120% 85% at 18% 0%, rgba(255,255,255,0.72) 0%, transparent 52%),' +
          'radial-gradient(120% 90% at 100% 100%, rgba(158,164,176,0.4) 0%, transparent 55%),' +
          'linear-gradient(135deg, #EEF0F3 0%, #DBDEE4 32%, #C7CBD3 56%, #E3E6EB 80%, #F2F3F6 100%)',
      }}
    >
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <g id="tri-unit">
            <path d={TRISTAR} />
          </g>
        </defs>

        {/* Grey tri-star field — purple glow + dark-purple drop shadow on all stars */}
        <g
          className="sail-star-field"
          style={{
            filter:
              'drop-shadow(0 0 3px rgba(124,92,196,0.55)) drop-shadow(0 1.5px 1.2px rgba(42,22,78,0.6))',
          }}
        >
          {STARS.map((s, i) => (
            <g key={i} transform={`translate(${s.x.toFixed(1)},${s.y.toFixed(1)})`}>
              <g
                className="sail-star-drift"
                style={{
                  ['--drift-dur' as string]:   `${s.driftDur.toFixed(2)}s`,
                  ['--drift-delay' as string]: `${s.driftDelay.toFixed(2)}s`,
                }}
              >
                <use
                  href="#tri-unit"
                  transform={`rotate(${s.rot.toFixed(1)}) scale(${s.scale.toFixed(2)})`}
                  className={s.disappears ? 'sail-star-blink' : 'sail-star-twinkle'}
                  style={{
                    color:                    s.bright ? '#F3F4F7' : '#868C98',
                    ['--star-o' as string]:   s.opacity.toFixed(2),
                    ['--star-dur' as string]: `${s.animDur.toFixed(2)}s`,
                    ['--star-delay' as string]: `${s.animDelay.toFixed(2)}s`,
                  }}
                  fill="currentColor"
                />
              </g>
            </g>
          ))}
        </g>

        {/* ── Minimal gold line tattoos — placed in the mobile-visible band ── */}
        <g fill="none" stroke="#A9852F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.22">
          {/* Marine — a clean sailboat: mast, mainsail, jib, hull, waterline */}
          <g transform="translate(505,700)">
            <path d="M0,-84 L0,42" />
            <path d="M8,-78 C46,-44 52,4 46,38 L8,38 Z" />
            <path d="M-8,-50 C-38,-32 -44,8 -38,36 L-8,36 Z" />
            <path d="M-62,42 L62,42 L48,64 L-48,64 Z" />
            <path d="M-84,74 Q0,90 84,74" opacity="0.65" />
          </g>

          {/* Money — coin with dollar mark and orbit ring, upper-right */}
          <g transform="translate(968,168)">
            <circle cx="0" cy="0" r="40" />
            <circle cx="0" cy="0" r="30" opacity="0.55" />
            <path d="M0,-30 L0,30" />
            <path d="M15,-16 C15,-25 -15,-25 -15,-13 C-15,-4 15,-2 15,8 C15,18 -15,18 -15,10" />
          </g>

          {/* Business — bar chart with a rising trend arrow, upper-left */}
          <g transform="translate(540,150)">
            <path d="M-56,44 L60,44" />
            <path d="M-46,44 L-46,22" />
            <path d="M-22,44 L-22,8" />
            <path d="M2,44 L2,-8" />
            <path d="M-52,26 L-20,4 L6,-14 L52,-46" opacity="0.85" />
            <path d="M34,-46 L52,-46 L52,-28" opacity="0.85" />
          </g>
        </g>
      </svg>
    </div>
  )
}
