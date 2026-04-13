import Stripe from 'stripe'

// Lazy singleton — avoids crashing at build time if key is not yet set
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not configured.')
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-09-30.acacia' as Stripe.LatestApiVersion })
  }
  return _stripe
}

export const PRICE_ID   = process.env.STRIPE_PRICE_ID ?? ''
export const FREE_LIMIT = 5
export const STORAGE_KEY = 'sail_usage'

export interface UsageRecord {
  date:  string   // YYYY-MM-DD
  count: number
}

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}
