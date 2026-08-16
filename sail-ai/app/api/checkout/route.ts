import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/auth'
import { createCheckout, activeProvider } from '@/lib/payments'

// SECURITY: Never construct redirect URLs from the client-supplied Origin header
// (open-redirect vulnerability). Use the server-side env var exclusively.
const APP_BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.AUTH_URL ??
  'https://sail-ai.com'
).replace(/\/$/, '')

export async function POST(_req: NextRequest) {
  if (!activeProvider()) {
    return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 503 })
  }

  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'You must be signed in to upgrade.' }, { status: 401 })
  }

  try {
    const url = await createCheckout({
      email:      session.user.email,
      userId:     (session.user as { id?: string }).id ?? session.user.email,
      successUrl: `${APP_BASE_URL}/chat?pro=1`,
      cancelUrl:  `${APP_BASE_URL}/pricing`,
    })
    return NextResponse.json({ url })
  } catch (err) {
    console.error('[Checkout] error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Could not create checkout session.' }, { status: 500 })
  }
}
