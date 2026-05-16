'use client'

/**
 * hooks/useNLPTranslation.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side NLP translation layer for AI-generated dynamic content.
 *
 * Two-tier cache strategy:
 *   L1: In-memory Map (session scope, instant, ~0ms)
 *   L2: localStorage (cross-session persistence, ~0ms)
 *   L3: /api/i18n/translate (network, ~600–1200ms, Groq-backed)
 *
 * Usage:
 *   const { translateText, translateBatch, isTranslating } = useNLPTranslation()
 *
 *   // Translate a single AI response
 *   const localised = await translateText(aiResponse)
 *
 *   // Translate a batch of UI strings
 *   const [s1, s2, s3] = await translateBatch(['Revenue', 'Growth', 'Risk'])
 *
 * Falls back to the original text on any error — never breaks the UI.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage }                              from '@/lib/i18n/LanguageContext'

// ── Cache persistence ─────────────────────────────────────────────────────────

const CACHE_KEY_PREFIX = 'sail_nlp_i18n_v1'
const MAX_CACHE_ENTRIES = 500

interface CacheStore {
  [locale: string]: {
    [hash: string]: string
  }
}

function loadCache(): CacheStore {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function saveCache(store: CacheStore) {
  try { localStorage.setItem(CACHE_KEY_PREFIX, JSON.stringify(store)) } catch { /* ignore */ }
}

/** Fast non-cryptographic hash for cache keys — djb2 variant. */
function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash >>> 0   // keep 32-bit unsigned
  }
  return hash.toString(36)
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useNLPTranslation() {
  const { locale } = useLanguage()

  // A-04: store locale in a ref so all inner callbacks can read the *current*
  // locale without being recreated on every render. This eliminates stale
  // closures: functions memoised with [] always see the live locale value.
  const localeRef  = useRef(locale)
  useEffect(() => { localeRef.current = locale }, [locale])

  // L1: in-memory cache (Map<hash, translation>)
  const memCache   = useRef<Map<string, string>>(new Map())
  const [isTranslating, setIsTranslating] = useState(false)

  // ── Internal: lookup with both cache tiers ────────────────────────────────

  const getCached = useCallback((text: string): string | null => {
    const lc   = localeRef.current
    const hash = hashString(text)

    // L1 check
    const mem = memCache.current.get(`${lc}:${hash}`)
    if (mem) return mem

    // L2 check (only when locale ≠ en to avoid unnecessary reads)
    if (lc !== 'en') {
      try {
        const store = loadCache()
        const hit   = store[lc]?.[hash]
        if (hit) {
          memCache.current.set(`${lc}:${hash}`, hit)
          return hit
        }
      } catch { /* ignore */ }
    }
    return null
  }, [])  // stable — reads locale via ref

  const setCached = useCallback((text: string, translation: string) => {
    const lc   = localeRef.current
    const hash = hashString(text)
    memCache.current.set(`${lc}:${hash}`, translation)

    try {
      const store = loadCache()
      if (!store[lc]) store[lc] = {}

      // Evict oldest if over limit
      const entries = Object.entries(store[lc]!)
      if (entries.length >= MAX_CACHE_ENTRIES) {
        const toDelete = entries.slice(0, Math.floor(MAX_CACHE_ENTRIES / 4))
        toDelete.forEach(([k]) => delete store[lc]![k])
      }

      store[lc]![hash] = translation
      saveCache(store)
    } catch { /* ignore */ }
  }, [])  // stable — reads locale via ref

  // ── Internal: network call ────────────────────────────────────────────────

  const fetchTranslations = useCallback(async (texts: string[]): Promise<string[]> => {
    const res = await fetch('/api/i18n/translate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ texts, targetLocale: localeRef.current }),
    })
    if (!res.ok) return texts   // fallback
    const data = await res.json() as { translations: string[] }
    return data.translations.length === texts.length ? data.translations : texts
  }, [])  // stable — reads locale via ref

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Translate a single string. Returns the original synchronously if cached;
   * otherwise fires a network request and resolves asynchronously.
   *
   * If locale is 'en', returns the original instantly.
   */
  const translateText = useCallback(async (text: string): Promise<string> => {
    if (!text || localeRef.current === 'en') return text

    const cached = getCached(text)
    if (cached) return cached

    setIsTranslating(true)
    try {
      const [translation] = await fetchTranslations([text])
      const result = translation ?? text
      setCached(text, result)
      return result
    } catch {
      return text
    } finally {
      setIsTranslating(false)
    }
  }, [getCached, setCached, fetchTranslations])  // all stable refs — no re-creation

  /**
   * Translate a batch of strings in one network round-trip.
   * Texts that hit the cache are excluded from the API call.
   *
   * Returns an array in the same order as input.
   */
  const translateBatch = useCallback(async (texts: string[]): Promise<string[]> => {
    if (texts.length === 0 || localeRef.current === 'en') return texts

    // Separate cache hits from misses
    const results: (string | null)[] = texts.map(t => getCached(t))
    const missIndices = results
      .map((r, i) => (r === null ? i : -1))
      .filter(i => i !== -1)

    if (missIndices.length === 0) return results as string[]

    const missTexts = missIndices.map(i => texts[i]!)

    setIsTranslating(true)
    try {
      const translations = await fetchTranslations(missTexts)
      missIndices.forEach((origIdx, i) => {
        const t = translations[i] ?? texts[origIdx]!
        results[origIdx] = t
        setCached(texts[origIdx]!, t)
      })
    } catch {
      missIndices.forEach(i => { results[i] = texts[i]! })
    } finally {
      setIsTranslating(false)
    }

    return results.map((r, i) => r ?? texts[i]!)
  }, [getCached, setCached, fetchTranslations])  // all stable refs — no re-creation

  /**
   * Synchronous cache-only check — useful for rendering without async.
   * Returns null if not cached.
   */
  const getCachedTranslation = useCallback((text: string): string | null => {
    if (localeRef.current === 'en') return text
    return getCached(text)
  }, [getCached])

  /** Wipe both cache tiers for the current locale (dev / testing utility). */
  const clearCache = useCallback(() => {
    const lc = localeRef.current
    // Clear L1
    const keysToDelete: string[] = []
    memCache.current.forEach((_, key) => {
      if (key.startsWith(`${lc}:`)) keysToDelete.push(key)
    })
    keysToDelete.forEach(k => memCache.current.delete(k))
    // Clear L2
    try {
      const store = loadCache()
      delete store[lc]
      saveCache(store)
    } catch { /* ignore */ }
  }, [])

  return {
    translateText,
    translateBatch,
    getCachedTranslation,
    clearCache,
    isTranslating,
    locale,
  }
}
