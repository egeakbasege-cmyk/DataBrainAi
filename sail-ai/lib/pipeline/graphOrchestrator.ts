/**
 * lib/pipeline/graphOrchestrator.ts — Layer 2: Stateful Graph Orchestrator
 * ──────────────────────────────────────────────────────────────────────────
 * Manages the request-scoped PipelineState through all pipeline nodes.
 *
 * Node graph (sequential):
 *   [LLM_ANALYSIS] → [VALIDATOR] → (repair loop ≤2) → [HUMANIZER] → done
 *
 * Circuit breaker:  max 3 retries per node (network/timeout faults)
 * Repair loop:      max 2 iterations (schema/boundary violations)
 * Key rotation:     groqKeys[] tried in order; 429 → next key
 *
 * All state is request-scoped — nothing persisted to memory/Redis here.
 * The caller owns the PipelineState lifetime.
 */

import { validateOutput }     from './validator'
import { humanize }           from './humanizer'
import type {
  PipelineState,
  PipelineConfig,
  PipelineOutput,
  PipelineError,
  NodeStatus,
  ValidatedOutput,
} from './types'
import { routeAndOptimize }   from './semanticRouter'

const GROQ_URL        = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_PRIMARY    = 'llama-3.3-70b-versatile'
const GROQ_FALLBACK   = 'llama-3.1-8b-instant'
const MAX_RETRIES     = 3
const MAX_REPAIR_ITER = 2
const ANALYSIS_TOKENS = 1800  // balanced: quality output within on_demand TPM budget
const TEMPERATURE     = 0.35

// ── State helpers ─────────────────────────────────────────────────────────────

function setStatus(state: PipelineState, node: string, status: NodeStatus) {
  state.nodeStatuses[node] = status
}

function recordError(state: PipelineState, node: string, code: string, message: string, details?: unknown) {
  const err: PipelineError = { node, code, message, details, timestamp: Date.now() }
  state.errors.push(err)
  setStatus(state, node, 'FAILED')
}

function incrementRetry(state: PipelineState, node: string): number {
  state.retryCount[node] = (state.retryCount[node] ?? 0) + 1
  return state.retryCount[node]
}

// ── Groq non-streaming fetch with key rotation + model fallback ───────────────

async function groqComplete(
  messages:    Array<{ role: string; content: string }>,
  groqKeys:    string[],
  maxTokens:   number,
  temperature: number,
): Promise<string> {
  const makeBody = (model: string) => JSON.stringify({
    model, messages, max_tokens: maxTokens, temperature, stream: false,
  })

  // Phase 1: try all keys with primary model
  let lastStatus = 0
  for (const key of groqKeys) {
    const res = await fetch(GROQ_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body:    makeBody(GROQ_PRIMARY),
    }).catch(() => null)

    if (!res) continue
    lastStatus = res.status
    if (res.status === 429) continue

    // 503/500/400/413 (TPM exceeded / context too long) → try fallback model immediately
    if (res.status === 503 || res.status === 500 || res.status === 400 || res.status === 413) {
      const fallback = await fetch(GROQ_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body:    makeBody(GROQ_FALLBACK),
      }).catch(() => null)
      if (fallback?.ok) {
        return extractContent(await fallback.json())
      }
      throw new Error(`Groq ${res.status} — fallback also failed`)
    }

    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`Groq ${res.status}: ${txt.slice(0, 200)}`)
    }

    return extractContent(await res.json())
  }

  // Phase 2: all keys hit 429 → retry with fallback model
  for (const key of groqKeys) {
    const res = await fetch(GROQ_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body:    makeBody(GROQ_FALLBACK),
    }).catch(() => null)
    if (res?.status !== 429) {
      if (res?.ok) return extractContent(await res.json())
      break
    }
  }

  throw new Error(`All ${groqKeys.length} Groq key(s) exhausted (last status: ${lastStatus})`)
}

