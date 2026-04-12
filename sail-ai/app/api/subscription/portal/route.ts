import { NextResponse }  from 'next/server'
import { auth }          from '@/auth'
import { lsRequest }     from '@/lib/lemonsqueezy'

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  try {
    const email = session.user.email.toLowerCase()

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
      // Fallback: send user to LS billing page directly
      const storeSlug = 'sail-ai'
      return NextResponse.json({ url: `https://${storeSlug}.lemonsqueezy.com/billing` })
    }

    return NextResponse.json({ url: portalUrl })
  } catch (err: any) {
    console.error('[Portal] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
