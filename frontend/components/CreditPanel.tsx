'use client'

interface Props {
  credits:  number | null
  freeUsed: boolean
  onBuy:    () => void
}

export function CreditPanel({ credits, freeUsed, onBuy }: Props) {
  if (!freeUsed) {
    return (
      <div className="flex items-center gap-2">
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1ed48a', display: 'inline-block' }} />
        <span className="font-mono text-2xs text-green uppercase tracking-widest">
          Free analysis available
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4">
      {credits !== null && (
        <span className="font-mono text-2xs uppercase tracking-widest"
          style={{ color: credits > 0 ? '#18b8e0' : '#d4821e' }}>
          {credits > 0
            ? `${credits} credit${credits !== 1 ? 's' : ''}`
            : 'No credits'}
        </span>
      )}
      <button
        onClick={onBuy}
        className="font-mono text-2xs uppercase tracking-widest px-3 py-1.5 rounded-pill border transition-all"
        style={{
          color:       '#18b8e0',
          borderColor: 'rgba(24,184,224,0.3)',
          background:  'rgba(24,184,224,0.05)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.background    = 'rgba(24,184,224,0.12)'
          el.style.borderColor   = 'rgba(24,184,224,0.6)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.background    = 'rgba(24,184,224,0.05)'
          el.style.borderColor   = 'rgba(24,184,224,0.3)'
        }}
      >
        Buy credits →
      </button>
    </div>
  )
}
