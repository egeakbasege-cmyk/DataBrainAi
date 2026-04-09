/** Decorative SVG ornaments — vintage nautical / British country-house aesthetic */

/** 8-point compass rose — used as section watermark or divider ornament */
export function CompassRose({
  size    = 100,
  color   = '#2B4A2A',
  opacity = 0.12,
}: {
  size?:    number
  color?:   string
  opacity?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      style={{ opacity, color }}
    >
      {/* Outer ring */}
      <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="0.6" />
      {/* Inner ring */}
      <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="0.5" />
      {/* Centre hub */}
      <circle cx="50" cy="50" r="5"  fill="currentColor" opacity="0.5" />
      <circle cx="50" cy="50" r="2"  fill="currentColor" />

      {/* Cardinal points — tall narrow diamonds */}
      {/* N */ }
      <path d="M50 3 L53.5 50 L50 44 L46.5 50 Z" fill="currentColor" />
      {/* S */}
      <path d="M50 97 L46.5 50 L50 56 L53.5 50 Z" fill="currentColor" />
      {/* E */}
      <path d="M97 50 L50 46.5 L56 50 L50 53.5 Z" fill="currentColor" />
      {/* W */}
      <path d="M3 50 L50 53.5 L44 50 L50 46.5 Z" fill="currentColor" />

      {/* Intercardinal points — shorter diamonds */}
      {/* NE */}
      <path d="M83 17 L53 47 L50 43 L54 40 Z" fill="currentColor" opacity="0.55" />
      {/* SE */}
      <path d="M83 83 L53 53 L57 50 L60 54 Z" fill="currentColor" opacity="0.55" />
      {/* SW */}
      <path d="M17 83 L47 53 L50 57 L46 60 Z" fill="currentColor" opacity="0.55" />
      {/* NW */}
      <path d="M17 17 L47 47 L43 50 L40 46 Z" fill="currentColor" opacity="0.55" />

      {/* Cardinal tick marks at ring */}
      <line x1="50" y1="18"  x2="50" y2="24"  stroke="currentColor" strokeWidth="0.8" />
      <line x1="50" y1="76"  x2="50" y2="82"  stroke="currentColor" strokeWidth="0.8" />
      <line x1="18" y1="50"  x2="24" y2="50"  stroke="currentColor" strokeWidth="0.8" />
      <line x1="76" y1="50"  x2="82" y2="50"  stroke="currentColor" strokeWidth="0.8" />

      {/* Direction letters */}
      <text x="50" y="13"  textAnchor="middle" fontSize="7" fontWeight="600" fontFamily="Jost,sans-serif" fill="currentColor" letterSpacing="0.05em">N</text>
      <text x="50" y="95"  textAnchor="middle" fontSize="7" fontWeight="600" fontFamily="Jost,sans-serif" fill="currentColor" letterSpacing="0.05em">S</text>
      <text x="91" y="53"  textAnchor="middle" fontSize="7" fontWeight="600" fontFamily="Jost,sans-serif" fill="currentColor" letterSpacing="0.05em">E</text>
      <text x="9"  y="53"  textAnchor="middle" fontSize="7" fontWeight="600" fontFamily="Jost,sans-serif" fill="currentColor" letterSpacing="0.05em">W</text>
    </svg>
  )
}

/** Heraldic wave rule — used as section divider */
export function WaveRule({ color = '#2B4A2A', opacity = 0.2 }: { color?: string; opacity?: number }) {
  return (
    <svg
      width="100%"
      height="10"
      viewBox="0 0 400 10"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ opacity }}
    >
      <path
        d="M0 5 Q25 0 50 5 Q75 10 100 5 Q125 0 150 5 Q175 10 200 5 Q225 0 250 5 Q275 10 300 5 Q325 0 350 5 Q375 10 400 5"
        stroke={color}
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Single thin rule with centred diamond ornament */
export function OrnamentRule({ color = '#C4973A' }: { color?: string }) {
  return (
    <div className="relative flex items-center" style={{ height: 16 }}>
      <div className="flex-1 h-px" style={{ background: 'rgba(26,24,20,0.12)' }} />
      <svg width="16" height="16" viewBox="0 0 16 16" className="mx-3 flex-shrink-0" aria-hidden="true">
        <path d="M8 1 L15 8 L8 15 L1 8 Z" fill={color} opacity="0.5" />
        <path d="M8 4 L12 8 L8 12 L4 8 Z" fill={color} opacity="0.7" />
      </svg>
      <div className="flex-1 h-px" style={{ background: 'rgba(26,24,20,0.12)' }} />
    </div>
  )
}

