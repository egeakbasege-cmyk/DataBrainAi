'use client'

interface Props {
  score: number
  compact?: boolean
}

function getConf(score: number) {
  if (score >= 0.85) return { color: '#2de8a0', label: 'High confidence' }
  if (score >= 0.60) return { color: '#e09030', label: 'Medium confidence' }
  return { color: '#4a6080', label: 'Estimated' }
}

export function ConfidenceBadge({ score, compact = false }: Props) {
  const { color, label } = getConf(score)
  const pct = Math.round(score * 100)

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-xs font-mono confidence-badge"
      style={{ background: color + '20', color, border: `1px solid ${color}40` }}
    >
      {compact ? `${pct}%` : `${label} · ${pct}%`}
    </span>
  )
}
