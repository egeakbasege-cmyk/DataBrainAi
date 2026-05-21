/**
 * app/api/chat/route.ts — Aetheris Edge Router v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Refactored from a 1551-line monolith into a clean orchestration entry-point.
 * All key management, circuit breaking, and speculative fetch live in the Groq
 * client. All multi-agent orchestration lives in the PersonalisedAI module.
 *
 * Module responsibilities:
 *   /lib/clients/groq.ts                  → Pool, circuit breakers, schemas, speculative
 *   /lib/orchestration/personalised-ai.ts → Chain of Draft, bespoke advisory synthesis
 *   /app/api/chat/route.ts                → Auth, routing, mode dispatch, streaming
 *
 * Mode routing:
 *   upwind / downwind  → progressive JSON stream (meta chunk → result chunk)
 *   sail               → SSE markdown stream
 *   trim               → instant JSON (strict schema, no repair)
 *   catamaran          → instant JSON (strict schema, no repair)
 *   operator           → SSE markdown stream
 *   scenario           → SSE markdown stream
 *   personalised       → Chain of Draft + 70B synthesis stream
 *   synergy            → alias → personalised (backward compatibility)
 *   auto               → Gateway Router → re-dispatched mode
 *
 * New in v2:
 *   • Speculative Execution  — 8B + 70B race for upwind/downwind; winner streams
 *   • Strict JSON Schemas    — Groq enforces schema at generation; no repair step
 *   • Circuit Breakers       — per-key in GroqClient; cascades prevented
 *   • Critic Guardrail       — low-confidence research auto-enriched before LLM call
 *   • C1 Bug Fixed           — cache hits now re-attach fresh scopeMetadata
 */

import { type NextRequest }                       from 'next/server'
import NextAuth                                   from 'next-auth'
import { authConfig }                             from '@/auth.config'
import type { AetherisPayload }                   from '@/types/architecture'

// ── Groq client (key pool, circuit breaker, schemas, speculative fetch) ───────
import {
  groqFetch,
  buildKeyPool,
  JSON_SCHEMAS,
  GROQ_MODELS,
  speculativeFetch,
  extractGroqContent,
} from '@/lib/clients/groq'
import type { GroqMessage, GroqRequest }           from '@/lib/clients/groq'

// ── PersonalisedAI orchestrator (replaces legacy Synergy) ────────────────────
import {
  executeChainOfDraft,
  buildPersonalisedAISystemPrompt,
  buildPersonalisedAIFallbackPrompt,
} from '@/lib/orchestration/personalised-ai'

// ── Prompt builders ───────────────────────────────────────────────────────────
import {
  buildUpwindSystemPrompt,
  buildDownwindSystemPrompt  as buildEnhancedDownwindPrompt,
  buildSailSystemPrompt      as buildEnhancedSailPrompt,
  buildTrimSystemPrompt      as buildEnhancedTrimPrompt,
  buildCatamaranSystemPrompt as buildEnhancedCatamaranPrompt,
  buildOperatorSystemPrompt  as buildEnhancedOperatorPrompt,
  buildScenarioSystemPrompt,
  LIVE_DATA_SYSTEM_PREFIX,
  DATA_UNCERTAINTY_SUFFIX,
  SEARCH_FAILED_WARNING,
} from '@/lib/prompts/enhanced-modes'

// ── Skill + governance layer ──────────────────────────────────────────────────
import { selectSkillCards, buildSkillBlock }      from '@/lib/skills/skillCards'
import type { SkillCard }                         from '@/lib/skills/skillCards'
import { scrubPII }                               from '@/lib/skills/piiScrubber'
import {
  buildDataHealthReport,
  GOVERNANCE_SYSTEM_SUFFIX,
  type DataHealthReport,
} from '@/lib/skills/dataHealthReport'

// ── Research layer ────────────────────────────────────────────────────────────
import {
  executeDeepSearch,
  encodeResearchContext,
  requiresResearch,
  decomposeToSearchQueries,
  detectQueryLanguage,
  type SearchResult,
} from '@/lib/tools/search'

// ── Pipeline ──────────────────────────────────────────────────────────────────
import { routeAndOptimize }    from '@/lib/pipeline/semanticRouter'
import type { ScopeMetadata }  from '@/lib/pipeline/types'
import { selectModel }         from '@/lib/pipeline/modelSelector'
import type { ComplexityTier } from '@/lib/pipeline/modelSelector'

// ── Cache ─────────────────────────────────────────────────────────────────────
import {
  getCachedResponse,
  setCachedResponse,
  CACHEABLE_MODES,
} from '@/lib/cache/responseCache'
import { checkRateLimit }      from '@/lib/cache/rateLimiter'

const { auth } = NextAuth(authConfig)
export const runtime = 'edge'

// ── Extended payload type ─────────────────────────────────────────────────────

type AnalysisMode =
  | 'upwind' | 'downwind' | 'sail' | 'trim' | 'catamaran'
  | 'operator' | 'personalised' | 'synergy' | 'scenario' | 'auto'

type ExtendedPayload = Omit<AetherisPayload, 'analysisMode'> & {
  apiKey?:            string
  primaryConstraint?: string
  analysisMode?:      AnalysisMode
  /** PersonalisedAI branded advisory name (e.g. "Acme AI") */
  companyName?:       string
  /** Legacy alias for companyName — still accepted for backward compat */
  synergyName?:       string
  /** Legacy field — ignored by PersonalisedAI (fixed specialists) */
  synergyModes?:      string[]
  ragContext?:        string
  businessMode?:      boolean
  messages?:          Array<{ role: string; content: string }>
}

