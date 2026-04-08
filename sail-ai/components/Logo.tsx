export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Sail AI logo"
    >
      {/* Hull */}
      <path
        d="M4 24 Q16 28 28 24 L26 22 Q16 25.5 6 22 Z"
        fill="#C0392B"
      />

      {/* Mast */}
      <line x1="16" y1="6" x2="16" y2="23" stroke="#C0392B" strokeWidth="1.5" strokeLinecap="round" />

      {/* Main sail with circuit traces */}
      <path d="M16 7 L26 20 L16 22 Z" fill="rgba(192,57,43,0.15)" stroke="#C0392B" strokeWidth="1" />

      {/* Circuit trace lines on sail */}
      <line x1="18" y1="10" x2="18" y2="13" stroke="#C0392B" strokeWidth="0.75" strokeLinecap="round" />
      <line x1="18" y1="13" x2="22" y2="13" stroke="#C0392B" strokeWidth="0.75" strokeLinecap="round" />
      <line x1="22" y1="13" x2="22" y2="16" stroke="#C0392B" strokeWidth="0.75" strokeLinecap="round" />
      <line x1="20" y1="16" x2="24" y2="16" stroke="#C0392B" strokeWidth="0.75" strokeLinecap="round" />

      {/* Chip nodes on circuit */}
      <rect x="17.5" y="9.5" width="1" height="1" rx="0.25" fill="#C0392B" />
      <rect x="21.5" y="12.5" width="1" height="1" rx="0.25" fill="#C0392B" />
      <rect x="21.5" y="15.5" width="1" height="1" rx="0.25" fill="#C0392B" />

      {/* Foresail */}
      <path d="M16 9 L8 20 L16 22 Z" fill="rgba(192,57,43,0.08)" stroke="rgba(192,57,43,0.5)" strokeWidth="0.75" />

      {/* Water line */}
      <path d="M2 26 Q8 24.5 16 26 Q24 27.5 30 26" stroke="rgba(192,57,43,0.3)" strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  )
}
