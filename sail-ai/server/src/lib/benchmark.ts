import { createClient } from '@supabase/supabase-js'
import type { BenchmarkDoc } from '../types'

let _client: ReturnType<typeof createClient> | null = null

function getClient() {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _client
}

/**
 * Retrieve the most relevant benchmark documents for a given query.
 *
 * Primary path: Supabase RPC `match_benchmarks` which uses pgvector similarity
 * search with the gte-small embedding model (no external embedding API needed).
 *
 * Fallback path: Postgres full-text search if vector search fails or Supabase
 * is not configured — still surfaces relevant sector data without embeddings.
 *
 * Returns an empty array on any failure so the chat route degrades gracefully.
 */
export async function retrieveBenchmarks(
  query:  string,
  limit = 4,
): Promise<BenchmarkDoc[]> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return []
  }

  const supabase = getClient()

  // ── Primary: pgvector similarity via Supabase AI embedding ───────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('match_benchmarks', {
      query_text:  query,
      match_count: limit,
    }) as { data: unknown; error: unknown }
    if (!error && Array.isArray(data) && data.length > 0) {
      return data as BenchmarkDoc[]
    }
  } catch { /* fall through to text search */ }

  // ── Fallback: full-text search ────────────────────────────────────────────
  try {
    const keywords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 6)
      .join(' | ')

    if (!keywords) return []

    const { data } = await supabase
      .from('benchmarks')
      .select('sector, metric, value, source, summary')
      .textSearch('summary', keywords, { type: 'websearch' })
      .limit(limit)

    return (data ?? []) as BenchmarkDoc[]
  } catch {
    return []
  }
}