// ── Stream URL hallucination stripper ─────────────────────────────────────────
// Strips [text](url) markdown hyperlinks from SSE streams before delivery.
// Defence-in-depth: real citations are injected as plain text by encodeResearchContext().

class StreamUrlStripper {
  private buf = ''

  push(chunk: string): string {
    this.buf += chunk
    this.buf = this.buf.replace(
      /\[\[([^\]\n]{1,150})\]\(https?:\/\/[^)\n]{1,400}\)\]/g, '$1',
    )
    this.buf = this.buf.replace(
      /\[([^\]\n]{1,150})\]\(https?:\/\/[^)\n]{1,400}\)/g, '$1',
    )
    const lastOpen = this.buf.lastIndexOf('[')
    if (lastOpen !== -1 && lastOpen > this.buf.length - 500) {
      const safe = this.buf.slice(0, lastOpen)
      this.buf   = this.buf.slice(lastOpen)
      return safe
    }
    const out = this.buf
    this.buf  = ''
    return out
  }

  flush(): string {
    this.buf = this.buf
      .replace(/\[\[([^\]\n]{1,150})\]\(https?:\/\/[^)\n]{1,400}\)\]/g, '$1')
      .replace(/\[([^\]\n]{1,150})\]\(https?:\/\/[^)\n]{1,400}\)/g,    '$1')
    const out = this.buf
    this.buf  = ''
    return out
  }
}

// ── JSON URL stripper (for non-streaming responses) ───────────────────────────

function stripUrlsFromJson(val: unknown): unknown {
  if (typeof val === 'string') {
    return val
      .replace(/\[\[([^\]\n]{1,150})\]\(https?:\/\/[^)\n]{1,400}\)\]/g, '$1')
      .replace(/\[([^\]\n]{1,150})\]\(https?:\/\/[^)\n]{1,400}\)/g,    '$1')
  }
  if (Array.isArray(val)) return val.map(stripUrlsFromJson)
  if (val !== null && typeof val === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = stripUrlsFromJson(v)
    }
    return out
  }
  return val
}

// ── User message builder ──────────────────────────────────────────────────────

function buildUserMessage(body: ExtendedPayload): string {
  const parts: string[] = []

  if (body.ragContext?.trim()) {
    parts.push(
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📡 REAL-TIME WEB SEARCH RESULTS — RETRIEVED NOW\n` +
      `MANDATORY: Use the figures below as PRIMARY source.\n` +
      `Do NOT use training-memory estimates when this data is present.\n` +
      `Cite the source URL and date for each figure you reference.\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      body.ragContext.trim() +
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    )
  }

  if (body.context?.trim())     parts.push(`BUSINESS CONTEXT\n${body.context.trim()}`)
  parts.push(`QUERY\n${body.message.trim()}`)
  if (body.fileContent?.trim()) parts.push(`ATTACHED DATA\n${body.fileContent.slice(0, 8000)}`)
  if (body.imageBase64)         parts.push('[Image attached — analyse the visual data in the context of the query.]')
  if (body.agentMode && body.agentMode !== 'Auto') parts.push(`AGENT MODE: ${body.agentMode}`)
  if (body.analysisMode === 'downwind') {
    parts.push('MODE: Conversational deep-dive — expand on trade-offs and second-order effects.')
  }

  const skillCards = selectSkillCards(body.message?.trim() ?? '')
  const skillBlock = buildSkillBlock(skillCards)
  if (skillBlock) parts.push(skillBlock)

  return parts.join('\n\n')
}

// ── Multi-turn message builder ────────────────────────────────────────────────

function buildGroqMessages(
  systemContent: string,
  userContent:   string,
  history:       Array<{ role: string; content: string }> | undefined,
): GroqMessage[] {
  const system: GroqMessage = { role: 'system', content: systemContent }
  const user:   GroqMessage = { role: 'user',   content: userContent   }
  if (!history?.length) return [system, user]
  const historyMsgs: GroqMessage[] = history.map(m => ({
    role:    (m.role === 'assistant' ? 'assistant' : 'user') as GroqMessage['role'],
    content: m.content.slice(0, 800),
  }))
  return [system, ...historyMsgs, user]
}

// ── Wabi-Sabi Critic Guardrail ────────────────────────────────────────────────
// Active quality gate: if health report confidence < 0.85 and search results
// are sparse, silently run a secondary targeted search before the LLM call.
// The user never sees this — latency impact ≤ 800 ms on average.

async function criticGuardrailSearch(
  healthReport:      DataHealthReport,
  query:             string,
  language:          string,
  existingResults:   SearchResult[],
  researchAttempted: boolean,
): Promise<SearchResult[]> {
  if (
    healthReport.confidenceScore >= 0.85 ||   // confidence adequate
    !researchAttempted                    ||   // no search was triggered
    existingResults.length >= 4               // already have enough sources
  ) return existingResults

  // Enrich with explicit evidence/statistics signal
  const enrichedQuery     = `${query.slice(0, 100).trim()} statistics evidence data report`
  const secondaryQueries  = decomposeToSearchQueries(enrichedQuery, undefined, language).slice(0, 2)
  const secondary         = await executeDeepSearch(secondaryQueries, language)

  const seen   = new Set(existingResults.map(r => r.url))
  const fresh  = secondary.results.filter(r => !seen.has(r.url))
  const merged = [...existingResults, ...fresh].slice(0, 60)
  merged.sort((a, b) => b.reliabilityScore - a.reliabilityScore)
  return merged
}

// ── Gateway Router ────────────────────────────────────────────────────────────

