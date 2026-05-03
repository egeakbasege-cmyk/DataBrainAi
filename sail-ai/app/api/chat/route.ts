/**
 * Aetheris Edge — Groq-only AI router
 *
 * All modes route directly to Groq (llama-3.3-70b-versatile).
 * No external backend proxy.
 *
 * analysisMode routing:
 *   upwind/downwind → ExecutiveResponse JSON
 *   sail            → SSE stream (first line __sailMeta JSON, then markdown)
 *   trim            → TrimResponse JSON { trimTitle, summary, phases[] }
 *   catamaran       → CatamaranResponse JSON
 *   operator        → SSE stream markdown
 *   synergy         → SSE stream markdown (multi-mode council)
 */

import { type NextRequest } from 'next/server'
import NextAuth              from 'next-auth'
import { authConfig }        from '@/auth.config'
import type { AetherisPayload } from '@/types/architecture'
import {
  buildUpwindSystemPrompt,
  buildSailSystemPrompt as buildEnhancedSailPrompt,
  buildTrimSystemPrompt as buildEnhancedTrimPrompt,
  buildCatamaranSystemPrompt as buildEnhancedCatamaranPrompt,
  buildOperatorSystemPrompt as buildEnhancedOperatorPrompt,
  buildSynergySystemPrompt,
  buildScenarioSystemPrompt,
} from '@/lib/prompts/enhanced-modes'
// [SAIL-NEW] — DataShift governance layer
import { selectSkillCards, buildSkillBlock }         from '@/lib/skills/skillCards'
import type { SkillCard }                            from '@/lib/skills/skillCards'
import { scrubPII }                                  from '@/lib/skills/piiScrubber'
import {
  buildDataHealthReport,
  GOVERNANCE_SYSTEM_SUFFIX,
  // encodeHealthReport not imported — health report attached to JSON responses only, never streamed.
  type DataHealthReport,
} from '@/lib/skills/dataHealthReport'
// [SAIL-INTELLIGENCE-UPGRADE] — Groq-optimised real-time research layer
import {
  executeDeepSearch,
  encodeResearchContext,
  requiresResearch,
  decomposeToSearchQueries,
  detectQueryLanguage,      // [SAIL-UNIVERSAL-INTELLIGENCE-V2]
  type SearchResult,
} from '@/lib/tools/search'
import {
  ANALYTIC_SYNTHESIS_DIRECTIVE,
  UNIVERSAL_LANGUAGE_DIRECTIVE,  // [SAIL-UNIVERSAL-INTELLIGENCE-V2]
  UNIVERSAL_VERACITY_DIRECTIVE,  // [SAIL-GLOBAL-VERACITY-PATCH]
  DATA_UNCERTAINTY_SUFFIX,       // [SAIL-FACTUAL-TRIGGER] always-on training-data transparency
  SEARCH_FAILED_WARNING,         // [SAIL-FACTUAL-TRIGGER] search ran but no results
} from '@/lib/prompts/enhanced-modes'

const { auth } = NextAuth(authConfig)

export const runtime = 'edge'

const GROQ_URL            = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL_PRIMARY  = 'llama-3.3-70b-versatile'
const GROQ_MODEL_FALLBACK = 'llama-3.1-8b-instant'   // 500K TPD — 5× higher daily limit
const GROQ_MODEL          = GROQ_MODEL_PRIMARY

// ── Key pool: rotate through up to 5 keys before falling back to a smaller model
// Add GROQ_API_KEY_2 … GROQ_API_KEY_5 in Vercel env to multiply daily capacity.
// byokKey: user-supplied BYOK key — appended after server keys so server capacity
// is consumed first; BYOK is the last-resort fallback key.
function getKeyPool(byokKey?: string): string[] {
  const keys: string[] = []
  const base = process.env.GROQ_API_KEY
  if (base) keys.push(base)
  // Support both _1,_2,_3... and _2,_3... naming conventions
  for (let i = 1; i <= 5; i++) {
    const k = process.env[`GROQ_API_KEY_${i}`]
    if (k && !keys.includes(k)) keys.push(k)
  }
  // Include BYOK key as last-resort fallback (after all server keys)
  if (byokKey && !keys.includes(byokKey)) keys.push(byokKey)
  return keys
}

