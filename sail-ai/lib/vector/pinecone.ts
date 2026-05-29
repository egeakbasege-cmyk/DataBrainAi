/**
 * lib/vector/pinecone.ts — Pinecone REST Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin fetch-based wrapper for the Pinecone Vector Database REST API.
 * No SDK dependency — works in both Node.js and Edge Runtime.
 *
 * Index configuration (create once in Pinecone dashboard):
 *   Name:       sail-ai-memory
 *   Dimensions: 1024  (matches embed-multilingual-v3.0)
 *   Metric:     cosine
 *   Type:       Serverless (AWS us-east-1)
 *
 * Required env vars:
 *   PINECONE_API_KEY    — API key from Pinecone dashboard
 *   PINECONE_INDEX_HOST — Full host URL, e.g.
 *                         https://sail-ai-memory-abc123.svc.aped-4627-b74a.pinecone.io
 */

const PINECONE_TIMEOUT_MS = 6_000

function getHost(): string {
  return process.env.PINECONE_INDEX_HOST ?? ''
}

function getKey(): string {
  return process.env.PINECONE_API_KEY ?? ''
}

function isConfigured(): boolean {
  return Boolean(getHost() && getKey())
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MemoryMetadata {
  userId:    string
  sessionId: string
  query:     string
  summary:   string
  mode:      string
  createdAt: string
}

export interface MemoryMatch {
  id:       string
  score:    number
  metadata: MemoryMetadata
}

interface PineconeQueryResponse {
  matches?: {
    id:       string
    score?:   number
    metadata?: Record<string, unknown>
  }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function pineconeRequest(
  path:    string,
  method:  'GET' | 'POST' | 'DELETE',
  body?:   unknown,
): Promise<Response | null> {
  if (!isConfigured()) return null

  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), PINECONE_TIMEOUT_MS)

  try {
    const res = await fetch(`${getHost()}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Api-Key':      getKey(),
      },
      body:   body ? JSON.stringify(body) : undefined,
      signal: abort.signal,
    })
    clearTimeout(timer)
    return res
  } catch (err) {
    clearTimeout(timer)
    console.warn('[Pinecone] Request failed:', err)
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Upsert a single vector with metadata.
 * id should be unique per (userId, sessionId) pair.
 */
export async function upsertVector(
  id:       string,
  vector:   number[],
  metadata: MemoryMetadata,
): Promise<boolean> {
  const res = await pineconeRequest('/vectors/upsert', 'POST', {
    vectors: [{ id, values: vector, metadata }],
  })

  if (!res || !res.ok) {
    if (res) console.warn('[Pinecone] Upsert failed:', res.status, await res.text())
    return false
  }
  return true
}

/**
 * Query for the topK most semantically similar vectors.
 * Filters by userId namespace to keep memories user-scoped.
 */
export async function queryVectors(
  vector: number[],
  userId: string,
  topK = 3,
): Promise<MemoryMatch[]> {
  const res = await pineconeRequest('/query', 'POST', {
    vector,
    topK,
    includeMetadata: true,
    filter: { userId: { '$eq': userId } },
  })

  if (!res || !res.ok) {
    if (res) console.warn('[Pinecone] Query failed:', res.status)
    return []
  }

  const data = await res.json() as PineconeQueryResponse
  return (data.matches ?? []).map(m => ({
    id:       m.id,
    score:    m.score ?? 0,
    metadata: m.metadata as unknown as MemoryMetadata,
  }))
}

/**
 * Delete a specific vector by id.
 */
export async function deleteVector(id: string): Promise<boolean> {
  const res = await pineconeRequest('/vectors/delete', 'POST', { ids: [id] })
  return Boolean(res?.ok)
}

/** Check if Pinecone is configured (env vars present) */
export { isConfigured as isPineconeConfigured }