const VALID_MODES = [
  'upwind', 'downwind', 'sail', 'trim', 'catamaran',
  'operator', 'personalised', 'scenario',
] as const
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
  upwind:       'sail',
  sail:         'operator',
  operator:     'personalised',
  personalised: 'operator',
  trim:         'operator',
  catamaran:    'personalised',
  downwind:     'sail',
  scenario:     'sail',
}

const MODE_SIMILARITY: Record<string, ValidMode> = {
  analysis:      'upwind',      analytics:    'upwind',
  metric:        'upwind',      kpi:          'upwind',
  strategy:      'sail',        strategic:    'sail',
  adaptive:      'sail',        coaching:     'downwind',
  conversation:  'downwind',    advisory:     'personalised',
  timeline:      'trim',        roadmap:      'trim',
  planning:      'trim',        schedule:     'trim',
  deep:          'operator',    comprehensive:'operator',
  intelligence:  'operator',    universal:    'operator',
  multi:         'personalised',hybrid:       'personalised',
  synergistic:   'personalised',council:      'personalised',
  bespoke:       'personalised',personalised: 'personalised',
  growth:        'catamaran',   experience:   'catamaran',
}

function sanitizeRouterResultStr(raw: string, validModes: readonly string[]): string {
  const lower = raw.toLowerCase().trim()
  if (validModes.includes(lower)) return lower
  let bestMode = 'personalised', bestScore = 0
  for (const vm of validModes) {
    const score = (lower.includes(vm) ? vm.length : 0) + (vm.includes(lower) ? lower.length : 0)
    if (score > bestScore) { bestScore = score; bestMode = vm }
  }
  return bestMode
}

