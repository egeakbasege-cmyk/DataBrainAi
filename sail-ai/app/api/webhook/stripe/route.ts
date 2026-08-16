/**
 * Stripe webhook receiver.
 *
 * Mirrors `app/api/webhook/route.ts` (Lemon Squeezy) so both providers can run
 * side by side during a migration. Stripe signs the *raw* body, so we must read
 * it with `req.text()` and never re-serialise before verification.
 *
 * Configure in the Stripe dashboard:
 *   Endpoint: https://<your-domain>/api/webhook/stripe
 *   Events:   checkout.session.completed,
 *             customer.subscription.created,
 *             customer.subscription.updated,
 *             customer.subscription.deleted
 */

import { NextRequest, NextResponse } from 'next/server'
import type Stripe                   from 'stripe'
import { getStripe }                 from '@/lib/stripe'
import { markPro, revokePro }        from '@/lib/proStore'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Subscription states that should still grant Pro access. */
const ACTIVE_STATUSES = new Set(['active', 'trialing', 'past_due'])

/** Resolve the billing email for a subscription/session via the customer object. */
async function resolveEmail(
  stripe: Stripe,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
  fallback?: string | null,
): Promise<string> {
  if (fallback) return fallback.toLowerCase().trim()
  if (!customer) return ''

  try {
    const id  = typeof customer === 'string' ? customer : customer.id
    const cus = await stripe.customers.retrieve(id)
    if (cus.deleted) return ''
    return (cus.email ?? '').toLowerCase().trim()
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 503 })
  }

  const payload   = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (err) {
    console.warn('[Stripe Webhook] Rejected:', err instanceof Error ? err.message : 'invalid signature')
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  console.log(`[Stripe Webhook] ${event.type} received`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s     = event.data.object as Stripe.Checkout.Session
        const email = await resolveEmail(stripe, s.customer, s.customer_details?.email)
        if (email) markPro(email)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub   = event.data.object as Stripe.Subscription
        const email = await resolveEmail(stripe, sub.customer)
        if (!email) break
        if (ACTIVE_STATUSES.has(sub.status)) markPro(email)
        else                                 revokePro(email)
        break
      }

      case 'customer.subscription.deleted': {
        const sub   = event.data.object as Stripe.Subscription
        const email = await resolveEmail(stripe, sub.customer)
        if (email) revokePro(email)
        break
      }

      default:
        break
    }
  } catch (err) {
    // Returning 500 makes Stripe retry, which is the desired behaviour for
    // transient failures (e.g. database temporarily unavailable).
    console.error('[Stripe Webhook] Handler error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json({ error: 'Handler failed.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
