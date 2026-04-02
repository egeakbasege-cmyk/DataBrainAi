'use client'

interface Props {
  credits:  number | null
  freeUsed: boolean
  onBuy:    () => void
}

export function CreditPanel({ credits, freeUsed, onBuy }: Props) {
  if (!freeUsed) {
    return (
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 bg-green/10 border border-green/30 text-green text-xs px-3 py-1.5 rounded-pill font-mono">
          ✦ Free analysis available
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted font-mono">
        {credits !== null ? (
          credits > 0 ? (
            <span className="text-accent">{credits} credit{credits !== 1 ? 's' : ''} remaining</span>
          ) : (
            <span className="text-warning">0 credits</span>
          )
        ) : null}
      </span>
      <button
        onClick={onBuy}
        className="text-xs bg-accent/10 border border-accent/30 text-accent px-3 py-1.5 rounded-pill font-mono hover:bg-accent/20 transition-all"
      >
        Buy credits →
      </button>
    </div>
  )
}
