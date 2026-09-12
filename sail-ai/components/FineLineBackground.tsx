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
 * Pure inline SVG + CSS: crisp at any DPR, tiny payload, zero layout shift.
 * Fixed and aria-hidden so it never intercepts pointer or a11y focus.
 */

// Mercedes-style tri-star centred at (0,0): mid size, tip radius ~11.
const TRISTAR = 'M0,-11 L1.9,-1.1 L9.5,5.5 L0,2.2 L-9.5,5.5 L-1.9,-1.1 Z'

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

          {/* Scattered tri-star tile — mid size, denser spread */}
          <pattern id="tri-scatter" width="108" height="108" patternUnits="userSpaceOnUse">
            <use href="#tri-unit" transform="translate(24,26) rotate(12)" />
            <use href="#tri-unit" transform="translate(76,20) rotate(-24) scale(0.74)" />
            <use href="#tri-unit" transform="translate(90,76) rotate(40) scale(0.9)" />
            <use href="#tri-unit" transform="translate(44,86) rotate(-8) scale(0.64)" />
            <use href="#tri-unit" transform="translate(8,66) rotate(52) scale(0.52)" />
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
          opacity="0.5"
        />
        {/* Brighter accents catching the "light" in the dense zone */}
        <rect
          width="1440"
          height="900"
          fill="url(#tri-scatter)"
          mask="url(#tri-mask)"
          style={{ color: '#FFFFFF' }}
          opacity="0.32"
          transform="translate(4,5)"
        />

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
