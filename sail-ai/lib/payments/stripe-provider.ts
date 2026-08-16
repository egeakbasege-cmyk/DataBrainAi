/**
 * Stripe payment provider.
 *
 * Used as the alternative (and recommended primary) provider to Lemon Squeezy.
 * Unlike Lemon Squeezy — which requires store activation before live mode and
 * silently issues *test* checkouts while the account is still in test mode —
 * Stripe exposes live/test state explicitly through the API key prefix
 * (`sk_live_` vs `sk_test_`), so misconfiguration is detectable at runtime.
 */

import { getStripe } from '@/lib/stripe'

/** True when the configured secret key is a live-mode key. */
export function isLiveMode(): boolean {
  return (process.env.STRIPE_SECRET_KEY ?? '').startsWith('sk_live_')
}

export function isConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID)
}

/**
 * Find an existing Stripe customer for this email, or create one.
 * Keeping one customer per email is what lets the billing portal and the
 * `proStore` Stripe fallback resolve subscriptions reliably.
 */
async function resolveCustomerId(email: string, userId: string): Promise<string> {
  const stripe = getStripe()
  const { data } = await stripe.customers.list({ email, limit: 1 })
  if (data.length > 0) return data[0].id

  const created = await stripe.customers.create({
    email,
    metadata: { user_id: userId },
  })
  return created.id
}

/** Create a Stripe Checkout Session and return its hosted URL. */
export async function createCheckoutUrl(opts: {
  email:      string
  userId:     string
  successUrl: string
  cancelUrl:  string
}): Promise<string> {
  const priceId = process.env.STRIPE_PRICE_ID
  if (!priceId) throw new Error('STRIPE_PRICE_ID is not configured.')

  const stripe     = getStripe()
  const customerId = await resolveCustomerId(opts.email, opts.userId)

  const session = await stripe.checkout.sessions.create({
    mode:                 'subscription',
    customer:             customerId,
    line_items:           [{ price: priceId, quantity: 1 }],
    success_url:          opts.successUrl,
    cancel_url:           opts.cancelUrl,
    allow_promotion_codes: true,
    // Mirrored on both the session and the subscription so the webhook can
    // always recover the originating user regardless of which event fires.
    client_reference_id:  opts.userId,
    metadata:             { user_id: opts.userId, user_email: opts.email },
    subscription_data:    { metadata: { user_id: opts.userId, user_email: opts.email } },
  })

  if (!session.url) throw new Error('Stripe did not return a checkout URL.')
  return session.url
}

/** Create a Stripe Billing Portal session so users can manage/cancel. */
export async function createPortalUrl(opts: {
  email:     string
  returnUrl: string
}): Promise<string | null> {
  const stripe   = getStripe()
  const { data } = await stripe.customers.list({ email: opts.email, limit: 1 })
  if (data.length === 0) return null

  const portal = await stripe.billingPortal.sessions.create({
    customer:   data[0].id,
    return_url: opts.returnUrl,
  })
  return portal.url
}
