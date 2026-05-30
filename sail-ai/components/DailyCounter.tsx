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
        border:     `1px solid ${urgent ? 'rgba(248,113,113,0.30)' : 'rgba(255,255,255,0.10)'}`,
        color:      urgent ? '#F87171' : 'rgba(232,237,243,0.45)',
        background: urgent ? 'rgba(248,113,113,0.08)' : 'transparent',
      }}
    >
      {remaining}/{FREE_LIMIT} {t('counter.freeToday')}
    </span>
  )
}
