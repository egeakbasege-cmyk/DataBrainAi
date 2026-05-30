/** Sail AI crest — Gold SVG logo */
export function Logo({ size = 48 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-gold.svg"
      alt="Sail AI"
      width={size}
      height={size}
      style={{
        objectFit: 'contain',
        filter: 'drop-shadow(0 0 8px rgba(201,169,110,0.45))',
      }}
    />
  )
}
