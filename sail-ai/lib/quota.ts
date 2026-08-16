/**
 * Server-side daily quota enforcement.
 *
 * The free-tier limit was previously enforced only in the browser
 * (`localStorage['sail_usage']`), so clearing site data granted unlimited
 * access to paid AI calls. This module makes the limit authoritative.
 *
 * Design notes:
 *  - Pro users are never rate limited here.
 *  - Anonymous callers are bucketed by IP so the endpoint is not free to abuse.
 *  - If the database is unavailable we fail *open* rather than taking the
 *    product down, but we log loudly so the outage is visible.
 */

import { auth }          from '@/auth'
import { checkPro }      from '@/lib/proStore'
import { FREE_LIMIT }    from '@/lib/stripe'
import type { NextRequest } from 'next/server'

export interface QuotaResult {
  allowed:   boolean
  isPro:     boolean
  used:      number
  limit:     number
  remaining: number
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Atomically increment the caller's usage for today and report whether the
 * request is allowed. Call this once, before doing the expensive work.
 */
export async function consumeQuota(req: NextRequest): Promise<QuotaResult> {
  const session = await auth().catch(() => null)
  const email   = session?.user?.email ?? null

  const isPro = email ? await checkPro(email).catch(() => false) : false
  if (isPro) {
    return { allowed: true, isPro: true, used: 0, limit: Infinity, remaining: Infinity }
  }

  const subject = email
    ? `user:${email.toLowerCase()}`
    : `ip:${clientIp(req)}`

  try {
    const { prisma } = await import('@/lib/prisma')
    const day = todayKey()

    // upsert + increment in a single round trip keeps this race-free under
    // concurrent requests (the unique index on [subject, day] is the guard).
    const row = await prisma.dailyUsage.upsert({
      where:  { subject_day: { subject, day } },
      create: { subject, day, count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    })

    const used = row.count
    return {
      allowed:   used <= FREE_LIMIT,
      isPro:     false,
      used,
      limit:     FREE_LIMIT,
      remaining: Math.max(0, FREE_LIMIT - used),
    }
  } catch (err) {
    console.error('[Quota] Database unavailable, failing open:', err instanceof Error ? err.message : 'unknown')
    return { allowed: true, isPro: false, used: 0, limit: FREE_LIMIT, remaining: FREE_LIMIT }
  }
}

/** Read-only view of today's usage — does not increment. */
export async function peekQuota(req: NextRequest): Promise<QuotaResult> {
  const session = await auth().catch(() => null)
  const email   = session?.user?.email ?? null
  const isPro   = email ? await checkPro(email).catch(() => false) : false

  if (isPro) {
    return { allowed: true, isPro: true, used: 0, limit: Infinity, remaining: Infinity }
  }

  const subject = email ? `user:${email.toLowerCase()}` : `ip:${clientIp(req)}`

  try {
    const { prisma } = await import('@/lib/prisma')
    const row = await prisma.dailyUsage.findUnique({
      where:  { subject_day: { subject, day: todayKey() } },
      select: { count: true },
    })
    const used = row?.count ?? 0
    return {
      allowed:   used < FREE_LIMIT,
      isPro:     false,
      used,
      limit:     FREE_LIMIT,
      remaining: Math.max(0, FREE_LIMIT - used),
    }
  } catch {
    return { allowed: true, isPro: false, used: 0, limit: FREE_LIMIT, remaining: FREE_LIMIT }
  }
}

/** Standard 402 body for a quota-exceeded response. */
export function quotaExceededBody(q: QuotaResult) {
  return {
    error:     `Daily free limit reached (${q.limit}/day). Upgrade to Pro for unlimited analyses.`,
    code:      'QUOTA_EXCEEDED',
    used:      q.used,
    limit:     q.limit,
    upgradeUrl: '/pricing',
  }
}
