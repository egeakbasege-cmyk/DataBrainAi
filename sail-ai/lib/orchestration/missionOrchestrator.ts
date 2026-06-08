/**
 * lib/orchestration/missionOrchestrator.ts — Multi-Mission Intelligence Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Decomposes any complex question into parallel specialist missions, routes
 * each to the optimal AI provider, then synthesises all results into one
 * clean, direct, well-organised answer.
 *
 * Architecture — three phases:
 *
 *   PHASE 1 — PLAN  (8B, ~200 ms)
 *     Fast planner reads the query, emits a mission list with typed slots.
 *     Each slot maps to a provider: SEARCH→Tavily, RECALL→Pinecone,
 *     FINANCIAL/STRATEGIC/RISK→8B JSON specialists, REASON→70B, ANALYZE→Gemini.
 *
 *   PHASE 2 — EXECUTE  (parallel, Promise.allSettled, 3.5 s wall-clock cap)
 *     All missions fire simultaneously. Partial results are accepted — one
 *     failed mission never blocks the synthesis.
 *
 *   PHASE 3 — SYNTHESISE  (70B streaming)
 *     All mission briefs are injected into a single synthesis prompt.
 *     Output is streamed token-by-token via SSE.
 *     Format: BLUF headline → structured body → decisive recommendation.
 *
 * Provider matrix:
 *   Groq 70B  → REASON, SYNTHESIZE (deep reasoning, final answer)
 *   Groq  8B  → FINANCIAL, STRATEGIC, RISK (structured JSON specialists)
 *   Gemini    → ANALYZE (data-pattern recognition, table/chart interpretation)
 *   Tavily    → SEARCH (real-time web, AI-native structured results)
 *   Pinecone  → RECALL (semantic memory, cross-session context)
 *
 * Edge Runtime safe — zero Node.js APIs.
 */

import { groqFetch, GROQ_MODELS, GROQ_URL, buildKeyPool }   from '@/lib/clients/groq'
import type { GroqMessage }                                  from '@/lib/clients/groq'
import { executeDeepSearch, decomposeToSearchQueries,
         encodeResearchContext }                             from '@/lib/tools/search'
import { recallRelevant, formatMemoryContext }               from '@/lib/vector/memory'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MissionType =
  | 'RECALL'      // Pinecone semantic memory lookup
  | 'SEARCH'      // Tavily real-time web research
  | 'FINANCIAL'   // 8B financial specialist (JSON structured)
  | 'STRATEGIC'   // 8B strategic specialist (JSON structured)
  | 'RISK'        // 8B risk/opportunity specialist (JSON structured)
  | 'REASON'      // 70B free-form deep reasoning
  | 'ANALYZE'     // Gemini structured data analysis

export interface Mission {
  id:       string
  type:     MissionType
  label:    string      // human-readable label shown in UI
  angle:    string      // the specific question this mission answers
  priority: 1 | 2 | 3  // 1=critical (always), 2=high, 3=nice-to-have
}

export interface MissionResult {
  missionId:  string
  type:       MissionType
  label:      string
  content:    string    // synthesisable text produced by this mission
  confidence: number    // 0.0–1.0
  elapsedMs:  number
  error?:     string
}

