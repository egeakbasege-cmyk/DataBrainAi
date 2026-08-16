/**
 * Payment provider abstraction.
 *
 * The app supports three interchangeable providers. Which one is active is
 * decided by `PAYMENT_PROVIDER` (`dodo` | `stripe` | `lemonsqueezy`); when
 * unset we auto-select whichever one is fully configured.
 *
 * Why an abstraction: the Lemon Squeezy store was stuck on a non-activated
 * (free-plan) account with a test-mode API key, which produces checkouts that
 * look valid but can never take real money. Being able to flip a single env
 * var removes that as a single point of failure.
 *
 * Preference order is deliberate:
 *   1. Dodo   — merchant of record, accepts Turkish merchants, settles to a
 *               Turkish bank account, and prices per buyer region.
 *   2. Stripe — only viable behind a US/UK entity; Stripe does not onboard
 *               merchants established in Turkey.
 *   3. Lemon Squeezy — retained as a fallback in case its store is activated.
 */

import * as stripeProvider from './stripe-provider'
import * as dodoProvider   from './dodo-provider'
import { createCheckoutUrl as lsCreateCheckoutUrl } from '@/lib/lemonsqueezy'

export type ProviderName = 'dodo' | 'stripe' | 'lemonsqueezy'

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

  if (explicit === 'dodo')         return dodoProvider.isConfigured() ? 'dodo' : null
  if (explicit === 'stripe')       return stripeProvider.isConfigured() ? 'stripe' : null
  if (explicit === 'lemonsqueezy') return lemonSqueezyConfigured() ? 'lemonsqueezy' : null

  // Auto-detect, in the preference order documented above.
  if (dodoProvider.isConfigured())   return 'dodo'
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
    dodo: {
      configured: dodoProvider.isConfigured(),
      liveMode:   dodoProvider.isLiveMode(),
    },
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

  if (provider === 'dodo')   return dodoProvider.createCheckoutUrl(opts)
  if (provider === 'stripe') return stripeProvider.createCheckoutUrl(opts)
  return lsCreateCheckoutUrl(opts)
}
