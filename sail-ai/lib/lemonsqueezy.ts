import crypto from 'crypto'

export const LS_API_URL  = 'https://api.lemonsqueezy.com/v1'
export const FREE_LIMIT  = 5
export const STORAGE_KEY = 'sail_usage'

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function lsRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY
  if (!apiKey) throw new Error('LEMONSQUEEZY_API_KEY is not configured.')

  const res = await fetch(`${LS_API_URL}${path}`, {
    ...options,
    headers: {
      'Accept':        'application/vnd.api+json',
      'Content-Type':  'application/vnd.api+json',
      'Authorization': `Bearer ${apiKey}`,
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Lemon Squeezy API error ${res.status}: ${body}`)
  }

  return res.json() as Promise<T>
}

/**
 * Create a checkout URL for the Pro subscription.
 * Returns the URL to redirect the user to.
 */
export async function createCheckoutUrl(opts: {
  email:       string
  userId:      string
  successUrl:  string
  cancelUrl:   string
}): Promise<string> {
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID
  const storeId   = process.env.LEMONSQUEEZY_STORE_ID
  if (!variantId || !storeId) {
    throw new Error('LEMONSQUEEZY_VARIANT_ID or LEMONSQUEEZY_STORE_ID is not configured.')
  }

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email:       opts.email,
          custom:      { user_id: opts.userId, user_email: opts.email },
        },
        product_options: {
          redirect_url: opts.successUrl,
        },
        checkout_options: {
          dark: false,
        },
        expires_at: null,
      },
      relationships: {
        store: {
          data: { type: 'stores', id: storeId },
        },
        variant: {
          data: { type: 'variants', id: variantId },
        },
      },
    },
  }

  const res = await lsRequest<{ data: { attributes: { url: string } } }>(
    '/checkouts',
    { method: 'POST', body: JSON.stringify(body) },
  )

  return res.data.attributes.url
}

/**
 * Verify Lemon Squeezy webhook signature.
 * Returns true if valid.
 */
export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  if (!secret) return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}
