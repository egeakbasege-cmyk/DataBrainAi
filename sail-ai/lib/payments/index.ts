/**
 * Payment provider abstraction.
 *
 * The app supports two interchangeable providers. Which one is active is
 * decided by `PAYMENT_PROVIDER` (`stripe` | `lemonsqueezy`); when unset we
 * auto-select whichever one is fully configured, preferring Stripe.
 *
 * Why an abstraction: the Lemon Squeezy store was stuck on a non-activated
 * (free-plan) account with a test-mode API key, which produces checkouts that
 * look valid but can never take real money. Being able to flip a single env
 * var to Stripe removes that as a single point of failure.
 */

import * as stripeProvider from './stripe-provider'
import { createCheckoutUrl as lsCreateCheckoutUrl } from '@/lib/lemonsqueezy'

export type ProviderName = 'stripe' | 'lemonsqueezy'

export interface CheckoutOptions {
  email:      string
  userId:     string
  successUrl: string
  cancelUrl:  string
}

function lemonSqueezyConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
    process.env.LEMONSQUEEZY_STORE_ID &&
    process.env.LEMONSQUEEZY_VARIANT_ID,
  )
}

/** Resolve the provider that should handle checkout right now. */
export function activeProvider(): ProviderName | null {
  const explicit = process.env.PAYMENT_PROVIDER?.toLowerCase()

  if (explicit === 'stripe')       return stripeProvider.isConfigured() ? 'stripe' : null
  if (explicit === 'lemonsqueezy') return lemonSqueezyConfigured() ? 'lemonsqueezy' : null

  // Auto-detect: Stripe wins when both are available.
  if (stripeProvider.isConfigured()) return 'stripe'
  if (lemonSqueezyConfigured())      return 'lemonsqueezy'
  return null
}

/**
 * Diagnostics for the admin/health surface. Never returns secrets — only
 * whether each provider is usable and whether it is in live mode.
 */
export function providerStatus() {
  return {
    active: activeProvider(),
    stripe: {
      configured: stripeProvider.isConfigured(),
      liveMode:   stripeProvider.isLiveMode(),
    },
    lemonsqueezy: {
      configured: lemonSqueezyConfigured(),
      // Lemon Squeezy does not expose mode via env; it is a property of the
      // API key and can only be confirmed by calling /users/me.
      liveMode:   null as boolean | null,
    },
  }
}

/** Create a hosted checkout URL using the active provider. */
export async function createCheckout(opts: CheckoutOptions): Promise<string> {
  const provider = activeProvider()
  if (!provider) throw new Error('No payment provider is configured.')

  return provider === 'stripe'
    ? stripeProvider.createCheckoutUrl(opts)
    : lsCreateCheckoutUrl(opts)
}
