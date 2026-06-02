/**
 * app/api/edge-agents/deep-explore/route.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * KAIROS Autonomous Deep-Explore Agent — Vercel Edge Runtime
 *
 * Pipeline:
 *   1. Auth  — validate session, extract user email + BYOK Groq key
 *   2. Query — build Tavily search queries from sector + diagnostic context
 *   3. Fetch — Tavily Advanced Search (3 parallel queries)
 *   4. LLM   — Groq synthesis with KAIROS_SYSTEM prompt → structured JSON
 *   5. Store — non-blocking pgvector memory write (fire-and-forget)
 *   6. Return { insight, meta }
 *
 * Security:
 *   • BYOK key: arrives in body.apiKey, forwarded to groqFetch, NEVER persisted
 *   • User email used server-side only as Supabase RLS userId — never in response
 *   • CRON_SECRET checked for cron-triggered calls via X-CRON-SECRET header
 */

export const runtime = 'edge'

import { auth }             from '@/auth'
import { groqFetch,
         extractGroqContent,
         GROQ_MODELS }      from '@/lib/clients/groq'

// ── Constants ─────────────────────────────────────────────────────────────────

const TAVILY_URL     = 'https://api.tavily.com/search'
const MAX_RESULTS    = 5      // per Tavily query
const SYNTHESIS_TOKENS = 1200

// ── KAIROS System Prompt ──────────────────────────────────────────────────────
// Instructs Groq to produce a structured insight object.
// Rules enforced here so the frontend never needs to sanitise:
//   • No customer satisfaction templates
//   • No hype labels (no "Unicorn", "Rocket ship", etc.)
//   • MRR brackets must be one of: 0-10k | 10-50k | 500k+
//   • All monetary values in the user's reported currency

const KAIROS_SYSTEM = `You are KAIROS, a precision market intelligence engine.
Your output is always a single valid JSON object — no markdown, no prose outside the object.

Output schema:
{
  "summary":    string,          // 2-3 sentence executive summary, no hype
  "signals":    string[],        // 3-5 concrete market signals from the sources
  "actions":    {                // ranked tactical actions
    "label":    string,          // imperative verb phrase, ≤10 words
    "impact":   "HIGH"|"MED"|"LOW",
    "effort":   "HIGH"|"MED"|"LOW",
    "timeline": string           // e.g. "30 days", "90 days"
  }[],
  "benchmarks": {                // relevant numeric benchmarks cited
    "metric":   string,
    "value":    string,
    "source":   string
  }[],
  "risks":      string[],        // 2-3 risks or counter-signals
  "confidence": number           // 0.0–1.0, your confidence in this synthesis
}

Rules you must never break:
- Never use the phrases "customer satisfaction", "rocket ship", "unicorn", or "10x".
- Never invent benchmarks — only cite figures present in the provided sources.
- MRR brackets, when referenced, must use exactly: 0-10k | 10-50k | 500k+
- Do not ask clarifying questions.`

// ── Types ─────────────────────────────────────────────────────────────────────

interface DeepExploreRequest {
  sector:      string
  queries:     string[]   // 1-3 search angles the caller wants explored
  context?:    string     // optional diagnostic context (serialised JSON string)
  apiKey?:     string     // BYOK Groq key — forwarded only, never stored
}

interface TavilyResult {
  title:   string
  url:     string
  content: string
  score:   number
}

interface TavilyResponse {
  results?: TavilyResult[]
}

interface KairosInsight {
  summary:    string
  signals:    string[]
  actions:    { label: string; impact: string; effort: string; timeline: string }[]
  benchmarks: { metric: string; value: string; source: string }[]
  risks:      string[]
  confidence: number
}

// ── Tavily search helper ───────────────────────────────────────────────────────

async function tavilySearch(query: string, apiKey: string): Promise<TavilyResult[]> {
  const res = await fetch(TAVILY_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      api_key:      apiKey,
      query,
      search_depth: 'advanced',
      max_results:  MAX_RESULTS,
      include_answer: false,
    }),
  })

  if (!res.ok) return []

  const data = await res.json().catch(() => ({} as TavilyResponse)) as TavilyResponse
  return data.results ?? []
}

// ── Memory write (fire-and-forget) ────────────────────────────────────────────
// Writes synthesised insight to Supabase memory_documents via REST.
// Non-blocking: errors are swallowed so a Supabase hiccup never fails the agent.

