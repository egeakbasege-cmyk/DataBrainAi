/**
 * PROJECT AETHERIS — Server-side type mirror
 *
 * Identical structural definitions to sail-ai/types/architecture.ts
 * kept in sync manually. The server has its own node_modules and cannot
 * import from the Next.js frontend tree.
 */

export type SupportedLanguage = 'en' | 'tr' | 'es' | 'de' | 'fr' | 'zh'

export type AgentMode = 'Auto' | 'Strategy' | 'Analysis' | 'Execution' | 'Review'

export interface AetherisState {
  sessionId: string
  userId: string
  cognitiveLoadIndex: number
  baselineMetrics: Record<string, number>
  activeStrategicVectors: StrategicVector[]
  predictiveDriftAlerts: PredictiveAlert[]
}

export interface StrategicVector {
  dimension: string
  currentVelocity: number
  targetVelocity: number
  inflectionPointDate: Date
}

export interface PredictiveAlert {
  metric: string
  forecastedDeviation: number
  shadowContext: string
  autonomousMicroPivot: ActionMatrixOption
  isResolved: boolean
}

export interface ActionMatrixOption {
  id: string
  title: string
  description: string
  sectorMedianSuccessRate: number
  implementationTimeDays: number
  densityScore: number
}

export interface ExecutiveResponse {
  insight: string
  matrixOptions?: ActionMatrixOption[]
  executionHorizons?: {
    thirtyDays: string[]
    sixtyDays:  string[]
    ninetyDays: string[]
  }
}

export interface ShadowContextRecord {
  id: string
  sessionId: string
  userId: string
  dimension: string
  contextText: string
  vectorSummary: string
  currentVelocity: number
  targetVelocity: number
  inflectionPointDate: string
  createdAt: string
}

export interface AetherisPayload {
  message: string
  sessionId: string
  userId: string
  language: SupportedLanguage
  agentMode: AgentMode
  analysisMode: 'upwind' | 'downwind'
  state?: Partial<AetherisState>
  imageBase64?: string
  imageMimeType?: string
  fileContent?: string
}

export interface CognitiveLoadInput {
  messagesInLastFiveMinutes: number
  averageMessageLength: number
  consecutiveRapidExchanges: number
}

export function computeCognitiveLoad(input: CognitiveLoadInput): number {
  const frequencyScore = Math.min(input.messagesInLastFiveMinutes * 10, 50)
  const brevityScore   = Math.max(0, 30 - Math.min(input.averageMessageLength / 10, 30))
  const rapidScore     = Math.min(input.consecutiveRapidExchanges * 4, 20)
  return Math.min(Math.round(frequencyScore + brevityScore + rapidScore), 100)
}

export function cognitiveLoadDirective(index: number): string {
  if (index >= 70) {
    return 'VERBOSITY: MINIMAL — user is in high-cadence decision mode. Return only data, metrics, and 1-line actions. No prose preamble.\n\n'
  }
  if (index >= 40) {
    return 'VERBOSITY: BALANCED — keep explanations concise. Lead with the metric or decision, follow with one supporting sentence.\n\n'
  }
  return 'VERBOSITY: STANDARD — full analytical depth expected. Use structured sections and cite benchmarks inline.\n\n'
}
