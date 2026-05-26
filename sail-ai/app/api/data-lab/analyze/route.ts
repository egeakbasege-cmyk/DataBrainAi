/**
 * /api/data-lab/analyze  — DataLab AI Analysis Engine v2
 * ──────────────────────────────────────────────────────────────────────────────
 * Accepts : { query: string, source: SourceSummary }
 * Returns : { success: true, result: AnalysisResult }
 *
 * The AnalysisResult shape matches the frontend interface exactly — field names
 * must never be changed here without a matching change in data-lab/page.tsx.
 *
 * Pipeline:
 *   1. Auth guard
 *   2. Validate + parse body
 *   3. Build structured Groq prompt from source data + user query
 *   4. Force strict JSON output mapped 1-to-1 with AnalysisResult interface
 *   5. Parse → safe-default → return typed result
 *
 * Model   : llama-3.3-70b-versatile  (Groq — fast, cheap, strong JSON output)
 * Fallback: On any non-200, return 502 so the frontend can catch and call
 *           the local buildAnalysis() mock without breaking the UI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

// ── Groq config ───────────────────────────────────────────────────────────────

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

function getGroqKey(): string | undefined {
  return (
    process.env.GROQ_API_KEY   ??
    process.env.GROQ_API_KEY_2 ??
    process.env.GROQ_API_KEY_3
  )
}

// ── AnalysisResult interface (mirror of frontend — NEVER rename these fields) ─

interface KeyMetric {
  label:     string
  value:     string
  benchmark: string
  delta:     string
  trend:     'up' | 'down' | 'neutral'
}

interface ActionStep {
  priority:  'HIGH' | 'MEDIUM' | 'LOW'
  title:     string
  rationale: string
  timeframe: string
}

interface Insight {
  category: string
  finding:  string
}

interface RiskFlag {
  severity:   'high' | 'medium' | 'low'
  risk:       string
  mitigation: string
}

interface BenchmarkRow {
  metric:      string
  yourValue:   string
  industryAvg: string
  delta:       string
  status:      'above' | 'below' | 'on-par'
}

interface AnalysisResult {
  query:            string
  confidence:       number
  source:           string
  executiveSummary: string
  keyMetrics:       KeyMetric[]
  actionSteps:      ActionStep[]
  insights:         Insight[]
  riskFlags:        RiskFlag[]
  benchmarks:       BenchmarkRow[]
  nextActions:      string[]
}

// ── SourceSummary (mirror of frontend) ───────────────────────────────────────

interface SourceSummary {
  type:       'shopify' | 'amazon' | 'csv' | 'api'
  name:       string
  syncedAt:   string
  revenue:    string
  orders:     string
  aov:        string
  topProduct: string
  extra:      { label: string; value: string }[]
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Senior Strategy Partner at a top-tier management consultancy (McKinsey / Bain tier).
You receive live business data from a connected platform and the user's analytical question.
Your job: produce a rigorous, data-grounded business intelligence report.

RULES:
- Every metric, delta, and benchmark figure must be derived from or clearly extrapolated from the provided data.
- Every recommendation must be specific, measurable, and time-bound.
- Tone: authoritative, precise, zero fluff. No filler sentences.
- All delta values must include a direction sign (e.g. "+12%" or "-2.3pp").
- Confidence (0-100) reflects how completely the data supports the user's query.
- Return ONLY a valid JSON object. No markdown fences, no explanation, no preamble.`

// ── JSON schema instruction appended to user message ─────────────────────────

const SCHEMA_INSTRUCTION = `
Your response MUST be a single JSON object with this EXACT structure (all field names required, no extras):

{
  "executiveSummary": "2-4 sentence data-grounded narrative that directly answers the user's question. Reference specific numbers.",
  "confidence": <integer 0-100>,
  "keyMetrics": [
    {
      "label": "short metric name",
      "value": "current value with currency/unit/% (e.g. $84,200 or 4.2%)",
      "benchmark": "industry average with identical unit",
      "delta": "+/-X% or +/-Xpp vs benchmark (always include sign)",
      "trend": "up | down | neutral"
    }
  ],
  "actionSteps": [
    {
      "priority": "HIGH | MEDIUM | LOW",
      "title": "short imperative action title (max 10 words)",
      "rationale": "1-2 sentences citing a specific data point that justifies this action",
      "timeframe": "e.g. 1-2 weeks, 48 hours, Month 1"
    }
  ],
  "insights": [
    {
      "category": "e.g. Revenue Concentration, Pricing, Retention",
      "finding": "1-2 sentences of non-obvious insight grounded in the data"
    }
  ],
  "riskFlags": [
    {
      "severity": "high | medium | low",
      "risk": "specific risk identified from the data",
      "mitigation": "concrete, actionable mitigation step"
    }
  ],
  "benchmarks": [
    {
      "metric": "metric name",
      "yourValue": "client value with unit",
      "industryAvg": "benchmark value with same unit",
      "delta": "+/-X% or absolute delta with sign",
      "status": "above | below | on-par"
    }
  ],
  "nextActions": [
    "Assign owner for HIGH priority action by end of week",
    "Second next action sentence",
    "Third next action sentence"
  ]
}

Exact counts required:
- keyMetrics:  4 items
- actionSteps: 3 items ordered HIGH → MEDIUM → LOW
- insights:    2 items
- riskFlags:   1 or 2 items
- benchmarks:  4 items
- nextActions: 3 strings
`

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {

  // 1. Auth guard
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse + validate body
  let query:  string
  let source: SourceSummary

  try {
    const body = await req.json()
    query  = String(body.query  ?? '').trim()
    source = body.source as SourceSummary
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }
  if (!source?.type || !source?.revenue) {
    return NextResponse.json({ error: 'source data is required' }, { status: 400 })
  }

  // 3. Groq key check
  const groqKey = getGroqKey()
  if (!groqKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 503 })
  }

  // 4. Build the data context block sent to the model
  const extraLines = (source.extra ?? [])
    .map((e: { label: string; value: string }) => `  - ${e.label}: ${e.value}`)
    .join('\n')

  const dataContext = `
CONNECTED DATA SOURCE: ${source.name} (${source.type.toUpperCase()})
Last synced: ${source.syncedAt}

CORE METRICS:
  - Monthly Revenue:     ${source.revenue}
  - Monthly Orders:      ${source.orders}
  - Average Order Value: ${source.aov}
  - Top Product:         ${source.topProduct}
ADDITIONAL METRICS:
${extraLines}
`.trim()

  const userMessage = `USER QUESTION: "${query}"

${dataContext}

${SCHEMA_INSTRUCTION}`

  // 5. Call Groq — 25 s hard timeout so Vercel serverless doesn't hard-cut first
  let rawText: string
  try {
    const groqRes = await fetch(GROQ_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        temperature: 0.10,
        max_tokens:  2400,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: userMessage   },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => '—')
      console.error('[data-lab/analyze] Groq HTTP error', groqRes.status, errText)
      return NextResponse.json(
        { error: 'AI synthesis failed — please retry.' },
        { status: 502 },
      )
    }

    const groqData = await groqRes.json()
    rawText = groqData.choices?.[0]?.message?.content ?? ''

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[data-lab/analyze] fetch/timeout error:', msg)
    return NextResponse.json(
      { error: 'AI service timed out — please retry.' },
      { status: 502 },
    )
  }

  // 6. Parse AI response — strip markdown fences if model adds them
  let parsed: Record<string, unknown>
  try {
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/```\s*$/,           '')
      .trim()
    parsed = JSON.parse(cleaned)
  } catch {
    // Second attempt: extract first {...} block
    const match = rawText.match(/\{[\s\S]+\}/)
    if (!match) {
      console.error('[data-lab/analyze] Unparseable AI response:', rawText.slice(0, 400))
      return NextResponse.json(
        { error: 'AI returned unexpected format — please retry.' },
        { status: 502 },
      )
    }
    try {
      parsed = JSON.parse(match[0])
    } catch {
      return NextResponse.json(
        { error: 'AI JSON parse failed — please retry.' },
        { status: 502 },
      )
    }
  }

  // 7. Shape into AnalysisResult — safe defaults for any missing field
  const result: AnalysisResult = {
    query,
    confidence:       typeof parsed.confidence === 'number' ? parsed.confidence : 88,
    source:           source.name,
    executiveSummary: String(parsed.executiveSummary ?? ''),

    keyMetrics: Array.isArray(parsed.keyMetrics)
      ? (parsed.keyMetrics as KeyMetric[]).slice(0, 6)
      : [],

    actionSteps: Array.isArray(parsed.actionSteps)
      ? (parsed.actionSteps as ActionStep[]).slice(0, 5)
      : [],

    insights: Array.isArray(parsed.insights)
      ? (parsed.insights as Insight[]).slice(0, 4)
      : [],

    riskFlags: Array.isArray(parsed.riskFlags)
      ? (parsed.riskFlags as RiskFlag[]).slice(0, 3)
      : [],

    benchmarks: Array.isArray(parsed.benchmarks)
      ? (parsed.benchmarks as BenchmarkRow[]).slice(0, 6)
      : [],

    nextActions: Array.isArray(parsed.nextActions)
      ? (parsed.nextActions as string[]).slice(0, 5)
      : [],
  }

  return NextResponse.json({ success: true, result })
}
