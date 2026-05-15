/**
 * /api/research — SAIL AI Deep Research Engine
 *
 * Dedicated endpoint for the Research page.
 * Always runs Tavily + Serper in parallel, captures real images,
 * then synthesises a structured intelligence report via Groq 70B.
 *
 * Returns:
 *   {
 *     title, summary, keyFindings[], sections[], marketSnapshot,
 *     sources[], images[], queriesUsed[], searchedAt, provider
 *   }
 */

import { type NextRequest } from 'next/server'
import NextAuth              from 'next-auth'
import { authConfig }        from '@/auth.config'
import {
  executeDeepSearch,
  decomposeToSearchQueries,
  detectQueryLanguage,
  type SearchResult,
  type SearchImage,
} from '@/lib/tools/search'

const { auth } = NextAuth(authConfig)

export const runtime = 'edge'

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

function getGroqKey(): string | undefined {
  return (
    process.env.GROQ_API_KEY ??
    process.env.GROQ_API_KEY_1 ??
    process.env.GROQ_API_KEY_2 ??
    process.env.GROQ_API_KEY_3
  )
}

// ── Report synthesis system prompt ────────────────────────────────────────────

const RESEARCH_SYNTHESIS_PROMPT = `You are SAIL Intelligence — a world-class market research engine.

Given live web search results, produce a structured intelligence report in JSON.

CRITICAL RULES:
1. ONLY use information from the provided search results. Zero hallucination.
2. Every claim must come from the sources given. If data is missing, say "No data found" for that field.
3. Be specific: include real numbers, percentages, company names, dates from the sources.
4. Write in the SAME language as the user's query (Turkish → full Turkish report, English → full English report).
5. marketSnapshot.sentiment must be one of: "bullish" | "bearish" | "neutral"
6. All sections should contain actionable, specific insights — no vague generalities.
7. keyFindings must be the 4 most important, specific data points from the sources.
8. Each section.dataPoints entry must be a specific number, stat, or concrete finding.

Return ONLY this JSON (no markdown fences, no explanation outside JSON):
{
  "title": "< concise report title in user's language, max 80 chars >",
  "summary": "< 2-3 sentence executive summary grounded in source data >",
  "keyFindings": [
    "< specific finding 1 with numbers >",
    "< specific finding 2 with numbers >",
    "< specific finding 3 with numbers >",
    "< specific finding 4 with numbers >"
  ],
  "sections": [
    {
      "heading": "< section title >",
      "content": "< 2-3 sentences of analysis from sources >",
      "dataPoints": ["< stat 1 >", "< stat 2 >", "< stat 3 >"]
    }
  ],
  "marketSnapshot": {
    "sentiment": "bullish | bearish | neutral",
    "confidence": < 0.0-1.0 based on data quality >,
    "timeframe": "< e.g. Q2 2026 or 2026 >"
  },
  "competitorInsights": [
    { "name": "< company/platform name >", "insight": "< 1-sentence finding >" }
  ],
  "actionableRecommendations": [
    "< specific action 1 >",
    "< specific action 2 >",
    "< specific action 3 >"
  ]
}`

// ── Source encoder for LLM context ───────────────────────────────────────────

function buildResearchContext(results: SearchResult[]): string {
  const top = results.slice(0, 15)   // feed top 15 to LLM
  return top
    .map((r, i) =>
      `[${i + 1}] SOURCE: ${r.url}\nDATE: ${r.publishedDate ?? 'unknown'} | RELIABILITY: ${Math.round(r.reliabilityScore * 100)}%\n${r.content}`,
    )
    .join('\n\n')
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth guard
  const session = await auth()
  if (!session?.user?.email) {
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }

  // Parse body
  let body: { query?: string; context?: string; language?: string }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const query = body.query?.trim() ?? ''
  if (!query) {
    return Response.json({ error: 'Query is required.' }, { status: 422 })
  }

  const groqKey = getGroqKey()
  if (!groqKey) {
    return Response.json({ error: 'AI provider not configured.' }, { status: 503 })
  }

  // Detect language
  const language = body.language && body.language !== 'en'
    ? body.language
    : detectQueryLanguage(query)

  // Build search vectors
  const queries = decomposeToSearchQueries(query, body.context, language)

  // Execute research — always fetch images here
  const searchResponse = await executeDeepSearch(queries, language, /* fetchImages */ true)

  const { results, images, queriesUsed, searchedAt, provider, staleSourceCount } = searchResponse

  if (results.length === 0) {
    return Response.json({
      title:        query,
      summary:      'No real-time data could be retrieved for this query. The analysis below is based on training data only.',
      keyFindings:  ['No live data sources found.'],
      sections:     [],
      marketSnapshot: { sentiment: 'neutral', confidence: 0.2, timeframe: new Date().getFullYear().toString() },
      competitorInsights: [],
      actionableRecommendations: [],
      sources:      [],
      images:       [],
      queriesUsed,
      searchedAt,
      provider,
      staleSourceCount,
    })
  }

  // Build context for LLM
  const researchContext = buildResearchContext(results)
  const userPrompt = `USER QUERY: ${query}\n\nLIVE SEARCH RESULTS:\n${researchContext}\n\nGenerate the intelligence report JSON now.`

  // Synthesise with Groq
  let groqRes: Response | null = null
  try {
    groqRes = await fetch(GROQ_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:           GROQ_MODEL,
        messages: [
          { role: 'system', content: RESEARCH_SYNTHESIS_PROMPT },
          { role: 'user',   content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens:      1800,
        temperature:     0.2,
      }),
    })
  } catch {
    groqRes = null
  }

  if (!groqRes?.ok) {
    const status = groqRes?.status === 401 ? 401 : groqRes?.status === 429 ? 429 : 502
    return Response.json({ error: 'AI synthesis failed.' }, { status })
  }

  const groqData = await groqRes.json().catch(() => ({})) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = groqData?.choices?.[0]?.message?.content ?? '{}'

  let report: Record<string, unknown>
  try {
    report = JSON.parse(content)
  } catch {
    report = { title: query, summary: content, keyFindings: [], sections: [] }
  }

  // Attach source metadata and images (real URLs from Tavily)
  const sources = results.slice(0, 20).map(r => ({
    url:             r.url,
    title:           r.title,
    domain:          r.domain,
    reliabilityScore: r.reliabilityScore,
    publishedDate:   r.publishedDate,
    content:         r.content.slice(0, 120),
  }))

  return Response.json({
    ...report,
    sources,
    images: (images as SearchImage[]).map(img => ({
      url:         img.url,
      description: img.description ?? undefined,
    })),
    queriesUsed,
    searchedAt,
    provider,
    staleSourceCount,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
