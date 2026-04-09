'use client'

import { FREE_LIMIT } from '@/lib/stripe'

interface Props {
  used:  number
  isPro: boolean
}

export function DailyCounter({ used, isPro }: Props) {
  if (isPro) {
    return (
      <span
        className="label-caps px-3 py-1.5"
        style={{ border: '1px solid rgba(43,74,42,0.3)', color: '#2B4A2A', background: 'rgba(43,74,42,0.06)' }}
      >
        Pro · Unlimited
      </span>
    )
  }

  const remaining = FREE_LIMIT - used
  const urgent    = remaining <= 1

  return (
    <span
      className="label-caps px-3 py-1.5"
      style={{
        border:     `1px solid ${urgent ? 'rgba(107,39,55,0.3)' : 'rgba(26,24,20,0.15)'}`,
        color:      urgent ? '#6B2737' : '#7A7062',
        background: urgent ? 'rgba(107,39,55,0.05)' : 'transparent',
      }}
    >
      {remaining}/{FREE_LIMIT} free today
    </span>
  )
}
