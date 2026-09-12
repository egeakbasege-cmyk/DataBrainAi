'use client'

import { FREE_LIMIT } from '@/lib/stripe'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  used:  number
  isPro: boolean
}

export function DailyCounter({ used, isPro }: Props) {
  const { t } = useLanguage()

  if (isPro) {
    return (
      <span
        className="label-caps"
        style={{
          padding:     '3px 10px',
          border:      '1px solid rgba(201,169,110,0.35)',
          color:       '#C9A96E',
          background:  'rgba(201,169,110,0.07)',
          borderRadius: 9999,
        }}
      >
        {t('counter.proUnlimited')}
      </span>
    )
  }

  const remaining = Math.max(0, FREE_LIMIT - used)
  const urgent    = remaining <= 2

  return (
    <span
      className="label-caps"
      style={{
        padding:    '3px 10px',
        border:     `1px solid ${urgent ? 'rgba(232,168,124,0.40)' : 'rgba(129,216,208,0.28)'}`,
        color:      urgent ? '#E8A87C' : 'rgba(129,216,208,0.90)',
        background: urgent ? 'rgba(232,168,124,0.08)' : 'rgba(129,216,208,0.06)',
        borderRadius: 9999,
      }}
    >
      {remaining}/{FREE_LIMIT} {t('counter.freeToday')}
    </span>
  )
}
