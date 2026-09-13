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

export interface CohereChatFetchOpts {
  /** Bring-your-own-key appended to the pool as a last resort. */
  byok?:      string | null
  /** Per-attempt request timeout in ms (applied to each key try). */
  timeoutMs?: number
}

/**
 * cohereChatFetch
 * POSTs a chat-completion body through the resolved transport, rotating across
 * the ENTIRE key pool so a rate-limited (429), unauthorised (401/403), or
 * server (5xx) response falls through to the next key — trial keys chain as
 * COHERE_API_KEY → …_1 → …_2 → …_3, then finally the AI Gateway if no direct
 * key remains. Returns the first usable Response. A non-retryable status (e.g.
 * 400) returns immediately since another key cannot fix it. When every key is
 * exhausted it returns the last failing Response, or a synthetic 503/429.
 *
 * The caller is responsible for reading the returned body; this helper only
 * inspects `res.status` and never consumes it. The passed body must already
 * carry the correct provider `model` id (use `resolveChatTransport().model`).
 */
export async function cohereChatFetch(
  body: Record<string, unknown>,
  opts: CohereChatFetchOpts = {},
): Promise<Response> {
  const { url, keys } = resolveChatTransport(opts.byok)
  if (keys.length === 0) {
    return new Response(JSON.stringify({ error: 'AI provider not configured.' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })
  }

  const payload = JSON.stringify(body)
  let last: Response | null = null

  for (const key of keys) {
    const res = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body:    payload,
      ...(opts.timeoutMs ? { signal: AbortSignal.timeout(opts.timeoutMs) } : {}),
    }).catch(() => null)

    if (!res) continue                 // network error / timeout → next key
    if (res.ok) return res             // success
    last = res
    // Rotate only when another key could plausibly succeed.
    if (res.status === 429 || res.status === 401 || res.status === 403 || res.status >= 500) continue
    return res                         // 400 etc. — rotation won't help
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
