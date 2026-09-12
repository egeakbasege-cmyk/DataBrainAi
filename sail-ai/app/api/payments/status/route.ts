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
export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const status = providerStatus()
  const issues: string[] = []

  if (!status.active) {
    issues.push('Dodo Payments is not configured. Set DODO_PAYMENTS_API_KEY and DODO_PRODUCT_ID.')
  }

  if (status.active === 'dodo') {
    if (!status.dodo.liveMode) {
      issues.push('Dodo is running in TEST mode (DODO_ENVIRONMENT=test). Real payments require live mode plus a live API key.')
    }
    if (!process.env.DODO_WEBHOOK_SECRET) {
      issues.push('DODO_WEBHOOK_SECRET is missing — the webhook will reject every event, so Pro status will not be granted after payment.')
    }
  }

  return NextResponse.json({
    ...status,
    healthy: issues.length === 0,
    issues,
  })
}
