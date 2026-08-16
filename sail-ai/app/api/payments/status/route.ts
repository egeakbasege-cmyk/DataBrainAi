/**
 * Payments diagnostics.
 *
 * Answers "why is checkout not taking real money?" without exposing secrets.
 * For Lemon Squeezy it calls `/users/me`, which returns `meta.test_mode` — the
 * exact flag that silently turns every checkout into a test checkout.
 *
 * Auth-gated: signed-in users only.
 */

import { NextResponse }   from 'next/server'
import { auth }           from '@/auth'
import { providerStatus } from '@/lib/payments'
import { lsRequest }      from '@/lib/lemonsqueezy'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const status = providerStatus()
  const issues: string[] = []

  if (!status.active) {
    issues.push('No payment provider is configured. Set DODO_PAYMENTS_API_KEY + DODO_PRODUCT_ID, or STRIPE_SECRET_KEY + STRIPE_PRICE_ID, or the LEMONSQUEEZY_* variables.')
  }

  if (status.active === 'dodo') {
    if (!status.dodo.liveMode) {
      issues.push('Dodo is running in TEST mode (DODO_ENVIRONMENT=test). Real payments require live mode plus a live API key.')
    }
    if (!process.env.DODO_WEBHOOK_SECRET) {
      issues.push('DODO_WEBHOOK_SECRET is missing — the webhook will reject every event, so Pro status will not be granted after payment.')
    }
  }

  if (status.active === 'stripe') {
    if (!status.stripe.liveMode) {
      issues.push('Stripe is using a TEST key (sk_test_…). Real payments require a live key.')
    }
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      issues.push('STRIPE_WEBHOOK_SECRET is missing — Pro status will not be granted after payment.')
    }
  }

  let lemonTestMode: boolean | null = null
  if (status.lemonsqueezy.configured) {
    try {
      const me = await lsRequest<{ meta?: { test_mode?: boolean } }>('/users/me')
      lemonTestMode = me.meta?.test_mode ?? null
      if (lemonTestMode) {
        issues.push('Lemon Squeezy API key is in TEST MODE. Checkouts will not charge real cards. Activate the store and issue a live API key.')
      }
    } catch {
      issues.push('Lemon Squeezy API key was rejected by the API.')
    }
    if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) {
      issues.push('LEMONSQUEEZY_WEBHOOK_SECRET is missing — Pro status will not be granted after payment.')
    }
  }

  return NextResponse.json({
    ...status,
    lemonsqueezy: { ...status.lemonsqueezy, liveMode: lemonTestMode === null ? null : !lemonTestMode },
    healthy: issues.length === 0,
    issues,
  })
}
