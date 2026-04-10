import { NextRequest, NextResponse } from 'next/server'
import { getStripe }                  from '@/lib/stripe'
import { markPro, revokePro }         from '@/lib/proStore'
import type Stripe                    from 'stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }

  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  switch (event.type) {

    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const email   = session.customer_email ?? session.customer_details?.email
      if (email) {
        markPro(email)
        console.log('[Webhook] Pro activated:', email)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub      = event.data.object as Stripe.Subscription
      const customer = await getStripe().customers.retrieve(sub.customer as string)
      const email    = (customer as Stripe.Customer).email
      if (email) {
        if (sub.status === 'active' || sub.status === 'trialing') {
          markPro(email)
          console.log('[Webhook] Subscription active:', email)
        } else {
          revokePro(email)
          console.log('[Webhook] Subscription inactive:', email, sub.status)
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub      = event.data.object as Stripe.Subscription
      const customer = await getStripe().customers.retrieve(sub.customer as string)
      const email    = (customer as Stripe.Customer).email
      if (email) {
        revokePro(email)
        console.log('[Webhook] Pro revoked:', email)
      }
      break
    }

    default:
      break
  }

  return NextResponse.json({ received: true })
}
