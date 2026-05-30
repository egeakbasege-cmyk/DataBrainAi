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
        }}
      >
        {t('counter.proUnlimited')}
      </span>
    )
  }

  const remaining = FREE_LIMIT - used
  const urgent    = remaining <= 2

  return (
    <span
      className="label-caps"
      style={{
        padding:    '3px 10px',
        border:     `1px solid ${urgent ? 'rgba(220,38,38,0.22)' : 'rgba(129,199,185,0.22)'}`,
        color:      urgent ? '#DC2626' : 'rgba(26,43,60,0.45)',
        background: urgent ? 'rgba(220,38,38,0.05)' : 'transparent',
      }}
    >
      {remaining}/{FREE_LIMIT} {t('counter.freeToday')}
    </span>
  )
}
