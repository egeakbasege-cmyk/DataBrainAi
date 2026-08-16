'use client'

import { RouteError } from '@/components/RouteError'

export default function DataLabError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="Data Lab"
      hint="The dataset workspace failed to initialise. Uploaded files are not lost."
    />
  )
}
