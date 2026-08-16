'use client'

import { RouteError } from '@/components/RouteError'

export default function OnboardingError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="Onboarding"
      hint="Setup could not continue. You can skip this and configure it later in settings."
    />
  )
}
