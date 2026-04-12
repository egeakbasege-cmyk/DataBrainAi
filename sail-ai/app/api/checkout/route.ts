import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/auth'
import { createCheckoutUrl }         from '@/lib/lemonsqueezy'

export async function POST(req: NextRequest) {
  if (!process.env.LEMONSQUEEZY_API_KEY) {
    return NextResponse.json({ error: 'Payments not configured yet.' }, { status: 503 })
  }

  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'You must be signed in to upgrade.' }, { status: 401 })
  }

  const origin = req.headers.get('origin') || 'https://data-brain-ai-sqqu.vercel.app'

  try {
    const url = await createCheckoutUrl({
      email:      session.user.email,
      userId:     (session.user as any).id ?? session.user.email,
      successUrl: `${origin}/chat?pro=1`,
      cancelUrl:  `${origin}/pricing`,
    })
    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('[Checkout] Lemon Squeezy error:', err.message)
    return NextResponse.json({ error: 'Could not create checkout session.' }, { status: 500 })
  }
}