function extractContent(json: unknown): string {
  const j = json as { choices?: Array<{ message?: { content?: string } }> }
  const content = j.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Groq returned empty content')
  return content
}

// ── Node: LLM Analysis ────────────────────────────────────────────────────────

async function runAnalysisNode(
  state:           PipelineState,
  systemPrompt:    string,
  researchContext: string,
  repairNote:      string,
  groqKeys:        string[],
): Promise<void> {
  setStatus(state, 'LLM_ANALYSIS', 'RUNNING')

  // Repair calls keep research context — the repair LLM needs the live data
  // to correctly assign source fields (LIVE vs TRAINING_EST) on rebuilt metrics.
  const userContent = buildUserMessage(
    state.intent.optimizedPrompt,
    researchContext,
    repairNote,
  )

  let lastErr: unknown
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const raw = await groqComplete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent },
        ],
        groqKeys,
        ANALYSIS_TOKENS,
        TEMPERATURE,
      )
      state.rawLLMOutput = raw
      setStatus(state, 'LLM_ANALYSIS', 'COMPLETE')
      return
    } catch (err) {
      lastErr = err
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 200 * attempt))
      }
    }
  }
  // All attempts exhausted — record and throw so orchestrate() can degrade gracefully
  recordError(state, 'LLM_ANALYSIS', 'MAX_RETRIES', String(lastErr))
  throw lastErr
}

// ── Node: Validator ───────────────────────────────────────────────────────────

function runValidatorNode(state: PipelineState): 'PASS' | 'REPAIR' | 'FAIL' {
  setStatus(state, 'VALIDATOR', 'RUNNING')

  if (!state.rawLLMOutput) {
    recordError(state, 'VALIDATOR', 'NO_OUTPUT', 'rawLLMOutput is null before validation')
    return 'FAIL'
  }

  const result = validateOutput(state.rawLLMOutput)

  if (result.valid && result.data) {
    state.validatedData   = result.data
    state.repairPayload   = null
    setStatus(state, 'VALIDATOR', 'COMPLETE')
    return 'PASS'
  }

  state.repairPayload = result.repair ?? null
  setStatus(state, 'VALIDATOR', 'FAILED')

  if (state.repairIterations >= MAX_REPAIR_ITER) {
    recordError(state, 'VALIDATOR', 'MAX_REPAIR', 'Exceeded max repair iterations', result.violations)
    return 'FAIL'
  }

  return 'REPAIR'
}

// ── Node: Humanizer ───────────────────────────────────────────────────────────

async function runHumanizerNode(
  state:        PipelineState,
  groqKeys:     string[],
  liveDataUsed: boolean,
): Promise<void> {
  setStatus(state, 'HUMANIZER', 'RUNNING')

  if (!state.validatedData) {
    recordError(state, 'HUMANIZER', 'NO_VALIDATED_DATA', 'validatedData is null before humanizer')
    throw new Error('Humanizer called without validated data')
  }

  let attempt = 0
  while (attempt < MAX_RETRIES) {
    attempt++
    try {
      const humanized = await humanize(state.validatedData, state, groqKeys, liveDataUsed)
      state.humanizedOutput = humanized
      setStatus(state, 'HUMANIZER', 'COMPLETE')
      return
    } catch (err) {
      const tries = incrementRetry(state, 'HUMANIZER')
      if (tries >= MAX_RETRIES) {
        recordError(state, 'HUMANIZER', 'MAX_RETRIES', String(err))
        throw err
      }
      await new Promise(r => setTimeout(r, 200 * tries))
    }
  }
}

// ── Prompt builders ───────────────────────────────────────────────────────────
//
// Token budget strategy (keeps total well under 12k TPM on on_demand tier):
//   System = mode instructions + JSON schema     ≈  800–1200 tokens
//   User   = research context (if any) + query   ≈  200–3000 tokens
//   Output =                                      ≈  1800 tokens
//   Total  =                                      ≈  2800–6000 tokens  ✓
//
// Research in the USER turn (not system) gives the model maximum attention on
// live data — it's the last thing read before generating the answer.

