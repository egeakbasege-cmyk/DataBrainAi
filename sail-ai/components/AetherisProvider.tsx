'use client'

/**
 * AetherisProvider
 *
 * Initialises the Aetheris Zustand store on mount with the authenticated
 * user's identity and a fresh session ID. Re-runs if the user changes.
 *
 * Mount this once in the root layout, inside AuthProvider.
 * No visible UI — pure initialisation layer.
 */

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useAetherisStore } from '@/lib/aetherisStore'

function generateSessionId(): string {
  // Crypto-random 16-byte hex, without depending on uuid package
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback: timestamp + random suffix
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function AetherisProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const initSession = useAetherisStore((s) => s.initSession)
  const resetSession = useAetherisStore((s) => s.resetSession)

  useEffect(() => {
    if (status === 'loading') return

    if (session?.user?.email) {
      const sessionId = generateSessionId()
      initSession(sessionId, session.user.email)
    } else {
      // Unauthenticated — clear any stale state
      resetSession()
    }
  }, [session?.user?.email, status, initSession, resetSession])

  return <>{children}</>
}
