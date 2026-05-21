/**
 * lib/pipeline/validator.ts — Layer 3: Deterministic Validator
 * ─────────────────────────────────────────────────────────────
 * Validates raw LLM output against the canonical ValidatedOutput schema.
 * Uses Zod for structure validation, plus deterministic boundary checks.
 *
 * On failure → builds a precise RepairPayload with:
 *   - exact counterexample (the failing excerpt, never a hallucination)
 *   - targeted repair instruction for the repair-loop LLM call
 *
 * No LLM call — pure deterministic checks. Latency: ~1ms.
 */

import { z } from 'zod'
import type {
  ValidatedOutput,
  ValidationResult,
  RepairPayload,
  SchemaViolation,
} from './types'

// ── Zod schema ────────────────────────────────────────────────────────────────

const PrioritySchema   = z.enum(['HIGH', 'MEDIUM', 'LOW'])
const SeveritySchema   = z.enum(['HIGH', 'MEDIUM', 'LOW'])
const EffortSchema     = z.enum(['HIGH', 'MEDIUM', 'LOW'])
const DataSourceSchema = z.enum(['LIVE', 'TRAINING_EST', 'USER_PROVIDED'])

const RecommendationSchema = z.object({
  title:     z.string().min(3, 'title too short'),
  rationale: z.string().min(10, 'rationale too short'),
  priority:  PrioritySchema,
  timeframe: z.string().min(1, 'timeframe required'),
  effort:    EffortSchema,
})

const MetricSchema = z.object({
  name:       z.string().min(1),
  value:      z.string().min(1),
  benchmark:  z.string().optional(),
  source:     DataSourceSchema,
})

const RiskSchema = z.object({
  title:      z.string().min(3),
  severity:   SeveritySchema,
  mitigation: z.string().min(10),
})

export const UnifiedOutputSchema = z.object({
  executiveSummary: z.string().min(10, 'executiveSummary must be ≥10 chars'),
  keyFindings:      z.array(z.string().min(1)).min(1, 'at least 1 keyFinding required'),
  recommendations:  z.array(RecommendationSchema).min(1, 'at least 1 recommendation required'),
  metrics:          z.array(MetricSchema).optional(),
  risks:            z.array(RiskSchema).min(1, 'at least 1 risk required'),
  nextActions:      z.array(z.string().min(1)).min(1, 'at least 1 nextAction required'),
  confidenceScore:  z.number().min(0).max(1, 'confidenceScore must be 0–1'),
  revenueTier:      z.string().min(1),
  timeHorizon:      z.string().min(1),
})

// ── JSON extractor ────────────────────────────────────────────────────────────
// Strips markdown fences, extracts the first valid JSON object.

function extractJSON(raw: string): unknown | null {
  // Strip markdown code fences: ```json ... ``` or ``` ... ```
  let cleaned = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim()

  // Try direct parse first
  try { return JSON.parse(cleaned) } catch { /* fall through */ }

  // Find first { ... } block
  const start = cleaned.indexOf('{')
  const end   = cleaned.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null

  try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { return null }
}

// ── Boundary checks ───────────────────────────────────────────────────────────
// Domain-specific invariants that Zod alone cannot express.

interface BoundaryCheckResult {
  violations: SchemaViolation[]
}

function checkBoundaries(data: ValidatedOutput): BoundaryCheckResult {
  const violations: SchemaViolation[] = []

  // 1. confidenceScore ∈ [0, 1]
  if (data.confidenceScore < 0 || data.confidenceScore > 1) {
    violations.push({
      field:    'confidenceScore',
      rule:     'must be between 0.0 and 1.0 (inclusive)',
      received: data.confidenceScore,
      expected: '0.0 ≤ confidenceScore ≤ 1.0',
    })
  }

  // 2. keyFindings: no duplicates, no empty strings
  const seen = new Set<string>()
  data.keyFindings.forEach((f, i) => {
    const key = f.trim().toLowerCase()
    if (!f.trim()) {
      violations.push({ field: `keyFindings[${i}]`, rule: 'must not be empty', received: f, expected: 'non-empty string' })
    } else if (seen.has(key)) {
      violations.push({ field: `keyFindings[${i}]`, rule: 'duplicate finding', received: f, expected: 'unique string' })
    }
    seen.add(key)
  })

  // 3. recommendations: title must differ from rationale (lazy copy-paste detection)
  data.recommendations.forEach((r, i) => {
    if (r.title.trim().toLowerCase() === r.rationale.trim().toLowerCase()) {
      violations.push({
        field:    `recommendations[${i}].rationale`,
        rule:     'rationale must differ from title',
        received: r.rationale,
        expected: 'distinct explanation of the reasoning',
      })
    }
  })

  // 4. metrics: value must not be empty placeholder
  data.metrics?.forEach((m, i) => {
    if (/^(n\/a|tbd|unknown|\?+|null|undefined)$/i.test(m.value.trim())) {
      violations.push({
        field:    `metrics[${i}].value`,
        rule:     'value must not be a placeholder',
        received: m.value,
        expected: 'a concrete numeric or descriptive value',
      })
    }
  })

  // 5. nextActions: basic non-empty check only.
  // Actionable-verb regex removed — Turkish is agglutinative (uygulayın, takip edin,
  // belirleyin etc.) and \b word-boundary anchors don't work with conjugated forms,
  // causing all TR responses to fail validation. Zod min(3) already prevents empty strings.

  return { violations }
}

