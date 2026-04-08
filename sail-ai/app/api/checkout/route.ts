import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICE_ID } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || 'http://localhost:3000'

  try {
    const session = await stripe.checkout.sessions.create({
      mode:                'subscription',
      payment_method_types: ['card'],
      line_items: [
        { price: PRICE_ID, quantity: 1 },
      ],
      success_url: `${origin}/chat?pro=1`,
      cancel_url:  `${origin}/pricing`,
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (err: any) {
    console.error('Stripe checkout error:', err.message)
    return NextResponse.json({ error: 'Could not create checkout session.' }, { status: 500 })
  }
}
