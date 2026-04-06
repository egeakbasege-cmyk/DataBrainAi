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
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FACC15', display: 'inline-block', boxShadow: '0 0 6px rgba(250,204,21,0.5)', flexShrink: 0 }} />
        <span className="font-sans text-xs font-medium uppercase tracking-widest-2"
          style={{ color: '#92400E' }}>
          Free analysis available
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {credits !== null && (
        <span className="font-sans text-xs font-medium"
          style={{ color: credits > 0 ? '#111827' : '#F59E0B' }}>
          {credits > 0
            ? `${credits} credit${credits !== 1 ? 's' : ''}`
            : 'No credits'}
        </span>
      )}
      <button
        onClick={onBuy}
        className="font-sans text-xs font-medium px-4 py-2 rounded-pill border transition-all"
        style={{ color: '#111827', borderColor: '#E5E7EB', background: '#FFFFFF' }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.background   = '#FACC15'
          el.style.borderColor  = '#FACC15'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.background   = '#FFFFFF'
          el.style.borderColor  = '#E5E7EB'
        }}
      >
        Buy credits →
      </button>
    </div>
  )
}
