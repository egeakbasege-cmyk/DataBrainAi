/**
 * lib/clients/cohere.ts — Shared Cohere v2 Chat helpers
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for the Cohere Chat API wire format across every
 * route and pipeline node. Cohere v2 accepts the same request body shape as the
 * previous provider (messages[], max_tokens, temperature, stream, response_format)
 * but returns a DIFFERENT response shape:
 *
 *   non-stream : { message: { content: [{ type: "text", text: "..." }] } }
 *   stream     : SSE events — content-delta carries delta.message.content.text
 *                (no [DONE] sentinel; message-end terminates the stream)
 *
 * These helpers centralise parsing so no route hand-rolls the shape.
 */

export const COHERE_CHAT_URL = 'https://api.cohere.com/v2/chat'

export const COHERE_MODELS = {
  /** Flagship reasoning model — replaces the old 70B primary */
  PRIMARY: 'command-a-03-2025',
  /** Fast, cheap model — replaces the old 8B instant model */
  FAST:    'command-r7b-12-2024',
} as const

export type CohereModel = typeof COHERE_MODELS[keyof typeof COHERE_MODELS]

// ── AI Gateway fallback ───────────────────────────────────────────────────────
// When no direct COHERE_API_KEY is provisioned (e.g. v0 preview sandboxes),
// route the exact same request through Vercel AI Gateway, which serves Cohere's
// chat model under an OpenAI-compatible endpoint. The request body shape is
// compatible (messages/max_tokens/temperature/response_format/stream); only the
// URL, auth key, model id, and response shape differ — the latter two handled by
// the model mapper and the dual-format parsers below. Production, where a real
// Cohere key exists, is unaffected and keeps hitting Cohere directly.

export const AI_GATEWAY_CHAT_URL = 'https://ai-gateway.vercel.sh/v1/chat/completions'

/** Cohere's flagship chat model as served by AI Gateway. */
export const AI_GATEWAY_MODEL = 'cohere/command-a'

export interface ChatTransport {
  url:      string
  keys:     string[]
  gateway:  boolean
  /** Maps a native Cohere model id to the id the resolved provider expects. */
  model:    (m: string) => string
}

/**
 * resolveChatTransport
 * Chooses the provider for chat calls:
 *   • Any COHERE_API_KEY present → Cohere direct (native format, unchanged).
 *   • Otherwise, AI_GATEWAY_API_KEY present → AI Gateway (OpenAI-compatible).
 *   • Neither → empty key pool (callers surface "AI provider not configured").
 */
export function resolveChatTransport(byok?: string | null): ChatTransport {
  const direct = cohereKeys(byok)
  if (direct.length > 0) {
    return { url: COHERE_CHAT_URL, keys: direct, gateway: false, model: m => m }
  }
  const gw = process.env.AI_GATEWAY_API_KEY
  if (gw) {
    return { url: AI_GATEWAY_CHAT_URL, keys: [gw], gateway: true, model: () => AI_GATEWAY_MODEL }
  }
  return { url: COHERE_CHAT_URL, keys: [], gateway: false, model: m => m }
}

// ── Groq fallback provider ────────────────────────────────────────────────────
// Real Groq (groq.com), OpenAI-compatible. Used as the LAST tier once every
// Cohere key and the AI Gateway are exhausted. Model ids are Groq-native and
// verified current; the response/stream shape is OpenAI-compatible and already
// handled by extractCohereText / cohereStreamDelta.

export const GROQ_FALLBACK_URL = 'https://api.groq.com/openai/v1/chat/completions'

export const GROQ_FALLBACK_MODELS = {
  PRIMARY: 'openai/gpt-oss-120b',
  FAST:    'openai/gpt-oss-20b',
} as const

/**
 * groqKeys — real Groq API keys in priority order: GROQ_API_KEY → GROQ_API_KEY_1…5
 */
export function groqKeys(): string[] {
  const keys: string[] = []
  const push = (k?: string | null) => { if (k && !keys.includes(k)) keys.push(k) }
  push(process.env.GROQ_API_KEY)
  for (let i = 1; i <= 5; i++) push(process.env[`GROQ_API_KEY_${i}`])
  return keys
}

/** Classify any model id into a capability tier so each provider gets a valid id. */
function modelTier(model: string): 'fast' | 'primary' {
  const m = (model || '').toLowerCase()
  if (m.includes('r7b') || m.includes('command-r') || m.includes('-20b') || m.includes('mini') || m.includes('fast')) {
    return 'fast'
  }
  return 'primary'
}

export type ChatProvider = 'cohere' | 'ai-gateway' | 'groq'

export interface ProviderAttempt {
  provider: ChatProvider
  url:      string
  key:      string
  /** Maps a requested model id to a valid id for THIS provider (tier-aware). */
  model:    (requested: string) => string
  /**
   * Provider-specific body fields merged into every request for this attempt.
   * Groq's gpt-oss models are reasoning models that otherwise spend the whole
   * token budget on hidden reasoning (empty content + failed JSON validation),
   * so we pin `reasoning_effort: 'low'` to guarantee usable output.
   */
  extraBody?: Record<string, unknown>
}

/**
 * buildProviderChain
 * The ordered failover chain used by every AI route. Each entry is one concrete
 * (provider, key) attempt. Rotation walks the list in order:
 *
 *   1. Cohere direct — COHERE_API_KEY (key 0) → …_1 → …_2 → …_3 (+ BYOK)
 *   2. AI Gateway    — AI_GATEWAY_API_KEY (serves cohere/command-a)
 *   3. Groq          — GROQ_API_KEY → …_1 … (openai/gpt-oss-*)
 *
 * So when the trial Cohere keys hit their rate limit, calls automatically spill
 * over to the AI Gateway and then to Groq — the other providers already wired
 * into this app — instead of failing.
 */