// ── Groq fetch: key rotation → model fallback on 429 ─────────────────────────
async function groqFetch(init: RequestInit, byokKey?: string): Promise<Response> {
  const reqBody = JSON.parse(init.body as string) as Record<string, unknown>
  const keys    = getKeyPool(byokKey)

  // Try every key with the primary model first
  for (const key of keys) {
    const res = await fetch(GROQ_URL, {
      ...init,
      headers: { ...init.headers as Record<string, string>, 'Authorization': `Bearer ${key}` },
    })
    if (res.status !== 429) return res
  }

  // All keys exhausted on primary model — retry primary key with fallback model
  const fallbackBody = JSON.stringify({ ...reqBody, model: GROQ_MODEL_FALLBACK })
  return fetch(GROQ_URL, {
    ...init,
    headers: { ...init.headers as Record<string, string>, 'Authorization': `Bearer ${keys[0] ?? ''}` },
    body: fallbackBody,
  })
}

type ExtendedPayload = Omit<AetherisPayload, 'analysisMode'> & {
  apiKey?:             string
  primaryConstraint?:  string
  /** 'auto' triggers the Gateway Router; other values select the mode directly. */
  analysisMode?:       'upwind' | 'downwind' | 'sail' | 'trim' | 'catamaran' | 'operator' | 'synergy' | 'scenario' | 'auto'
  synergyModes?:       string[]
  synergyName?:        string
  /** Future RAG injection — populate with retrieved Pinecone/Weaviate chunks before calling this route. */
  ragContext?:         string
}

// ── User message builder ──────────────────────────────────────────────────────

function buildUserMessage(body: ExtendedPayload): string {
  const parts: string[] = []

  if (body.context?.trim()) {
    parts.push(`BUSINESS CONTEXT\n${body.context.trim()}`)
  }

  // Live research context — injected by the research loop when requiresResearch() is true.
  // Also accepts Pinecone/Weaviate RAG chunks in the same field (future expansion).
  // Format is already <research_context>…</research_context> via encodeResearchContext().
  if (body.ragContext?.trim()) {
    parts.push(body.ragContext.trim())
  }

  parts.push(`QUERY\n${body.message.trim()}`)

  if (body.fileContent?.trim()) {
    parts.push(`ATTACHED DATA\n${body.fileContent.slice(0, 8000)}`)
  }

  if (body.imageBase64) {
    parts.push('[Image attached — analyse the visual data in the context of the query.]')
  }

  if (body.agentMode && body.agentMode !== 'Auto') {
    parts.push(`AGENT MODE: ${body.agentMode}`)
  }

  if (body.analysisMode === 'downwind') {
    parts.push('MODE: Conversational deep-dive — expand on trade-offs and second-order effects.')
  }

  // [SAIL-NEW] Module 1 — Expert Skill injection
  // selectSkillCards scores every card by keyword hit count; returns [] on no match.
  const skillCards = selectSkillCards(body.message?.trim() ?? '')
  const skillBlock = buildSkillBlock(skillCards)
  if (skillBlock) parts.push(skillBlock)

  return parts.join('\n\n')
}

// ── Gateway Router ────────────────────────────────────────────────────────────
// Ultra-fast preliminary LLM call (llama-3.1-8b-instant, 150 tokens, 3s timeout)
// that classifies query intent and selects the optimal analysis mode.
// Returns null on timeout or any error → caller falls back to 'upwind'.

const VALID_MODES = ['upwind', 'downwind', 'sail', 'trim', 'catamaran', 'operator', 'synergy', 'scenario'] as const
type ValidMode  = typeof VALID_MODES[number]
type RouterMood = 'analytical' | 'exploratory' | 'urgent' | 'planning' | 'creative'

interface RouterResult {
  mode:            ValidMode
  confidence:      number
  moodSignal:      RouterMood
  urgencyLevel:    number
  reasoning:       string
  alternativeMode: ValidMode
}

const VALID_MODES_SET = new Set<string>(VALID_MODES)

const ALTERNATIVE_MODE_MAP: Record<ValidMode, ValidMode> = {
  upwind:    'sail',
  sail:      'operator',
  operator:  'synergy',
  synergy:   'operator',
  trim:      'operator',
  catamaran: 'synergy',
  downwind:  'sail',
  scenario:  'sail',
}

// Fuzzy fallback — maps hallucinated/partial strings to the nearest valid mode
const MODE_SIMILARITY: Record<string, ValidMode> = {
  analysis:      'upwind',
  analytics:     'upwind',
  metric:        'upwind',
  kpi:           'upwind',
  strategy:      'sail',
  strategic:     'sail',
  adaptive:      'sail',
  coaching:      'downwind',
  conversation:  'downwind',
  advisory:      'downwind',
  timeline:      'trim',
  roadmap:       'trim',
  planning:      'trim',
  schedule:      'trim',
  deep:          'operator',
  comprehensive: 'operator',
  intelligence:  'operator',
  universal:     'operator',
  multi:         'synergy',
  hybrid:        'synergy',
  synergistic:   'synergy',
  council:       'synergy',
  growth:        'catamaran',
  experience:    'catamaran',
}

