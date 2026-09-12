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
  error?:   { message?: string }
}

/**
 * extractCohereText
 * Concatenates every text content block from a non-streaming Cohere response.
 */
export function extractCohereText(json: unknown): string {
  const blocks = (json as CohereChatJson)?.message?.content
  if (!Array.isArray(blocks)) return ''
  return blocks.map(b => (b?.text ?? '')).join('').trim()
}

/**
 * cohereStreamDelta
 * Parses a single Cohere SSE payload (the JSON string after "data: ").
 * Returns the text delta for content-delta events, otherwise null.
 */
export function cohereStreamDelta(payload: string): string | null {
  try {
    const evt = JSON.parse(payload) as {
      type?:  string
      delta?: { message?: { content?: { text?: string } } }
    }
    if (evt.type === 'content-delta') return evt.delta?.message?.content?.text ?? null
    return null
  } catch {
    return null
  }
}
