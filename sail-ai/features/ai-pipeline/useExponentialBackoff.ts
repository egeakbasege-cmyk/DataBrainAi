'use client'

/**
 * features/ai-pipeline/useExponentialBackoff.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Stateful exponential backoff hook with jitter.
 *
 * Algorithm:
 *   delay(n) = min(baseMs × 2^n + rand(-jitter, +jitter), maxMs)
 *
 * Usage:
 *   const { attempt, schedule, reset, isExhausted } = useExponentialBackoff()
 *   if (shouldRetry) schedule(() => retryFn())
 */

import { useCallback, useRef, useState } from 'react'
import type { BackoffConfig }             from './types'

const DEFAULTS: BackoffConfig = {
  baseMs:   500,
  maxMs:    30_000,
  maxTries: 5,
  jitterMs: 200,
}

export function useExponentialBackoff(config: Partial<BackoffConfig> = {}) {
  const cfg      = { ...DEFAULTS, ...config }
  const attempt  = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tries, setTries] = useState(0)

  const clear = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }, [])

  const reset = useCallback(() => {
    clear()
    attempt.current = 0
    setTries(0)
  }, [clear])

  const schedule = useCallback((fn: () => void): boolean => {
    if (attempt.current >= cfg.maxTries) return false   // exhausted

    const expo   = Math.pow(2, attempt.current)
    const jitter = (Math.random() * 2 - 1) * cfg.jitterMs
    const delay  = Math.min(cfg.baseMs * expo + jitter, cfg.maxMs)

    attempt.current++
    setTries(attempt.current)

    timerRef.current = setTimeout(fn, delay)
    return true
  }, [cfg.baseMs, cfg.maxMs, cfg.maxTries, cfg.jitterMs])

  const isExhausted = tries >= cfg.maxTries

  return { tries, isExhausted, schedule, reset, clear }
}
