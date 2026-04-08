import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export const PRICE_ID = process.env.STRIPE_PRICE_ID!

export const FREE_LIMIT = 5
export const STORAGE_KEY = 'sail_usage'

export interface UsageRecord {
  date:  string   // YYYY-MM-DD
  count: number
}

export function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10)
}
