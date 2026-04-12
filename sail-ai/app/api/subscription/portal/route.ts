import { NextResponse }         from 'next/server'
import { auth }                 from '@/auth'
import { lsRequest }            from '@/lib/lemonsqueezy'

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  try {
    // Find the customer by email in Lemon Squeezy
    const customers = await lsRequest<{ data: Array<{ id: string }> }>(
      `/customers?filter[email]=${encodeURIComponent(session.user.email)}&filter[store_id]=${process.env.LEMONSQUEEZY_STORE_ID}`
    )

    const customerId = customers?.data?.[0]?.id
    if (!customerId) {
      return NextResponse.json({ error: 'No subscription found for this account.' }, { status: 404 })
    }

    // Create a customer portal session
    const portal = await lsRequest<{ data: { attributes: { url: string } } }>(
      '/customer-portal-sessions',
      {
        method: 'POST',
        body: JSON.stringify({
          data: {
            type: 'customer-portal-sessions',
            attributes: {},
            relationships: {
              customer: {
                data: { type: 'customers', id: customerId },
              },
            },
          },
        }),
      }
    )

    const url = portal?.data?.attributes?.url
    if (!url) throw new Error('No portal URL returned')

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('[Portal] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
