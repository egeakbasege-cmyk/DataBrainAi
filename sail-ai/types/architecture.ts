/**
 * PROJECT AETHERIS — Data & Types Layer
 *
 * The Aetheris State Engine replaces traditional memory with a
 * Multi-Dimensional Shadow Context that tracks not just conversation
 * history but the *strategic trajectory* of the session.
 */

import type { AnalysisMode } from './chat'

// ── Language & Mode enumerations ───────────────────────────────────────────────

export type SupportedLanguage = 'en' | 'tr' | 'es' | 'de' | 'fr' | 'zh'

/**
 * Capitalised display values (Aetheris convention).
 * Maps to lowercase API contract values in types/chat.ts via `toApiAgentMode()`.
 */
export type AgentMode = 'Auto' | 'Strategy' | 'Analysis' | 'Execution' | 'Review'

/** Normalise Aetheris display AgentMode to the lowercase API wire format. */
export function toApiAgentMode(
  m: AgentMode,
): 'auto' | 'strategy' | 'analysis' | 'execution' | 'review' {
  return m.toLowerCase() as 'auto' | 'strategy' | 'analysis' | 'execution' | 'review'
}

// ── Aetheris Predictive State Engine ──────────────────────────────────────────

/**
 * Top-level session state.
 * Persisted per-user in Supabase; rehydrated on every new message to provide
 * trajectory-aware context before the LLM processes the query.
 */
export interface AetherisState {
  sessionId: string
  userId: string
  /**
   * 0–100.  High index (>70) → AI returns concise, data-only output.
   * Low index (<30) → richer narrative explanation.
   * Derived from recent interaction cadence via `computeCognitiveLoad()`.
   */
  cognitiveLoadIndex: number
  /** Named numeric KPIs the user has provided across the session. */
  baselineMetrics: Record<string, number>
  activeStrategicVectors: StrategicVector[]
  predictiveDriftAlerts: PredictiveAlert[]
}

// ── Strategic Vector ──────────────────────────────────────────────────────────

/**
 * Represents one axis of strategic movement being tracked.
 * e.g. "Market Penetration", "Retention Health", "Cash Burn Velocity".
 */
export interface StrategicVector {
  /** Human-readable dimension label — used for embedding + display. */
  dimension: string
  /** Current rate of change (0–100 normalised scale). */
  currentVelocity: number
  /** Target rate of change required to hit the user's stated goal. */
  targetVelocity: number
  /** Forecasted date when this vector becomes a hard constraint. */
  inflectionPointDate: Date
}

// ── Predictive Drift Alert ────────────────────────────────────────────────────

/**
 * A system-generated alert that fires *before* a metric deviation occurs.
 * The `autonomousMicroPivot` field contains the pre-computed resolution —
 * the system does not just warn, it already has an answer.
 */
export interface PredictiveAlert {
  metric: string
  /** Projected % or absolute deviation from target, expressed as a positive number. */
  forecastedDeviation: number
  /**
   * Concise summary of the vector embedding data that justifies this alert.
   * Never shown to the user verbatim; used by the LLM for grounding.
   */
  shadowContext: string
  /** The pre-resolved action the system recommends. */
  autonomousMicroPivot: ActionMatrixOption
  isResolved: boolean
}

// ── Action Matrix ─────────────────────────────────────────────────────────────

/**
 * A discrete, scored strategic option.
 * Rendered as a high-density data card in the UI (Phase 4).
 */
export interface ActionMatrixOption {
  id: string
  title: string
  description: string
  /** Sector-median probability of success for this action type. 0–1. */
  sectorMedianSuccessRate: number
  /** Realistic execution timeline in calendar days. */
  implementationTimeDays: number
  /**
   * Density score (0–100): ratio of actionable information to total tokens.
   * Higher = more compressed, executable output; lower = more explanatory context.
   */
  densityScore: number
}

