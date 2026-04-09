import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PRICE_ID } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !PRICE_ID) {
    return NextResponse.json(
      { error: 'Stripe is not configured on this deployment.' },
      { status: 503 },
    )
  }

  const origin = req.headers.get('origin') || 'http://localhost:3000'

  try {
    const session = await getStripe().checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items:           [{ price: PRICE_ID, quantity: 1 }],
      success_url:          `${origin}/chat?pro=1`,
      cancel_url:           `${origin}/pricing`,
    })
    return NextResponse.json({ sessionId: session.id })
  } catch (err: any) {
    console.error('Stripe checkout error:', err.message)
    return NextResponse.json({ error: 'Could not create checkout session.' }, { status: 500 })
  }
}
