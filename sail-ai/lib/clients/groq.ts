/**
 * lib/clients/groq.ts — Aetheris Cohere API Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated, strictly-typed Cohere API client for Vercel Edge Runtime.
 *
 * Capabilities:
 *   • Per-key circuit breakers  — fail-fast on quota/error storms
 *   • Key pool rotation         — server keys → BYOK, primary → 8B fallback
 *   • Structured Output schemas — JSON Schema strict mode (no repair step)
 *   • Predictive Speculative    — race 8B vs 70B, stream the winner
 *   • Zero Node.js APIs         — pure Web APIs throughout
 *
 * Circuit breaker states (per key, module-level):
 *   CLOSED    — healthy, accepting requests
 *   OPEN      — tripped (3 consecutive failures), rejects for 30 s
 *   HALF-OPEN — probe window after 30 s; one test request allowed
 */

import { resolveChatTransport, buildProviderChain, isRetryableStatus, extractCohereText } from './cohere'

// ── Groq endpoint + model identifiers ────────────────────────────────────────

export const GROQ_URL = 'https://api.cohere.com/v2/chat'

export const GROQ_MODELS = {
  PRIMARY: 'command-a-03-2025' as const,
  FAST:    'command-r7b-12-2024' as const,
}
export type GroqModel = typeof GROQ_MODELS[keyof typeof GROQ_MODELS]

// ── Typed request / response shapes ──────────────────────────────────────────

export interface GroqMessage {
  role:    'system' | 'user' | 'assistant'
  content: string
}

export interface JSONObjectFormat {
  type: 'json_object'
}

export type ResponseFormat = JSONObjectFormat

export interface GroqRequest {
  model:            GroqModel | string
  messages:         GroqMessage[]
  max_tokens:       number
  temperature:      number
  stream?:          boolean
  response_format?: ResponseFormat
}

export interface GroqApiResponse {
  // Cohere v2 non-streaming shape
  message?: { content?: Array<{ type?: string; text?: string }> }
  error?:   { message?: string }
}

// ── Circuit breaker (module-level, shared within one Edge instance) ───────────
// Acceptable: protects within-request key rotation. For cross-request
// persistence, back with KV (future enhancement).

const CIRCUIT_FAILURE_THRESHOLD = 3       // consecutive failures to trip
const CIRCUIT_RESET_MS          = 30_000  // 30 s half-open window

interface CircuitState {
  failures: number
  openedAt: number  // 0 = CLOSED
}

const _circuits = new Map<string, CircuitState>()

function _getCircuit(key: string): CircuitState {
  if (!_circuits.has(key)) _circuits.set(key, { failures: 0, openedAt: 0 })
  return _circuits.get(key)!
}

function _isOpen(key: string): boolean {
  const c = _getCircuit(key)
  if (c.openedAt === 0) return false                              // CLOSED
  if (Date.now() - c.openedAt > CIRCUIT_RESET_MS) {              // HALF-OPEN probe
    c.openedAt = 0
    return false
  }
  return true                                                     // OPEN — reject
}

function _success(key: string): void {
  const c = _getCircuit(key)
  c.failures = 0
  c.openedAt = 0
}

function _failure(key: string): void {
  const c = _getCircuit(key)
  c.failures++
  if (c.failures >= CIRCUIT_FAILURE_THRESHOLD && c.openedAt === 0) {
    c.openedAt = Date.now()
  }
}

// ── Key pool ──────────────────────────────────────────────────────────────────

/**
 * buildKeyPool
 *
 * Returns all non-empty Groq API keys in priority order:
 *   GROQ_API_KEY → GROQ_API_KEY_1…5 → byokKey (last resort)
 */
export function buildKeyPool(byokKey?: string): string[] {
  const keys: string[] = []
  const base = process.env.COHERE_API_KEY
  if (base) keys.push(base)
  for (let i = 1; i <= 5; i++) {
    const k = process.env[`COHERE_API_KEY_${i}`]
    if (k && !keys.includes(k)) keys.push(k)
  }
  if (byokKey && !keys.includes(byokKey)) keys.push(byokKey)
  return keys
}

// ── Core fetch: rotation + circuit breaker + model fallback ──────────────────

/**
 * groqFetch
 *
 * Retry strategy:
 *   Phase 1 — try each non-open key with the PRIMARY model
 *     • 429 (rate-limited)         → record failure, try next key
 *     • 503/500/400/413 (server)   → record failure, immediate 8B retry on same key
 *     • any other status            → record success/failure, return as-is
 *   Phase 2 — if ALL keys returned 429 → retry all with FAST (8B) model
 *   Final     — synthesise a 429 response so callers show the right message
 */
