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
 *   confidenceScore = clamp(base, 0.10, 1.00)
 *
 * Stream delimiter (consumed by frontend):
 *   %%HEALTH_REPORT%%{JSON}%%END_REPORT%%\n
 */

import type { SkillCard } from './skillCards'

// ── Interface ─────────────────────────────────────────────────────────────────

export interface DataHealthReport {
  confidenceScore:   number      // 0.10–1.00
  anomalyLog:        string[]    // human-readable issues detected
  logicTrace:        string      // which cards were used and why
  dataCompleteness:  number      // 0.0–1.0
  piiRedacted:       boolean
  skillsApplied:     string[]    // SkillCard ids
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
}

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * buildDataHealthReport
 *
 * Implements the exact confidence formula from the spec and assembles
 * a fully populated DataHealthReport.
 */
export function buildDataHealthReport(params: DataHealthReportParams): DataHealthReport {
  const { redactedCount, piiTags, appliedCards, matchedKeywords, bodyFields } = params

  // ── Completeness ──────────────────────────────────────────────────────────
  const totalFields   = bodyFields.length
  const emptyFields   = bodyFields.filter(([, v]) => !v?.trim()).length
  const emptyFieldRatio    = totalFields > 0 ? emptyFields / totalFields : 0
  const dataCompleteness   = 1.0 - emptyFieldRatio

  // ── Confidence score (exact spec formula) ─────────────────────────────────
  let base = 1.0
  base -= redactedCount * 0.05                                     // PII penalty
  base -= emptyFieldRatio * 0.30                                   // completeness penalty
  base += appliedCards.reduce((sum, c) => sum + c.confidenceBoost, 0)  // skill boost
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
    piiRedacted: redactedCount > 0,
    skillsApplied: appliedCards.map((c) => c.id),
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
