'use client'

/**
 * hooks/useMediaQuery.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SSR-safe media query hook. Returns false on server; subscribes to
 * MediaQueryList on the client with cleanup.
 *
 * Usage:
 *   const isMobile  = useMediaQuery('(max-width: 639px)')
 *   const isDark    = useMediaQuery('(prefers-color-scheme: dark)')
 *   const isRetina  = useMediaQuery('(min-resolution: 2dppx)')
 */

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql     = window.matchMedia(query)
    setMatches(mql.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

// ── Convenience breakpoints (Tailwind defaults) ───────────────────────────────

export const useIsMobile  = () => useMediaQuery('(max-width: 639px)')
export const useIsTablet  = () => useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
export const useIsDark    = () => useMediaQuery('(prefers-color-scheme: dark)')
export const useIsRetina  = () => useMediaQuery('(min-resolution: 2dppx)')