const GATEWAY_ROUTER_PROMPT = `You are a query routing engine for a business intelligence platform. Analyze the user's message and route it to the optimal analysis mode.

Available modes:
- "upwind"    → metric-driven financial/KPI analysis, benchmarks, data interpretation
- "downwind"  → coaching, conversational deep-dive, trade-off exploration
- "sail"      → adaptive intelligence: detect query type and blend analytic + coaching
- "trim"      → phased timeline planning, project roadmaps, execution schedules
- "catamaran" → dual-track: market growth + customer experience simultaneously
- "operator"  → comprehensive deep intelligence, multi-domain strategy
- "synergy"   → war-room council: multiple specialist modules working in parallel

Mood signals:
- "analytical"  → user wants data, numbers, benchmarks
- "exploratory" → user wants to think through options
- "urgent"      → time-sensitive decision or crisis management
- "planning"    → user wants a roadmap or action plan
- "creative"    → user wants brainstorming or unconventional approaches

urgencyLevel: 0.0–1.0. Set ≥ 0.8 only for genuine crises or deadlines within 48 hours.

Return ONLY this JSON (no markdown, no explanation):
{"mode":"<mode>","confidence":<0.0-1.0>,"moodSignal":"<mood>","urgencyLevel":<0.0-1.0>,"reasoning":"<max 80 chars>","alternativeMode":"<mode>"}`

// [SAIL-NEW] Module 4 — sanitizeRouterResult(string) overload
// Validates a raw mode string from the LLM against the valid-modes list,
// scores by substring overlap, and falls back to 'synergy' if no match.
// Used by the adaptive domain-bias logic in runGatewayRouter().
function sanitizeRouterResultStr(
  raw: string,
  validModes: readonly string[],
): string {
  const lower = raw.toLowerCase().trim()
  if (validModes.includes(lower)) return lower

  // Score each valid mode by bi-directional substring overlap
  let bestMode  = 'synergy'
  let bestScore = 0
  for (const vm of validModes) {
    const score =
      (lower.includes(vm)  ? vm.length  : 0) +
      (vm.includes(lower)  ? lower.length : 0)
    if (score > bestScore) { bestScore = score; bestMode = vm }
  }

  if (bestScore === 0) {
    console.warn(`[SAIL-ROUTER] Invalid mode suggestion: "${raw}" — falling back to 'synergy'`)
  }
  return bestMode
}

function sanitizeRouterResult(raw: Record<string, unknown>): RouterResult {
  const toValidMode = (val: unknown): ValidMode => {
    if (typeof val !== 'string') return 'upwind'
    const lower = val.toLowerCase().trim()
    if (VALID_MODES_SET.has(lower)) return lower as ValidMode
    // Fuzzy match: check if any similarity key appears in the value
    for (const [keyword, mode] of Object.entries(MODE_SIMILARITY)) {
      if (lower.includes(keyword)) return mode
    }
    return 'upwind'
  }

  const toFloat = (val: unknown, def: number): number => {
    const n = parseFloat(String(val))
    return isNaN(n) ? def : Math.min(1, Math.max(0, n))
  }

  const toMood = (val: unknown): RouterMood => {
    const VALID_MOODS: RouterMood[] = ['analytical', 'exploratory', 'urgent', 'planning', 'creative']
    if (typeof val === 'string' && VALID_MOODS.includes(val.toLowerCase() as RouterMood)) {
      return val.toLowerCase() as RouterMood
    }
    return 'analytical'
  }

  const mode = toValidMode(raw.mode)
  const alt  = toValidMode(raw.alternativeMode)

  return {
    mode,
    confidence:      toFloat(raw.confidence,   0.7),
    moodSignal:      toMood(raw.moodSignal),
    urgencyLevel:    toFloat(raw.urgencyLevel,  0.3),
    reasoning:       typeof raw.reasoning === 'string' ? raw.reasoning.slice(0, 120) : '',
    alternativeMode: alt === mode ? ALTERNATIVE_MODE_MAP[mode] : alt,
  }
}

// [SAIL-NEW] Module 4 — domain → mode bias map
// Advisory only: active when analysisMode === 'auto'.
// Raw bias strings are passed through sanitizeRouterResultStr() before use.
const DOMAIN_MODE_BIAS: Partial<Record<SkillCard['domain'][number], string>> = {
  financial_analysis:      'trim',
  business_strategy:       'synergy',
  risk_assessment:         'audit',     // sanitizes → 'synergy' (no overlap)
  product_strategy:        'roadmap',   // sanitizes → 'synergy' (no overlap)
  market_research:         'sail',
  operations:              'operator',
  competitive_intelligence:'upwind',
  data_governance:         'operator',
}