export function buildProviderChain(byok?: string | null): ProviderAttempt[] {
  const chain: ProviderAttempt[] = []

  for (const key of cohereKeys(byok)) {
    chain.push({
      provider: 'cohere',
      url:      COHERE_CHAT_URL,
      key,
      model:    m => (modelTier(m) === 'fast' ? COHERE_MODELS.FAST : COHERE_MODELS.PRIMARY),
    })
  }

  const gw = process.env.AI_GATEWAY_API_KEY
  if (gw) {
    chain.push({
      provider: 'ai-gateway',
      url:      AI_GATEWAY_CHAT_URL,
      key:      gw,
      model:    () => AI_GATEWAY_MODEL,
    })
  }

  for (const key of groqKeys()) {
    chain.push({
      provider:  'groq',
      url:       GROQ_FALLBACK_URL,
      key,
      model:     m => (modelTier(m) === 'fast' ? GROQ_FALLBACK_MODELS.FAST : GROQ_FALLBACK_MODELS.PRIMARY),
      extraBody: { reasoning_effort: 'low' },
    })
  }

  return chain
}

/** True when another provider/key could plausibly succeed after this status. */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status === 401 || status === 403 || status >= 500
}

export interface CohereChatFetchOpts {
  /** Bring-your-own-key appended to the pool as a last resort. */
  byok?:      string | null
  /** Per-attempt request timeout in ms (applied to each key try). */
  timeoutMs?: number
}

/**
 * cohereChatFetch
 * POSTs a chat-completion body through the full provider cascade
 * (Cohere keys 0→1→2→3 → AI Gateway → Groq). A rate-limited (429),
 * unauthorised (401/403), server (5xx) response, or network error falls through
 * to the next attempt; the model id is remapped per provider so each gets a
 * valid id regardless of what the caller passed. Returns the first usable
 * Response. A non-retryable status (e.g. 400) returns immediately. When every
 * provider is exhausted it returns the last failing Response, or a synthetic
 * 503/429.
 *
 * The caller is responsible for reading the returned body; this helper only
 * inspects `res.status` and never consumes it.
 */
export async function cohereChatFetch(
  body: Record<string, unknown>,
  opts: CohereChatFetchOpts = {},
): Promise<Response> {
  const chain = buildProviderChain(opts.byok)
  if (chain.length === 0) {
    return new Response(JSON.stringify({ error: 'AI provider not configured.' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })
  }

  const requested = typeof body.model === 'string' ? body.model : COHERE_MODELS.PRIMARY
  let last: Response | null = null

  for (const attempt of chain) {
    const res = await fetch(attempt.url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${attempt.key}` },
      body:    JSON.stringify({ ...body, ...attempt.extraBody, model: attempt.model(requested) }),
      ...(opts.timeoutMs ? { signal: AbortSignal.timeout(opts.timeoutMs) } : {}),
    }).catch(() => null)

    if (!res) continue                          // network error / timeout → next provider
    if (res.ok) return res                      // success
    last = res
    if (isRetryableStatus(res.status)) continue // rotate to next key/provider
    return res                                  // 400 etc. — rotation won't help
  }

  return last ?? new Response(
    JSON.stringify({ error: 'Rate limit reached. Please try again shortly.' }),
    { status: 429, headers: { 'Content-Type': 'application/json' } },
  )
}

/**
 * cohereKeys
 * Returns all non-empty Cohere API keys in priority order:
 *   COHERE_API_KEY → COHERE_API_KEY_1…5 → byok (last resort)
 */
export function cohereKeys(byok?: string | null): string[] {
  const keys: string[] = []
  const push = (k?: string | null) => { if (k && !keys.includes(k)) keys.push(k) }
  push(process.env.COHERE_API_KEY)
  for (let i = 1; i <= 5; i++) push(process.env[`COHERE_API_KEY_${i}`])
  push(byok)
  return keys
}

interface CohereChatJson {
  message?: { content?: Array<{ type?: string; text?: string }> }
  choices?: Array<{ message?: { content?: string } }>
  error?:   { message?: string }
}

/**
 * extractCohereText
 * Concatenates the text of a non-streaming chat response. Handles both the
 * Cohere v2 native shape (message.content[].text) and the AI Gateway
 * OpenAI-compatible shape (choices[0].message.content).
 */
export function extractCohereText(json: unknown): string {
  const j = json as CohereChatJson
  const blocks = j?.message?.content
  if (Array.isArray(blocks)) {
    const text = blocks.map(b => (b?.text ?? '')).join('').trim()
    if (text) return text
  }
  const openai = j?.choices?.[0]?.message?.content
  if (typeof openai === 'string') return openai.trim()
  return ''
}

/**
 * cohereStreamDelta
 * Parses a single Cohere SSE payload (the JSON string after "data: ").
 * Returns the text delta for content-delta events, otherwise null.
 */
export function cohereStreamDelta(payload: string): string | null {
  try {
    const evt = JSON.parse(payload) as {
      type?:    string
      delta?:   { message?: { content?: { text?: string } } }
      choices?: Array<{ delta?: { content?: string } }>
    }
    // Cohere v2 native streaming
    if (evt.type === 'content-delta') return evt.delta?.message?.content?.text ?? null
    // AI Gateway OpenAI-compatible streaming
    const openai = evt.choices?.[0]?.delta?.content
    if (typeof openai === 'string') return openai
    return null
  } catch {
    return null
  }
}
