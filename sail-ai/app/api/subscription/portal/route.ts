import { NextResponse }  from 'next/server'
import { auth }          from '@/auth'
import { lsRequest }     from '@/lib/lemonsqueezy'

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  try {
    const email    = session.user.email
    const storeId  = process.env.LEMONSQUEEZY_STORE_ID ?? ''

    // Find active subscription by user email
    const res = await lsRequest<{
      data: Array<{
        attributes: {
          user_email: string
          status:     string
          urls:       { customer_portal: string }
        }
      }>
    }>(`/subscriptions?filter[store_id]=${storeId}&sort=-createdAt`)

    const sub = res.data?.find(
      s => s.attributes.user_email?.toLowerCase() === email.toLowerCase()
    )

    const portalUrl = sub?.attributes?.urls?.customer_portal
    if (!portalUrl) {
      return NextResponse.json({ error: 'No active subscription found.' }, { status: 404 })
    }

    return NextResponse.json({ url: portalUrl })
  } catch (err: any) {
    console.error('[Portal] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