// ── Executive Response schema ─────────────────────────────────────────────────

/**
 * Structured output contract for all Aetheris backend responses.
 * The UI renders this as an ActionMatrix card set + horizon timeline.
 */
export interface ExecutiveResponse {
  insight: string
  matrixOptions?: ActionMatrixOption[]
  executionHorizons?: {
    thirtyDays: string[]
    sixtyDays:  string[]
    ninetyDays: string[]
  }
}

// ── Shadow Context persistence record ────────────────────────────────────────

/**
 * Row shape for the `shadow_context` Supabase table.
 * One record per tracked strategic vector per session turn.
 */
export interface ShadowContextRecord {
  id: string
  sessionId: string
  userId: string
  dimension: string
  /** Full narrative context captured at the time of persistence. */
  contextText: string
  /**
   * Condensed summary used as the source text for embedding generation.
   * Keeps the embedding focused on strategic signal rather than verbosity.
   */
  vectorSummary: string
  currentVelocity: number
  targetVelocity: number
  /** ISO 8601 date string (stored as text in Supabase). */
  inflectionPointDate: string
  createdAt: string
}

// ── Aetheris API payload ──────────────────────────────────────────────────────

/**
 * Full payload sent from the Next.js proxy to the Railway backend.
 * Extends the base ChatPayload with Aetheris session state.
 */
export interface AetherisPayload {
  message: string
  sessionId: string
  userId: string
  language: SupportedLanguage
  agentMode: AgentMode
  analysisMode: 'upwind' | 'downwind' | 'sail' | 'trim' | 'catamaran' | 'operator'
  /** Partial snapshot used for trajectory-aware LLM context injection. */
  state?: Partial<AetherisState>
  imageBase64?: string
  imageMimeType?: string
  fileContent?: string
  context?: string
  /** BYOK — user-supplied Groq API key (stored client-side, never persisted server-side). */
  apiKey?: string
}

// ── Cognitive Load computation ────────────────────────────────────────────────

export interface CognitiveLoadInput {
  /** Number of user messages sent in the last 5 minutes. */
  messagesInLastFiveMinutes: number
  /** Mean character count of recent messages. */
  averageMessageLength: number
  /** How many back-to-back replies occurred with < 8s gap. */
  consecutiveRapidExchanges: number
}

/**
 * Derives a Cognitive Load Index (0–100) from interaction telemetry.
 *
 * Algorithm:
 *   - Frequency component: up to 50 pts from message rate
 *   - Brevity component:   up to 30 pts from short messages (inverse of length)
 *   - Rapid-fire bonus:    up to 20 pts from consecutive fast exchanges
 *
 * The backend uses this to modulate AI verbosity without user input.
 */
export function computeCognitiveLoad(input: CognitiveLoadInput): number {
  const frequencyScore = Math.min(input.messagesInLastFiveMinutes * 10, 50)
  const brevityScore   = Math.max(0, 30 - Math.min(input.averageMessageLength / 10, 30))
  const rapidScore     = Math.min(input.consecutiveRapidExchanges * 4, 20)
  return Math.min(Math.round(frequencyScore + brevityScore + rapidScore), 100)
}

// ── Utility: derive verbosity instruction from cognitive load ─────────────────

/**
 * Converts a cognitive load index into a system-prompt verbosity directive.
 * Injected at the top of every Aetheris LLM call.
 */
export function cognitiveLoadDirective(index: number): string {
  if (index >= 70) {
    return 'VERBOSITY: MINIMAL — user is in high-cadence decision mode. Return only data, metrics, and 1-line actions. No prose preamble.\n\n'
  }
  if (index >= 40) {
    return 'VERBOSITY: BALANCED — keep explanations concise. Lead with the metric or decision, follow with one supporting sentence.\n\n'
  }
  return 'VERBOSITY: STANDARD — full analytical depth expected. Use structured sections and cite benchmarks inline.\n\n'
}