/** Vintage engraved sailboat — for hero/decorative use */
export function EngravedSailboat({
  size    = 160,
  color   = '#2B4A2A',
  opacity = 1,
}: {
  size?:    number
  color?:   string
  opacity?: number
}) {
  return (
    <svg
      width={size}
      height={size * 0.75}
      viewBox="0 0 160 120"
      fill="none"
      aria-hidden="true"
      style={{ opacity }}
    >
      {/* Water — heraldic waves */}
      <path d="M0 95 Q20 88 40 95 Q60 102 80 95 Q100 88 120 95 Q140 102 160 95" stroke={color} strokeWidth="1.2" fill="none" opacity="0.35" />
      <path d="M0 102 Q20 96 40 102 Q60 108 80 102 Q100 96 120 102 Q140 108 160 102" stroke={color} strokeWidth="0.8" fill="none" opacity="0.2" />
      <path d="M0 109 Q20 104 40 109 Q60 114 80 109 Q100 104 120 109 Q140 114 160 109" stroke={color} strokeWidth="0.6" fill="none" opacity="0.12" />

      {/* Hull — elegant keel */}
      <path d="M30 90 Q80 100 130 90 L124 83 Q80 93 36 83 Z" fill={color} />
      <path d="M36 83 L44 87 L116 87 L124 83 Q80 90 36 83 Z" fill={color} opacity="0.4" />
      {/* Keel */}
      <path d="M80 90 L80 100 L72 100 Z" fill={color} opacity="0.5" />

      {/* Mast */}
      <line x1="80" y1="12" x2="80" y2="88" stroke={color} strokeWidth="1.8" strokeLinecap="round" />

      {/* Boom */}
      <line x1="80" y1="74" x2="116" y2="78" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.7" />

      {/* Main sail — engraving lines for texture */}
      <path d="M80 14 L118 80 L80 85 Z" fill={color} opacity="0.07" stroke={color} strokeWidth="1" />
      {/* Engraving horizontal lines on main sail */}
      {[20,28,36,44,52,60,68,76].map((y, i) => {
        const t   = (y - 14) / (80 - 14)
        const x1  = 80 + t * (80 - 80)     // left edge at mast
        const x2  = 80 + t * (118 - 80)    // right edge at leech
        const xm  = x1 + (x2 - x1) * 0.15  // indent from mast
        return (
          <line
            key={y}
            x1={xm} y1={y}
            x2={x2 - 1} y2={y + (80 - y) * 0.04}
            stroke={color}
            strokeWidth="0.5"
            opacity={0.2 + i * 0.04}
          />
        )
      })}

      {/* Foresail */}
      <path d="M80 18 L44 80 L80 85 Z" fill={color} opacity="0.04" stroke={color} strokeWidth="0.8" />
      {/* Engraving lines on foresail */}
      {[26,36,46,56,66,76].map((y, i) => {
        const t  = (y - 18) / (80 - 18)
        const x1 = 80 - t * (80 - 44)
        const x2 = 80
        return (
          <line
            key={y}
            x1={x1 + 1} y1={y}
            x2={x2 - 2} y2={y}
            stroke={color}
            strokeWidth="0.4"
            opacity={0.12 + i * 0.03}
          />
        )
      })}

      {/* Forestay + backstay (rigging) */}
      <line x1="80" y1="14" x2="44" y2="84" stroke={color} strokeWidth="0.6" opacity="0.3" />
      <line x1="80" y1="14" x2="116" y2="76" stroke={color} strokeWidth="0.6" opacity="0.2" />
      {/* Shrouds */}
      <line x1="80" y1="30" x2="50"  y2="85" stroke={color} strokeWidth="0.4" opacity="0.2" />
      <line x1="80" y1="30" x2="110" y2="83" stroke={color} strokeWidth="0.4" opacity="0.2" />

      {/* Burgee / flag at masthead */}
      <path d="M80 10 L92 14 L80 18 Z" fill={color} opacity="0.7" />

      {/* Porthole */}
      <circle cx="96" cy="87" r="3" stroke={color} strokeWidth="0.8" fill="none" opacity="0.5" />
      <circle cx="96" cy="87" r="1.2" fill={color} opacity="0.3" />
    </svg>
  )
}

/** Anchor ornament — small decorative element */
export function AnchorIcon({ size = 20, color = '#2B4A2A', opacity = 0.4 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ opacity }}>
      <circle cx="12" cy="5" r="2.5" stroke={color} strokeWidth="1.2" />
      <line x1="12" y1="7.5" x2="12" y2="20" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6 10 H18" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M6 20 Q6 16 12 20 Q18 16 18 20" stroke={color} strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
