'use client'

import { RouteError } from '@/components/RouteError'

export default function ConnectorsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="Connectors"
      hint="Connector status could not be fetched. Existing integrations keep running."
    />
  )
}
