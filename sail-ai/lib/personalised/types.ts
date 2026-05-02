/**
 * Personalised AI Engine — Type System
 *
 * IAgentMod / IPersonalisedAIConfig interfaces per architecture spec,
 * plus MarketDataSchema (Zod) that enforces 2026-anchored pricing and
 * rejects historical hallucinations at the schema level.
 */

import { z } from 'zod'

// ── 1. Single Agent Mod ────────────────────────────────────────────────────────
export interface IAgentMod {
  /** Unique registry identifier — e.g. 'RUZGARA_KARSI', 'SAIL' */
  id: string
  /** Display name */
  name: string
  /** Concentrated behavioural directive injected into the synthesised prompt */
  systemDirective: string
  /**
   * Relative contribution weight (0–1), assigned by resolveModsFromIds():
   *   2 mods → [0.55, 0.45]
   *   3 mods → [0.45, 0.33, 0.22]
   *   4 mods → [0.40, 0.25, 0.22, 0.13]
   */
  weight: number
  /** Domain expertise tags used for persona fusion */
  domainFocus: string[]
}

// ── 2. Personalised AI Configuration ─────────────────────────────────────────
export interface IPersonalisedAIConfig {
  userId: string
  /** Persona name — e.g. "Emre's Personalised AI" */
  hybridName: string
  /** MIN 2, MAX 4. First mod = dominant (highest weight). */
  selectedMods: IAgentMod[]
  /** Strict output language lock — any deviation is a FATAL guardrail error */
  baseLanguage: 'tr-TR' | 'en-US'
  /** Injected at prompt-build time to prevent model using stale market prices */
  temporalContext: Date
}

// ── 3. MarketDataSchema (Zod) — hard floor guards ─────────────────────────────
//
// Key constraints (per architecture spec):
//   estimatedRentMin ≥ 500_000  → TRY annual floor for premium Turkish locations (2026)
//   dataYear ≥ 2026             → rejects any historical year being cited as current
//
// On validation failure, ZodError.errors[].message IS the human-readable anomaly flag,
// which the route uses in its correction-pass prompt.
export const MarketDataSchema = z.object({
  location: z.string().min(2),

  estimatedRentMin: z.number().min(500_000, {
    message:
      '[DATA ANOMALY] estimatedRentMin is below 2026 market floor for premium Turkish areas ' +
      '(minimum ₺500,000/year). Apply post-2023 inflation multiplier before reporting.',
  }),

  estimatedRentMax: z.number(),

  currency: z.enum(['TRY', 'USD', 'EUR']),

  dataYear: z.number().min(2026, {
    message:
      '[TEMPORAL ANOMALY] dataYear is pre-2026. ' +
      'Extrapolate forward using macro-economic trends and set to current year.',
  }),

  confidenceScore: z.number().min(0).max(1),

  sourceConstraint: z
    .string()
    .describe('Derivation method — must reference the inflation adjustment and multiplier applied.'),

  marketMultiplier: z
    .number()
    .min(1)
    .describe('Post-2023 cumulative inflation/boom multiplier applied to the base figure.'),

  anomalyFlags: z
    .array(z.string())
    .describe('User-supplied figures that violated plausibility checks; empty array if input was clean.'),
})

export type MarketData = z.infer<typeof MarketDataSchema>

// ── 4. Full personalised response schema (non-streaming JSON path) ─────────────
export const PersonalisedResponseSchema = z.object({
  hybridInsight: z.string().min(20),
  dominantModSignal: z.string(),
  executionMatrix: z
    .array(
      z.object({
        id: z.string(),
        title: z.string().max(80),
        description: z.string(),
        modSource: z.string().describe('Which mod contributed this action'),
        sectorMedianSuccessRate: z.number().min(0).max(1),
        implementationTimeDays: z.number().int().positive(),
        densityScore: z.number().int().min(0).max(100),
      }),
    )
    .min(2)
    .max(4),
  executionHorizons: z.object({
    thirtyDays: z.array(z.string()).min(1).max(4),
    sixtyDays:  z.array(z.string()).min(1).max(4),
    ninetyDays: z.array(z.string()).min(1).max(4),
  }),
  confidenceIndex: z.object({
    score:     z.number().min(0).max(1),
    rationale: z.string(),
  }),
  marketData:      MarketDataSchema.optional(),
  languageVerified: z.boolean(),
  temporalAnchor:  z.string(),
})

export type PersonalisedResponse = z.infer<typeof PersonalisedResponseSchema>

// ── 5. API request body ───────────────────────────────────────────────────────
export interface PersonalisedRequestBody {
  message: string
  config: {
    userId?:         string
    hybridName?:     string
    /** Registry IDs ('RUZGARA_KARSI') or mode names ('upwind') — both accepted */
    selectedModIds:  string[]
    baseLanguage?:   'tr-TR' | 'en-US'
  }
  /** true → PATH B: structured JSON with MarketDataSchema Zod validation */
  marketDataQuery?: boolean
  fileContent?:     string
  imageBase64?:     string
  imageMimeType?:   string
  apiKey?:          string
}
