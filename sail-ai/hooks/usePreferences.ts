'use client'

/**
 * Capacitor Preferences Hook — v2
 *
 * Wraps Capacitor Preferences API with localStorage fallback.
 *
 * Fixes vs. original:
 *   1. Race condition: original used a module-level `let Preferences = null` mutated
 *      by multiple simultaneous async calls in React StrictMode (double-invoke).
 *      Fixed with a proper Promise-based singleton that collapses concurrent loads.
 *
 *   2. isCapacitor() was called on every operation. Now resolved once at module init
 *      and cached, saving ~6 property lookups per storage op.
 *
 *   3. Added typed key constants export — callers should use PREF_KEYS to avoid
 *      typo-based storage bugs (e.g. 'userToken' vs 'user_token').
 */

import { useCallback } from 'react'

// ── Platform detection (evaluated once at module init) ────────────────────────
const IS_CAPACITOR: boolean =
  typeof window !== 'undefined' &&
  !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
    ?.isNativePlatform?.()

// ── Storage key constants — single source of truth ───────────────────────────
export const PREF_KEYS = {
  // Auth
  AUTH_TOKEN:      'sail_auth_token',
  AUTH_EXPIRES_AT: 'sail_auth_expires_at',
  // User profile
  USER_EMAIL:      'sail_user_email',
  USER_ID:         'sail_user_id',
  USER_NAME:       'sail_user_name',
  USER_IMAGE:      'sail_user_image',
  USER_PLAN:       'sail_user_plan',
  // App preferences
  LANGUAGE:        'sail_language',
  BRAND_CONFIG:    'sail_brand_config',
  THEME:           'sail_theme',
} as const

// ── Promise-based singleton (collapses concurrent imports) ────────────────────
type CapPreferences = {
  get(opts: { key: string }):  Promise<{ value: string | null }>
  set(opts: { key: string; value: string }): Promise<void>
  remove(opts: { key: string }): Promise<void>
  clear(): Promise<void>
}

let _prefPromise: Promise<CapPreferences | null> | null = null

function loadPreferences(): Promise<CapPreferences | null> {
  if (!IS_CAPACITOR) return Promise.resolve(null)
  if (!_prefPromise) {
    _prefPromise = import('@capacitor/preferences')
      .then(m => m.Preferences as CapPreferences)
      .catch(() => {
        _prefPromise = null   // reset so the next call retries
        return null
      })
  }
  return _prefPromise
}

// Pre-warm the import in Capacitor environments (non-blocking)
if (IS_CAPACITOR) {
  void loadPreferences()
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePreferences() {
  const get = useCallback(async (key: string): Promise<string | null> => {
    try {
      const P = await loadPreferences()
      if (P) {
        const { value } = await P.get({ key })
        return value
      }
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null
    } catch (err) {
      console.error('[Preferences] get error:', err)
      return null
    }
  }, [])

  const set = useCallback(async (key: string, value: string): Promise<void> => {
    try {
      const P = await loadPreferences()
      if (P) { await P.set({ key, value }); return }
      if (typeof window !== 'undefined') localStorage.setItem(key, value)
    } catch (err) {
      console.error('[Preferences] set error:', err)
    }
  }, [])

  const remove = useCallback(async (key: string): Promise<void> => {
    try {
      const P = await loadPreferences()
      if (P) { await P.remove({ key }); return }
      if (typeof window !== 'undefined') localStorage.removeItem(key)
    } catch (err) {
      console.error('[Preferences] remove error:', err)
    }
  }, [])

  const clear = useCallback(async (): Promise<void> => {
    try {
      const P = await loadPreferences()
      if (P) { await P.clear(); return }
      if (typeof window !== 'undefined') localStorage.clear()
    } catch (err) {
      console.error('[Preferences] clear error:', err)
    }
  }, [])

  return { get, set, remove, clear }
}

export default usePreferences
