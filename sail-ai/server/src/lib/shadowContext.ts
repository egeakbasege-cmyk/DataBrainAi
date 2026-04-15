/**
 * Aetheris Shadow Context — Supabase pgvector layer
 *
 * Stores and retrieves per-user strategic trajectory data as vector
 * embeddings. Every session turn that contains extractable strategic
 * signal (a new metric, a directional decision, a risk acknowledgement)
 * should be persisted here so subsequent calls benefit from trajectory-
 * aware context rather than a blank slate.
 *
 * Primary path:  `match_shadow_context` RPC (pgvector cosine similarity)
 * Fallback path: recency-sorted SELECT for the same user_id
 */

import { createClient } from '@supabase/supabase-js'
import type { ShadowContextRecord, StrategicVector, AetherisState } from '../types/architecture'

// ── Lazy Supabase client ───────────────────────────────────────────────────────

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

function isConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// ── Write ──────────────────────────────────────────────────────────────────────

/**
 * Persist a strategic vector record to the `shadow_context` table.
 *
 * Uses the `upsert_shadow_context` RPC which:
 *   1. Generates an embedding from `p_vector_summary` using Supabase AI (gte-small)
 *   2. Upserts the row keyed on (session_id, dimension)
 *
 * Non-fatal — if Supabase is unavailable the chat pipeline continues unaffected.
 */
export async function persistShadowContext(
  record: Omit<ShadowContextRecord, 'id' | 'createdAt'>,
): Promise<void> {
  if (!isConfigured()) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (getClient() as any).rpc('upsert_shadow_context', {
      p_session_id:            record.sessionId,
      p_user_id:               record.userId,
      p_dimension:             record.dimension,
      p_context_text:          record.contextText,
      p_vector_summary:        record.vectorSummary,
      p_current_velocity:      record.currentVelocity,
      p_target_velocity:       record.targetVelocity,
      p_inflection_point_date: record.inflectionPointDate,
    })
  } catch {
    // Non-fatal — shadow context enrichment is best-effort
  }
}

// ── Read ───────────────────────────────────────────────────────────────────────

/**
 * Retrieve the most relevant shadow context records for a query string.
 *
 * Primary:  `match_shadow_context` RPC — pgvector cosine similarity on the
 *           embedded `vector_summary` column (gte-small, 384 dimensions).
 * Fallback: Most-recent rows for `userId` ordered by `created_at DESC`.
 *
 * Returns an empty array on any failure — never throws.
 */
export async function retrieveShadowContext(
  query:  string,
  userId: string,
  limit = 3,
): Promise<ShadowContextRecord[]> {
  if (!isConfigured()) return []

  const supabase = getClient()

  // ── Primary: vector similarity ────────────────────────────────────────────
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).rpc('match_shadow_context', {
      query_text:  query,
      p_user_id:   userId,
      match_count: limit,
    }) as { data: unknown; error: unknown }

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as ShadowContextRecord[]
    }
  } catch { /* fall through to recency sort */ }

  // ── Fallback: recency sort ────────────────────────────────────────────────
  try {
    const { data } = await supabase
      .from('shadow_context')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    return (data ?? []) as ShadowContextRecord[]
  } catch {
    return []
  }
}

// ── State assembly ─────────────────────────────────────────────────────────────

/**
 * Build a partial `AetherisState` snapshot from persisted shadow context.
 * Called at the start of each request to provide trajectory context to the LLM.
 *
 * The resulting `activeStrategicVectors` are serialised into the system prompt
 * so the model understands where the user's strategy currently stands.
 */
export async function buildAetherisSnapshot(
  sessionId: string,
  userId:    string,
  query:     string,
): Promise<Partial<AetherisState>> {
  const records = await retrieveShadowContext(query, userId)

  const activeStrategicVectors: StrategicVector[] = records.map(r => ({
    dimension:           r.dimension,
    currentVelocity:     r.currentVelocity,
    targetVelocity:      r.targetVelocity,
    inflectionPointDate: new Date(r.inflectionPointDate),
  }))

  return {
    sessionId,
    userId,
    cognitiveLoadIndex:    0,   // Computed client-side and forwarded in AetherisPayload
    baselineMetrics:       {},
    activeStrategicVectors,
    predictiveDriftAlerts: [],
  }
}

// ── Context serialisation for prompt injection ─────────────────────────────────

/**
 * Convert active strategic vectors into a concise system-prompt block.
 * Injected between the agent mode prefix and the core strategy prompt.
 *
 * Example output:
 *   STRATEGIC TRAJECTORY (3 active vectors):
 *   - Market Penetration: velocity 42/100 → target 75 (inflection: 2026-07-01)
 *   - Retention Health: velocity 28/100 → target 60 (inflection: 2026-05-15)
 */
export function serialiseShadowContext(vectors: StrategicVector[]): string {
  if (!vectors.length) return ''

  const lines = vectors.map(v => {
    const inflection = v.inflectionPointDate instanceof Date
      ? v.inflectionPointDate.toISOString().slice(0, 10)
      : String(v.inflectionPointDate)
    return `- ${v.dimension}: velocity ${v.currentVelocity}/100 → target ${v.targetVelocity} (inflection: ${inflection})`
  })

  return `\nSTRATEGIC TRAJECTORY (${vectors.length} active vector${vectors.length > 1 ? 's' : ''}):\n${lines.join('\n')}\n`
}
