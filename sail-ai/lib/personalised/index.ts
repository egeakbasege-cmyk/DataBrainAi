/**
 * Personalised AI Engine — public API
 *
 * Streaming usage:
 *   POST /api/chat/personalised
 *   { message, config: { selectedModIds: ['upwind','sail'], baseLanguage: 'tr-TR', hybridName: "Emre'nin AI'sı" } }
 *
 * Market data (generateObject equivalent):
 *   POST /api/chat/personalised
 *   { message, marketDataQuery: true, config: { selectedModIds: ['upwind','trim'], baseLanguage: 'tr-TR' } }
 *   → Returns MarketData validated by MarketDataSchema (estimatedRentMin ≥ 500_000, dataYear ≥ 2026)
 */

export type { IAgentMod, IPersonalisedAIConfig, MarketData, PersonalisedResponse } from './types'
export { MarketDataSchema, PersonalisedResponseSchema } from './types'
export { resolveModsFromIds, resolveModsFromAnalysisModes, getAllMods, ANALYSIS_MODE_TO_MOD_ID } from './mod-registry'
export { generatePersonalisedPrompt, generatePersonalisedPromptFromModes } from './prompt-synthesiser'
export { detectLanguageBleed, applyMarketHallucinationGuard, detectTemporalAnomaly, runGuardrails, validateMarketData } from './guardrails'
