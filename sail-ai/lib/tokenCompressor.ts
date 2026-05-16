/**
 * lib/tokenCompressor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cost-per-query optimiser — compresses conversation history before dispatch
 * to any LLM API to prevent exponential token growth in multi-turn sessions.
 *
 * Strategy:
 *   1. TAIL PRESERVATION  — Keep the last N turns verbatim (full fidelity)
 *   2. HEAD TRUNCATION    — Older turns are hard-truncated to MAX_PER_TURN chars
 *   3. BUDGET ENFORCEMENT — Walk backward from tail until maxTotalChars reached
 *   4. DEDUP              — Consecutive identical texts are collapsed
 *
 * Token estimation: 1 token ≈ 3.5 chars (conservative for mixed EN/TR content)
 */

export interface Turn {
  role:    'user' | 'assistant' | 'system'
  content: string
}

export interface CompressOptions {
  /** Number of most-recent turns to keep verbatim. Default: 6 */
  keepTail?: number
  /** Max characters for truncated head turns. Default: 400 */
  maxCharsPerHeadTurn?: number
  /** Hard cap on total character budget. Default: 12 000 (~3 400 tokens) */
  maxTotalChars?: number
  /** If true, inject a one-line compression notice before head turns. */
  addNotice?: boolean
}

export function compressHistory(turns: Turn[], opts: CompressOptions = {}): Turn[] {
  const {
    keepTail            = 6,
    maxCharsPerHeadTurn = 400,
    maxTotalChars       = 12_000,
    addNotice           = false,
  } = opts

  if (turns.length === 0) return []

  // ── 1. Dedup consecutive identical messages ──────────────────────────────
  const deduped = turns.reduce<Turn[]>((acc, t) => {
    const prev = acc[acc.length - 1]
    if (prev && prev.role === t.role && prev.content === t.content) return acc
    return [...acc, t]
  }, [])

  // ── 2. Split into head + tail ────────────────────────────────────────────
  const tail = deduped.slice(-keepTail)
  const head = deduped.slice(0, -keepTail).map(t => ({
    ...t,
    content: t.content.length > maxCharsPerHeadTurn
      ? t.content.slice(0, maxCharsPerHeadTurn).trimEnd() + '…'
      : t.content,
  }))

  // ── 3. Optional compression notice ──────────────────────────────────────
  const notice: Turn[] = addNotice && head.length > 0 ? [{
    role:    'system' as const,
    content: `[Context: ${head.length} earlier turn(s) summarised for brevity]`,
  }] : []

  const combined = [...notice, ...head, ...tail]

  // ── 4. Budget enforcement (walk backward from tail) ──────────────────────
  let totalChars  = 0
  const result: Turn[] = []

  for (let i = combined.length - 1; i >= 0; i--) {
    const t     = combined[i]!
    const chars = t.content.length
    if (totalChars + chars > maxTotalChars && result.length >= keepTail) break
    result.unshift(t)
    totalChars += chars
  }

  return result
}

/** Estimate token count for a list of turns (conservative: 3.5 chars/token). */
export function estimateTokens(turns: Turn[]): number {
  const totalChars = turns.reduce((n, t) => n + t.content.length, 0)
  return Math.ceil(totalChars / 3.5)
}

/** Quick single-string token estimate. */
export function estimateStringTokens(text: string): number {
  return Math.ceil(text.length / 3.5)
}
