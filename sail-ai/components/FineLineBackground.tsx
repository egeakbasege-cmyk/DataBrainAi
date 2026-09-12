'use client'

/**
 * FineLineBackground
 * ─────────────────────────────────────────────────────────────────────────────
 * Fixed, full-viewport luxury backdrop for the Sail AI+ landing page.
 *
 *   • Base — deep obsidian (#0C0C0E) blended with royal amethyst
 *     (#1A102F / #2A1B4E) radial gradients.
 *   • Art  — single-line "fine-line tattoo" SVG strokes in faint polished gold:
 *     a minimalist sailboat, a geometric compass rose, and an ascending
 *     financial growth line with nodes. Pure vector: crisp at any DPR, a few
 *     KB, and zero layout shift (it is absolutely positioned and aria-hidden).
 *
 * Absolutely no harbor/coastline photography — the brief forbids it.
 */

export function FineLineBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundColor: '#0C0C0E',
        backgroundImage:
          'radial-gradient(120% 90% at 12% -8%, rgba(42,27,78,0.55) 0%, transparent 55%),' +
          'radial-gradient(110% 90% at 108% 4%, rgba(26,16,47,0.85) 0%, transparent 52%),' +
          'radial-gradient(90% 70% at 50% 116%, rgba(42,27,78,0.45) 0%, transparent 60%),' +
          'linear-gradient(180deg, #0C0C0E 0%, #120C22 45%, #0C0C0E 100%)',
      }}
    >
      {/* Fine-line tattoo art — right-anchored watermark */}
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <linearGradient id="fl-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.9" />
            <stop offset="55%" stopColor="#C9A96E" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#8A6D3B" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        <g
          fill="none"
          stroke="url(#fl-gold)"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.16"
        >
          {/* ── Compass rose (upper right) ── */}
          <g transform="translate(1090 220)">
            <circle cx="0" cy="0" r="150" strokeWidth="0.75" />
            <circle cx="0" cy="0" r="112" strokeWidth="0.75" />
            <circle cx="0" cy="0" r="22" />
            {/* cardinal star */}
            <path d="M0 -150 L26 -26 L150 0 L26 26 L0 150 L-26 26 L-150 0 L-26 -26 Z" />
            {/* intercardinal thin rays */}
            <path d="M0 -112 L16 -16 L112 0 L16 16 L0 112 L-16 16 L-112 0 L-16 -16 Z" strokeWidth="0.6" opacity="0.7" />
            <line x1="0" y1="-150" x2="0" y2="150" strokeWidth="0.5" opacity="0.5" />
            <line x1="-150" y1="0" x2="150" y2="0" strokeWidth="0.5" opacity="0.5" />
          </g>

          {/* ── Single-line sailboat (lower left) ── */}
          <g transform="translate(250 560)">
            {/* mast */}
            <line x1="0" y1="-210" x2="0" y2="40" />
            {/* main sail — one continuous curve */}
            <path d="M0 -200 C 96 -150 128 -46 120 34 L4 34 Z" strokeWidth="1.1" />
            {/* fore sail */}
            <path d="M-4 -150 C -70 -96 -90 -20 -86 34 L-4 34 Z" strokeWidth="0.9" opacity="0.8" />
            {/* hull */}
            <path d="M-140 46 C -96 104 116 104 168 46 Z" strokeWidth="1.1" />
            {/* waterline ripples */}
            <path d="M-190 78 Q -150 66 -110 78 T -30 78 T 50 78 T 130 78 T 210 78" strokeWidth="0.7" opacity="0.6" />
            <path d="M-160 96 Q -120 86 -80 96 T 0 96 T 80 96 T 160 96" strokeWidth="0.6" opacity="0.45" />
          </g>

          {/* ── Ascending growth line with nodes (mid, spanning) ── */}
          <g transform="translate(430 700)">
            <path d="M0 120 L150 96 L300 132 L470 40 L640 70 L820 -40 L1000 -8" strokeWidth="1.1" />
            {[
              [0, 120], [150, 96], [300, 132], [470, 40], [640, 70], [820, -40], [1000, -8],
            ].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="4.5" fill="#D4AF37" fillOpacity="0.5" stroke="none" />
            ))}
          </g>
        </g>
      </svg>

      {/* Subtle grid grain for depth — kept extremely faint */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(201,169,110,0.05) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(201,169,110,0.05) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(120% 90% at 50% 30%, #000 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(120% 90% at 50% 30%, #000 0%, transparent 75%)',
          opacity: 0.5,
        }}
      />
    </div>
  )
}
