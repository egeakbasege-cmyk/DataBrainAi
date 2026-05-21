/**
 * lib/pipeline/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared type contracts for the Sail AI 5-Layer Stateful Pipeline.
 * PipelineState is strictly request-scoped — never shared across requests.
 * All cross-request persistence (if needed) goes through Redis/KV.
 */

import type { SupportedLanguage } from '@/types/architecture'

// ── Revenue Tiers (granular enterprise-grade buckets) ─────────────────────────

export type RevenueTier =
  | '$0–$10k'
  | '$10k–$50k'
  | '$50k–$100k'
  | '$100k–$250k'
  | '$250k–$500k'
  | '$500k+'

// ── Node lifecycle ─────────────────────────────────────────────────────────────

export type NodeStatus = 'PENDING' | 'RUNNING' | 'COMPLETE' | 'FAILED' | 'CIRCUIT_OPEN'

export interface NodeResult<T> {
  success: boolean
  data?:   T
  error?:  PipelineError
}

export interface PipelineError {
  node:      string
  code:      string
  message:   string
  details?:  unknown
  timestamp: number
}

// ── Layer 1 — Semantic Router output ─────────────────────────────────────────

export interface OptimizedIntent {
  originalMessage:   string
  optimizedPrompt:   string
  clarityScore:      number                  // 0.0 – 1.0 (five 0.2-point components)
  injectedDefaults:  Record<string, string>  // ONLY the missing components → surfaces in UI
  detectedDomain:    string
  revenueTier:       RevenueTier
  inferredIndustry:  string
  inferredGoal:      string
  inferredTimeframe: string
  inferredAudience:  string
}

// ── Layer 2 — Stateful Graph (request-scoped) ─────────────────────────────────

/**
 * Lives and dies within a single POST request.
 * Passed by reference through every pipeline node.
 * Never serialised to storage.
 */
export interface PipelineState {
  requestId:        string
  sessionId:        string
  userId:           string
  language:         SupportedLanguage
  analysisMode:     string
  intent:           OptimizedIntent
  retryCount:       Record<string, number>  // nodeId → attempt count
  nodeStatuses:     Record<string, NodeStatus>
  rawLLMOutput:     string | null
  validatedData:    ValidatedOutput | null
  humanizedOutput:  HumanizedResponse | null
  repairPayload:    RepairPayload | null
  repairIterations: number
  errors:           PipelineError[]
  startedAt:        number
}

// ── Layer 3 — Validator types ─────────────────────────────────────────────────

export interface SchemaViolation {
  field:    string
  rule:     string
  received: unknown
  expected: string
}

export interface RepairPayload {
  failedSchema:      string
  violations:        SchemaViolation[]
  counterexample:    string            // exact failing excerpt from raw output
  repairInstruction: string            // precise instruction to the repair LLM call
}

export interface ValidationResult {
  valid:       boolean
  data?:       ValidatedOutput
  violations?: SchemaViolation[]
  repair?:     RepairPayload
}

/** Canonical output shape that all 8 Groq modes must produce. */
export interface ValidatedOutput {
  executiveSummary: string
  keyFindings:      string[]
  recommendations:  Array<{
    title:     string
    rationale: string
    priority:  'HIGH' | 'MEDIUM' | 'LOW'
    timeframe: string
    effort:    'HIGH' | 'MEDIUM' | 'LOW'
  }>
  metrics?: Array<{
    name:       string
    value:      string
    benchmark?: string
    source:     'LIVE' | 'TRAINING_EST' | 'USER_PROVIDED'
  }>
  risks: Array<{
    title:      string
    severity:   'HIGH' | 'MEDIUM' | 'LOW'
    mitigation: string
  }>
  nextActions:     string[]
  confidenceScore: number   // 0.0 – 1.0
  revenueTier:     string
  timeHorizon:     string
}

// ── Layer 4 — Humanizer types ─────────────────────────────────────────────────

