'use client'

/**
 * hooks/useDebounce.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Debounce a value — only updates after `delayMs` of inactivity.
 * Also exports a debounced callback hook for imperative use.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(searchQuery, 350)
 *
 *   const handleInput = useDebouncedCallback((v: string) => {
 *     doExpensiveWork(v)
 *   }, 400)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Value debounce ────────────────────────────────────────────────────────────

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debounced
}

// ── Callback debounce ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  fn:      T,
  delayMs: number
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fnRef    = useRef(fn)

  // Keep ref fresh without re-creating the debounced fn
  useEffect(() => { fnRef.current = fn }, [fn])

  return useCallback((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fnRef.current(...args), delayMs)
  }, [delayMs]) as T
}
