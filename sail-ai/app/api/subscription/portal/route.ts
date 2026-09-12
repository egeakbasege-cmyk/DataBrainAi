import { NextResponse }     from 'next/server'
import { auth }             from '@/auth'
import { activeProvider }   from '@/lib/payments'
import * as dodoProvider    from '@/lib/payments/dodo-provider'

const APP_BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.AUTH_URL ??
  'https://sail-ai.com'
).replace(/\/$/, '')

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const email = session.user.email.toLowerCase()

  try {
    if (activeProvider() === 'dodo') {
      const url = await dodoProvider.createPortalUrl(email, `${APP_BASE_URL}/account`)
      if (!url) {
        return NextResponse.json(
          { error: 'No active subscription found for this account.' },
          { status: 404 },
        )
      }
      return NextResponse.json({ url })
    }
  } catch (err: unknown) {
    // SECURITY: never forward raw upstream provider errors to the browser.
    console.error('[Portal] Error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json(
      { error: 'Could not open the billing portal. Please try again.' },
      { status: 500 },
    )
  }
}
