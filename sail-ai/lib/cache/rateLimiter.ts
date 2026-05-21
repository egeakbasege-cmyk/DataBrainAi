/**
 * lib/cache/rateLimiter.ts — Per-User Rate Limiter
 * ──────────────────────────────────────────────────
 * Tracks request counts per userId using a fixed 60-second sliding window
 * stored in Vercel KV. Prevents any single user from exhausting the shared
 * Groq key pool and degrading service for all other users.
 *
 * Algorithm: fixed window counter
 *   Key:   "ratelimit:{userId}:{window}"   where window = floor(now / 60000)
 *   Value: integer request count
 *   TTL:   90 seconds (covers the full window + 30s safety margin)
 *
 *   INCR is atomic in Redis/KV — no race conditions under concurrent requests.
 *
 * Limits (conservative — adjust per business tier as needed):
 *   Standard users:   20 req/min
 *   Any user:         50 req/min  (hard ceiling, prevents pathological abuse)
 *
 * Graceful degradation:
 *   Returns { allowed: true } when KV_REST_API_URL is missing or any error occurs.
 *   Rate limiting is an availability enhancement, not a hard security gate —
 *   failing open is safer than blocking legitimate users on KV outage.
 */

import { kv } from '@vercel/kv'

// ── Limits ─────────────────────────────────────────────────────────────────────
const STANDARD_LIMIT = 20   // requests per 60-second window, per user
const HARD_LIMIT     = 50   // absolute ceiling regardless of user tier

// ── Key TTL ───────────────────────────────────────────────────────────────────
const WINDOW_TTL_SECONDS = 90  // 60s window + 30s safety margin

// ── KV availability guard ──────────────────────────────────────────────────────

function kvAvailable(): boolean {
  return typeof process.env.KV_REST_API_URL === 'string' && process.env.KV_REST_API_URL.length > 0
}

// ── Window key ─────────────────────────────────────────────────────────────────
// Changes every 60 seconds — automatically creates a new counter each window.

function windowKey(userId: string): string {
  const window = Math.floor(Date.now() / 60_000)
  return `ratelimit:${userId}:${window}`
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed:    boolean
  count:      number    // current request count this window
  limit:      number    // effective limit for this user
  remaining:  number    // requests remaining in this window
  resetInMs:  number    // milliseconds until the window resets
}

/**
 * Check and increment the rate limit counter for a user.
 * Call this BEFORE the Groq request — returns { allowed: false } to reject early.
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const limit      = STANDARD_LIMIT
  const resetInMs  = 60_000 - (Date.now() % 60_000)

  if (!kvAvailable()) {
    // KV not configured — fail open, no rate limiting applied
    return { allowed: true, count: 0, limit, remaining: limit, resetInMs }
  }

  try {
    const key   = windowKey(userId)
    // INCR: atomic increment. Returns the NEW value after increment.
    const count = await kv.incr(key)

    // Set TTL only on the first request in this window (count === 1)
    // Subsequent INCR calls do not reset the TTL.
    if (count === 1) {
      await kv.expire(key, WINDOW_TTL_SECONDS)
    }

    const effectiveLimit = Math.min(limit, HARD_LIMIT)
    const allowed        = count <= effectiveLimit

    return {
      allowed,
      count,
      limit:     effectiveLimit,
      remaining: Math.max(0, effectiveLimit - count),
      resetInMs,
    }
  } catch {
    // KV error — fail open to avoid blocking legitimate users
    return { allowed: true, count: 0, limit, remaining: limit, resetInMs }
  }
}
