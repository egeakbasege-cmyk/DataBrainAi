import { NextResponse }     from 'next/server'
import { auth }             from '@/auth'
import { lsRequest }        from '@/lib/lemonsqueezy'
import { activeProvider }   from '@/lib/payments'
import { createPortalUrl }  from '@/lib/payments/stripe-provider'
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

    if (activeProvider() === 'stripe') {
      const url = await createPortalUrl({
        email,
        returnUrl: `${APP_BASE_URL}/account`,
      })
      if (!url) {
        return NextResponse.json(
          { error: 'No active subscription found for this account.' },
          { status: 404 },
        )
      }
      return NextResponse.json({ url })
    }

    // ── Lemon Squeezy ───────────────────────────────────────────────────────
    // List all subscriptions and find by email (LS bracket-filter is unreliable)
    const res = await lsRequest<{
      data: Array<{
        attributes: {
          user_email: string
          status:     string
          urls:       { customer_portal: string }
        }
      }>
    }>('/subscriptions?sort=-createdAt&page[size]=50')

    const sub = res.data?.find(
      s => s.attributes.user_email?.toLowerCase() === email
    )

    const portalUrl = sub?.attributes?.urls?.customer_portal
    if (!portalUrl) {
      // Fallback: send user to the store billing page. Slug is configurable so a
      // store rename does not require a code change.
      const storeSlug = process.env.LEMONSQUEEZY_STORE_SLUG ?? 'sail-ai'
      return NextResponse.json({ url: `https://${storeSlug}.lemonsqueezy.com/billing` })
    }

    return NextResponse.json({ url: portalUrl })
  } catch (err: unknown) {
    // SECURITY: never forward raw upstream provider errors to the browser.
    console.error('[Portal] Error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json(
      { error: 'Could not open the billing portal. Please try again.' },
      { status: 500 },
    )
  }
}
