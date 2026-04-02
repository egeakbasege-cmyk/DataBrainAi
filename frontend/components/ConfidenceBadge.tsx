'use client'

interface Props {
  score:    number
  compact?: boolean
}

function getConf(score: number) {
  if (score >= 0.85) return { color: '#1ed48a', label: 'High confidence' }
  if (score >= 0.60) return { color: '#d4821e', label: 'Medium confidence' }
  return                     { color: '#4d6178', label: 'Estimated' }
}

export function ConfidenceBadge({ score, compact = false }: Props) {
  const { color, label } = getConf(score)
  const pct = Math.round(score * 100)

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono confidence-badge"
      style={{
        fontSize:        '0.6rem',
        letterSpacing:   '0.08em',
        textTransform:   'uppercase',
        color,
        padding:         compact ? '0.2rem 0.5rem' : '0.25rem 0.65rem',
        borderRadius:    '999px',
        border:          `1px solid ${color}35`,
        background:      `${color}0d`,
      }}
      title={`Confidence: ${pct}%`}
      aria-label={`${label}: ${pct}%`}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {compact ? `${pct}%` : `${label} · ${pct}%`}
    </span>
  )
}
