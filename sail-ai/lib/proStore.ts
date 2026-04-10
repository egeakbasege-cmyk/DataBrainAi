/**
 * Server-side Pro status store — three-layer lookup:
 *   1. In-memory cache (instant, resets on cold start)
 *   2. Prisma / PostgreSQL (persists across restarts)
 *   3. Stripe API (source of truth, queried on full miss)
 */

import Stripe from 'stripe'

// ── In-memory cache ────────────────────────────────────────────────
const proSet  = new Set<string>()
const freeSet = new Set<string>()
const CACHE_TTL = 60 * 60 * 1000     // 1 hour

const proTs  = new Map<string, number>()
const freeTs = new Map<string, number>()

function cacheValid(ts: number | undefined) {
  return ts !== undefined && Date.now() - ts < CACHE_TTL
}

// ── Stripe helpers ─────────────────────────────────────────────────
let _stripe: Stripe | null = null

function stripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
  return _stripe
}

async function queryStripe(email: string): Promise<boolean> {
  const s = stripeClient()
  if (!s) return false
  try {
    const { data: customers } = await s.customers.list({ email, limit: 1 })
    if (!customers.length) return false
    const { data: subs } = await s.subscriptions.list({
      customer: customers[0].id,
      status:   'active',
      limit:    1,
    })
    return subs.length > 0
  } catch {
    return false
  }
}

// ── Prisma helpers (imported lazily to avoid Edge issues) ──────────
async function dbSetPro(email: string, isPro: boolean) {
  try {
    const { prisma } = await import('@/lib/prisma')
    await prisma.user.updateMany({ where: { email }, data: { isPro } })
  } catch { /* DB may not be configured */ }
}

async function dbCheckPro(email: string): Promise<boolean | null> {
  try {
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({ where: { email }, select: { isPro: true } })
    return user?.isPro ?? null
  } catch {
    return null
  }
}

// ── Public API ─────────────────────────────────────────────────────

/** Mark an email as Pro immediately (called from Stripe webhook). */
export function markPro(email: string) {
  const e = email.toLowerCase()
  proSet.add(e);  proTs.set(e, Date.now())
  freeSet.delete(e); freeTs.delete(e)
  // Persist to DB async — do not await to keep webhook response fast
  dbSetPro(e, true).catch(() => undefined)
}

/** Remove Pro status (subscription cancelled / expired). */
export function revokePro(email: string) {
  const e = email.toLowerCase()
  proSet.delete(e);  proTs.delete(e)
  freeSet.add(e);  freeTs.set(e, Date.now())
  dbSetPro(e, false).catch(() => undefined)
}

/**
 * Check if an email has an active Pro subscription.
 * Memory → DB → Stripe fallback.
 */
export async function checkPro(email: string): Promise<boolean> {
  if (!email) return false
  const e = email.toLowerCase()

  // 1. Memory cache
  if (proSet.has(e)  && cacheValid(proTs.get(e)))  return true
  if (freeSet.has(e) && cacheValid(freeTs.get(e))) return false

  // 2. Database
  const dbResult = await dbCheckPro(e)
  if (dbResult === true)  { proSet.add(e);  proTs.set(e, Date.now());  return true  }
  if (dbResult === false) { freeSet.add(e); freeTs.set(e, Date.now()); return false }

  // 3. Stripe (source of truth)
  const stripeResult = await queryStripe(e)
  if (stripeResult) { markPro(e) } else { freeSet.add(e); freeTs.set(e, Date.now()) }
  return stripeResult
}