export interface OrchestrationPlan {
  complexity:  'simple' | 'moderate' | 'complex'
  missions:    Mission[]
  reasoning:   string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PARALLEL_TIMEOUT_MS  = 3_500   // wall-clock cap for the parallel phase
const MAX_SPECIALIST_TOKENS = 380    // per 8B specialist mission
const MAX_REASON_TOKENS     = 900    // 70B reason mission
const MAX_SYNTHESIS_TOKENS  = 1_600  // 70B synthesis

// ── PHASE 1: Planner ─────────────────────────────────────────────────────────

const PLANNER_SYSTEM = `You are a query decomposition engine for a multi-agent AI system.
Given a user question, produce a structured mission plan that maximises answer quality.

Mission types available:
  RECALL    — retrieve relevant past user analyses from semantic memory
  SEARCH    — fetch real-time web data when current figures are needed
  FINANCIAL — financial drill: margins, revenue, unit economics, burn
  STRATEGIC — competitive positioning, moats, growth vectors, market fit
  RISK      — risks, regulatory exposure, failure modes, mitigation paths
  REASON    — deep reasoning / synthesis when no external data is needed
  ANALYZE   — structured data analysis when CSV/table/chart is present

Rules:
  • 2–5 missions maximum. Do not over-decompose simple factual questions.
  • For vague or conversational questions → ["REASON"] only, complexity="simple"
  • For questions with company/financial data → include FINANCIAL + STRATEGIC
  • For questions needing current market data → include SEARCH
  • Always set priority 1 for the 1–2 most critical missions.
  • Every mission needs a specific "angle" — the exact sub-question it answers.
  • REASON and ANALYZE are mutually exclusive; use ANALYZE only when user attached data.

Return ONLY this JSON (no markdown):
{
  "complexity": "simple|moderate|complex",
  "reasoning": "<max 80 chars — why this decomposition>",
  "missions": [
    { "id": "m1", "type": "SEARCH",    "label": "Real-time market data",    "angle": "...", "priority": 1 },
    { "id": "m2", "type": "FINANCIAL", "label": "Unit economics breakdown",  "angle": "...", "priority": 1 },
    { "id": "m3", "type": "STRATEGIC", "label": "Competitive positioning",   "angle": "...", "priority": 2 }
  ]
}`

export async function planMissions(
  query:      string,
  context?:   string,
  hasData?:   boolean,
  byokKey?:   string,
): Promise<OrchestrationPlan> {
  const keys = buildKeyPool(byokKey)

  // Fallback plan for when planner fails or no keys available
  const fallback: OrchestrationPlan = {
    complexity: 'moderate',
    reasoning:  'planner unavailable — default plan',
    missions: [
      { id: 'm1', type: 'SEARCH',    label: 'Current data',          angle: query.slice(0, 200), priority: 1 },
      { id: 'm2', type: 'FINANCIAL', label: 'Financial analysis',    angle: query.slice(0, 200), priority: 1 },
      { id: 'm3', type: 'STRATEGIC', label: 'Strategic perspective', angle: query.slice(0, 200), priority: 2 },
    ],
  }

  if (!keys.length) return fallback

  const userContent = [
    context?.trim() ? `Business context: ${context.slice(0, 300)}` : '',
    hasData ? '[User attached a data file]' : '',
    `Query: ${query.slice(0, 600)}`,
  ].filter(Boolean).join('\n')

  try {
    const res = await groqFetch(
      {
        model:           GROQ_MODELS.FAST,
        messages:        [
          { role: 'system', content: PLANNER_SYSTEM },
          { role: 'user',   content: userContent     },
        ],
        max_tokens:      400,
        temperature:     0.05,
        response_format: { type: 'json_object' },
      },
      byokKey,
    )

    if (!res.ok) return fallback

    const raw = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const txt = raw.choices?.[0]?.message?.content ?? ''
    const plan = JSON.parse(txt) as OrchestrationPlan

    // Sanitize
    if (!Array.isArray(plan.missions) || plan.missions.length === 0) return fallback

    plan.missions = plan.missions
      .filter(m => m.type && m.id && m.angle)
      .slice(0, 5)

    return plan
  } catch {
    return fallback
  }
}

// ── PHASE 2: Mission Runners ──────────────────────────────────────────────────

// ── 2a. SEARCH mission (Tavily real-time web) ─────────────────────────────────

async function runSearchMission(mission: Mission, query: string, language = 'en'): Promise<MissionResult> {
  const t0 = Date.now()
  try {
    const vectors  = decomposeToSearchQueries(mission.angle, undefined, language).slice(0, 2)
    const search   = await executeDeepSearch(vectors, language)
    const content  = encodeResearchContext({ ...search, results: search.results.slice(0, 8) })

    return {
      missionId:  mission.id,
      type:       'SEARCH',
      label:      mission.label,
      content:    content || 'No relevant results found.',
      confidence: search.results.length > 0 ? 0.82 : 0.30,
      elapsedMs:  Date.now() - t0,
    }
  } catch (e) {
    return {
      missionId: mission.id, type: 'SEARCH', label: mission.label,
      content: '', confidence: 0, elapsedMs: Date.now() - t0,
      error: e instanceof Error ? e.message : 'search failed',
    }
  }
}

// ── 2b. RECALL mission (Pinecone semantic memory) ─────────────────────────────

async function runRecallMission(mission: Mission, userId: string, query: string): Promise<MissionResult> {
  const t0 = Date.now()
  try {
    const matches = await recallRelevant(userId, query, 3, 0.72)
    const content = formatMemoryContext(matches)

    return {
      missionId:  mission.id,
      type:       'RECALL',
      label:      mission.label,
      content:    content || '',
      confidence: matches.length > 0 ? 0.88 : 0.0,
      elapsedMs:  Date.now() - t0,
    }
  } catch (e) {
    return {
      missionId: mission.id, type: 'RECALL', label: mission.label,
      content: '', confidence: 0, elapsedMs: Date.now() - t0,
      error: e instanceof Error ? e.message : 'recall failed',
    }
  }
}

// ── 2c. Specialist missions (8B JSON structured) ──────────────────────────────

const SPECIALIST_PROMPTS: Record<'FINANCIAL' | 'STRATEGIC' | 'RISK', string> = {
  FINANCIAL: `You are a Principal-level financial analyst. Interrogate the query through the FINANCIAL lens only.
Focus: unit economics (LTV/CAC/payback), revenue model, burn rate, margins, break-even.
Rules: Every figure carries a source or [est.] tag. State gaps explicitly. Be declarative — not "you might", but "the path is X."
Return ONLY this JSON:
{"insight":"<2-3 sentences with a specific figure>","criticalFigure":"<single most important metric>","recommendation":"<one imperative sentence>","confidence":<0-1>}`,

  STRATEGIC: `You are a Senior Partner strategy consultant. Interrogate the query through the STRATEGIC lens only.
Focus: competitive moats, market positioning, growth vectors, category definition, TAM/SAM/SOM.
Rules: Name specific competitors. Anchor every claim to a market size or trend. One clear strategic imperative.
Return ONLY this JSON:
{"insight":"<2-3 sentences>","criticalFigure":"<market size or competitive metric>","recommendation":"<one imperative sentence>","confidence":<0-1>}`,

  RISK: `You are a Chief Risk Officer. Interrogate the query through the RISK lens only.
Focus: primary failure modes, regulatory exposure, execution risks, black-swan scenarios, mitigation paths.
Rules: Rank risks by probability × impact. For each risk: name it, score it (H/M/L), give one mitigation.
Return ONLY this JSON:
{"insight":"<2-3 sentences naming top 2 risks>","criticalFigure":"<highest-severity risk>","recommendation":"<one decisive mitigation action>","confidence":<0-1>}`,
}

async function runSpecialistMission(
  mission:  Mission,
  query:    string,
  context?: string,
  byokKey?: string,
): Promise<MissionResult> {
  const t0 = Date.now()
  const sysPrompt = SPECIALIST_PROMPTS[mission.type as 'FINANCIAL' | 'STRATEGIC' | 'RISK']
  if (!sysPrompt) {
    return { missionId: mission.id, type: mission.type, label: mission.label,
             content: '', confidence: 0, elapsedMs: 0, error: 'unknown specialist type' }
  }

  try {
    const msgs: GroqMessage[] = [
      { role: 'system', content: sysPrompt },
      { role: 'user',   content: [
          context?.trim() ? `Context: ${context.slice(0, 300)}` : '',
          `Question: ${mission.angle.slice(0, 400)}`,
          `(Full query for background: ${query.slice(0, 200)})`,
        ].filter(Boolean).join('\n') },
    ]

    const res = await groqFetch(
      { model: GROQ_MODELS.FAST, messages: msgs, max_tokens: MAX_SPECIALIST_TOKENS,
        temperature: 0.12, response_format: { type: 'json_object' } },
      byokKey,
    )

    if (!res.ok) throw new Error(`groq ${res.status}`)

    const raw  = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const txt  = raw.choices?.[0]?.message?.content ?? '{}'
    const data = JSON.parse(txt) as {
      insight?: string; criticalFigure?: string; recommendation?: string; confidence?: number
    }

    const content = [
      data.insight           ? `▸ ${data.insight}`              : '',
      data.criticalFigure    ? `Key figure: ${data.criticalFigure}` : '',
      data.recommendation    ? `Recommendation: ${data.recommendation}` : '',
    ].filter(Boolean).join('\n')

    return {
      missionId:  mission.id,
      type:       mission.type,
      label:      mission.label,
      content,
      confidence: typeof data.confidence === 'number' ? data.confidence : 0.72,
      elapsedMs:  Date.now() - t0,
    }
  } catch (e) {
    return {
      missionId: mission.id, type: mission.type, label: mission.label,
      content: '', confidence: 0, elapsedMs: Date.now() - t0,
      error: e instanceof Error ? e.message : 'specialist failed',
    }
  }
}

// ── 2d. REASON mission (70B deep reasoning) ───────────────────────────────────

async function runReasonMission(
  mission:  Mission,
  query:    string,
  context?: string,
  byokKey?: string,
): Promise<MissionResult> {
  const t0 = Date.now()
  try {
    const msgs: GroqMessage[] = [
      { role: 'system', content: `You are a world-class analytical advisor.
Answer the specific question below with precision and depth.
Begin immediately with the most important insight. No preamble.
Use numbers, comparisons, and specific examples. Declarative tone.` },
      { role: 'user', content: [
          context?.trim() ? `Context: ${context.slice(0, 400)}` : '',
          `Question: ${mission.angle.slice(0, 500)}`,
        ].filter(Boolean).join('\n') },
    ]

    const res = await groqFetch(
      { model: GROQ_MODELS.PRIMARY, messages: msgs, max_tokens: MAX_REASON_TOKENS, temperature: 0.25 },
      byokKey,
    )

    if (!res.ok) throw new Error(`groq ${res.status}`)

    const raw     = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = raw.choices?.[0]?.message?.content ?? ''

    return {
      missionId:  mission.id,
      type:       'REASON',
      label:      mission.label,
      content,
      confidence: 0.80,
      elapsedMs:  Date.now() - t0,
    }
  } catch (e) {
    return {
      missionId: mission.id, type: 'REASON', label: mission.label,
      content: '', confidence: 0, elapsedMs: Date.now() - t0,
      error: e instanceof Error ? e.message : 'reason failed',
    }
  }
}

// ── 2e. ANALYZE mission (Gemini structured data analysis) ─────────────────────

async function runAnalyzeMission(
  mission:    Mission,
  query:      string,
  fileContent?: string,
): Promise<MissionResult> {
  const t0 = Date.now()
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return { missionId: mission.id, type: 'ANALYZE', label: mission.label,
             content: '', confidence: 0, elapsedMs: 0, error: 'GEMINI_API_KEY not set' }
  }

