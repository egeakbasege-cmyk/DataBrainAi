/**
 * lib/cache/responseCache.ts — Semantic Response Cache
 * ──────────────────────────────────────────────────────
 * Caches Groq JSON-mode responses (upwind/downwind/trim/catamaran) in Vercel KV.
 * Streaming modes (sail/operator/synergy/scenario) are NOT cached —
 * they stream directly and cannot be reconstructed from cache safely.
 *
 * Cache key strategy:
 *   "aetheris:v1:{mode}:{language}:{djb2(normalizedQuery)}"
 *
 *   Normalisation: lowercase → trim → collapse whitespace → strip punctuation
 *   This catches identical and near-identical queries (whitespace/case variants)
 *   without requiring embedding similarity (which would need another LLM call).
 *
 * TTL policy:
 *   With live research (ragContext present): 300s  (5 min)
 *     — research data is time-sensitive; short TTL preserves freshness
 *   Without research:                        900s  (15 min)
 *     — training-data answers are stable; longer TTL reduces Groq calls
 *
 * Graceful degradation:
 *   All functions return null / no-op when KV_REST_API_URL is missing.
 *   The route continues as a cache miss — no errors, no crashes.
 *   Activate by setting KV_REST_API_URL + KV_REST_API_TOKEN in Vercel Storage.
 */

import { kv } from '@vercel/kv'

// ── Cacheable modes ────────────────────────────────────────────────────────────
// Only JSON-response modes can be reconstructed from cache.
// Streaming modes must be excluded — their SSE format cannot be replayed.
export const CACHEABLE_MODES = new Set(['upwind', 'downwind', 'trim', 'catamaran'])

// ── TTL constants (seconds) ────────────────────────────────────────────────────
const TTL_WITH_RESEARCH    = 300   //  5 minutes — research data is time-sensitive
const TTL_WITHOUT_RESEARCH = 900   // 15 minutes — training estimates are stable

// ── Key prefix + version ───────────────────────────────────────────────────────
// Bump the version string ('v1' → 'v2') to invalidate all cached entries
// when the response schema changes.
const KEY_PREFIX = 'aetheris:v1'

// ── DJB2 hash (32-bit, URL-safe base36 output) ────────────────────────────────
// Chosen over crypto.subtle (async, adds latency) and btoa (binary-unsafe).
// Collision probability on 16-char base36 is negligible for typical query volumes.

function djb2(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash | 0  // Force 32-bit signed integer
  }
  return Math.abs(hash).toString(36)
}

// ── Query normaliser ───────────────────────────────────────────────────────────

function normalise(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?;:'"()[\]{}<>]/g, '')
}

// ── KV availability guard ──────────────────────────────────────────────────────

function kvAvailable(): boolean {
  return typeof process.env.KV_REST_API_URL === 'string' && process.env.KV_REST_API_URL.length > 0
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function buildCacheKey(query: string, mode: string, language: string): string {
  return `${KEY_PREFIX}:${mode}:${language}:${djb2(normalise(query))}`
}

/**
 * Attempt to retrieve a cached response.
 * Returns `null` on cache miss, KV unavailability, or any error.
 */
export async function getCachedResponse(
  query:    string,
  mode:     string,
  language: string,
): Promise<Record<string, unknown> | null> {
  if (!kvAvailable() || !CACHEABLE_MODES.has(mode)) return null
  try {
    const key  = buildCacheKey(query, mode, language)
    const data = await kv.get<Record<string, unknown>>(key)
    return data ?? null
  } catch {
    return null  // Cache miss — treat as if KV is not available
  }
}

/**
 * Store a response in the cache.
 * No-ops silently on KV unavailability or any error.
 */
export async function setCachedResponse(
  query:          string,
  mode:           string,
  language:       string,
  response:       Record<string, unknown>,
  hasResearch:    boolean,
): Promise<void> {
  if (!kvAvailable() || !CACHEABLE_MODES.has(mode)) return
  try {
    const key = buildCacheKey(query, mode, language)
    const ttl = hasResearch ? TTL_WITH_RESEARCH : TTL_WITHOUT_RESEARCH
    // Strip __healthReport from cached value — it contains timestamps that would
    // become stale. It is re-attached on cache hit from the current request context.
    const { __healthReport: _hr, scopeMetadata: _sm, ...cacheable } = response
    void _hr; void _sm
    await kv.set(key, cacheable, { ex: ttl })
  } catch {
    // Cache write failure is non-fatal — the response was already sent to the user
  }
}
