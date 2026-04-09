/** Sail AI crest-style logo — vintage yacht club aesthetic */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-label="Sail AI">
      {/* Outer crest ring */}
      <circle cx="16" cy="16" r="14.5" stroke="#2B4A2A" strokeWidth="0.75" opacity="0.45" />
      {/* Water */}
      <path d="M5 23 Q10.5 20.5 16 23 Q21.5 25.5 27 23" stroke="#2B4A2A" strokeWidth="0.85" fill="none" opacity="0.45" />
      {/* Hull */}
      <path d="M8 21.5 Q16 25 24 21.5 L22.5 19.5 Q16 23 9.5 19.5 Z" fill="#2B4A2A" />
      {/* Mast */}
      <line x1="16" y1="6.5" x2="16" y2="21" stroke="#2B4A2A" strokeWidth="1.4" strokeLinecap="round" />
      {/* Main sail */}
      <path d="M16 8 L24 19 L16 21 Z" fill="#2B4A2A" opacity="0.13" stroke="#2B4A2A" strokeWidth="0.9" />
      {/* Sail engraving */}
      <line x1="17.5" y1="10.5" x2="21.5" y2="13.5" stroke="#2B4A2A" strokeWidth="0.4" opacity="0.35" />
      <line x1="17.5" y1="13.5" x2="22.5" y2="16.5" stroke="#2B4A2A" strokeWidth="0.4" opacity="0.35" />
      <line x1="17.5" y1="16.5" x2="23"   y2="18.5" stroke="#2B4A2A" strokeWidth="0.4" opacity="0.35" />
      {/* Foresail */}
      <path d="M16 9 L9.5 19 L16 21 Z" fill="#2B4A2A" opacity="0.05" stroke="#2B4A2A" strokeWidth="0.7" />
      {/* Burgee */}
      <path d="M16 5.5 L21 8 L16 10 Z" fill="#2B4A2A" opacity="0.65" />
      {/* Crest tick marks */}
      <line x1="16" y1="1.5" x2="16" y2="3"    stroke="#2B4A2A" strokeWidth="0.6" opacity="0.3" />
      <line x1="16" y1="29"  x2="16" y2="30.5"  stroke="#2B4A2A" strokeWidth="0.6" opacity="0.3" />
      <line x1="1.5" y1="16" x2="3"  y2="16"    stroke="#2B4A2A" strokeWidth="0.6" opacity="0.3" />
      <line x1="29"  y1="16" x2="30.5" y2="16"  stroke="#2B4A2A" strokeWidth="0.6" opacity="0.3" />
    </svg>
  )
}