const JSON_SCHEMA_BLOCK = `
Return ONLY a valid JSON object — no markdown fences, no extra text before or after.
Schema (all fields required unless marked optional):
{
  "executiveSummary": "string (≥50 chars, plain prose)",
  "keyFindings":      ["string", ...],
  "recommendations": [{
    "title":     "string",
    "rationale": "string",
    "priority":  "HIGH"|"MEDIUM"|"LOW",
    "timeframe": "string",
    "effort":    "HIGH"|"MEDIUM"|"LOW"
  }],
  "metrics": [{
    "name": "string", "value": "string",
    "benchmark": "string (optional)",
    "source": "LIVE"|"TRAINING_EST"|"USER_PROVIDED"
  }],
  "risks": [{ "title": "string", "severity": "HIGH"|"MEDIUM"|"LOW", "mitigation": "string" }],
  "nextActions":     ["string", ...],
  "confidenceScore": 0.0–1.0,
  "revenueTier":     "string",
  "timeHorizon":     "string"
}
source rules: LIVE = from search data below · USER_PROVIDED = stated by user · TRAINING_EST = estimated`.trim()

function buildSystemPrompt(callerSystemPrompt: string, state: PipelineState): string {
  return [
    callerSystemPrompt.trim(),
    ``,
    `━━━ CONTEXT ━━━`,
    `Industry: ${state.intent.inferredIndustry} | Goal: ${state.intent.inferredGoal}`,
    `Revenue tier: ${state.intent.revenueTier} | Horizon: ${state.intent.inferredTimeframe}`,
    ``,
    `━━━ OUTPUT FORMAT (MANDATORY) ━━━`,
    JSON_SCHEMA_BLOCK,
  ].join('\n')
}

function buildUserMessage(
  query:           string,
  researchContext: string,
  repairNote:      string,
): string {
  const parts: string[] = []

  if (repairNote) {
    parts.push(repairNote)
    parts.push(`━━━`)
  }

  if (researchContext.trim()) {
    parts.push(
      `⚡ LIVE WEB SEARCH DATA — use these figures as primary source, not training memory:\n` +
      researchContext.trim() +
      `\n━━━ END LIVE DATA ━━━`,
    )
  }

  parts.push(query)
  return parts.join('\n\n')
}

// ── Pipeline state factory ────────────────────────────────────────────────────

