/**
 * lib/vector/embed.ts — Cohere Multilingual Embeddings
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates 1024-dimensional semantic embeddings via the Cohere API.
 * Uses embed-multilingual-v3.0 — supports 100+ languages, making it
 * compatible with Sail AI's 6-locale user base.
 *
 * Two input types:
 *   'search_document' — for text being indexed (analysis summaries)
 *   'search_query'    — for text being searched (user queries)
 *
 * Falls back to null on any error so callers can gracefully skip vector ops.
 */

const COHERE_EMBED_URL   = 'https://api.cohere.com/v2/embed'
const COHERE_EMBED_MODEL = 'embed-multilingual-v3.0'
const EMBED_TIMEOUT_MS   = 5_000
const EMBED_DIMENSIONS   = 1024

export type EmbedInputType = 'search_document' | 'search_query'

interface CohereEmbedResponse {
  embeddings?: {
    float?: number[][]
  }
}

/**
 * Embed a single text string. Returns a float32 array or null if unavailable.
 */
export async function embedText(
  text:      string,
  inputType: EmbedInputType = 'search_document',
): Promise<number[] | null> {
  const apiKey = process.env.COHERE_API_KEY
  if (!apiKey) return null

  // Truncate to Cohere's 512-token soft limit (rough char estimate)
  const truncated = text.slice(0, 2_048)

  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), EMBED_TIMEOUT_MS)

  try {
    const res = await fetch(COHERE_EMBED_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      COHERE_EMBED_MODEL,
        texts:      [truncated],
        input_type: inputType,
        embedding_types: ['float'],
      }),
      signal: abort.signal,
    })

    clearTimeout(timer)

    if (!res.ok) {
      console.warn('[Embed] Cohere error:', res.status, await res.text())
      return null
    }

    const data = await res.json() as CohereEmbedResponse
    const vector = data.embeddings?.float?.[0]

    if (!vector || vector.length !== EMBED_DIMENSIONS) {
      console.warn('[Embed] Unexpected vector dimensions:', vector?.length)
      return null
    }

    return vector
  } catch (err) {
    clearTimeout(timer)
    console.warn('[Embed] Failed:', err)
    return null
  }
}

/** Dimensions for the Pinecone index configuration */
export const VECTOR_DIMENSIONS = EMBED_DIMENSIONS
