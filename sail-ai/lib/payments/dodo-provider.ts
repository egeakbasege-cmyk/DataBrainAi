/**
 * lib/payments/dodo-provider.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Dodo Payments — merchant-of-record provider.
 *
 * Why this exists alongside the other two:
 *   • Lemon Squeezy's store is on a non-activated account, so its API key is
 *     permanently test-mode — checkouts look valid but can never capture money.
 *   • Stripe does not support merchants established in Turkey; that provider is
 *     only usable behind a US/UK entity.
 * Dodo accepts Turkish merchants (including unregistered individuals, verified
 * by national ID) and settles to Turkish bank accounts, while still acting as
 * merchant of record so global VAT/sales-tax filing stays off our plate.
 *
 * Unlike Lemon Squeezy — whose store currency is a single global setting — Dodo
 * prices per buyer region, so a Turkish customer can be billed in TRY while a
 * US customer is billed in USD from the same product.
 *
 * The official SDK is used rather than hand-rolled fetch calls: the checkout
 * payload has a non-obvious shape (`product_cart`, discriminated `customer`
 * union) and guessing it from prose docs is how silent integration bugs happen.
 */

import DodoPayments from 'dodopayments'
import type { CheckoutOptions } from './index'

/**
 * Dodo issues separate keys per environment and routes them to different base
 * URLs. Getting this wrong is the exact failure mode we hit with Lemon Squeezy
 * (a test key silently producing uncapturable checkouts), so the mode is an
 * explicit env var rather than something inferred from the key.
 */
function environment(): 'live_mode' | 'test_mode' {
  return process.env.DODO_ENVIRONMENT?.toLowerCase() === 'test' ? 'test_mode' : 'live_mode'
}

export function isConfigured(): boolean {
  return Boolean(process.env.DODO_PAYMENTS_API_KEY && process.env.DODO_PRODUCT_ID)
}

export function isLiveMode(): boolean {
  return environment() === 'live_mode'
}

let cached: DodoPayments | null = null

function client(): DodoPayments {
  if (!cached) {
    const bearerToken = process.env.DODO_PAYMENTS_API_KEY
    if (!bearerToken) throw new Error('DODO_PAYMENTS_API_KEY is not set.')
    cached = new DodoPayments({ bearerToken, environment: environment() })
  }
  return cached
}

/**
 * Create a hosted checkout session and return its URL.
 *
 * `userId` travels in `metadata` so the webhook can tie the purchase back to an
 * account. It is deliberately *not* treated as an authorisation claim on the
 * receiving end — see the webhook route for why metadata is untrusted input.
 */
export async function createCheckoutUrl(opts: CheckoutOptions): Promise<string> {
  const productId = process.env.DODO_PRODUCT_ID
  if (!productId) throw new Error('DODO_PRODUCT_ID is not set.')

  const session = await client().checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: opts.email },
    return_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { user_id: opts.userId },
    // Cards must always be offered as a fallback; if every listed method is
    // unavailable for the buyer's region the session fails outright.
    allowed_payment_method_types: ['credit', 'debit'],
  })

  if (!session.checkout_url) {
    throw new Error('Dodo returned a session without a checkout URL.')
  }
  return session.checkout_url
}

/**
 * Create a customer-portal link so subscribers can manage or cancel billing.
 *
 * Dodo keys the portal by `customer_id`, but everywhere else in this app a user
 * is identified by email, so the id has to be looked up first. Returns null
 * when the email has never transacted — the caller renders an upgrade prompt
 * instead of a dead link.
 */
export async function createPortalUrl(email: string, returnUrl?: string): Promise<string | null> {
  const dodo = client()

  const matches = await dodo.customers.list({ email, page_size: 1 })
  const customer = matches.items?.[0]
  if (!customer) return null

  const session = await dodo.customers.customerPortal.create(customer.customer_id, {
    return_url: returnUrl,
  })
  return session.link
}