async function runGatewayRouter(
  message:  string,
  context?: string,
  byokKey?: string,
): Promise<RouterResult | null> {
  const keys = getKeyPool(byokKey)
  if (!keys.length) return null

  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 3_000)

  try {
    const userContent = context?.trim()
      ? `Context: ${context.trim().slice(0, 300)}\n\nQuery: ${message.slice(0, 500)}`
      : message.slice(0, 500)

    const res = await fetch(GROQ_URL, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${keys[0]}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:           GROQ_MODEL_FALLBACK,   // llama-3.1-8b-instant — fast + high TPD
        messages: [
          { role: 'system', content: GATEWAY_ROUTER_PROMPT },
          { role: 'user',   content: userContent },
        ],
        max_tokens:      150,
        temperature:     0.1,
        response_format: { type: 'json_object' },
      }),
      signal: abort.signal,
    })

    clearTimeout(timer)
    if (!res.ok) return null

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
    const raw  = JSON.parse(data.choices?.[0]?.message?.content ?? '{}') as Record<string, unknown>

    // [SAIL-NEW] Module 4 — skill-card domain bias (advisory, auto mode only)
    const topCard = selectSkillCards(message, 1)[0]
    if (topCard) {
      const biasedMode = DOMAIN_MODE_BIAS[topCard.domain[0]]
      if (biasedMode) {
        // Validate the biased suggestion; sanitizer maps invalid strings → 'synergy'
        raw.mode = sanitizeRouterResultStr(biasedMode, VALID_MODES)
      }
    }

    return sanitizeRouterResult(raw)
  } catch {
    clearTimeout(timer)
    return null
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Session guard — NextAuth v5 Edge-compatible check
  const session = await auth()

  if (!session?.user?.email) {
    return Response.json(
      { error: 'Authentication required. Please sign in.' },
      { status: 401 },
    )
  }

  // 2. Parse and validate payload
  let body: ExtendedPayload
  try {
    body = (await req.json()) as ExtendedPayload
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.message?.trim() && !body.imageBase64) {
    return Response.json({ error: 'Message is required.' }, { status: 422 })
  }

  const analysisMode: 'upwind' | 'downwind' | 'sail' | 'trim' | 'catamaran' | 'operator' | 'synergy' | 'scenario' | 'auto' = body.analysisMode ?? 'upwind'

  // 3. Groq — single AI provider
  const groqKey = process.env.GROQ_API_KEY ?? body.apiKey

  if (!groqKey) {
    return Response.json(
      { error: 'AI provider not configured. Add a Groq API key in settings to continue.' },
      { status: 503 },
    )
  }

  // ── AUTO mode: Gateway Router — intelligent dispatch ─────────────────────
  // Runs a fast 8B-model call (3 s timeout) to classify query intent and return
  // a __moodGuide payload. The frontend shows a routing card; high-urgency
  // queries (urgencyLevel ≥ 0.8) are auto-proceeded without user confirmation.
  if (analysisMode === 'auto') {
    const routerResult = await runGatewayRouter(
      body.message ?? '',
      body.context,
      body.apiKey,
    )
    return Response.json({
      __moodGuide: {
        detectedMood:    routerResult?.moodSignal    ?? 'analytical',
        selectedMode:    routerResult?.mode          ?? 'upwind',
        alternativeMode: routerResult?.alternativeMode ?? 'sail',
        reasoning:       routerResult?.reasoning     ?? '',
        urgencyLevel:    routerResult?.urgencyLevel  ?? 0.3,
        confidence:      routerResult?.confidence    ?? 0.7,
        autoProceeding:  (routerResult?.urgencyLevel ?? 0) >= 0.8,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // [SAIL-NEW] Module 2 — PII scrubbing (fileContent only; message/context never stored)
  let piiRedactedCount = 0
  let piiTags: string[] = []
  if (body.fileContent) {
    const { scrubbedText, redactedCount, tags } = scrubPII(body.fileContent)
    body.fileContent    = scrubbedText
    piiRedactedCount    = redactedCount
    piiTags             = tags
  }

  // [SAIL-INTELLIGENCE-UPGRADE] Module 2 — Parallel research loop
  // [SAIL-UNIVERSAL-INTELLIGENCE-V2] Language-aware: detects query language first so
  // decomposeToSearchQueries() can produce bilingual vectors (EN global + native) for
  // non-English queries.
  const queryText   = body.message?.trim() ?? ''
  // Prefer explicit body.language (set by frontend locale) over heuristic detection.
  // detectQueryLanguage() is the heuristic fallback when body.language is absent or 'en'.
  const _queryLanguage = (body.language && body.language !== 'en')
    ? body.language
    : detectQueryLanguage(queryText)

  let _searchResults: SearchResult[] = []
  let _researchQueries: string[]     = []
  let _hasSynthesisContext            = false
  let _researchAttempted              = false   // [SAIL-FACTUAL-TRIGGER] search was triggered
  let _staleSourceCount: number | undefined

  if (requiresResearch(queryText)) {
    _researchAttempted = true
    // Pass detected language so bilingual vectors are generated for non-English queries
    _researchQueries = decomposeToSearchQueries(queryText, body.context, _queryLanguage)
    const searchResponse = await executeDeepSearch(_researchQueries)
    _searchResults     = searchResponse.results
    _staleSourceCount  = searchResponse.staleSourceCount  // [SAIL-DATA-VERACITY]

    if (_searchResults.length > 0) {
      // Inject into body.ragContext so buildUserMessage() wraps it in the prompt
      body.ragContext     = encodeResearchContext(searchResponse)
      _hasSynthesisContext = true
    }
  }

  const language           = body.language ?? 'en'
  const primaryConstraint  = body.primaryConstraint
  const userMessage        = buildUserMessage(body)   // skill + research injection happens inside

  // [SAIL-NEW] Module 3 — Wabi-Sabi Health Report pre-computation
  // Computed once here; stream handlers embed it as the first chunk.
  const _appliedCards     = selectSkillCards(queryText)
  const _matchedKeywords  = _appliedCards.map((card) =>
    card.triggerKeywords.filter((kw) => queryText.toLowerCase().includes(kw)),
  )
  const _bodyFields: [string, string | undefined][] = [
    ['message',  body.message],
    ['context',  body.context],
  ]
  const healthReport: DataHealthReport = buildDataHealthReport({
    redactedCount:    piiRedactedCount,
    piiTags,
    appliedCards:     _appliedCards,
    matchedKeywords:  _matchedKeywords,
    bodyFields:       _bodyFields,
    searchResults:    _searchResults,
    researchQueries:  _researchQueries,
    queryLanguage:    _queryLanguage,    // [SAIL-UNIVERSAL-INTELLIGENCE-V2]
    staleSourceCount: _staleSourceCount, // [SAIL-DATA-VERACITY]
  })

  // Governance suffix only when a business methodology was triggered.
  // Casual / non-business queries (_appliedCards === []) get no suffix.
  const governanceSuffix = _appliedCards.length > 0 ? GOVERNANCE_SYSTEM_SUFFIX : ''

  // [SAIL-FACTUAL-TRIGGER] uncertaintySuffix:
  // • Streaming modes (sail, operator, synergy, scenario): inject DATA_UNCERTAINTY_SUFFIX
  //   — LLM can freely add "(eğitim verisi)" labels inside markdown text.
  // • JSON modes (upwind, downwind, trim, catamaran): do NOT inject DATA_UNCERTAINTY_SUFFIX.
  //   JSON format prevents free-text labels. Schemas now have dataSource / null fields instead.
  //   DEEP_RESEARCH_DIRECTIVE (already in mode prompts) handles training-data transparency.
  // downwind falls through to the same JSON handler as upwind (buildUpwindSystemPrompt)
  const streamingModes = new Set(['sail', 'operator', 'synergy', 'scenario'])
  const uncertaintySuffix = streamingModes.has(analysisMode) ? DATA_UNCERTAINTY_SUFFIX : ''

  // Research context for JSON modes injected as a SYSTEM-level block (higher authority than user msg)
  // so the LLM prioritises live data over the "sector estimates (est.)" instructions in mode prompts.
  const researchSystemBlock = _hasSynthesisContext && !streamingModes.has(analysisMode)
    ? `\n\nLIVE RESEARCH DATA — USE THIS FIRST:\n${body.ragContext ?? ''}\n`
    : ''

  // [SAIL-INTELLIGENCE-UPGRADE] Synthesis suffix — appended when live research was retrieved.
  // [SAIL-UNIVERSAL-INTELLIGENCE-V2] For non-English queries, also injects UNIVERSAL_LANGUAGE_DIRECTIVE.
  // [SAIL-GLOBAL-VERACITY-PATCH] UNIVERSAL_VERACITY_DIRECTIVE enforces strict source traceability.
  // [SAIL-FACTUAL-TRIGGER] SEARCH_FAILED_WARNING injected when search was triggered but empty.
  const synthesisSuffix = _hasSynthesisContext
    ? ANALYTIC_SYNTHESIS_DIRECTIVE
      + UNIVERSAL_VERACITY_DIRECTIVE
      + (_queryLanguage !== 'en' ? UNIVERSAL_LANGUAGE_DIRECTIVE : '')
    : (_researchAttempted ? SEARCH_FAILED_WARNING : '')

  // ── SYNERGY mode: War Room Council — streaming markdown ──────────────────
  if (analysisMode === 'synergy') {
    const modes        = body.synergyModes ?? ['upwind', 'sail']
    const synergyName  = body.synergyName
    const synRes = await groqFetch({
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages: [
          { role: 'system', content: buildSynergySystemPrompt(modes, language, synergyName, primaryConstraint) + governanceSuffix + uncertaintySuffix + synthesisSuffix },
          { role: 'user',   content: userMessage },
        ],
        max_tokens:  1000,
        temperature: 0.45,
        stream:      true,
      }),
    }, body.apiKey).catch(() => null)

    if (!synRes?.ok) {
      const synStatus = synRes?.status === 401 ? 401 : synRes?.status === 429 ? 429 : 502
      return Response.json(
        { error: synStatus === 401 ? 'Invalid API key.' : synStatus === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status: synStatus },
      )
    }

    const encoder   = new TextEncoder()
    // [SAIL-NEW] Module 3 — health report embedded in meta (frontend splits independently)
    const metaLine  = JSON.stringify({ __synMeta: { modes, companyName: synergyName ?? null, healthReport } }) + '\n'
    const groqBody  = synRes.body!

    const stream = new ReadableStream({
      async start(ctrl) {
        ctrl.enqueue(encoder.encode(metaLine))
        const reader  = groqBody.getReader()
        const decoder = new TextDecoder()
        let   buf     = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() ?? ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const raw = line.slice(6).trim()
              if (raw === '[DONE]') continue
              try {
                const delta = (JSON.parse(raw) as { choices?: Array<{ delta?: { content?: string } }> })
                  .choices?.[0]?.delta?.content ?? ''
                if (delta) ctrl.enqueue(encoder.encode(delta))
              } catch { /* ignore parse errors */ }
            }
          }
        } catch { /* stream ended abruptly */ } finally {
          ctrl.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    })
  }

  // ── SAIL mode: streaming markdown response ────────────────────────────────
  if (analysisMode === 'sail') {
    const sailRes = await groqFetch({
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages: [
          { role: 'system', content: buildEnhancedSailPrompt(language, primaryConstraint) + governanceSuffix + uncertaintySuffix + synthesisSuffix },
          { role: 'user',   content: userMessage },
        ],
        max_tokens:  1200,
        temperature: 0.45,
        stream:      true,
      }),
    }, body.apiKey).catch(() => null)

    if (!sailRes?.ok) {
      const sailStatus = sailRes?.status === 401 ? 401 : sailRes?.status === 429 ? 429 : 502
      return Response.json(
        { error: sailStatus === 401 ? 'Invalid API key.' : sailStatus === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status: sailStatus },
      )
    }

    const encoder   = new TextEncoder()
    const sailBody  = sailRes.body!

    const stream = new ReadableStream({
      async start(ctrl) {
        const reader        = sailBody.getReader()
        const decoder       = new TextDecoder()
        let   sseBuf        = ''
        let   contentBuf    = ''
        let   intentEmitted = false

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            sseBuf += decoder.decode(value, { stream: true })
            const lines = sseBuf.split('\n')
            sseBuf = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const raw = line.slice(6).trim()
              if (raw === '[DONE]') continue
              try {
                const delta = (JSON.parse(raw) as { choices?: Array<{ delta?: { content?: string } }> })
                  .choices?.[0]?.delta?.content ?? ''
                if (!delta) continue

                if (!intentEmitted) {
                  contentBuf += delta
                  const nl = contentBuf.indexOf('\n')
                  if (nl !== -1) {
                    const match  = contentBuf.slice(0, nl).trim().match(/\[INTENT:(analytic|coaching)\]/)
                    const intent = match ? (match[1] as 'analytic' | 'coaching') : 'analytic'
                    // [SAIL-NEW] Module 3 — health report embedded in __sailMeta
                    ctrl.enqueue(encoder.encode(JSON.stringify({ __sailMeta: { intent, healthReport } }) + '\n'))
                    const rest = contentBuf.slice(nl + 1)
                    if (rest) ctrl.enqueue(encoder.encode(rest))
                    contentBuf    = ''
                    intentEmitted = true
                  } else if (contentBuf.length > 120) {
                    // [SAIL-NEW] Module 3 — health report in fallback meta
                    ctrl.enqueue(encoder.encode(JSON.stringify({ __sailMeta: { intent: 'analytic', healthReport } }) + '\n'))
                    ctrl.enqueue(encoder.encode(contentBuf))
                    contentBuf    = ''
                    intentEmitted = true
                  }
                } else {
                  ctrl.enqueue(encoder.encode(delta))
                }
              } catch { /* ignore parse errors */ }
            }
          }
        } catch { /* stream ended abruptly */ } finally {
          if (!intentEmitted) {
            // [SAIL-NEW] Module 3 — health report in finally-block fallback
            ctrl.enqueue(encoder.encode(JSON.stringify({ __sailMeta: { intent: 'analytic', healthReport } }) + '\n'))
            if (contentBuf) ctrl.enqueue(encoder.encode(contentBuf))
          } else if (contentBuf) {
            ctrl.enqueue(encoder.encode(contentBuf))
          }
          ctrl.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    })
  }

  // ── SCENARIO mode: Mirofish predictive simulation — streaming markdown ──────
  if (analysisMode === 'scenario') {
    const scenarioRes = await groqFetch({
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages: [
          {
            role:    'system',
            content: buildScenarioSystemPrompt(language, primaryConstraint, body.context) + governanceSuffix + uncertaintySuffix + synthesisSuffix,
          },
          { role: 'user', content: userMessage },
        ],
        max_tokens:  1400,
        temperature: 0.5,
        stream:      true,
      }),
    }, body.apiKey).catch(() => null)

    if (!scenarioRes?.ok) {
      const scStatus = scenarioRes?.status === 401 ? 401 : scenarioRes?.status === 429 ? 429 : 502
      return Response.json(
        { error: scStatus === 401 ? 'Invalid API key.' : scStatus === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status: scStatus },
      )
    }

    const encoder   = new TextEncoder()
    const scBody    = scenarioRes.body!

    const stream = new ReadableStream({
      async start(ctrl) {
        // [SAIL-NEW] Module 3 — scenario meta line with health report
        const metaLine = JSON.stringify({ __scenarioMeta: { healthReport } }) + '\n'
        ctrl.enqueue(encoder.encode(metaLine))
        const reader  = scBody.getReader()
        const decoder = new TextDecoder()
        let   buf     = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() ?? ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const raw = line.slice(6).trim()
              if (raw === '[DONE]') continue
              try {
                const delta = (JSON.parse(raw) as { choices?: Array<{ delta?: { content?: string } }> })
                  .choices?.[0]?.delta?.content ?? ''
                if (delta) ctrl.enqueue(encoder.encode(delta))
              } catch { /* ignore parse errors */ }
            }
          }
        } catch { /* stream ended abruptly */ } finally {
          ctrl.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    })
  }

  // ── Operator mode: universal deep-intelligence streaming ─────────────────
  if (analysisMode === 'operator') {
    const operatorRes = await groqFetch({
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        messages: [
          { role: 'system', content: buildEnhancedOperatorPrompt(language, primaryConstraint) + governanceSuffix + uncertaintySuffix + synthesisSuffix },
          { role: 'user',   content: userMessage },
        ],
        max_tokens:  1200,
        temperature: 0.5,
        stream:      true,
      }),
    }, body.apiKey).catch(() => null)

    if (!operatorRes?.ok) {
      const opStatus = operatorRes?.status === 401 ? 401 : operatorRes?.status === 429 ? 429 : 502
      return Response.json(
        { error: opStatus === 401 ? 'Invalid API key.' : opStatus === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status: opStatus },
      )
    }

    const encoder    = new TextEncoder()
    const opBody     = operatorRes.body!

    const stream = new ReadableStream({
      async start(ctrl) {
        // Health report is attached to JSON responses only; not streamed as visible text
        const reader  = opBody.getReader()
        const decoder = new TextDecoder()
        let   buf     = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() ?? ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const raw = line.slice(6).trim()
              if (raw === '[DONE]') continue
              try {
                const delta = (JSON.parse(raw) as { choices?: Array<{ delta?: { content?: string } }> })
                  .choices?.[0]?.delta?.content ?? ''
                if (delta) ctrl.enqueue(encoder.encode(delta))
              } catch { /* ignore */ }
            }
          }
        } catch { /* stream ended abruptly */ } finally {
          ctrl.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    })
  }

  // ── TRIM mode: phased timeline JSON ──────────────────────────────────────
  if (analysisMode === 'trim') {
    let trimRes: Response
    try {
      trimRes = await groqFetch({
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:           GROQ_MODEL,
          messages: [
            { role: 'system', content: buildEnhancedTrimPrompt(language, primaryConstraint) + researchSystemBlock + synthesisSuffix },
            { role: 'user',   content: userMessage },
          ],
          response_format: { type: 'json_object' },
          max_tokens:      900,
          temperature:     0.4,
        }),
      }, body.apiKey)
    } catch {
      return Response.json({ error: 'TRIM request failed.' }, { status: 502 })
    }

    if (!trimRes.ok) {
      const status = trimRes.status === 401 ? 401 : trimRes.status === 429 ? 429 : 502
      return Response.json(
        { error: status === 401 ? 'Invalid API key.' : status === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status },
      )
    }

    const trimData: { choices?: Array<{ message?: { content?: string } }> } = await trimRes.json().catch(() => ({}))
    const trimContent = trimData?.choices?.[0]?.message?.content ?? '{}'

    try {
      const parsed = JSON.parse(trimContent)
      // [SAIL-NEW] Module 3 — health report in JSON response
      return Response.json({ ...parsed, __healthReport: healthReport }, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      return Response.json(
        { trimTitle: 'Strategic Plan', summary: trimContent, phases: [], __healthReport: healthReport },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }

  // ── CATAMARAN mode: dual-track system overhaul ────────────────────────────
  if (analysisMode === 'catamaran') {
    let catRes: Response
    try {
      catRes = await groqFetch({
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:           GROQ_MODEL,
          messages: [
            { role: 'system', content: buildEnhancedCatamaranPrompt(language, primaryConstraint) + researchSystemBlock + synthesisSuffix },
            { role: 'user',   content: userMessage },
          ],
          response_format: { type: 'json_object' },
          max_tokens:      1100,
          temperature:     0.35,
        }),
      }, body.apiKey)
    } catch {
      return Response.json({ error: 'AI provider unreachable.' }, { status: 502 })
    }

    if (!catRes.ok) {
      const status = catRes.status === 401 ? 401 : catRes.status === 429 ? 429 : 502
      return Response.json(
        { error: status === 401 ? 'Invalid API key.' : status === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status },
      )
    }

    const catData: { choices?: Array<{ message?: { content?: string } }> } = await catRes.json().catch(() => ({}))
    const catContent = catData?.choices?.[0]?.message?.content ?? '{}'

    try {
      const parsed = JSON.parse(catContent)
      // [SAIL-NEW] Module 3 — health report in JSON response
      return Response.json({ ...parsed, __healthReport: healthReport }, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      return Response.json(
        {
          catamaranTitle: 'System Overhaul Plan',
          marketGrowth: { actions: [], target: '' },
          customerExperience: { actions: [], target: '' },
          unifiedStrategy: '',
          thirtyDayTarget: '',
          greatestRisk: '',
          __healthReport: healthReport,  // [SAIL-NEW]
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }

  // ── Upwind / Downwind: ExecutiveResponse JSON ─────────────────────────────
  const cognitiveLoad = (body.state as { cognitiveLoadIndex?: number } | undefined)?.cognitiveLoadIndex ?? 0

  let groqRes: Response
  try {
    groqRes = await groqFetch({
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:           GROQ_MODEL,
        messages: [
          { role: 'system', content: buildUpwindSystemPrompt(cognitiveLoad, language, primaryConstraint) + researchSystemBlock + synthesisSuffix },
          { role: 'user',   content: userMessage },
        ],
        response_format: { type: 'json_object' },
        max_tokens:      1200,
        temperature:     0.4,
      }),
    }, body.apiKey)
  } catch {
    return Response.json({ error: 'Unable to reach AI provider.' }, { status: 502 })
  }

  if (!groqRes.ok) {
    const errBody = await groqRes.json().catch(() => ({})) as Record<string, unknown>
    const groqMsg = (errBody?.error as Record<string, unknown>)?.message as string | undefined
    const status  = groqRes.status === 401 ? 401 : groqRes.status === 429 ? 429 : 502
    const fallback = status === 401 ? 'Invalid API key.' : status === 429 ? 'Rate limit reached.' : `AI provider error: ${groqRes.status}`
    return Response.json({ error: groqMsg ?? fallback }, { status })
  }

  let groqData: { choices?: Array<{ message?: { content?: string } }> }
  try {
    groqData = await groqRes.json()
  } catch {
    return Response.json({ error: 'AI provider returned invalid response.' }, { status: 502 })
  }

  const content = groqData?.choices?.[0]?.message?.content ?? ''

  try {
    const parsed = JSON.parse(content)
    // [SAIL-NEW] Module 3 — health report in JSON response
    return Response.json({ ...parsed, __healthReport: healthReport }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json(
      { insight: content || 'Analysis complete. Please review and try again.', __healthReport: healthReport },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
