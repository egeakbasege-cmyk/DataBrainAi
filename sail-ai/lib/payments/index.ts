/**
 * Payment provider abstraction.
 *
 * Dodo Payments is the only supported checkout provider. Keeping provider
 * selection centralized prevents an accidentally unconfigured fallback from
 * creating a checkout that cannot complete.
 */

import * as dodoProvider from './dodo-provider'

export type ProviderName = 'dodo'

export interface CheckoutOptions {
  email:      string
  userId:     string
  successUrl: string
  cancelUrl:  string
}

/** Resolve Dodo as the only supported payment provider. */
export function activeProvider(): ProviderName | null {
  return dodoProvider.isConfigured() ? 'dodo' : null
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

  }
}

/** Create a hosted checkout URL using the active provider. */
export async function createCheckout(opts: CheckoutOptions): Promise<string> {
  const provider = activeProvider()
  if (!provider) throw new Error('No payment provider is configured.')

  return dodoProvider.createCheckoutUrl(opts)
}
