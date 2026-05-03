/**
 * lib/skills/dataHealthReport.ts
 *
 * Wabi-Sabi Health Report — transparent confidence scoring and audit trail.
 *
 * confidenceScore formula (exact spec):
 *   base  = 1.0
 *   base -= redactedCount * 0.05          // PII penalty per item
 *   base -= emptyFieldRatio * 0.30        // completeness penalty
 *   base += sum(appliedCards.map(c => c.confidenceBoost))  // skill boost
 *   base += researchBoost                 // +0.08 when live data retrieved
 *   confidenceScore = clamp(base, 0.10, 1.00)
 *
 * Stream delimiter (consumed by frontend):
 *   %%HEALTH_REPORT%%{JSON}%%END_REPORT%%\n
 */

import type { SkillCard }    from './skillCards'
import type { SearchResult } from '@/lib/tools/search'
import {
  computeTriangulationLevel,
  computeTriangulationAndConsensus, // [SAIL-GLOBAL-VERACITY-PATCH]
} from '@/lib/tools/search'

// ── Interface ─────────────────────────────────────────────────────────────────

export interface DataHealthReport {
  confidenceScore:    number      // 0.10–1.00
  anomalyLog:         string[]    // human-readable issues detected
  logicTrace:         string      // which cards were used and why
  dataCompleteness:   number      // 0.0–1.0
  piiRedacted:        boolean
  skillsApplied:      string[]    // SkillCard ids
  // ── Research-layer metrics (populated when live search ran) ────────────────
  triangulationLevel?: number     // 1–10: cross-source agreement score
  dataRecency?:        string     // ISO date of the most recently published result
  sourceReliability?:  number     // 0.0–1.0 average domain reliability across results
  researchQueriesUsed?: string[]  // search vectors that were sent
  // ── Universal Intelligence V2 metrics ─────────────────────────────────────
  // [SAIL-UNIVERSAL-INTELLIGENCE-V2]
  languagePurityScore?: number    // 0.0–1.0: 1.0 = bilingual query vectors used, 0.5 = English-only vectors, undefined = no research
  globalDataCoverage?:  boolean   // true = at least one English global query vector was used
  // ── Global Veracity Patch metrics ─────────────────────────────────────────
  // [SAIL-GLOBAL-VERACITY-PATCH]
  isGloballyVerified?:  boolean   // true = ≥3 unique domains AND ≥2 numeric-data sources
  uniqueDomains?:       number    // count of distinct authority domains retrieved
  discrepancyRisk?:     boolean   // sources present but none carry quantitative data
}

// ── Builder params ────────────────────────────────────────────────────────────