export function createPipelineState(config: PipelineConfig): PipelineState {
  const intent = routeAndOptimize(config.message, config.analysisMode)

  return {
    requestId:        `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    sessionId:        config.sessionId,
    userId:           config.userId,
    language:         config.language,
    analysisMode:     config.analysisMode,
    intent,
    retryCount:       {},
    nodeStatuses:     {},
    rawLLMOutput:     null,
    validatedData:    null,
    humanizedOutput:  null,
    repairPayload:    null,
    repairIterations: 0,
    errors:           [],
    startedAt:        Date.now(),
  }
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

export async function orchestrate(
  config: PipelineConfig,
): Promise<PipelineOutput> {
  const state = createPipelineState(config)

  const researchContext = config.researchContext?.trim() ?? ''
  const liveDataUsed    = !!researchContext

  // System prompt: mode instructions + JSON schema (compact, no research data here)
  const analysisSystemPrompt = buildSystemPrompt(config.systemPrompt, state)

  // Repair system prompt: minimal — just enough context to fix violations
  const repairSystemPrompt = [
    `You are a JSON repair assistant. Fix the schema violations listed in the user message.`,
    `Return the complete corrected JSON object — no markdown, no extra text.`,
    ``,
    `━━━ OUTPUT FORMAT (MANDATORY) ━━━`,
    JSON_SCHEMA_BLOCK,
  ].join('\n')

  // ── Analysis + Validate + Repair loop ──────────────────────────────────────

  while (true) {
    // Node 1: LLM Analysis
    const isRepair      = state.repairIterations > 0
    const systemPrompt  = isRepair ? repairSystemPrompt : analysisSystemPrompt
    const repairNote    = state.repairPayload?.repairInstruction ?? ''

    try {
      await runAnalysisNode(
        state,
        systemPrompt,
        researchContext,
        repairNote,
        config.groqKeys,
      )
    } catch {
      return buildDegradedOutput(state, 'LLM analysis node failed after max retries')
    }

    // Node 2: Validate
    const validationOutcome = runValidatorNode(state)

    if (validationOutcome === 'PASS') break

    if (validationOutcome === 'FAIL') {
      return buildDegradedOutput(state, 'Validation failed and max repair iterations exceeded')
    }

    // REPAIR: loop back with repair instruction
    state.repairIterations++
    state.rawLLMOutput = null
  }

  // ── Node 3: Humanize ───────────────────────────────────────────────────────
  try {
    await runHumanizerNode(state, config.groqKeys, liveDataUsed)
  } catch {
    // Humanizer failed — return validated data with raw summary fallback
    return buildFallbackFromValidated(state)
  }

  // ── Assemble final output ──────────────────────────────────────────────────
  return {
    prose:          state.humanizedOutput!.prose,
    scopeMetadata:  state.humanizedOutput!.scopeMetadata,
    structuredData: state.validatedData,
  }
}

// ── Fallback builders ─────────────────────────────────────────────────────────

function buildDegradedOutput(state: PipelineState, reason: string): PipelineOutput {
  const processingMs = Date.now() - state.startedAt
  return {
    prose: [
      `Analysis could not be completed at this time. ${reason}`,
      `Errors: ${state.errors.map(e => `[${e.node}] ${e.message}`).join('; ')}`,
    ].join(' '),
    scopeMetadata: {
      domain:            state.intent.detectedDomain,
      segment:           state.intent.inferredAudience,
      optimizationGoal:  state.intent.inferredGoal,
      clarityScore:      state.intent.clarityScore,
      revenueTier:       state.intent.revenueTier,
      inferredIndustry:  state.intent.inferredIndustry,
      inferredTimeframe: state.intent.inferredTimeframe,
      injectedDefaults:  state.intent.injectedDefaults,
      analysisMode:      state.analysisMode,
      processingMs,
      validationPassed:  false,
      repairIterations:  state.repairIterations,
      liveDataUsed:      false,
      confidenceScore:   0,
    },
    structuredData: null,
  }
}

function buildFallbackFromValidated(state: PipelineState): PipelineOutput {
  const data        = state.validatedData!
  const processingMs = Date.now() - state.startedAt

  // Assemble prose from validated data directly (no humanizer)
  const prose = [
    data.executiveSummary,
    '',
    `Key findings: ${data.keyFindings.join(' • ')}`,
    '',
    `Primary recommendation: ${data.recommendations[0]?.title ?? 'See full analysis.'}`,
    '',
    `Immediate action: ${data.nextActions[0] ?? 'Review recommendations above.'}`,
  ].join('\n')

  return {
    prose,
    scopeMetadata: {
      domain:            state.intent.detectedDomain,
      segment:           state.intent.inferredAudience,
      optimizationGoal:  state.intent.inferredGoal,
      clarityScore:      state.intent.clarityScore,
      revenueTier:       state.intent.revenueTier,
      inferredIndustry:  state.intent.inferredIndustry,
      inferredTimeframe: state.intent.inferredTimeframe,
      injectedDefaults:  state.intent.injectedDefaults,
      analysisMode:      state.analysisMode,
      processingMs,
      validationPassed:  true,
      repairIterations:  state.repairIterations,
      liveDataUsed:      false,
      confidenceScore:   data.confidenceScore,
    },
    structuredData: data,
  }
}
