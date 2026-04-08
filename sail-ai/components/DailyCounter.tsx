'use client'

import { FREE_LIMIT } from '@/lib/stripe'

interface Props {
  used:  number
  isPro: boolean
}

export function DailyCounter({ used, isPro }: Props) {
  if (isPro) {
    return (
      <span className="text-xs font-medium px-3 py-1 rounded-pill"
        style={{ background: 'rgba(192,57,43,0.12)', color: '#C0392B', border: '1px solid rgba(192,57,43,0.2)' }}>
        Pro · unlimited
      </span>
    )
  }

  const remaining = FREE_LIMIT - used
  const urgent    = remaining <= 1

  return (
    <span
      className="text-xs font-medium px-3 py-1 rounded-pill"
      style={{
        background: urgent ? 'rgba(192,57,43,0.1)' : 'rgba(255,255,255,0.05)',
        color:      urgent ? '#C0392B'              : '#94A3B8',
        border:     `1px solid ${urgent ? 'rgba(192,57,43,0.25)' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {remaining} / {FREE_LIMIT} free today
    </span>
  )
}
