'use client'

/**
 * FineLineBackground
 * ─────────────────────────────────────────────────────────────────────────────
 * Metallic-silver hero backdrop inspired by the Mercedes-AMG "one star" livery:
 * a polished silver field scattered with three-pointed tri-stars that disperse
 * (dense → sparse) across the panel, plus a few minimal line "tattoos" — a
 * marine sail, a money coin, and a business growth arrow — etched in faint gold.
 *
 * Pure inline SVG + CSS: crisp at any DPR, tiny payload, zero layout shift.
 * Fixed and aria-hidden so it never intercepts pointer or a11y focus.
 */

// Mercedes-style tri-star centred at (0,0): tip radius ~18, pinched valleys.
const TRISTAR = 'M0,-18 L3.1,-1.8 L15.6,9 L0,3.6 L-15.6,9 L-3.1,-1.8 Z'

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
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <g id="tri-unit">
            <path d={TRISTAR} />
          </g>

          {/* Scattered tri-star tile */}
          <pattern id="tri-scatter" width="150" height="150" patternUnits="userSpaceOnUse">
            <use href="#tri-unit" transform="translate(32,34) rotate(12)" />
            <use href="#tri-unit" transform="translate(104,26) rotate(-24) scale(0.72)" />
            <use href="#tri-unit" transform="translate(126,104) rotate(40) scale(0.9)" />
            <use href="#tri-unit" transform="translate(58,118) rotate(-8) scale(0.62)" />
            <use href="#tri-unit" transform="translate(10,92) rotate(52) scale(0.5)" />
          </pattern>

          {/* Dispersion: opaque toward top-right, fading toward lower-left */}
          <linearGradient id="tri-fade" x1="1" y1="0" x2="0.05" y2="1">
            <stop offset="0"    stopColor="#fff" stopOpacity="1" />
            <stop offset="0.42" stopColor="#fff" stopOpacity="0.42" />
            <stop offset="0.72" stopColor="#fff" stopOpacity="0.1" />
            <stop offset="1"    stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="tri-mask">
            <rect width="1440" height="900" fill="url(#tri-fade)" />
          </mask>
        </defs>

        {/* Graphite tri-star dispersion field */}
        <rect
          width="1440"
          height="900"
          fill="url(#tri-scatter)"
          mask="url(#tri-mask)"
          style={{ color: '#868C98' }}
          opacity="0.55"
        />
        {/* Brighter accents catching the "light" in the dense zone */}
        <rect
          width="1440"
          height="900"
          fill="url(#tri-scatter)"
          mask="url(#tri-mask)"
          style={{ color: '#FFFFFF' }}
          opacity="0.35"
          transform="translate(6,7)"
        />

        {/* ── Minimal gold line tattoos ─────────────────────────── */}
        <g fill="none" stroke="#B08D4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.18">
          {/* Marine sail — single-line sailboat, lower-left */}
          <g transform="translate(196,712)">
            <path d="M0,40 L0,-74" />
            <path d="M6,-70 L6,34 L58,34 Z" />
            <path d="M-6,-40 L-6,34 L-46,34 Z" />
            <path d="M-64,42 Q0,64 64,42" />
            <path d="M-80,52 L80,52" opacity="0.7" />
          </g>

          {/* Money — coin with dollar mark, upper-right */}
          <g transform="translate(1276,152)">
            <circle cx="0" cy="0" r="34" />
            <path d="M0,-27 L0,27" />
            <path d="M13,-15 C13,-23 -13,-23 -13,-12 C-13,-4 13,-2 13,7 C13,17 -13,17 -13,9" />
          </g>

          {/* Business — upward growth arrow, upper-left */}
          <g transform="translate(150,150)">
            <path d="M-52,32 L-18,-4 L8,20 L52,-34" />
            <path d="M34,-34 L52,-34 L52,-16" />
          </g>
        </g>
      </svg>
    </div>
  )
}