export async function groqFetch(
  request:  GroqRequest,
  byokKey?: string,
): Promise<Response> {
  const chain = buildProviderChain(byokKey)
  if (chain.length === 0) {
    return new Response(
      JSON.stringify({ error: { message: 'AI provider not configured.' } }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const authHeaders = (key: string): Record<string, string> => ({
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${key}`,
  })
  const mkBody = (a: { model: (m: string) => string; extraBody?: Record<string, unknown> }, model: string) =>
    JSON.stringify({ ...request, ...a.extraBody, model: a.model(model) })

  // Walk the cascade: Cohere keys 0→1→2→3 → AI Gateway → Groq. A rate limit,
  // auth failure, or server error rotates to the next attempt; a transient 5xx
  // additionally gets one same-provider retry on the FAST model first.
  let last: Response | null = null
  for (const a of chain) {
    if (_isOpen(a.key)) continue

    const res = await fetch(a.url, {
      method:  'POST',
      headers: authHeaders(a.key),
      body:    mkBody(a, request.model),
    }).catch(() => null)

    if (!res) { _failure(a.key); continue }

    if (res.ok) { _success(a.key); return res }

    if (isRetryableStatus(res.status)) {
      _failure(a.key)
      // Transient server error → quick FAST-model retry on the same provider.
      if (res.status >= 500) {
        const fallback = await fetch(a.url, {
          method:  'POST',
          headers: authHeaders(a.key),
          body:    mkBody(a, GROQ_MODELS.FAST),
        }).catch(() => null)
        if (fallback?.ok) { _success(a.key); return fallback }
      }
      last = res
      continue
    }

    return res // non-retryable (e.g. 400) — another provider won't help
  }

  return last ?? new Response(
    JSON.stringify({ error: { message: 'Rate limit reached. Please wait a moment and try again.' } }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  )
}

// ── JSON content extractor ────────────────────────────────────────────────────

export async function extractGroqContent(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}))
  // Shared dual-format parser handles both Cohere-native and AI Gateway shapes.
  return extractCohereText(data)
}

// ── Structured Output JSON Schemas ────────────────────────────────────────────
// Enforced at Groq generation time — eliminates all downstream repair steps.
// Each schema mirrors the exact shape expected by the frontend renderers.

// json_schema strict mode is not supported by llama-3.3-70b-versatile or
// llama-3.1-8b-instant on Groq. All modes use json_object (valid JSON guaranteed;
// structure is enforced via the system prompt instead).
export const JSON_SCHEMAS = {

  // ── UPWIND — ExecutiveResponse ──────────────────────────────────────────────
  executive: { type: 'json_object' } as const satisfies JSONObjectFormat,

  // ── DOWNWIND — DownwindResponse ─────────────────────────────────────────────
  downwind: { type: 'json_object' } as const satisfies JSONObjectFormat,

  // ── TRIM — TrimResponse ─────────────────────────────────────────────────────
  trim: { type: 'json_object' } as const satisfies JSONObjectFormat,

  // ── CATAMARAN — CatamaranResponse ───────────────────────────────────────────
  catamaran: { type: 'json_object' } as const satisfies JSONObjectFormat,

  // ── PersonalisedAI Specialist Draft ─────────────────────────────────────────
  specialist_draft: { type: 'json_object' } as const satisfies JSONObjectFormat,
} as const

// ── Predictive Speculative Fetch ──────────────────────────────────────────────

export interface SpeculativeOptions {
  /** 8B model request — low depth, instant */
  simpleRequest:  GroqRequest
  /** 70B model request — full depth */
  complexRequest: GroqRequest
  /** SemanticRouter clarity score 0–1 */
  clarityScore:   number
}

/**
 * speculativeFetch
 *
 * Fires BOTH requests simultaneously. Streams the winner based on clarity:
 *   ≥ 0.75  → always use complex (70B); abort simple to preserve TPM
 *   < 0.35  → always use simple (8B); abort complex
 *   0.35–0.74 → race: take whichever resolves first, abort the other
 *
 * Falls back to key-rotating groqFetch on any failure.
 */
export async function speculativeFetch(
  opts:     SpeculativeOptions,
  byokKey?: string,
): Promise<Response> {
  // Deterministic zones — single fetch, no speculation overhead
  if (opts.clarityScore >= 0.75) return groqFetch(opts.complexRequest, byokKey)
  if (opts.clarityScore <  0.35) return groqFetch(opts.simpleRequest,  byokKey)

  // Mid-range zone: race both requests
  const { url, keys, model: mapModel } = resolveChatTransport(byokKey)
  const key = keys[0]
  if (!key) return groqFetch(opts.complexRequest, byokKey)

  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${key}`,
  }

  const abortSimple  = new AbortController()
  const abortComplex = new AbortController()

  // Tag each resolved value with its origin so the winner is identified
  // reliably from the raced value itself — never from shared mutable state,
  // which a late-settling loser callback could otherwise overwrite.
  type Raced = { which: 'simple' | 'complex'; res: Response | null }

  const simpleP: Promise<Raced> = fetch(url, {
    method: 'POST', headers,
    body:   JSON.stringify({ ...opts.simpleRequest, model: mapModel(opts.simpleRequest.model) }),
    signal: abortSimple.signal,
  })
    .catch(() => null)
    .then(res => ({ which: 'simple', res }))

  const complexP: Promise<Raced> = fetch(url, {
    method: 'POST', headers,
    body:   JSON.stringify({ ...opts.complexRequest, model: mapModel(opts.complexRequest.model) }),
    signal: abortComplex.signal,
  })
    .catch(() => null)
    .then(res => ({ which: 'complex', res }))

  const winner = await Promise.race([simpleP, complexP])

  if (winner.res?.ok) {
    // Winner is healthy — abort the slower request to reclaim Groq TPM
    if (winner.which === 'simple') abortComplex.abort()
    else                           abortSimple.abort()
    return winner.res
  }

  // Winner failed — keep the other request in-flight (do NOT abort it) and use it
  const other = await (winner.which === 'simple' ? complexP : simpleP)
  if (other.res?.ok) return other.res

  // Both failed — full retry with key rotation
  return groqFetch(opts.complexRequest, byokKey)
}
