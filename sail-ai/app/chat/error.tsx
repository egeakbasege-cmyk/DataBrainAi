'use client'

import { RouteError } from '@/components/RouteError'

export default function ChatError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      section="Chat"
      hint="The chat workspace failed to load. Your conversation history is stored locally and is safe."
    />
  )
}
