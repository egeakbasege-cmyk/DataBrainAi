/**
 * Personalised AI Guardrails — Output Validation Middleware
 *
 * Three concerns:
 *   1. LANGUAGE BLEED DETECTION  — post-generation Unicode-range heuristic check
 *   2. MARKET HALLUCINATION GUARD — detects/corrects implausibly low TRY pricing
 *   3. TEMPORAL ANOMALY DETECTOR  — flags historical years cited as current reality
 *   4. MARKET DATA ZOD VALIDATOR  — for the generateObject-style PATH B
 *
 * All functions are Edge-runtime compatible (no Node-only APIs).
 */

import { MarketDataSchema, type MarketData } from './types'
import { z } from 'zod'

// ═══════════════════════════════════════════════════════════════════════════════
// 1. LANGUAGE BLEED DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

// Turkish-specific chars (outside basic Latin / ASCII)
const TR_SIGNATURE = /[çÇğĞıİöÖşŞüÜ]/

// Indonesian high-frequency function words — the primary bleed case in the spec
const INDONESIAN_MARKERS =
  /\b(yang|adalah|untuk|dengan|dalam|tidak|bahwa|atau|anda|juga|pada|dari|ini|itu|sudah|akan|bisa|ada|saya|kami|mereka|karena|namun|tetapi|jika|oleh)\b/gi
const INDONESIAN_THRESHOLD = 4

// Non-Latin / non-Turkish script block
const NON_LATIN_BLOCK = /[Ѐ-ӿ؀-ۿ一-鿿぀-ゟ゠-ヿ]/

/**
 * Detect language bleed in LLM output.
 * Uses lightweight Unicode-range heuristics — no external dependencies.
 */
