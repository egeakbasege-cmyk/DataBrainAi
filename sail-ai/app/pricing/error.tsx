'use client'

import { RouteError } from '@/components/RouteError'

export default function PricingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="Pricing"
      hint="Plan details could not be loaded. Your current subscription is unaffected."
    />
  )
}
