/** Sail AI crest — Ultra Premium Gold on Black */
export function Logo({ size = 48 }: { size?: number }) {
  return (
    <img 
      src="/logo-gold.png" 
      alt="Sail AI" 
      width={size} 
      height={size}
      style={{ 
        objectFit: 'contain',
        filter: 'drop-shadow(0 0 6px rgba(201,169,110,0.4))'
      }}
    />
  )
}
