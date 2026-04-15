/**
 * Aetheris Executive Response — Schema Validator
 *
 * Enforces the `ExecutiveResponse` JSON contract on every LLM output.
 * The LLM is instructed via system prompt to return valid JSON; this
 * module is the defensive last line that guarantees the client always
 * receives a structurally correct response regardless of model drift.
 *
 * Three-tier enforcement:
 *  1. `validateExecutiveResponse`  — boolean conformance check
 *  2. `sanitiseExecutiveResponse`  — fills missing optional fields; fixes types
 *  3. `buildMockExecutiveResponse` — returns a valid fallback for error paths
 */

import type { ExecutiveResponse, ActionMatrixOption } from '../types/architecture'

// ── Type guards ────────────────────────────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && isFinite(v)
}

function isActionMatrixOption(v: unknown): v is ActionMatrixOption {
  if (!v || typeof v !== 'object') return false
  const o = v as Record<string, unknown>
  return (
    isString(o.id) &&
    isString(o.title) &&
    isString(o.description) &&
    isNumber(o.sectorMedianSuccessRate) &&
    isNumber(o.implementationTimeDays) &&
    isNumber(o.densityScore)
  )
}

// ── Primary validator ──────────────────────────────────────────────────────────

/**
 * Returns true only when the object fully satisfies the `ExecutiveResponse`
 * contract including optional arrays.  Use `sanitiseExecutiveResponse` when
 * you want a repaired version instead of a boolean.
 */
export function validateExecutiveResponse(raw: unknown): raw is ExecutiveResponse {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>

  if (!isString(o.insight)) return false

  if (o.matrixOptions !== undefined) {
    if (!Array.isArray(o.matrixOptions)) return false
    if (!o.matrixOptions.every(isActionMatrixOption)) return false
  }

  if (o.executionHorizons !== undefined) {
    const h = o.executionHorizons as Record<string, unknown>
    if (typeof h !== 'object' || h === null) return false
    for (const key of ['thirtyDays', 'sixtyDays', 'ninetyDays'] as const) {
      if (!Array.isArray(h[key]) || !(h[key] as unknown[]).every(isString)) return false
    }
  }

  return true
}

// ── Sanitiser ─────────────────────────────────────────────────────────────────

/**
 * Attempts to coerce a partially-valid object into a conformant `ExecutiveResponse`.
 * Fills missing fields with safe defaults rather than throwing.
 *
 * Use when the LLM returned parseable JSON but with minor structural drift.
 */
export function sanitiseExecutiveResponse(raw: unknown): ExecutiveResponse {
  const fallback: ExecutiveResponse = {
    insight: 'Analysis complete. See details below.',
  }

  if (!raw || typeof raw !== 'object') return fallback

  const o = raw as Record<string, unknown>

  const insight = isString(o.insight)
    ? o.insight
    : isString((o as Record<string, unknown>).headline)
      ? String((o as Record<string, unknown>).headline)
      : fallback.insight

  const matrixOptions = Array.isArray(o.matrixOptions)
    ? (o.matrixOptions as unknown[]).filter(isActionMatrixOption)
    : undefined

  let executionHorizons: ExecutiveResponse['executionHorizons'] | undefined
  if (o.executionHorizons && typeof o.executionHorizons === 'object') {
    const h = o.executionHorizons as Record<string, unknown>
    const coerceArray = (v: unknown): string[] => {
      if (Array.isArray(v)) return (v as unknown[]).filter(isString)
      if (isString(v)) return [v]
      return []
    }
    executionHorizons = {
      thirtyDays: coerceArray(h.thirtyDays),
      sixtyDays:  coerceArray(h.sixtyDays),
      ninetyDays: coerceArray(h.ninetyDays),
    }
  } else if (o.target30 || o.target60 || o.target90) {
    // Legacy strategy schema → remap to execution horizons
    executionHorizons = {
      thirtyDays: isString(o.target30) ? [o.target30] : [],
      sixtyDays:  isString(o.target60) ? [o.target60] : [],
      ninetyDays: isString(o.target90) ? [o.target90] : [],
    }
  }

  return {
    insight,
    ...(matrixOptions?.length ? { matrixOptions } : {}),
    ...(executionHorizons ? { executionHorizons } : {}),
  }
}

// ── Mock builder ───────────────────────────────────────────────────────────────

/**
 * Returns a structurally valid `ExecutiveResponse` for error and test paths.
 * The UI should render this gracefully in all states — this is the contract.
 */
export function buildMockExecutiveResponse(
  reason: string = 'Analysis temporarily unavailable.',
): ExecutiveResponse {
  return {
    insight: reason,
  }
}

// ── JSON extraction ────────────────────────────────────────────────────────────

/**
 * Extract and parse the first valid JSON object from a raw LLM text response.
 * Handles markdown code fences and leading/trailing prose that the model
 * occasionally emits despite explicit JSON-only instructions.
 */
export function extractJsonFromLLMOutput(text: string): unknown {
  // Strip markdown code fences
  const stripped = text
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```$/im, '')
    .trim()

  // Find the outermost JSON object
  const start = stripped.indexOf('{')
  const end   = stripped.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null

  try {
    return JSON.parse(stripped.slice(start, end + 1))
  } catch {
    return null
  }
}