export interface HumanizedResponse {
  prose:         string        // executive-grade narrative, no AI fluff
  scopeMetadata: ScopeMetadata
}

// ── Layer 5 — AnalysisScope panel metadata ────────────────────────────────────

export interface ScopeMetadata {
  domain:            string
  segment:           string
  optimizationGoal:  string
  clarityScore:      number
  revenueTier:       string
  inferredIndustry:  string
  inferredTimeframe: string
  injectedDefaults:  Record<string, string>
  analysisMode:      string
  processingMs:      number
  validationPassed:  boolean
  repairIterations:  number
  liveDataUsed:      boolean
  confidenceScore:   number
  /** Adaptive model tier selected for this request (from modelSelector). */
  modelTier?:        'SIMPLE' | 'STANDARD' | 'COMPLEX' | 'CRITICAL'
}

// ── Personalised AI Engine types ─────────────────────────────────────────────
// Canonical interfaces importable by both the orchestration layer and the
// frontend. Kept here (not in personalised-ai.ts) so the pipeline/types barrel
// remains the single source of truth for all cross-layer contracts.

/** The three fixed specialist domains in the Chain of Draft engine. */
export type PersonalisedAISpecialistId = 'financial' | 'strategic' | 'operational'

/**
 * Compact intelligence brief returned by each parallel 8B specialist agent.
 * Schema-enforced via Groq Structured Outputs (JSON_SCHEMAS.specialist_draft).
 */
export interface SpecialistDraft {
  /** Specialist label, e.g. "◈ FINANCIAL LENS". */
  lens:                  string
  /** 2–3 precise sentences carrying at least one specific figure. */
  coreInsight:           string
  /** Single most important metric or number; labelled [est.] if estimated. */
  criticalFigure:        string
  /** One high-leverage action, imperative voice, tied to a metric. */
  primaryRecommendation: string
  /** Agent self-reported confidence (0.0–1.0). */
  confidence:            number
  /** Origin of the data used to produce the draft. */
  dataSource:            'live-research' | 'training-estimate' | 'user-provided' | 'mixed'
}

/**
 * Result of the `executeChainOfDraft()` parallel phase.
 * Partial success (1–2 agents returning drafts) is acceptable.
 */
export interface ChainOfDraftResult {
  /** All drafts that completed within the 2-second wall-clock timeout. */
  drafts:       SpecialistDraft[]
  /** Wall-clock time for the entire parallel phase, in milliseconds. */
  elapsedMs:    number
  /** True when at least one specialist returned a valid draft. */
  parallelMode: boolean
}

/**
 * Per-agent summary emitted in the `__synMeta` SSE event for the frontend.
 * Maintains backward compatibility with the legacy Synergy `agentSummary` shape.
 */
export interface PersonalisedAIAgentSummary {
  /** Lens label, e.g. "◈ FINANCIAL LENS". Maps to legacy `layer` field. */
  layer:      string
  /** Agent self-reported confidence (0.0–1.0). */
  confidence: number
}

/**
 * Full metadata payload emitted as `__synMeta` in the SSE stream.
 * Frontend reads this to populate the agent attribution panel.
 */
export interface PersonalisedAIMeta {
  companyName:   string | null
  healthReport:  unknown
  scopeMetadata: unknown
  agentSummary:  PersonalisedAIAgentSummary[]
  parallelMode:  boolean
  elapsedMs:     number
}

// ── Final pipeline output ─────────────────────────────────────────────────────

export interface PipelineOutput {
  prose:          string
  scopeMetadata:  ScopeMetadata
  structuredData: ValidatedOutput | null  // available for card renderers
}

// ── Orchestrator config ───────────────────────────────────────────────────────

export interface PipelineConfig {
  message:         string
  sessionId:       string
  userId:          string
  language:        SupportedLanguage
  analysisMode:    string
  systemPrompt:    string              // built by the caller (mode-specific)
  researchContext: string              // ragContext from search layer
  groqKeys:        string[]
}
