'use client'

import { RouteError } from '@/components/RouteError'

export default function VaultError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="Vault"
      hint="Your stored context could not be read. Nothing has been deleted."
    />
  )
}