export interface DataHealthReportParams {
  /** Number of PII items scrubbed from fileContent */
  redactedCount:    number
  /** Entity type tags from scrubPII() */
  piiTags:          string[]
  /** Cards selected by selectSkillCards() */
  appliedCards:     SkillCard[]
  /** Keywords that triggered each card (parallel array — same index as appliedCards) */
  matchedKeywords:  string[][]
  /**
   * Fields from the request body that are expected but may be absent.
   * Pass an array of [fieldName, value | undefined] tuples.
   * Example: [['context', body.context], ['message', body.message]]
   */
  bodyFields:       [string, string | undefined][]
  // ── Optional: real-time research data (populated by Module 2 research loop) ─
  /** Raw search results for triangulation scoring and recency detection. */
  searchResults?:    SearchResult[]
  /** Search queries sent to the provider (for audit trail). */
  researchQueries?:  string[]
  // ── Universal Intelligence V2 params ──────────────────────────────────────
  // [SAIL-UNIVERSAL-INTELLIGENCE-V2]
  /** Detected query language code ('en' | 'tr' | 'es' | 'de' | 'fr' | 'zh'). */
  queryLanguage?:    string
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * buildDataHealthReport
 *
 * Implements the exact confidence formula from the spec and assembles
 * a fully populated DataHealthReport.
 */
export function buildDataHealthReport(params: DataHealthReportParams): DataHealthReport {
  const {
    redactedCount, piiTags, appliedCards, matchedKeywords, bodyFields,
    searchResults = [], researchQueries = [],
    queryLanguage = 'en',
  } = params

  // ── Completeness ──────────────────────────────────────────────────────────
  const totalFields        = bodyFields.length
  const emptyFields        = bodyFields.filter(([, v]) => !v?.trim()).length
  const emptyFieldRatio    = totalFields > 0 ? emptyFields / totalFields : 0
  const dataCompleteness   = 1.0 - emptyFieldRatio

  // ── Research metrics (only when search results are present) ──────────────
  const hasResearch = searchResults.length > 0

  // [SAIL-GLOBAL-VERACITY-PATCH] Use the richer consensus function which also
  // exposes uniqueDomains, isGloballyVerified, and discrepancyRisk.
  // computeTriangulationLevel is retained for external callers (backward compat).
  const consensus = hasResearch
    ? computeTriangulationAndConsensus(searchResults)
    : undefined
  const triangulationLevel = consensus?.triangulationLevel
  const sourceReliability  = hasResearch
    ? parseFloat(
        (searchResults.reduce((s, r) => s + r.reliabilityScore, 0) / searchResults.length)
          .toFixed(3),
      )
    : undefined
  // Most recent publishedDate among results
  const dataRecency = hasResearch
    ? searchResults
        .map(r => r.publishedDate ?? '')
        .filter(Boolean)
        .sort()
        .at(-1)   // lexicographic sort works for ISO-8601 and YYYY-MM-DD
    : undefined
  // Confidence boost: live research adds +0.08 when results returned
  const researchBoost = hasResearch ? 0.08 : 0

  // ── Universal Intelligence V2 metrics ─────────────────────────────────────
  // [SAIL-UNIVERSAL-INTELLIGENCE-V2]
  // languagePurityScore: 1.0 if non-English query used bilingual vectors (global EN + native),
  //                      0.5 if English-only vectors were used for a non-English query,
  //                      undefined if no research was performed.
  // globalDataCoverage:  true if at least one English-language global vector was issued.
  const isNonEnglish = queryLanguage !== 'en'
  let languagePurityScore: number | undefined
  let globalDataCoverage: boolean | undefined

  if (hasResearch) {
    // A non-English query producing bilingual vectors (EN global + native) scores 1.0.
    // An English query always has globalDataCoverage = true; purity score = 1.0 (no translation risk).
    // A non-English query with only English vectors scores 0.5 (coverage gap).
    const hasNativeVector = isNonEnglish && researchQueries.length >= 2
    languagePurityScore = isNonEnglish
      ? (hasNativeVector ? 1.0 : 0.5)
      : 1.0
    // globalDataCoverage: did we send at least one English-language global query?
    // For non-English: Q1 is always English global. For English: all queries are English.
    globalDataCoverage = true
  }

  // ── Confidence score (extended spec formula) ──────────────────────────────
  let base = 1.0
  base -= redactedCount * 0.05                                          // PII penalty
  base -= emptyFieldRatio * 0.30                                        // completeness penalty
  base += appliedCards.reduce((sum, c) => sum + c.confidenceBoost, 0)   // skill boost
  base += researchBoost                                                  // live data boost
  const confidenceScore = Math.max(0.10, Math.min(1.0, base))

  // ── Anomaly log ───────────────────────────────────────────────────────────
  const anomalyLog: string[] = []

  // PII entries
  for (const tag of piiTags) {
    anomalyLog.push(`PII detected: ${tag}`)
  }

  // Structural: required fields missing across applied cards
  for (let i = 0; i < appliedCards.length; i++) {
    const card = appliedCards[i]
    if (!card.requiresFields) continue
    for (const fieldName of card.requiresFields) {
      const entry = bodyFields.find(([name]) => name === fieldName)
      if (!entry || !entry[1]?.trim()) {
        anomalyLog.push(
          `Missing field '${fieldName}' required by ${card.id} (${card.name})`,
        )
      }
    }
  }

  // General completeness warning
  if (emptyFieldRatio > 0.5) {
    anomalyLog.push(
      `Low data completeness: ${Math.round(dataCompleteness * 100)}% of expected fields provided`,
    )
  }

  // ── Logic trace ───────────────────────────────────────────────────────────
  let logicTrace: string
  if (appliedCards.length === 0) {
    logicTrace = 'No expert methodology matched — general reasoning applied.'
  } else {
    logicTrace = appliedCards
      .map(
        (card, i) =>
          `Applied ${card.id} (${card.name}) — triggered by: ${(matchedKeywords[i] ?? []).join(', ')}`,
      )
      .join(' | ')
  }

  return {
    confidenceScore,
    anomalyLog,
    logicTrace,
    dataCompleteness,
    piiRedacted:          redactedCount > 0,
    skillsApplied:        appliedCards.map((c) => c.id),
    // Research-layer metrics (undefined when no search was performed)
    ...(triangulationLevel !== undefined && { triangulationLevel }),
    ...(dataRecency        !== undefined && { dataRecency }),
    ...(sourceReliability  !== undefined && { sourceReliability }),
    ...(researchQueries.length > 0       && { researchQueriesUsed: researchQueries }),
    // Universal Intelligence V2 metrics [SAIL-UNIVERSAL-INTELLIGENCE-V2]
    ...(languagePurityScore !== undefined && { languagePurityScore }),
    ...(globalDataCoverage  !== undefined && { globalDataCoverage }),
    // Global Veracity Patch metrics [SAIL-GLOBAL-VERACITY-PATCH]
    ...(consensus !== undefined && { isGloballyVerified: consensus.isGloballyVerified }),
    ...(consensus !== undefined && { uniqueDomains:      consensus.uniqueDomains }),
    ...(consensus !== undefined && { discrepancyRisk:    consensus.discrepancyRisk }),
  }
}

// ── Stream helpers ────────────────────────────────────────────────────────────

export const HEALTH_REPORT_START = '%%HEALTH_REPORT%%'
export const HEALTH_REPORT_END   = '%%END_REPORT%%'

/**
 * encodeHealthReport
 *
 * Serialises a DataHealthReport into the stream delimiter format.
 * The frontend splits on the delimiters to extract the JSON independently
 * from the main LLM response.
 */
export function encodeHealthReport(report: DataHealthReport): string {
  return `${HEALTH_REPORT_START}${JSON.stringify(report)}${HEALTH_REPORT_END}\n`
}

/**
 * GOVERNANCE_SYSTEM_SUFFIX
 *
 * Appended to every system prompt so the LLM includes a transparent
 * data health summary at the end of its response.
 */
export const GOVERNANCE_SYSTEM_SUFFIX = `\n\nDATA GOVERNANCE: At the end of your response, include a brief "Data Health" note (1–2 sentences) summarising your confidence score and which methodology you followed. Be transparent about any data limitations.`
