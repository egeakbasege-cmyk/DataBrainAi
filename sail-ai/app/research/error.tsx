'use client'

import { RouteError } from '@/components/RouteError'

export default function ResearchError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="Research"
      hint="The research engine did not respond. This is usually a temporary upstream issue."
    />
  )
}
