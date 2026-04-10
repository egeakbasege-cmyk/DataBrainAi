'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSession }                        from 'next-auth/react'
import { FREE_LIMIT, STORAGE_KEY, getTodayKey, type UsageRecord } from '@/lib/stripe'

export function useSubscription() {
  const { data: session, update } = useSession()
  const isPro = session?.user?.isPro ?? false

  const [usedToday,   setUsedToday]   = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)

  // Load today's usage from localStorage (per-device counter)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const rec: UsageRecord = JSON.parse(raw)
        if (rec.date === getTodayKey()) {
          setUsedToday(rec.count)
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: getTodayKey(), count: 0 }))
          setUsedToday(0)
        }
      }
    } catch { /* ignore */ }
  }, [])

  const canAnalyse = isPro || usedToday < FREE_LIMIT

  const recordUsage = useCallback(() => {
    if (isPro) return
    const next = usedToday + 1
    setUsedToday(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: getTodayKey(), count: next }))
  }, [isPro, usedToday])

  const triggerPaywall = useCallback(() => setShowPaywall(true),  [])
  const closePaywall   = useCallback(() => setShowPaywall(false), [])

  /**
   * Called after a successful Stripe checkout (?pro=1).
   * Forces the NextAuth session to re-read Pro status from the server.
   */
  const activatePro = useCallback(async () => {
    await update()           // triggers JWT callback which re-checks Stripe
    setShowPaywall(false)
  }, [update])

  return {
    isPro,
    usedToday,
    remaining:     isPro ? Infinity : FREE_LIMIT - usedToday,
    canAnalyse,
    showPaywall,
    recordUsage,
    triggerPaywall,
    closePaywall,
    activatePro,
  }
}
