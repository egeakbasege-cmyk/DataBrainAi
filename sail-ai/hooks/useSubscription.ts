'use client'

import { useCallback, useEffect, useState } from 'react'
import { FREE_LIMIT, STORAGE_KEY, getTodayKey, type UsageRecord } from '@/lib/stripe'

export function useSubscription() {
  const [isPro, setIsPro]           = useState(false)
  const [usedToday, setUsedToday]   = useState(0)
  const [showPaywall, setShowPaywall] = useState(false)

  // Load usage from localStorage
  useEffect(() => {
    try {
      const proFlag = localStorage.getItem('sail_pro')
      if (proFlag === 'true') { setIsPro(true); return }

      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const rec: UsageRecord = JSON.parse(raw)
        if (rec.date === getTodayKey()) {
          setUsedToday(rec.count)
        } else {
          // New day — reset
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

  const triggerPaywall = useCallback(() => setShowPaywall(true), [])
  const closePaywall   = useCallback(() => setShowPaywall(false), [])

  const activatePro = useCallback(() => {
    localStorage.setItem('sail_pro', 'true')
    setIsPro(true)
    setShowPaywall(false)
  }, [])

  return {
    isPro,
    usedToday,
    remaining: isPro ? Infinity : FREE_LIMIT - usedToday,
    canAnalyse,
    showPaywall,
    recordUsage,
    triggerPaywall,
    closePaywall,
    activatePro,
  }
}