function sanitizeRouterResult(raw: Record<string, unknown>): RouterResult {
  const toValidMode = (val: unknown): ValidMode => {
    if (typeof val !== 'string') return 'upwind'
    const lower = val.toLowerCase().trim()
    if (VALID_MODES_SET.has(lower)) return lower as ValidMode
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
    const VALID: RouterMood[] = ['analytical', 'exploratory', 'urgent', 'planning', 'creative']
    return typeof val === 'string' && VALID.includes(val.toLowerCase() as RouterMood)
      ? val.toLowerCase() as RouterMood
      : 'analytical'
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

const DOMAIN_MODE_BIAS: Partial<Record<SkillCard['domain'][number], string>> = {
  financial_analysis:       'trim',
  business_strategy:        'personalised',
  risk_assessment:          'personalised',
  product_strategy:         'personalised',
  market_research:          'sail',
  operations:               'operator',
  competitive_intelligence: 'upwind',
  data_governance:          'operator',
}

const GATEWAY_ROUTER_PROMPT = `You are a query routing engine for a business intelligence platform. Analyse the user message and route it to the optimal analysis mode.

VAGUE QUERY RULE (check first): If the query has NO specific business context (no company, product, industry, metric, or concrete problem) → route to "downwind".

Available modes:
- "upwind"       → metric-driven financial/KPI analysis, benchmarks, data interpretation
- "downwind"     → coaching, context collection, exploratory conversation without business details
- "sail"         → adaptive intelligence when SOME context is present
- "trim"         → phased timeline planning, project roadmaps, execution schedules
- "catamaran"    → dual-track: market growth + customer experience simultaneously
- "operator"     → comprehensive deep intelligence, multi-domain strategy
- "personalised" → bespoke advisory: multi-specialist intelligence synthesised into a unified brief
- "scenario"     → predictive simulation, what-if analysis

Mood signals: "analytical" | "exploratory" | "urgent" | "planning" | "creative"
urgencyLevel: 0.0–1.0. Set ≥ 0.8 only for genuine crises or 48-hour deadlines.

Return ONLY this JSON:
{"mode":"<mode>","confidence":<0-1>,"moodSignal":"<mood>","urgencyLevel":<0-1>,"reasoning":"<max 80 chars>","alternativeMode":"<mode>"}`

async function runGatewayRouter(
  message:  string,
  context?: string,
  byokKey?: string,
): Promise<RouterResult | null> {
  const keys = buildKeyPool(byokKey)
  if (!keys.length) return null

  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), 3_000)

  const userContent = context?.trim()
    ? `Context: ${context.trim().slice(0, 300)}\n\nQuery: ${message.slice(0, 500)}`
    : message.slice(0, 500)

  try {
    const res = await groqFetch(
      {
        model:           GROQ_MODELS.FAST,
        messages:        [
          { role: 'system', content: GATEWAY_ROUTER_PROMPT },
          { role: 'user',   content: userContent           },
        ],
        max_tokens:      150,
        temperature:     0.1,
        response_format: { type: 'json_object' },
      },
      byokKey,
    )

    clearTimeout(timer)
    if (!res.ok) return null

    const rawContent = await extractGroqContent(res)
    const raw        = JSON.parse(rawContent) as Record<string, unknown>

    // Domain bias from matched skill card (advisory only, auto mode only)
    const topCard = selectSkillCards(message, 1)[0]
    if (topCard) {
      const biasedMode = DOMAIN_MODE_BIAS[topCard.domain[0]]
      if (biasedMode) raw.mode = sanitizeRouterResultStr(biasedMode, VALID_MODES)
    }

    return sanitizeRouterResult(raw)
  } catch {
    clearTimeout(timer)
    return null
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {

  // ── 1. Session guard ───────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.email) {
    return Response.json(
      { error: 'Authentication required. Please sign in.' },
      { status: 401 },
    )
  }

  // ── 2. Parse payload ───────────────────────────────────────────────────────
  let body: ExtendedPayload
  try {
    body = (await req.json()) as ExtendedPayload
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!body.message?.trim() && !body.imageBase64) {
    return Response.json({ error: 'Message is required.' }, { status: 422 })
  }

  const analysisMode: AnalysisMode = body.analysisMode ?? 'upwind'

  // ── 3. Key availability ────────────────────────────────────────────────────
  if (buildKeyPool(body.apiKey).length === 0) {
    return Response.json(
      { error: 'AI provider not configured. Add a Groq API key in settings.' },
      { status: 503 },
    )
  }

  // ── 4. Per-user rate limit ─────────────────────────────────────────────────
  const userId   = body.userId ?? 'anonymous'
  const rlResult = await checkRateLimit(userId)
  if (!rlResult.allowed) {
    return Response.json(
      {
        error: `Rate limit reached. You can make ${rlResult.limit} requests per minute. ` +
               `Resets in ${Math.ceil(rlResult.resetInMs / 1000)}s.`,
      },
      { status: 429 },
    )
  }

  // ── 5. AUTO mode: Gateway Router ───────────────────────────────────────────
  if (analysisMode === 'auto') {
    const routerResult = await runGatewayRouter(body.message ?? '', body.context, body.apiKey)
    return Response.json({
      __moodGuide: {
        detectedMood:    routerResult?.moodSignal     ?? 'analytical',
        selectedMode:    routerResult?.mode           ?? 'upwind',
        alternativeMode: routerResult?.alternativeMode ?? 'sail',
        reasoning:       routerResult?.reasoning      ?? '',
        urgencyLevel:    routerResult?.urgencyLevel   ?? 0.3,
        confidence:      routerResult?.confidence     ?? 0.7,
        autoProceeding:  (routerResult?.urgencyLevel  ?? 0) >= 0.8,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // ── 6. Semantic Router (deterministic, ~1 ms, no LLM) ─────────────────────
  const startedAt = Date.now()
  const intent    = routeAndOptimize(body.message ?? '', analysisMode)

  // ── 7. Cache check (JSON modes — C1 bug fixed: re-attaches scopeMetadata) ──
  const cacheQueryText = body.message?.trim() ?? ''
  const cacheLang      = body.language ?? 'en'

  if (CACHEABLE_MODES.has(analysisMode)) {
    const cached = await getCachedResponse(cacheQueryText, analysisMode, cacheLang)
    if (cached) {
      const cacheHitScope: ScopeMetadata = {
        domain:            intent.detectedDomain,
        segment:           intent.inferredAudience,
        optimizationGoal:  intent.inferredGoal,
        clarityScore:      intent.clarityScore,
        revenueTier:       intent.revenueTier,
        inferredIndustry:  intent.inferredIndustry,
        inferredTimeframe: intent.inferredTimeframe,
        injectedDefaults:  intent.injectedDefaults,
        analysisMode,
        processingMs:      Date.now() - startedAt,
        validationPassed:  true,
        repairIterations:  0,
        liveDataUsed:      true,   // only live-data responses are ever cached
        confidenceScore:   intent.clarityScore,
        modelTier:         'STANDARD',
      }
      return Response.json(
        { ...cached, __cacheHit: true, scopeMetadata: cacheHitScope },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }

  // ── 8. PII scrubbing (fileContent only) ───────────────────────────────────
  let piiRedactedCount = 0
  let piiTags: string[] = []
  if (body.fileContent) {
    const { scrubbedText, redactedCount, tags } = scrubPII(body.fileContent)
    body.fileContent = scrubbedText
    piiRedactedCount = redactedCount
    piiTags          = tags
  }

  // ── 9. Research loop ───────────────────────────────────────────────────────
  const queryText      = body.message?.trim() ?? ''
  const _queryLanguage = (body.language && body.language !== 'en')
    ? body.language
    : detectQueryLanguage(queryText)

  let _searchResults: SearchResult[] = []
  let _researchQueries: string[]     = []
  let _hasSynthesisContext            = false
  let _researchAttempted              = false
  let _staleSourceCount: number | undefined

  if (requiresResearch(queryText)) {
    _researchAttempted = true
    _researchQueries   = decomposeToSearchQueries(queryText, body.context, _queryLanguage)
    const searchResponse = await executeDeepSearch(_researchQueries, _queryLanguage)
    _searchResults     = searchResponse.results
    _staleSourceCount  = searchResponse.staleSourceCount

    console.error(
      `[SEARCH] mode=${analysisMode} lang=${_queryLanguage} ` +
      `results=${_searchResults.length} provider=${searchResponse.provider} ` +
      `queries=${JSON.stringify(_researchQueries)}`,
    )

    if (_searchResults.length > 0) {
      body.ragContext      = encodeResearchContext(searchResponse)
      _hasSynthesisContext = true
    }
  }

  // ── 10. Adaptive model selection ──────────────────────────────────────────
  const contextChars   = (body.ragContext?.length ?? 0) + (body.fileContent?.length ?? 0)
  const modelSelection = selectModel(queryText, analysisMode, contextChars)
  const language       = body.language ?? 'en'
  const primaryConstraint = body.primaryConstraint

  // ── 11. Build user message (skill injection + research context) ────────────
  const userMessage = buildUserMessage(body)

  // ── 12. Wabi-Sabi Health Report (pre-compute) ─────────────────────────────
  const _appliedCards    = selectSkillCards(queryText)
  const _matchedKeywords = _appliedCards.map(card =>
    card.triggerKeywords.filter(kw => queryText.toLowerCase().includes(kw)),
  )
  const healthReport: DataHealthReport = buildDataHealthReport({
    redactedCount:    piiRedactedCount,
    piiTags,
    appliedCards:     _appliedCards,
    matchedKeywords:  _matchedKeywords,
    bodyFields:       [['message', body.message], ['context', body.context]],
    searchResults:    _searchResults,
    researchQueries:  _researchQueries,
    queryLanguage:    _queryLanguage,
    staleSourceCount: _staleSourceCount,
  })

  // ── 13. Critic Guardrail: silent secondary search on low confidence ────────
  if (_researchAttempted) {
    _searchResults = await criticGuardrailSearch(
      healthReport, queryText, _queryLanguage, _searchResults, _researchAttempted,
    )
    // If guardrail retrieved new sources, rebuild ragContext
    if (_searchResults.length > (_hasSynthesisContext ? (_researchQueries.length * 10) : 0)) {
      const enrichedResponse = {
        results:          _searchResults,
        images:           [],
        queriesUsed:      _researchQueries,
        searchedAt:       new Date().toISOString(),
        provider:         'tavily' as const,
        staleSourceCount: _staleSourceCount ?? 0,
      }
      body.ragContext      = encodeResearchContext(enrichedResponse)
      _hasSynthesisContext = _searchResults.length > 0
    }
  }

  // ── 14. ScopeMetadata builder (closure — needs intent + modelSelection) ────
  function buildScopeMeta(
    validationPassed: boolean,
    repairIterations: number,
    confidenceScore:  number,
    tier?:            ComplexityTier,
  ): ScopeMetadata {
    return {
      domain:            intent.detectedDomain,
      segment:           intent.inferredAudience,
      optimizationGoal:  intent.inferredGoal,
      clarityScore:      intent.clarityScore,
      revenueTier:       intent.revenueTier,
      inferredIndustry:  intent.inferredIndustry,
      inferredTimeframe: intent.inferredTimeframe,
      injectedDefaults:  intent.injectedDefaults,
      analysisMode,
      processingMs:      Date.now() - startedAt,
      validationPassed,
      repairIterations,
      liveDataUsed:      _hasSynthesisContext,
      confidenceScore,
      modelTier:         tier ?? modelSelection.tier,
    }
  }

  // ── 15. Shared prompt components ───────────────────────────────────────────

  const isBusinessMode = body.businessMode !== false
  const domainPrefix   = isBusinessMode
    ? `DOMAIN LOCK — MANDATORY (read before everything else):
You are a business strategy and market intelligence assistant. You ONLY operate in the commercial domain.

SCOPE RULES — NON-NEGOTIABLE:
1. ALLOWED topics: businesses, products, markets, sales, e-commerce, revenue, pricing, marketing, operations, finance, supply chain, hiring, competitive strategy, team management, customer acquisition, retention, product development.
2. FORBIDDEN topics: personal life, health advice, relationships, spirituality, horoscopes, astrology, general self-improvement, motivational life quotes.
3. VAGUE QUERY RULE — CRITICAL: If the user's question has NO specific business context, respond ONLY with 2–3 targeted clarification questions.
4. ANTI-HOROSCOPE RULE — ABSOLUTE: NEVER output life-coaching or cosmic language. Ground every sentence in specific numbers, named metrics, or concrete actions.
5. ALWAYS: specific numbers, named metrics, concrete actions with timelines, or explicit questions to gather missing data.

`
    : `DOMAIN: Free chat mode — answer any topic naturally and helpfully. Be direct, specific, and genuinely useful.\n\n`

  const governanceSuffix  = _appliedCards.length > 0 ? GOVERNANCE_SYSTEM_SUFFIX : ''
  const liveDataPrefix    = _hasSynthesisContext ? LIVE_DATA_SYSTEM_PREFIX : ''
  const streamingModes    = new Set(['sail', 'operator', 'personalised', 'synergy', 'scenario'])
  const uncertaintySuffix = streamingModes.has(analysisMode) ? DATA_UNCERTAINTY_SUFFIX : ''
  const synthesisSuffix   = _hasSynthesisContext
    ? `\n\n⚡ REMINDER — LIVE DATA ACTIVE: The user message contains fresh web search results ` +
      `inside ━━ REAL-TIME WEB SEARCH RESULTS ━━. ` +
      `Using training-memory estimates for any metric covered by those results is a quality failure. ` +
      `Cite source URL + date for every live figure.` +
      (_queryLanguage !== 'en' ? ` Respond entirely in ${_queryLanguage}.` : '')
    : (_researchAttempted ? SEARCH_FAILED_WARNING : '')

  const encoder = new TextEncoder()

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONALISED AI (replaces legacy Synergy)
  // Also handles mode='synergy' for backward compatibility
  // ═══════════════════════════════════════════════════════════════════════════

  if (analysisMode === 'personalised' || analysisMode === 'synergy') {
    const companyName = body.companyName ?? body.synergyName

    // Phase 1 — Chain of Draft: 3 specialist 8B agents, 2 s total timeout
    const draftResult = await executeChainOfDraft(
      userMessage,
      language,
      primaryConstraint,
      body.apiKey,
    )

    // Phase 2 — 70B synthesis (streaming)
    const synthesisSystemPrompt = draftResult.parallelMode
      ? liveDataPrefix +
        buildPersonalisedAISystemPrompt(
          draftResult.drafts, language, companyName, primaryConstraint,
        ) + synthesisSuffix
      : liveDataPrefix +
        buildPersonalisedAIFallbackPrompt(language, companyName, primaryConstraint) +
        uncertaintySuffix + synthesisSuffix

    const synthRes = await groqFetch(
      {
        model:       GROQ_MODELS.PRIMARY,
        messages:    buildGroqMessages(synthesisSystemPrompt, userMessage, body.messages),
        max_tokens:  1200,
        temperature: 0.40,
        stream:      true,
      },
      body.apiKey,
    ).catch(() => null)

    if (!synthRes?.ok) {
      const st = synthRes?.status === 401 ? 401 : synthRes?.status === 429 ? 429 : 502
      return Response.json(
        { error: st === 401 ? 'Invalid API key.' : st === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status: st },
      )
    }

    // Meta line — backward-compat format (__synMeta) so existing frontend works
    const metaLine = JSON.stringify({
      __synMeta: {
        modes:         ['financial', 'strategic', 'operational'],
        companyName:   companyName ?? null,
        healthReport,
        scopeMetadata: buildScopeMeta(true, 0, intent.clarityScore),
        agentSummary:  draftResult.drafts.map(d => ({ layer: d.lens, confidence: d.confidence })),
        parallelMode:  draftResult.parallelMode,
        elapsedMs:     draftResult.elapsedMs,
      },
    }) + '\n'

    const groqBody = synthRes.body!
    const stream   = new ReadableStream({
      async start(ctrl) {
        ctrl.enqueue(encoder.encode(metaLine))
        const reader   = groqBody.getReader()
        const decoder  = new TextDecoder()
        const stripper = new StreamUrlStripper()
        let buf = ''
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
                if (delta) {
                  const clean = stripper.push(delta)
                  if (clean) ctrl.enqueue(encoder.encode(clean))
                }
              } catch { /* ignore parse errors */ }
            }
          }
        } catch { /* stream ended abruptly */ } finally {
          const tail = stripper.flush()
          if (tail) ctrl.enqueue(encoder.encode(tail))
          ctrl.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type':      'text/plain; charset=utf-8',
        'Cache-Control':     'no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAIL — adaptive streaming markdown
  // ═══════════════════════════════════════════════════════════════════════════

  if (analysisMode === 'sail') {
    const sailRes = await groqFetch(
      {
        model:       modelSelection.model,
        messages:    buildGroqMessages(
          liveDataPrefix + domainPrefix +
          buildEnhancedSailPrompt(language, primaryConstraint) +
          governanceSuffix + uncertaintySuffix + synthesisSuffix,
          userMessage,
          body.messages,
        ),
        max_tokens:  modelSelection.maxTokens,
        temperature: modelSelection.temperature,
        stream:      true,
      },
      body.apiKey,
    ).catch(() => null)

    if (!sailRes?.ok) {
      const st = sailRes?.status === 401 ? 401 : sailRes?.status === 429 ? 429 : 502
      return Response.json(
        { error: st === 401 ? 'Invalid API key.' : st === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status: st },
      )
    }

    const sailBody = sailRes.body!
    const stream   = new ReadableStream({
      async start(ctrl) {
        const reader        = sailBody.getReader()
        const decoder       = new TextDecoder()
        const stripper      = new StreamUrlStripper()
        let sseBuf        = ''
        let contentBuf    = ''
        let intentEmitted = false

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
                    const match      = contentBuf.slice(0, nl).trim().match(/\[INTENT:(analytic|coaching)\]/)
                    const sailIntent = match ? (match[1] as 'analytic' | 'coaching') : 'analytic'
                    ctrl.enqueue(encoder.encode(
                      JSON.stringify({ __sailMeta: { intent: sailIntent, healthReport, scopeMetadata: buildScopeMeta(true, 0, intent.clarityScore) } }) + '\n',
                    ))
                    const rest = contentBuf.slice(nl + 1)
                    if (rest) {
                      const clean = stripper.push(rest)
                      if (clean) ctrl.enqueue(encoder.encode(clean))
                    }
                    contentBuf    = ''
                    intentEmitted = true
                  } else if (contentBuf.length > 120) {
                    ctrl.enqueue(encoder.encode(
                      JSON.stringify({ __sailMeta: { intent: 'analytic', healthReport, scopeMetadata: buildScopeMeta(true, 0, intent.clarityScore) } }) + '\n',
                    ))
                    const clean = stripper.push(contentBuf)
                    if (clean) ctrl.enqueue(encoder.encode(clean))
                    contentBuf    = ''
                    intentEmitted = true
                  }
                } else {
                  const clean = stripper.push(delta)
                  if (clean) ctrl.enqueue(encoder.encode(clean))
                }
              } catch { /* ignore */ }
            }
          }
        } catch { /* stream ended */ } finally {
          const tail = stripper.flush()
          if (!intentEmitted) {
            ctrl.enqueue(encoder.encode(
              JSON.stringify({ __sailMeta: { intent: 'analytic', healthReport, scopeMetadata: buildScopeMeta(true, 0, intent.clarityScore) } }) + '\n',
            ))
          }
          const remaining = contentBuf + tail
          if (remaining) ctrl.enqueue(encoder.encode(remaining))
          ctrl.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENARIO — predictive simulation streaming markdown
  // ═══════════════════════════════════════════════════════════════════════════

  if (analysisMode === 'scenario') {
    const scenarioRes = await groqFetch(
      {
        model:       modelSelection.model,
        messages:    buildGroqMessages(
          liveDataPrefix + domainPrefix +
          buildScenarioSystemPrompt(language, primaryConstraint) +
          governanceSuffix + uncertaintySuffix + synthesisSuffix,
          userMessage,
          body.messages,
        ),
        max_tokens:  modelSelection.maxTokens,
        temperature: modelSelection.temperature,
        stream:      true,
      },
      body.apiKey,
    ).catch(() => null)

    if (!scenarioRes?.ok) {
      const st = scenarioRes?.status === 401 ? 401 : scenarioRes?.status === 429 ? 429 : 502
      return Response.json(
        { error: st === 401 ? 'Invalid API key.' : st === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status: st },
      )
    }

    const scBody = scenarioRes.body!
    const stream = new ReadableStream({
      async start(ctrl) {
        ctrl.enqueue(encoder.encode(
          JSON.stringify({ __scenarioMeta: { healthReport, scopeMetadata: buildScopeMeta(true, 0, intent.clarityScore) } }) + '\n',
        ))
        const reader   = scBody.getReader()
        const decoder  = new TextDecoder()
        const stripper = new StreamUrlStripper()
        let buf = ''
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
                if (delta) {
                  const clean = stripper.push(delta)
                  if (clean) ctrl.enqueue(encoder.encode(clean))
                }
              } catch { /* ignore */ }
            }
          }
        } catch { /* stream ended */ } finally {
          const tail = stripper.flush()
          if (tail) ctrl.enqueue(encoder.encode(tail))
          ctrl.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OPERATOR — deep intelligence streaming markdown
  // ═══════════════════════════════════════════════════════════════════════════

  if (analysisMode === 'operator') {
    const operatorRes = await groqFetch(
      {
        model:       modelSelection.model,
        messages:    buildGroqMessages(
          liveDataPrefix + domainPrefix +
          buildEnhancedOperatorPrompt(language, primaryConstraint) +
          governanceSuffix + uncertaintySuffix + synthesisSuffix,
          userMessage,
          body.messages,
        ),
        max_tokens:  modelSelection.maxTokens,
        temperature: modelSelection.temperature,
        stream:      true,
      },
      body.apiKey,
    ).catch(() => null)

    if (!operatorRes?.ok) {
      const st = operatorRes?.status === 401 ? 401 : operatorRes?.status === 429 ? 429 : 502
      return Response.json(
        { error: st === 401 ? 'Invalid API key.' : st === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status: st },
      )
    }

    const opBody = operatorRes.body!
    const stream = new ReadableStream({
      async start(ctrl) {
        const reader   = opBody.getReader()
        const decoder  = new TextDecoder()
        const stripper = new StreamUrlStripper()
        let buf = ''
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
                if (delta) {
                  const clean = stripper.push(delta)
                  if (clean) ctrl.enqueue(encoder.encode(clean))
                }
              } catch { /* ignore */ }
            }
          }
        } catch { /* stream ended */ } finally {
          const tail = stripper.flush()
          if (tail) ctrl.enqueue(encoder.encode(tail))
          ctrl.close()
        }
      },
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' },
    })
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIM — phased timeline JSON (strict schema)
  // ═══════════════════════════════════════════════════════════════════════════

  if (analysisMode === 'trim') {
    const trimRes = await groqFetch(
      {
        model:           modelSelection.model,
        messages:        buildGroqMessages(
          liveDataPrefix + domainPrefix +
          buildEnhancedTrimPrompt(language, primaryConstraint) + synthesisSuffix,
          userMessage,
          body.messages,
        ),
        response_format: JSON_SCHEMAS.trim,
        max_tokens:      modelSelection.maxTokens,
        temperature:     modelSelection.temperature,
      },
      body.apiKey,
    ).catch(() => null)

    if (!trimRes?.ok) {
      const st = trimRes?.status === 401 ? 401 : trimRes?.status === 429 ? 429 : 502
      return Response.json(
        { error: st === 401 ? 'Invalid API key.' : st === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status: st },
      )
    }

    const content = await extractGroqContent(trimRes)
    try {
      const parsed   = JSON.parse(content)
      const trimResp = {
        ...(stripUrlsFromJson(parsed) as object),
        __healthReport: healthReport,
        scopeMetadata:  buildScopeMeta(true, 0, intent.clarityScore),
      }
      void setCachedResponse(cacheQueryText, analysisMode, cacheLang, trimResp as Record<string, unknown>, _hasSynthesisContext)
      return Response.json(trimResp, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      // JSON Schema strict mode should prevent this — graceful fallback
      return Response.json(
        { trimTitle: 'Strategic Plan', summary: content, phases: [], __healthReport: healthReport, scopeMetadata: buildScopeMeta(false, 0, intent.clarityScore) },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CATAMARAN — dual-track JSON (strict schema)
  // ═══════════════════════════════════════════════════════════════════════════

  if (analysisMode === 'catamaran') {
    const catRes = await groqFetch(
      {
        model:           modelSelection.model,
        messages:        buildGroqMessages(
          liveDataPrefix + domainPrefix +
          buildEnhancedCatamaranPrompt(language, primaryConstraint) + synthesisSuffix,
          userMessage,
          body.messages,
        ),
        response_format: JSON_SCHEMAS.catamaran,
        max_tokens:      modelSelection.maxTokens,
        temperature:     modelSelection.temperature,
      },
      body.apiKey,
    ).catch(() => null)

    if (!catRes?.ok) {
      const st = catRes?.status === 401 ? 401 : catRes?.status === 429 ? 429 : 502
      return Response.json(
        { error: st === 401 ? 'Invalid API key.' : st === 429 ? 'Rate limit reached.' : 'AI provider error.' },
        { status: st },
      )
    }

    const content = await extractGroqContent(catRes)
    try {
      const parsed  = JSON.parse(content)
      const catResp = {
        ...(stripUrlsFromJson(parsed) as object),
        __healthReport: healthReport,
        scopeMetadata:  buildScopeMeta(true, 0, intent.clarityScore),
      }
      void setCachedResponse(cacheQueryText, analysisMode, cacheLang, catResp as Record<string, unknown>, _hasSynthesisContext)
      return Response.json(catResp, { headers: { 'Cache-Control': 'no-store' } })
    } catch {
      return Response.json(
        {
          catamaranTitle:     'System Overhaul Plan',
          marketGrowth:       { actions: [], target: '' },
          customerExperience: { actions: [], target: '' },
          unifiedStrategy:    '',
          thirtyDayTarget:    '',
          greatestRisk:       '',
          __healthReport:     healthReport,
          scopeMetadata:      buildScopeMeta(false, 0, intent.clarityScore),
        },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPWIND / DOWNWIND — Progressive JSON stream with Speculative Execution
  //
  // Architecture:
  //   Chunk 1 — __streamMeta  : emitted immediately (~5 ms)
  //             Scope panel populates while Groq is generating.
  //   Chunk 2 — __result      : emitted when Groq completes
  //             Full parsed + schema-validated JSON response.
  //   Chunk 2 — __error       : emitted on any failure
  //
  // Speculative execution:
  //   • High clarity (≥ 0.75) → only 70B fires; 8B request skipped
  //   • Low clarity  (< 0.35) → only 8B fires;  70B request skipped
  //   • Mid clarity           → both fire; winner streamed, loser aborted
  // ═══════════════════════════════════════════════════════════════════════════

  const cognitiveLoad = (body.state as { cognitiveLoadIndex?: number } | undefined)?.cognitiveLoadIndex ?? 0

  const sessionHistoryBlock = analysisMode === 'downwind' && body.messages?.length
    ? (body.messages as Array<{ role: string; content: string }>)
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 400)}`)
        .join('\n')
    : undefined

  const activeSystemPrompt = analysisMode === 'downwind'
    ? buildEnhancedDownwindPrompt(language, primaryConstraint, sessionHistoryBlock)
    : buildUpwindSystemPrompt(cognitiveLoad, language, primaryConstraint)

  const responseSchema = analysisMode === 'downwind'
    ? JSON_SCHEMAS.downwind
    : JSON_SCHEMAS.executive

  const fullSystemPrompt = liveDataPrefix + domainPrefix + activeSystemPrompt + synthesisSuffix
  const groqMessages     = buildGroqMessages(fullSystemPrompt, userMessage, undefined)

  // Fire speculative fetch — both models start simultaneously
  const groqResPromise = speculativeFetch(
    {
      simpleRequest: {
        model:           GROQ_MODELS.FAST,
        messages:        groqMessages,
        response_format: responseSchema,
        max_tokens:      680,
        temperature:     modelSelection.temperature,
      },
      complexRequest: {
        model:           modelSelection.model,
        messages:        groqMessages,
        response_format: responseSchema,
        max_tokens:      modelSelection.maxTokens,
        temperature:     modelSelection.temperature,
      },
      clarityScore: intent.clarityScore,
    },
    body.apiKey,
  )

  const immediateMeta = buildScopeMeta(true, 0, intent.clarityScore)

  const stream = new ReadableStream({
    async start(ctrl) {
      // ── Chunk 1: meta (immediate — before Groq responds) ──────────────────
      ctrl.enqueue(encoder.encode(
        JSON.stringify({ __streamMeta: { scopeMetadata: immediateMeta, healthReport } }) + '\n',
      ))

      // ── Await speculative result ───────────────────────────────────────────
      let groqRes: Response
      try {
        groqRes = await groqResPromise
      } catch {
        ctrl.enqueue(encoder.encode(
          JSON.stringify({ __error: 'Unable to reach AI provider.', __status: 502 }) + '\n',
        ))
        ctrl.close()
        return
      }

      if (!groqRes.ok) {
        const errBody = await groqRes.json().catch(() => ({}) as Record<string, unknown>) as Record<string, unknown>
        const groqMsg = (errBody?.error as Record<string, unknown> | undefined)?.message as string | undefined
        const status  = groqRes.status === 401 ? 401 : groqRes.status === 429 ? 429 : 502
        ctrl.enqueue(encoder.encode(
          JSON.stringify({
            __error:  groqMsg ?? (status === 401 ? 'Invalid API key.' : status === 429 ? 'Rate limit reached.' : `AI provider error: ${groqRes.status}`),
            __status: status,
          }) + '\n',
        ))
        ctrl.close()
        return
      }

      const rawContent = await extractGroqContent(groqRes)

      // JSON_SCHEMAS strict mode guarantees valid JSON — parse fallback is an edge guard
      let parsedResponse: unknown
      try {
        parsedResponse = JSON.parse(rawContent)
      } catch {
        ctrl.enqueue(encoder.encode(
          JSON.stringify({
            __result: {
              insight:        rawContent || 'Analysis complete.',
              __healthReport: healthReport,
              scopeMetadata:  buildScopeMeta(false, 0, intent.clarityScore),
            },
          }) + '\n',
        ))
        ctrl.close()
        return
      }

      // Extract confidence from the parsed response (supports both formats)
      const parsedRecord = parsedResponse as Record<string, unknown>
      const ciField      = parsedRecord.confidenceIndex
      const confidenceScore =
        ciField !== null && typeof ciField === 'object'
          ? (typeof (ciField as Record<string, unknown>).score === 'number'
              ? (ciField as Record<string, unknown>).score as number
              : intent.clarityScore)
          : typeof ciField === 'number'
          ? ciField as number
          : intent.clarityScore

      const finalResp = {
        ...(stripUrlsFromJson(parsedResponse) as object),
        __healthReport: healthReport,
        scopeMetadata:  buildScopeMeta(true, 0, confidenceScore),
      }

      // Fire-and-forget cache write
      void setCachedResponse(
        cacheQueryText, analysisMode, cacheLang,
        finalResp as Record<string, unknown>,
        _hasSynthesisContext,
      )

      // ── Chunk 2: full result ───────────────────────────────────────────────
      ctrl.enqueue(encoder.encode(JSON.stringify({ __result: finalResp }) + '\n'))
      ctrl.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':      'text/plain; charset=utf-8',
      'Cache-Control':     'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
