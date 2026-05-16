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

import { useCallback, useRef, useState } from 'react'
import { useLanguage }                   from '@/lib/i18n/LanguageContext'

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

  // L1: in-memory cache (Map<hash, translation>)
  const memCache   = useRef<Map<string, string>>(new Map())
  const [isTranslating, setIsTranslating] = useState(false)

  // ── Internal: lookup with both cache tiers ────────────────────────────────

  function getCached(text: string): string | null {
    const hash = hashString(text)

    // L1 check
    const mem = memCache.current.get(`${locale}:${hash}`)
    if (mem) return mem

    // L2 check (only when locale ≠ en to avoid unnecessary reads)
    if (locale !== 'en') {
      try {
        const store = loadCache()
        const hit   = store[locale]?.[hash]
        if (hit) {
          memCache.current.set(`${locale}:${hash}`, hit)
          return hit
        }
      } catch { /* ignore */ }
    }
    return null
  }

  function setCached(text: string, translation: string) {
    const hash = hashString(text)
    memCache.current.set(`${locale}:${hash}`, translation)

    try {
      const store = loadCache()
      if (!store[locale]) store[locale] = {}

      // Evict oldest if over limit
      const entries = Object.entries(store[locale]!)
      if (entries.length >= MAX_CACHE_ENTRIES) {
        const toDelete = entries.slice(0, Math.floor(MAX_CACHE_ENTRIES / 4))
        toDelete.forEach(([k]) => delete store[locale]![k])
      }

      store[locale]![hash] = translation
      saveCache(store)
    } catch { /* ignore */ }
  }

  // ── Internal: network call ────────────────────────────────────────────────

  async function fetchTranslations(texts: string[]): Promise<string[]> {
    const res = await fetch('/api/i18n/translate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ texts, targetLocale: locale }),
    })
    if (!res.ok) return texts   // fallback
    const data = await res.json() as { translations: string[] }
    return data.translations.length === texts.length ? data.translations : texts
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Translate a single string. Returns the original synchronously if cached;
   * otherwise fires a network request and resolves asynchronously.
   *
   * If locale is 'en', returns the original instantly.
   */
  const translateText = useCallback(async (text: string): Promise<string> => {
    if (!text || locale === 'en') return text

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
  }, [locale])  // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Translate a batch of strings in one network round-trip.
   * Texts that hit the cache are excluded from the API call.
   *
   * Returns an array in the same order as input.
   */
  const translateBatch = useCallback(async (texts: string[]): Promise<string[]> => {
    if (texts.length === 0 || locale === 'en') return texts

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
  }, [locale])  // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Synchronous cache-only check — useful for rendering without async.
   * Returns null if not cached.
   */
  const getCachedTranslation = useCallback((text: string): string | null => {
    if (locale === 'en') return text
    return getCached(text)
  }, [locale])  // eslint-disable-line react-hooks/exhaustive-deps

  /** Wipe both cache tiers for the current locale (dev / testing utility). */
  const clearCache = useCallback(() => {
    // Clear L1
    const keysToDelete: string[] = []
    memCache.current.forEach((_, key) => {
      if (key.startsWith(`${locale}:`)) keysToDelete.push(key)
    })
    keysToDelete.forEach(k => memCache.current.delete(k))
    // Clear L2
    try {
      const store = loadCache()
      delete store[locale]
      saveCache(store)
    } catch { /* ignore */ }
  }, [locale])

  return {
    translateText,
    translateBatch,
    getCachedTranslation,
    clearCache,
    isTranslating,
    locale,
  }
}
