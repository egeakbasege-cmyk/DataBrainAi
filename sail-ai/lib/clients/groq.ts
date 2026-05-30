/**
 * lib/clients/groq.ts — Aetheris Groq API Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Dedicated, strictly-typed Groq API client for Vercel Edge Runtime.
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

// ── Groq endpoint + model identifiers ────────────────────────────────────────

export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export const GROQ_MODELS = {
  PRIMARY: 'llama-3.3-70b-versatile' as const, // 12 K TPM on_demand
  FAST:    'llama-3.1-8b-instant'    as const, // 500 K TPD — 5× daily headroom
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
  choices?: Array<{
    message?: { content?: string }
    delta?:   { content?: string }
  }>
  error?: { message?: string }
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
  const base = process.env.GROQ_API_KEY
  if (base) keys.push(base)
  for (let i = 1; i <= 5; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`]
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
  const keys     = buildKeyPool(byokKey)
  const body     = JSON.stringify(request)
  const fastBody = JSON.stringify({ ...request, model: GROQ_MODELS.FAST })

  const authHeaders = (key: string): Record<string, string> => ({
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${key}`,
  })

  // Phase 1 — primary model, all keys
  let atLeastOneNon429 = false
  for (const key of keys) {
    if (_isOpen(key)) continue

    const res = await fetch(GROQ_URL, {
      method:  'POST',
      headers: authHeaders(key),
      body,
    }).catch(() => null)

    if (!res) { _failure(key); continue }

    if (res.status === 429) { _failure(key); continue }

    atLeastOneNon429 = true

    if (
      res.status === 503 ||
      res.status === 500 ||
      res.status === 400 ||
      res.status === 413
    ) {
      _failure(key)
      const fallback = await fetch(GROQ_URL, {
        method:  'POST',
        headers: authHeaders(key),
        body:    fastBody,
      }).catch(() => null)
      if (fallback?.ok) { _success(key); return fallback }
      continue
    }

    if (res.ok) _success(key)
    return res
  }

  if (atLeastOneNon429) {
    return new Response(
      JSON.stringify({ error: { message: 'AI provider unreachable.' } }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Phase 2 — all keys 429'd on primary → retry all with FAST model
  for (const key of keys) {
    if (_isOpen(key)) continue
    const res = await fetch(GROQ_URL, {
      method:  'POST',
      headers: authHeaders(key),
      body:    fastBody,
    }).catch(() => null)
    if (res && res.status !== 429) { _success(key); return res }
    if (res?.status === 429) _failure(key)
  }

  return new Response(
    JSON.stringify({ error: { message: 'Rate limit reached. Please wait a moment and try again.' } }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  )
}

// ── JSON content extractor ────────────────────────────────────────────────────

export async function extractGroqContent(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}) as GroqApiResponse) as GroqApiResponse
  return data.choices?.[0]?.message?.content ?? ''
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
  const key = buildKeyPool(byokKey)[0]
  if (!key) return groqFetch(opts.complexRequest, byokKey)

  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${key}`,
  }

  const abortSimple  = new AbortController()
  const abortComplex = new AbortController()

  // eslint-disable-next-line prefer-const -- mutated inside .then() callbacks
  let resolvedWith: string = 'complex'

  const simpleP = fetch(GROQ_URL, {
    method: 'POST', headers,
    body:   JSON.stringify(opts.simpleRequest),
    signal: abortSimple.signal,
  })
    .catch(() => null)
    .then(r => { resolvedWith = 'simple'; return r })

  const complexP = fetch(GROQ_URL, {
    method: 'POST', headers,
    body:   JSON.stringify(opts.complexRequest),
    signal: abortComplex.signal,
  })
    .catch(() => null)
    .then(r => { resolvedWith = 'complex'; return r })

  const winner = await Promise.race([simpleP, complexP])

  // Abort the slower request to reclaim Groq TPM
  if (resolvedWith === 'simple') abortComplex.abort()
  else                           abortSimple.abort()

  if (winner?.ok) return winner

  // Winner request failed — fall back to the other (already in-flight)
  const fallback = resolvedWith === 'simple' ? await complexP : await simpleP
  if (fallback?.ok) return fallback

  // Both failed — full retry with key rotation
  return groqFetch(opts.complexRequest, byokKey)
}
