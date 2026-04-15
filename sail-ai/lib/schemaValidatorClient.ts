/**
 * Client-side ExecutiveResponse schema validator
 *
 * Mirrors the logic in server/src/lib/schemaValidator.ts using the
 * frontend type path (@/types/architecture).  Used by useAetherisSubmit
 * to enforce schema integrity before rendering.
 */

import type { ExecutiveResponse, ActionMatrixOption } from '@/types/architecture'

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

export function validateExecutiveResponse(raw: unknown): raw is ExecutiveResponse {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  if (!isString(o.insight)) return false
  if (o.matrixOptions !== undefined) {
    if (!Array.isArray(o.matrixOptions)) return false
    if (!(o.matrixOptions as unknown[]).every(isActionMatrixOption)) return false
  }
  if (o.executionHorizons !== undefined) {
    const h = o.executionHorizons as Record<string, unknown>
    if (typeof h !== 'object' || h === null) return false
    for (const key of ['thirtyDays', 'sixtyDays', 'ninetyDays']) {
      if (!Array.isArray(h[key]) || !(h[key] as unknown[]).every(isString)) return false
    }
  }
  return true
}

export function sanitiseExecutiveResponse(raw: unknown): ExecutiveResponse {
  const fallback: ExecutiveResponse = { insight: 'Analysis complete.' }
  if (!raw || typeof raw !== 'object') return fallback
  const o = raw as Record<string, unknown>

  const insight = isString(o.insight)
    ? o.insight
    : isString(o.headline) ? String(o.headline) : fallback.insight

  const matrixOptions = Array.isArray(o.matrixOptions)
    ? (o.matrixOptions as unknown[]).filter(isActionMatrixOption)
    : undefined

  let executionHorizons: ExecutiveResponse['executionHorizons'] | undefined
  if (o.executionHorizons && typeof o.executionHorizons === 'object') {
    const h = o.executionHorizons as Record<string, unknown>
    const coerce = (v: unknown): string[] =>
      Array.isArray(v) ? (v as unknown[]).filter(isString) : isString(v) ? [v] : []
    executionHorizons = {
      thirtyDays: coerce(h.thirtyDays),
      sixtyDays:  coerce(h.sixtyDays),
      ninetyDays: coerce(h.ninetyDays),
    }
  } else if (o.target30 || o.target60 || o.target90) {
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

export function buildMockExecutiveResponse(reason = 'Service temporarily unavailable.'): ExecutiveResponse {
  return {
    insight: reason,
    matrixOptions: [{
      id:                      'mock-retry',
      title:                   'Retry analysis',
      description:             'Submit your query again — transient errors typically resolve within one retry.',
      sectorMedianSuccessRate: 0.9,
      implementationTimeDays:  0,
      densityScore:            80,
    }],
    executionHorizons: {
      thirtyDays: ['Resubmit with the same input for an immediate retry.'],
      sixtyDays:  ['Review your input for completeness if the issue persists.'],
      ninetyDays: ['Contact support if errors continue beyond three retries.'],
    },
  }
}