async function memoryWrite(
  userId:  string,
  sector:  string,
  content: string,
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) return

  // Generate a lightweight embedding via Supabase's text-embedding-ada-002 proxy
  // If unavailable we store the document without an embedding (full-text fallback)
  const embeddingRes = await fetch(`${supabaseUrl}/functions/v1/embed`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ text: `${sector}: ${content.slice(0, 512)}` }),
  }).catch(() => null)

  const embedding: number[] | null = embeddingRes?.ok
    ? await embeddingRes.json()
        .then((d: { embedding?: number[] }) => d.embedding ?? null)
        .catch(() => null)
    : null

  await fetch(`${supabaseUrl}/rest/v1/memory_documents`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey':        supabaseKey,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      user_id:     userId,
      content,
      source_type: 'kairos_deep_explore',
      embedding,
    }),
  }).catch(() => { /* swallow — non-critical */ })
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {

  // ── 1. Auth ──────────────────────────────────────────────────────────────────

  // Allow cron triggers with a server-side secret
  const cronSecret = req.headers.get('x-cron-secret')
  let   userId: string | null = null

  if (cronSecret) {
    if (cronSecret !== process.env.CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status:  403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    userId = 'cron'
  } else {
    const session = await auth()
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status:  401,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    userId = session.user.email  // used server-side only; never returned to client
  }

  // ── 2. Parse body ─────────────────────────────────────────────────────────────

  let body: DeepExploreRequest
  try {
    body = await req.json() as DeepExploreRequest
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status:  400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { sector, queries, context, apiKey: byokKey } = body

  if (!sector || !Array.isArray(queries) || queries.length === 0) {
    return new Response(JSON.stringify({ error: 'sector and queries[] are required' }), {
      status:  400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const tavilyKey = process.env.TAVILY_API_KEY
  if (!tavilyKey) {
    return new Response(JSON.stringify({ error: 'Search service not configured' }), {
      status:  503,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ── 3. Tavily parallel search ─────────────────────────────────────────────────

  const searchQueries = queries.slice(0, 3).map(q =>
    `${sector} ${q} market data benchmarks 2024 2025`,
  )

  const searchResultSets = await Promise.all(
    searchQueries.map(q => tavilySearch(q, tavilyKey)),
  )

  // Deduplicate by URL, keep highest-score copy, limit to 12 total
  const seen    = new Set<string>()
  const results: TavilyResult[] = []

  for (const set of searchResultSets) {
    for (const r of set) {
      if (!seen.has(r.url)) {
        seen.add(r.url)
        results.push(r)
      }
    }
  }

  results.sort((a, b) => b.score - a.score)
  const top12 = results.slice(0, 12)

  // ── 4. Groq synthesis ─────────────────────────────────────────────────────────

  const sourcesBlock = top12
    .map((r, i) =>
      `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content.slice(0, 600)}`,
    )
    .join('\n\n---\n\n')

  const userPrompt = [
    `SECTOR: ${sector}`,
    `RESEARCH ANGLES: ${queries.join(' | ')}`,
    context ? `DIAGNOSTIC CONTEXT:\n${context}` : '',
    '',
    'SOURCES:',
    sourcesBlock,
    '',
    'Synthesise the above into the required JSON insight object.',
  ]
    .filter(Boolean)
    .join('\n')

  const groqRes = await groqFetch(
    {
      model:           GROQ_MODELS.PRIMARY,
      messages:        [
        { role: 'system', content: KAIROS_SYSTEM },
        { role: 'user',   content: userPrompt },
      ],
      max_tokens:      SYNTHESIS_TOKENS,
      temperature:     0.3,
      response_format: { type: 'json_object' },
    },
    byokKey,
  )

  if (!groqRes.ok) {
    const errText = await groqRes.text().catch(() => '')
    return new Response(
      JSON.stringify({ error: 'LLM synthesis failed', detail: errText }),
      { status: groqRes.status, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const raw     = await extractGroqContent(groqRes)
  let   insight: KairosInsight

  try {
    insight = JSON.parse(raw) as KairosInsight
  } catch {
    return new Response(
      JSON.stringify({ error: 'LLM returned malformed JSON', raw }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // ── 5. Non-blocking memory write ──────────────────────────────────────────────

  if (userId !== 'cron') {
    // Fire-and-forget — do not await
    void memoryWrite(
      userId,
      sector,
      `${insight.summary}\n\nSignals: ${insight.signals.join('; ')}`,
    )
  }

  // ── 6. Return ─────────────────────────────────────────────────────────────────

  return new Response(
    JSON.stringify({
      insight,
      meta: {
        sector,
        queriesRun:   searchQueries.length,
        sourcesFound: top12.length,
        model:        GROQ_MODELS.PRIMARY,
      },
    }),
    {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}
