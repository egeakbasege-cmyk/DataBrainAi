/**
 * Sail AI — Chat & Agent type definitions
 *
 * AgentMode selects the cognitive routing strategy used by the Railway backend.
 * It refines how the backend retrieves benchmarks, calls tools, and structures
 * the response — it does not override the Upwind/Downwind macro-mode.
 */

export type AgentMode =
  | 'auto'       // System selects the best fit based on input and benchmark data
  | 'strategy'   // Long-term decisions, planning, competitive positioning
  | 'analysis'   // Benchmark comparisons, summaries, document understanding
  | 'execution'  // Action plans, next steps, implementation workflows
  | 'review'     // Quality checks, risk assessment, consistency validation

export type AnalysisMode = 'upwind' | 'downwind' | 'sail'

/** SAIL v2.1 Intent Classification Categories */
export type SailIntentCategory = 'creative' | 'technical' | 'analytic'

/** Result from the SAIL intent classifier */
export interface SailIntentResult {
  intent: SailIntentCategory
  confidence: number
  language: 'tr' | 'en'
  keywords: string[]
  /** MRR tier for analytic routing decisions */
  mrrTier?: 'seed' | 'growth' | 'scale' | 'enterprise'
}

export interface Message {
  role:    'user' | 'assistant'
  content: string
}

/** Payload forwarded verbatim from the Next.js proxy to the Railway backend. */
export interface ChatPayload {
  message:        string
  context?:       string
  apiKey?:        string
  imageBase64?:   string
  imageMimeType?: string
  fileContent?:   string
  mode?:          AnalysisMode
  agentMode?:     AgentMode
  /** Downwind multi-turn: prior exchanges, excluding the current message. */
  messages?:      Message[]
}

/** A single verified data point cited in the response. */
export interface BenchmarkRef {
  source:    string
  dataPoint: string
  value?:    string
}

/** Metadata attached to a structured backend response (non-streaming path). */
export interface ResponseMetadata {
  agentMode:     AgentMode
  analysisMode:  AnalysisMode
  benchmarkRefs: BenchmarkRef[]
  confidence?:   number  // 0–1 float; omitted when not applicable
}

/** Landing-page preview widget local state. */
export interface PreviewState {
  activePresetId: string | null
  agentMode:      AgentMode
}

/** SAIL v2.1 Response Structure for dynamic rendering */
export interface SailResponse {
  content: string
  intent: SailIntentResult
  /** Structured data for analytic intent (charts, tables) */
  chartData?: {
    type: 'line' | 'bar' | 'area' | 'pie'
    data: Array<Record<string, unknown>>
    xKey: string
    yKeys: string[]
    title?: string
  }
  /** Code blocks for technical intent */
  codeBlocks?: Array<{
    language: string
    code: string
    filename?: string
  }>
  /** Executive summary sections for creative intent */
  sections?: Array<{
    title: string
    content: string
    priority: 'high' | 'medium' | 'low'
  }>
}
