'use client'

interface Props {
  score:    number
  compact?: boolean
}

function getConf(score: number) {
  if (score >= 0.85) return { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'High confidence' }
  if (score >= 0.60) return { bg: '#FEFCE8', color: '#A16207', border: '#FEF08A', label: 'Medium confidence' }
  return                    { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB', label: 'Estimated' }
}

export function ConfidenceBadge({ score, compact = false }: Props) {
  const { bg, color, border, label } = getConf(score)
  const pct = Math.round(score * 100)

  return (
    <span
      className="inline-flex items-center gap-1.5 font-sans confidence-badge"
      style={{
        fontSize:      '0.6rem',
        fontWeight:    500,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color,
        padding:       compact ? '0.2rem 0.6rem' : '0.3rem 0.75rem',
        borderRadius:  '999px',
        border:        `1px solid ${border}`,
        background:    bg,
        whiteSpace:    'nowrap',
      }}
      title={`Confidence: ${pct}%`}
      aria-label={`${label}: ${pct}%`}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
      {compact ? `${pct}%` : `${label} · ${pct}%`}
    </span>
  )
}
