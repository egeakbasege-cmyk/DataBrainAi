'use client'

/**
 * hooks/useLocalStorage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Type-safe localStorage hook with SSR guard and cross-tab sync.
 *
 * Usage:
 *   const [theme, setTheme] = useLocalStorage<'dark'|'light'>('theme', 'dark')
 */

import { useCallback, useEffect, useState } from 'react'

type SetValue<T> = (value: T | ((prev: T) => T)) => void

export function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') return initialValue
    try {
      const raw = window.localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : initialValue
    } catch {
      return initialValue
    }
  }, [key, initialValue])

  const [storedValue, setStoredValue] = useState<T>(readValue)

  const setValue: SetValue<T> = useCallback((value) => {
    const next = value instanceof Function ? value(storedValue) : value
    try {
      window.localStorage.setItem(key, JSON.stringify(next))
      setStoredValue(next)
      // Notify other tabs
      window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(next) }))
    } catch (err) {
      console.warn(`[useLocalStorage] Error setting "${key}":`, err)
    }
  }, [key, storedValue])

  // Sync across tabs
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try { setStoredValue(JSON.parse(e.newValue) as T) } catch { /* ignore */ }
      }
    }
    window.addEventListener('storage', handler)
    return () => window.removeEventListener('storage', handler)
  }, [key])

  return [storedValue, setValue]
}