  try {
    const prompt = [
      `Analyse the following data and answer: ${mission.angle.slice(0, 400)}`,
      fileContent ? `\n\nData:\n${fileContent.slice(0, 6_000)}` : '',
      `\n\nContext query: ${query.slice(0, 300)}`,
      '\n\nDeliver: 3 key findings, the most critical metric, and one actionable insight. Be precise and numerical.',
    ].join('')

    const models = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']

    for (const model of models) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            contents:         [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 700, temperature: 0.25 },
          }),
        },
      )

      if (!res.ok) continue

      const data = await res.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
      }
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

      if (content) {
        return {
          missionId:  mission.id,
          type:       'ANALYZE',
          label:      mission.label,
          content,
          confidence: 0.85,
          elapsedMs:  Date.now() - t0,
        }
      }
    }

    throw new Error('all Gemini models failed')
  } catch (e) {
    return {
      missionId: mission.id, type: 'ANALYZE', label: mission.label,
      content: '', confidence: 0, elapsedMs: Date.now() - t0,
      error: e instanceof Error ? e.message : 'analyze failed',
    }
  }
}

// ── PHASE 2: Mission Executor (parallel with timeout) ─────────────────────────

export async function executeMissions(
  missions:    Mission[],
  query:       string,
  opts: {
    userId?:      string
    context?:     string
    fileContent?: string
    language?:    string
    byokKey?:     string
  },
): Promise<MissionResult[]> {
  const { userId = 'anon', context, fileContent, language = 'en', byokKey } = opts

  // Build one promise per mission
  const promises = missions.map(m => {
    switch (m.type) {
      case 'SEARCH':
        return runSearchMission(m, query, language)
      case 'RECALL':
        return runRecallMission(m, userId, query)
      case 'FINANCIAL':
      case 'STRATEGIC':
      case 'RISK':
        return runSpecialistMission(m, query, context, byokKey)
      case 'REASON':
        return runReasonMission(m, query, context, byokKey)
      case 'ANALYZE':
        return runAnalyzeMission(m, query, fileContent)
      default:
        return Promise.resolve<MissionResult>({
          missionId: m.id, type: m.type, label: m.label,
          content: '', confidence: 0, elapsedMs: 0, error: 'unknown type',
        })
    }
  })

  // Race all missions against a hard wall-clock cap
  const timeout = new Promise<MissionResult[]>(resolve =>
    setTimeout(() => resolve([]), PARALLEL_TIMEOUT_MS),
  )

  const settled = await Promise.race([
    Promise.allSettled(promises),
    timeout.then(() => null),
  ])

  if (!settled) {
    // Timeout — return empty results; synthesis still runs
    return []
  }

  return settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          missionId:  missions[i].id,
          type:       missions[i].type,
          label:      missions[i].label,
          content:    '',
          confidence: 0,
          elapsedMs:  PARALLEL_TIMEOUT_MS,
          error:      r.reason instanceof Error ? r.reason.message : 'unknown error',
        },
  )
}

