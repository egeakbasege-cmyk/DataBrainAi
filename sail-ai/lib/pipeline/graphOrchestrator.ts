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
const ANALYSIS_TOKENS = 2400
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

    // 503/500/400 → try fallback model immediately on this key
    if (res.status === 503 || res.status === 500 || res.status === 400) {
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
  state:        PipelineState,
  systemPrompt: string,
  repairNote:   string,
  groqKeys:     string[],
): Promise<void> {
  setStatus(state, 'LLM_ANALYSIS', 'RUNNING')

  const userContent = repairNote
    ? `${repairNote}\n\n---\n\nOriginal query: ${state.intent.optimizedPrompt}`
    : state.intent.optimizedPrompt

  let attempt = 0
  while (attempt < MAX_RETRIES) {
    attempt++
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
      const tries = incrementRetry(state, 'LLM_ANALYSIS')
      if (tries >= MAX_RETRIES) {
        recordError(state, 'LLM_ANALYSIS', 'MAX_RETRIES', String(err))
        throw err
      }
      // brief back-off before retry (edge-compatible: no setTimeout in edge)
      // Use a busy-wait micro-delay (acceptable on edge for <5ms)
      await new Promise(r => setTimeout(r, 200 * tries))
    }
  }
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

// ── System prompt builder ─────────────────────────────────────────────────────
// Wraps the caller-supplied prompt with JSON output enforcement.

function wrapWithJSONEnforcement(
  callerSystemPrompt: string,
  researchContext:    string,
  state:              PipelineState,
): string {
  const jsonSchema = `
Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "executiveSummary": "string (≥50 chars)",
  "keyFindings": ["string", ...],
  "recommendations": [
    {
      "title": "string",
      "rationale": "string",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "timeframe": "string",
      "effort": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "metrics": [
    { "name": "string", "value": "string", "benchmark": "string (optional)", "source": "LIVE" | "TRAINING_EST" | "USER_PROVIDED" }
  ],
  "risks": [
    { "title": "string", "severity": "HIGH" | "MEDIUM" | "LOW", "mitigation": "string" }
  ],
  "nextActions": ["string", ...],
  "confidenceScore": 0.0–1.0,
  "revenueTier": "${state.intent.revenueTier}",
  "timeHorizon": "${state.intent.inferredTimeframe}"
}
Set "source" to "LIVE" only for data from the live search context below.
Set "source" to "USER_PROVIDED" for data the user explicitly stated.
Set "source" to "TRAINING_EST" for estimated data from training.
`.trim()

  const blocks: string[] = []

  if (researchContext.trim()) {
    blocks.push(
      `⚡ LIVE WEB SEARCH DATA — USE THIS AS PRIMARY SOURCE ⚡\n${researchContext.trim()}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    )
  }

  blocks.push(callerSystemPrompt.trim())
  blocks.push(`\n━━━ OUTPUT FORMAT (MANDATORY) ━━━\n${jsonSchema}`)

  return blocks.join('\n\n')
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

  const liveDataUsed   = !!config.researchContext?.trim()
  const fullSystemPrompt = wrapWithJSONEnforcement(
    config.systemPrompt,
    config.researchContext ?? '',
    state,
  )

  // ── Analysis + Validate + Repair loop ──────────────────────────────────────
  let analysisSystemPrompt = fullSystemPrompt

  while (true) {
    // Node 1: LLM Analysis
    try {
      await runAnalysisNode(
        state,
        analysisSystemPrompt,
        state.repairPayload?.repairInstruction ?? '',
        config.groqKeys,
      )
    } catch {
      // Analysis failed past retries — return graceful degraded output
      return buildDegradedOutput(state, 'LLM analysis node failed after max retries')
    }

    // Node 2: Validate
    const validationOutcome = runValidatorNode(state)

    if (validationOutcome === 'PASS') break  // exit repair loop

    if (validationOutcome === 'FAIL') {
      return buildDegradedOutput(state, 'Validation failed and max repair iterations exceeded')
    }

    // REPAIR: inject repair instruction and loop back
    state.repairIterations++
    state.rawLLMOutput = null  // reset for re-analysis

    // For repair call: use a minimal system prompt + repair instruction
    analysisSystemPrompt = [
      `You previously returned invalid JSON. Fix ONLY the schema violations listed below.`,
      `Return the corrected complete JSON object — no extra text, no markdown fences.`,
      `\nOriginal system context:\n${config.systemPrompt.slice(0, 500)}`,
    ].join('\n')
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
