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
        className="label-caps"
        style={{
          padding:     '3px 10px',
          border:      '1px solid rgba(201,169,110,0.35)',
          color:       '#C9A96E',
          background:  'rgba(201,169,110,0.07)',
        }}
      >
        Professional · Unlimited
      </span>
    )
  }

  const remaining = FREE_LIMIT - used
  const urgent    = remaining <= 1

  return (
    <span
      className="label-caps"
      style={{
        padding:    '3px 10px',
        border:     `1px solid ${urgent ? 'rgba(153,27,27,0.25)' : 'rgba(0,0,0,0.14)'}`,
        color:      urgent ? '#991B1B' : '#71717A',
        background: urgent ? 'rgba(153,27,27,0.04)' : 'transparent',
      }}
    >
      {remaining}/{FREE_LIMIT} free today
    </span>
  )
}
