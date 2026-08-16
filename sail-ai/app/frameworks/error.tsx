'use client'

import { RouteError } from '@/components/RouteError'

export default function FrameworksError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="Frameworks"
      hint="The framework canvas failed to render. Try again or pick another framework."
    />
  )
}