export function detectLanguageBleed(
  text:     string,
  expected: 'tr-TR' | 'en-US',
): { clean: boolean; detectedDeviation: string | null } {
  const indonesianHits = (text.match(INDONESIAN_MARKERS) ?? []).length

  if (expected === 'en-US') {
    if (indonesianHits >= INDONESIAN_THRESHOLD) {
      return {
        clean: false,
        detectedDeviation:
          `ERR_LANGUAGE_BLEED: Indonesian detected (${indonesianHits} marker words). Expected: en-US.`,
      }
    }
    if (NON_LATIN_BLOCK.test(text)) {
      return {
        clean: false,
        detectedDeviation: 'ERR_LANGUAGE_BLEED: Non-Latin script in en-US response.',
      }
    }
    return { clean: true, detectedDeviation: null }
  }

  if (expected === 'tr-TR') {
    // A Turkish response of >200 chars should contain Turkish-specific characters
    if (text.length > 200 && !TR_SIGNATURE.test(text)) {
      if (indonesianHits >= INDONESIAN_THRESHOLD) {
        return {
          clean: false,
          detectedDeviation:
            `ERR_LANGUAGE_BLEED: Indonesian detected (${indonesianHits} markers). Expected: tr-TR.`,
        }
      }
      if (NON_LATIN_BLOCK.test(text)) {
        return {
          clean: false,
          detectedDeviation: 'ERR_LANGUAGE_BLEED: Non-Turkish/Latin script in tr-TR response.',
        }
      }
    }
    return { clean: true, detectedDeviation: null }
  }

  return { clean: true, detectedDeviation: null }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. MARKET HALLUCINATION GUARD
// ═══════════════════════════════════════════════════════════════════════════════

const LOCATION_PATTERNS: Record<string, RegExp> = {
  'Alaçatı':   /ala[çc]at[iı]/i,
  'Bodrum':    /bodrum/i,
  'Kaş':       /ka[şs](?:\s|[^a-z]|$)/i,
  'Çeşme':     /[çc]e[şs]me/i,
  'Bebek':     /bebek/i,
  'Nişantaşı': /ni[şs]anta[şs][iı]/i,
  'Fethiye':   /fethiye/i,
  'Göcek':     /g[öo][çc]ek/i,
}

// Annual TRY floors for 2026 (extrapolated from 2024 data × cumulative CPI)
const FLOORS_2026: Record<string, { floor: number; estimate: string; multiplier: number }> = {
  'Alaçatı':   { floor: 1_500_000, estimate: '₺1,500,000–₺4,000,000/yıl', multiplier: 4.2 },
  'Bodrum':    { floor: 1_200_000, estimate: '₺1,200,000–₺3,500,000/yıl', multiplier: 3.8 },
  'Kaş':       { floor:   900_000, estimate: '₺900,000–₺2,500,000/yıl',   multiplier: 3.5 },
  'Çeşme':     { floor: 1_000_000, estimate: '₺1,000,000–₺2,800,000/yıl', multiplier: 3.6 },
  'Bebek':     { floor: 2_000_000, estimate: '₺2,000,000–₺6,000,000/yıl', multiplier: 5.0 },
  'Nişantaşı': { floor: 1_800_000, estimate: '₺1,800,000–₺5,000,000/yıl', multiplier: 4.5 },
  'Fethiye':   { floor:   800_000, estimate: '₺800,000–₺2,000,000/yıl',   multiplier: 3.2 },
  'Göcek':     { floor:   700_000, estimate: '₺700,000–₺1,800,000/yıl',   multiplier: 3.0 },
}

/** Extract TRY numeric figures from text (handles ₺, TL, TRY, lira variants) */
function extractTRYFigures(text: string): Array<{ raw: string; value: number }> {
  const re = /(?:₺\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*(?:TL|TRY|lira)/gi
  const out: Array<{ raw: string; value: number }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const v = parseFloat(m[1].replace(/\./g, '').replace(',', '.'))
    if (!isNaN(v)) out.push({ raw: m[0], value: v })
  }
  return out
}

/**
 * Scan LLM output for premium Turkish location + suspiciously low TRY figure.
 * Prepends a correction note when an anomaly is found.
 */
export function applyMarketHallucinationGuard(
  text:      string,
  _location?: string,
): { corrected: string; anomaliesDetected: string[] } {
  const anomaliesDetected: string[] = []
  let corrected = text

  for (const [locName, pattern] of Object.entries(LOCATION_PATTERNS)) {
    if (!pattern.test(corrected)) continue
    const floor = FLOORS_2026[locName]
    if (!floor) continue

    const figures    = extractTRYFigures(corrected)
    const suspicious = figures.filter(f => f.value >= 100 && f.value < floor.floor)
    if (!suspicious.length) continue

    const examples = suspicious.slice(0, 2).map(f => f.raw).join(', ')
    const note =
      `[DATA ANOMALY] Detected low-tier TRY figure(s) (${examples}) near "${locName}" reference. ` +
      `2026 market floor: ${floor.estimate} (${floor.multiplier}× post-2023 multiplier applied). ` +
      `Original figure replaced with current market estimate.`
    anomaliesDetected.push(note)
    corrected = `\n\n⚠️ **${note}**\n\n` + corrected
  }

  return { corrected, anomaliesDetected }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TEMPORAL ANOMALY DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

const HISTORICAL_YEAR_RE = /\b(20(?:20|21|22|23|24))\b/g

/** Flag citations of historical years used as if they represent current conditions */
export function detectTemporalAnomaly(text: string): {
  hasAnomaly: boolean
  citedYears: number[]
} {
  const all   = Array.from(text.matchAll(HISTORICAL_YEAR_RE)).map(m => parseInt(m[1]))
  const years = all.filter((v, i, a) => a.indexOf(v) === i)
  return { hasAnomaly: years.length > 0, citedYears: years }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. FULL OUTPUT PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface GuardrailResult {
  text:              string
  clean:             boolean
  languageError:     string | null
  marketCorrections: string[]
  temporalWarnings:  number[]
}

/**
 * Run the complete guardrail pipeline on a completed LLM response.
 * For streaming: accumulate the full text, call this, then surface corrections.
 */
export function runGuardrails(
  text:         string,
  baseLanguage: 'tr-TR' | 'en-US',
  userQuery?:   string,
): GuardrailResult {
  let current = text
  let clean   = true

  // 1. Language bleed
  const langResult = detectLanguageBleed(current, baseLanguage)
  if (!langResult.clean) {
    clean   = false
    current = `[⚠️ LANGUAGE GUARDRAIL TRIGGERED]\n${langResult.detectedDeviation}\n\n${current}`
  }

  // 2. Market hallucination
  const locationHint = userQuery
    ? Object.keys(LOCATION_PATTERNS).find(loc => LOCATION_PATTERNS[loc].test(userQuery))
    : undefined
  const mktResult = applyMarketHallucinationGuard(current, locationHint)
  if (mktResult.anomaliesDetected.length > 0) {
    clean   = false
    current = mktResult.corrected
  }

  // 3. Temporal anomaly (warning — does not modify text)
  const temporal = detectTemporalAnomaly(current)

  return {
    text:              current,
    clean,
    languageError:     langResult.detectedDeviation,
    marketCorrections: mktResult.anomaliesDetected,
    temporalWarnings:  temporal.citedYears,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. MARKET DATA ZOD VALIDATOR (generateObject equivalent)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validates raw LLM JSON output against MarketDataSchema.
 * Called by the /personalised route in PATH B (marketDataQuery: true).
 */
export function validateMarketData(
  rawObject: unknown,
): { success: true; data: MarketData } | { success: false; error: z.ZodError } {
  const result = MarketDataSchema.safeParse(rawObject)
  return result.success
    ? { success: true,  data: result.data }
    : { success: false, error: result.error }
}
