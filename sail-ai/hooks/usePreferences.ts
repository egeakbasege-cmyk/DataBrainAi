'use client'

/**
 * Capacitor Preferences Hook
 * 
 * Yerel depolama için Capacitor Preferences API wrapper.
 * Web fallback olarak localStorage kullanır.
 * 
 * Kullanım:
 * const { get, set, remove, clear } = usePreferences()
 * await set('userToken', 'abc123')
 * const token = await get('userToken')
 */

import { useCallback } from 'react'

// Capacitor'ın yüklü olup olmadığını kontrol et
const isCapacitor = () => {
  if (typeof window === 'undefined') return false
  return !!(window as any).Capacitor?.isNativePlatform?.()
}

// Lazy load Capacitor Preferences
let Preferences: any = null

async function getPreferences() {
  if (!isCapacitor()) return null
  if (!Preferences) {
    const { Preferences: P } = await import('@capacitor/preferences')
    Preferences = P
  }
  return Preferences
}

export function usePreferences() {
  const get = useCallback(async (key: string): Promise<string | null> => {
    try {
      const P = await getPreferences()
      if (P) {
        const { value } = await P.get({ key })
        return value
      }
      // Fallback: localStorage
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key)
      }
      return null
    } catch (error) {
      console.error('[Preferences] Get error:', error)
      return null
    }
  }, [])

  const set = useCallback(async (key: string, value: string): Promise<void> => {
    try {
      const P = await getPreferences()
      if (P) {
        await P.set({ key, value })
        return
      }
      // Fallback: localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value)
      }
    } catch (error) {
      console.error('[Preferences] Set error:', error)
    }
  }, [])

  const remove = useCallback(async (key: string): Promise<void> => {
    try {
      const P = await getPreferences()
      if (P) {
        await P.remove({ key })
        return
      }
      // Fallback: localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.error('[Preferences] Remove error:', error)
    }
  }, [])

  const clear = useCallback(async (): Promise<void> => {
    try {
      const P = await getPreferences()
      if (P) {
        await P.clear()
        return
      }
      // Fallback: localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear()
      }
    } catch (error) {
      console.error('[Preferences] Clear error:', error)
    }
  }, [])

  return { get, set, remove, clear }
}

export default usePreferences