// ── PHASE 3: Synthesis (70B streaming) ───────────────────────────────────────

const SYNTHESIS_SYSTEM = `You are the senior synthesiser of a multi-agent intelligence system.
You receive structured briefs from specialist agents (search, financial, strategic, risk, memory) and must weave them into ONE authoritative answer.

Mandatory output format:
  1. BOTTOM LINE — 1–2 sentences. The single most important conclusion. Declarative.
  2. KEY FINDINGS — 3–5 bullets, each anchored to a specific figure or fact from the briefs.
  3. DECISIVE ACTION — The one highest-leverage action to take now. Imperative voice.
  4. OPEN RISKS (optional) — Only include if a mission flagged material risk.

Rules:
  • Begin IMMEDIATELY with "BOTTOM LINE:" — no preamble, no "Based on the analysis..."
  • Every bullet must contain at least one number, name, or verifiable claim.
  • If briefs contradict each other, surface the tension and give the most supported view.
  • If a brief is empty or errored, silently omit it — do not mention missing data.
  • Language matches the user's language.
  • Total length: 200–350 words. Clarity over completeness.`

export function buildSynthesisPrompt(
  query:          string,
  missionResults: MissionResult[],
  context?:       string,
): GroqMessage[] {
  // Only include missions that produced useful content
  const useful = missionResults.filter(r => r.content.trim().length > 20 && !r.error)

  const briefBlock = useful.map(r =>
    `═══ ${r.label.toUpperCase()} (confidence: ${Math.round(r.confidence * 100)}%) ═══\n${r.content.trim()}`,
  ).join('\n\n')

  const userContent = [
    context?.trim()    ? `BUSINESS CONTEXT\n${context.trim().slice(0, 400)}` : '',
    `USER QUESTION\n${query.trim()}`,
    briefBlock ? `\nINTELLIGENCE BRIEFS FROM SPECIALIST AGENTS\n${briefBlock}` : '',
  ].filter(Boolean).join('\n\n')

  return [
    { role: 'system', content: SYNTHESIS_SYSTEM },
    { role: 'user',   content: userContent       },
  ]
}