// ── Counterexample extractor ──────────────────────────────────────────────────
// Pulls the exact failing excerpt from the raw string — never fabricates.

function buildCounterexample(violations: SchemaViolation[], raw: string): string {
  if (violations.length === 0) return ''

  const v    = violations[0]
  const excerptLen = 200

  // Try to find the field name in raw output for context
  const fieldKey = v.field.split(/[\[.]/)[0]
  const idx      = raw.indexOf(`"${fieldKey}"`)
  if (idx !== -1) {
    return raw.slice(idx, idx + excerptLen).replace(/\n/g, '↵')
  }
  // Fallback: first N chars of raw
  return raw.slice(0, excerptLen).replace(/\n/g, '↵')
}

// ── RepairPayload builder ─────────────────────────────────────────────────────

function buildRepairPayload(
  violations:    SchemaViolation[],
  raw:           string,
  failedSchema:  string,
): RepairPayload {
  const counterexample    = buildCounterexample(violations, raw)
  const violationLines    = violations
    .slice(0, 5)  // cap at 5 for prompt size
    .map(v => `• Field "${v.field}": ${v.rule}. Got: ${JSON.stringify(v.received)}. Expected: ${v.expected}`)
    .join('\n')

  const repairInstruction = [
    `Your previous output had ${violations.length} schema violation(s). Fix ONLY these issues:`,
    '',
    violationLines,
    '',
    `Counterexample (exact failing excerpt from your output):`,
    `"""`,
    counterexample,
    `"""`,
    '',
    `Return the COMPLETE corrected JSON object matching the schema — no extra text, no markdown fences.`,
  ].join('\n')

  return {
    failedSchema,
    violations,
    counterexample,
    repairInstruction,
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export function validateOutput(raw: string): ValidationResult {
  // Step 1: parse JSON
  const parsed = extractJSON(raw)
  if (parsed === null) {
    const violation: SchemaViolation = {
      field:    'root',
      rule:     'must be a valid JSON object',
      received: raw.slice(0, 100),
      expected: 'JSON object matching ValidatedOutput schema',
    }
    return {
      valid:      false,
      violations: [violation],
      repair:     buildRepairPayload([violation], raw, 'JSON_PARSE'),
    }
  }

  // Step 2: Zod schema validation
  const zodResult = UnifiedOutputSchema.safeParse(parsed)
  if (!zodResult.success) {
    const violations: SchemaViolation[] = zodResult.error.issues.map(issue => ({
      field:    issue.path.join('.') || 'root',
      rule:     issue.message,
      received: issue.path.reduce((obj: unknown, key) => {
        if (obj && typeof obj === 'object') return (obj as Record<string | number, unknown>)[key]
        return undefined
      }, parsed),
      expected: issue.code,
    }))
    return {
      valid:      false,
      violations,
      repair:     buildRepairPayload(violations, raw, 'ZOD_SCHEMA'),
    }
  }

  // Step 3: Boundary checks
  const data = zodResult.data as ValidatedOutput
  const { violations } = checkBoundaries(data)
  if (violations.length > 0) {
    return {
      valid:      false,
      data,
      violations,
      repair:     buildRepairPayload(violations, raw, 'BOUNDARY_CHECK'),
    }
  }

  // All checks passed
  return { valid: true, data }
}
