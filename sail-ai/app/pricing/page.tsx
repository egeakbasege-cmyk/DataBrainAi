'use client'

import Link from 'next/link'
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Nav } from '@/components/Nav'
import { FREE_LIMIT } from '@/lib/stripe'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

const FREE_FEATURES = [
  `${FREE_LIMIT} analyses per day`,
  'Full strategy output',
  'Industry benchmarks',
  '3-step action plan',
]

const PRO_FEATURES = [
  'Unlimited analyses per day',
  'Priority response time',
  'Full strategy output',
  'Industry benchmarks',
  '3-step action plan',
  'Early access to new features',
  'Cancel any time',
]

export default function PricingPage() {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    if (!stripePromise) { alert('Payments not configured yet.'); return }
    setLoading(true)
    try {
      const res    = await fetch('/api/checkout', { method: 'POST' })
      const data   = await res.json()
      if (data.error) throw new Error(data.error)
      const stripe = await stripePromise
      await stripe?.redirectToCheckout({ sessionId: data.sessionId })
    } catch (err: any) {
      console.error('Checkout error:', err.message)
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen" style={{ background: '#0A0F1E' }}>
      <Nav />

      <section className="max-w-4xl mx-auto px-6 md:px-10 pt-20 pb-32">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-xs font-medium uppercase tracking-widest block mb-4" style={{ color: '#94A3B8' }}>Pricing</span>
          <h1 className="font-bold mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.03em', color: '#F1F5F9' }}>
            Simple, honest pricing
          </h1>
          <p className="text-base" style={{ color: '#94A3B8', maxWidth: '36ch', margin: '0 auto' }}>
            Start free. Upgrade when you need more.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Free */}
          <div className="rounded-card p-8" style={{ background: '#111827', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#94A3B8' }}>Free</p>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="font-bold text-4xl" style={{ color: '#F1F5F9' }}>$0</span>
              <span className="text-sm" style={{ color: '#94A3B8' }}>forever</span>
            </div>
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#CBD5E1' }}>
                  <span style={{ color: '#94A3B8' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <Link
              href="/chat"
              className="block w-full text-center py-3 rounded-pill text-sm font-semibold transition-colors"
              style={{ background: 'rgba(255,255,255,0.07)', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div
            className="rounded-card p-8 relative overflow-hidden"
            style={{ background: '#111827', border: '1px solid rgba(192,57,43,0.35)', boxShadow: '0 0 40px rgba(192,57,43,0.12)' }}
          >
            {/* Crimson bar */}
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: 'linear-gradient(90deg, #C0392B, rgba(192,57,43,0.1))' }} />

            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C0392B' }}>Pro</p>
              <span
                className="text-xs font-medium px-2.5 py-0.5 rounded-pill"
                style={{ background: 'rgba(192,57,43,0.1)', color: '#C0392B', border: '1px solid rgba(192,57,43,0.25)' }}
              >
                Most popular
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-6">
              <span className="font-bold text-4xl" style={{ color: '#F1F5F9' }}>$4</span>
              <span className="text-sm" style={{ color: '#94A3B8' }}>/month</span>
            </div>

            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#CBD5E1' }}>
                  <span style={{ color: '#C0392B' }}>✓</span> {f}
                </li>
              ))}
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="block w-full text-center py-3 rounded-pill text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: '#C0392B', color: '#F1F5F9', boxShadow: '0 0 20px rgba(192,57,43,0.35)' }}
            >
              {loading ? 'Redirecting…' : 'Upgrade to Pro →'}
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <h2 className="font-semibold text-lg mb-8" style={{ color: '#F1F5F9' }}>FAQ</h2>
          <div className="space-y-6">
            {[
              { q: 'How does the free tier work?', a: `You get ${FREE_LIMIT} full strategy analyses per day at no cost. Reset every midnight.` },
              { q: 'What does Pro include?', a: 'Unlimited analyses per day, faster responses, and early access to every new feature we ship.' },
              { q: 'Can I cancel anytime?', a: 'Yes — cancel from the Stripe customer portal with one click. No questions asked.' },
              { q: 'Is my business data stored?', a: 'No. Sail AI processes your input in real time and does not persist your business details.' },
            ].map((faq) => (
              <div key={faq.q} className="rounded-card p-5" style={{ background: 'rgba(17,24,39,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="font-semibold text-sm mb-2" style={{ color: '#F1F5F9' }}>{faq.q}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
