'use client'

/**
 * SectionDivider — Swiss diagonal section transition
 *
 * Creates an angled cut between two sections instead of a flat horizontal rule.
 * The `from` colour occupies the upper diagonal, `to` the lower background.
 *
 * direction:
 *   'down-right'  — top-left to bottom-right (default, most common)
 *   'down-left'   — mirrored diagonal
 *
 * height: thickness of the transition zone (default 48px)
 */

interface DividerProps {
  from:       string    // background of the section above
  to:         string    // background of the section below
  direction?: 'down-right' | 'down-left'
  height?:    number
}

export function SectionDivider({
  from,
  to,
  direction = 'down-right',
  height    = 48,
}: DividerProps) {
  const clip = direction === 'down-right'
    ? 'polygon(0 0, 100% 0, 100% 0%, 0 100%)'   // angled from top-right to bottom-left
    : 'polygon(0 0, 100% 0, 100% 100%, 0 0%)'   // mirrored

  return (
    <div
      aria-hidden="true"
      style={{
        position:   'relative',
        height,
        background: to,
        overflow:   'hidden',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position:  'absolute',
          inset:     0,
          background: from,
          clipPath:  clip,
        }}
      />
    </div>
  )
}

/**
 * ChampagneRule — a single gradient hairline rule
 * used between equal-colour sections for Swiss precision separation.
 */
export function ChampagneRule({ opacity = 0.5 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height:     1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(201,169,110,0.7) 35%, rgba(20,184,166,0.5) 65%, transparent 100%)',
        opacity,
        flexShrink: 0,
      }}
    />
  )
}
