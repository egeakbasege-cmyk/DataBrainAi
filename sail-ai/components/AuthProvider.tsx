'use client'

import { SessionProvider } from 'next-auth/react'

/**
 * AuthProvider
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps the app in next-auth's SessionProvider with cross-tab / mobile
 * stabilization:
 *   • refetchOnWindowFocus — re-validates the session when the user returns to
 *     the tab or foregrounds the PWA on mobile, so a token refreshed in one
 *     place propagates everywhere instead of showing a stale "logged out" state.
 *   • refetchInterval — silently keeps the JWT cookie warm on long-lived tabs.
 *   • refetchWhenOffline={false} — avoids pointless refetch churn while offline.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchOnWindowFocus
      refetchInterval={5 * 60}
      refetchWhenOffline={false}
    >
      {children}
    </SessionProvider>
  )
}
