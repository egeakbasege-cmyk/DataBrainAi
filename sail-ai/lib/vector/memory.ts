/**
 * lib/vector/memory.ts — Semantic Memory: High-Level API
 * ─────────────────────────────────────────────────────────────────────────────
 * Combines Cohere embedding + Pinecone storage to give Sail AI cross-session
 * semantic memory. Past analyses are recalled by meaning, not keyword.
 *
 * Usage:
 *   // After an analysis completes:
 *   await saveAnalysis(userId, sessionId, query, summary, mode)
 *
 *   // Before generating a new response:
 *   const context = await recallRelevant(userId, query)
 *   // → inject context into system prompt
 */

import { embedText }    from './embed'
import { upsertVector, queryVectors, isPineconeConfigured } from './pinecone'
import type { MemoryMatch } from './pinecone'

export type { MemoryMatch }

// ── Save ──────────────────────────────────────────────────────────────────────

/**
 * Embed and store an analysis summary in Pinecone.
 * Call this after a successful Aetheris analysis is generated.
 *
 * @param userId    — user identifier (for filtering)
 * @param sessionId — unique session / analysis ID
 * @param query     — the original user question
 * @param summary   — condensed analysis summary (≤ 500 words)
 * @param mode      — analysis mode (upwind, trim, catamaran, etc.)
 */
export async function saveAnalysis(
  userId:    string,
  sessionId: string,
  query:     string,
  summary:   string,
  mode = 'upwind',
): Promise<boolean> {
  if (!isPineconeConfigured()) return false

  // Embed the query + summary together for richer recall
  const text   = `${query}\n\n${summary}`.slice(0, 2_000)
  const vector = await embedText(text, 'search_document')
  if (!vector) return false

  return upsertVector(
    `${userId}:${sessionId}`,
    vector,
    {
      userId,
      sessionId,
      query:     query.slice(0, 300),
      summary:   summary.slice(0, 500),
      mode,
      createdAt: new Date().toISOString(),
    },
  )
}

// ── Recall ────────────────────────────────────────────────────────────────────

/**
 * Recall the most semantically relevant past analyses for a given query.
 * Returns an empty array if Pinecone is not configured or no matches found.
 *
 * @param userId — user identifier (scopes the search to this user's history)
 * @param query  — the current user question to search against
 * @param topK   — maximum number of results (default 3)
 * @param minScore — minimum cosine similarity threshold (default 0.72)
 */
export async function recallRelevant(
  userId:   string,
  query:    string,
  topK    = 3,
  minScore = 0.72,
): Promise<MemoryMatch[]> {
  if (!isPineconeConfigured()) return []

  const vector = await embedText(query, 'search_query')
  if (!vector) return []

  const matches = await queryVectors(vector, userId, topK + 2) // fetch extra, then filter
  return matches
    .filter(m => m.score >= minScore && m.metadata.sessionId !== '') // exclude low-confidence
    .slice(0, topK)
}

// ── Format for prompt injection ────────────────────────────────────────────────

/**
 * Format recalled memories as a concise context block for LLM injection.
 * Designed to fit within a system prompt without excessive token cost.
 */
export function formatMemoryContext(matches: MemoryMatch[]): string {
  if (matches.length === 0) return ''

  const lines = ['=== Relevant past analyses (semantic memory) ===']

  matches.forEach((m, i) => {
    const date    = new Date(m.metadata.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const score   = (m.score * 100).toFixed(0)
    lines.push(
      `\n[${i + 1}] ${date} · ${m.metadata.mode} mode · ${score}% relevance`,
      `Q: ${m.metadata.query}`,
      `Summary: ${m.metadata.summary}`,
    )
  })

  lines.push('=== End of semantic memory ===')
  return lines.join('\n')
}