/**
 * Runs synthesis and returns a fetch Response (streaming).
 * Call `res.body` directly to pipe into SSE.
 */
export async function streamSynthesis(
  query:          string,
  missionResults: MissionResult[],
  context?:       string,
  byokKey?:       string,
): Promise<Response> {
  const keys = buildKeyPool(byokKey)
  const msgs = buildSynthesisPrompt(query, missionResults, context)

  // Try each key until one works
  for (const key of keys) {
    const res = await fetch(GROQ_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:       GROQ_MODELS.PRIMARY,
        messages:    msgs,
        max_tokens:  MAX_SYNTHESIS_TOKENS,
        temperature: 0.28,
        stream:      true,
      }),
    })
    if (res.ok) return res
  }

  // Fallback — return a short non-streaming answer
  return new Response(
    JSON.stringify({ error: 'synthesis unavailable — all keys exhausted' }),
    { status: 503 },
  )
}

// ── Full orchestration (non-streaming utility) ────────────────────────────────
// Useful for internal pipeline steps that need the full result synchronously.

export interface OrchestrationBundle {
  plan:           OrchestrationPlan
  results:        MissionResult[]
  modelsUsed:     string[]
  totalElapsedMs: number
}

export async function orchestrate(
  query:   string,
  opts: {
    userId?:      string
    context?:     string
    fileContent?: string
    language?:    string
    byokKey?:     string
    hasData?:     boolean
  } = {},
): Promise<OrchestrationBundle> {
  const t0 = Date.now()

  const plan    = await planMissions(query, opts.context, opts.hasData, opts.byokKey)
  const results = await executeMissions(plan.missions, query, opts)

  const modelsUsed = [
    GROQ_MODELS.FAST,
    results.some(r => r.type === 'REASON') ? GROQ_MODELS.PRIMARY : '',
    results.some(r => r.type === 'SEARCH') ? 'tavily' : '',
    results.some(r => r.type === 'ANALYZE') ? 'gemini-2.0-flash' : '',
    GROQ_MODELS.PRIMARY, // synthesis
  ].filter(Boolean)

  return { plan, results, modelsUsed, totalElapsedMs: Date.now() - t0 }
}
