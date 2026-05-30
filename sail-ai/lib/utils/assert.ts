/**
 * lib/utils/assert.ts — Runtime Assertion Utilities
 * ─────────────────────────────────────────────────────────────────────────────
 * Lightweight assertion helpers that surface bugs loudly in development
 * and degrade gracefully (log + noop) in production where appropriate.
 *
 * Never import these in hot paths — they are dev/guard utilities only.
 */

const IS_DEV = process.env.NODE_ENV !== 'production'

// ── Hard assert ───────────────────────────────────────────────────────────────

/**
 * Throw in dev, log in prod.
 * Use for conditions that should NEVER occur in correct code.
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    const err = new Error(`[ASSERT] ${message}`)
    if (IS_DEV) throw err
    console.error(err)
  }
}

// ── Exhaustive check ──────────────────────────────────────────────────────────

/**
 * Compile-time exhaustiveness check for switch/union discriminants.
 *
 * @example
 *   switch (mode) {
 *     case 'upwind': ...
 *     default: assertNever(mode)  // TypeScript error if a case is missing
 *   }
 */
export function assertNever(value: never, label?: string): never {
  throw new Error(`[ASSERT] Unhandled case${label ? ` in ${label}` : ''}: ${JSON.stringify(value)}`)
}

// ── Non-null assertion ────────────────────────────────────────────────────────

/**
 * Narrow T | null | undefined → T.
 * Throws if value is null/undefined.
 */
export function assertDefined<T>(value: T | null | undefined, name?: string): T {
  if (value === null || value === undefined) {
    const msg = name ? `Expected "${name}" to be defined` : 'Expected defined value'
    const err = new Error(`[ASSERT] ${msg}`)
    if (IS_DEV) throw err
    console.error(err)
    return value as T   // prod: silent pass-through
  }
  return value
}

// ── Environment ───────────────────────────────────────────────────────────────

/**
 * Assert that a required environment variable is present.
 * Throws at startup — prevents silent misconfiguration.
 */
export function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`[CONFIG] Required environment variable "${key}" is missing.`)
  }
  return value
}

// ── Type guards ───────────────────────────────────────────────────────────────

export function isString(v: unknown): v is string {
  return typeof v === 'string'
}

export function isNumber(v: unknown): v is number {
  return typeof v === 'number' && !Number.isNaN(v)
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
