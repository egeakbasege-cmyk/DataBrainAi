'use client'

import { RouteError } from '@/components/RouteError'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="Dashboard"
      hint="Your metrics could not be loaded. Saved data is intact."
    />
  )
}
