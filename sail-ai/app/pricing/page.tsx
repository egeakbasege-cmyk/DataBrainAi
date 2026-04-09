'use client'

import Link from 'next/link'
import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Nav } from '@/components/Nav'
import { OrnamentRule, CompassRose } from '@/components/Ornaments'
import { FREE_LIMIT } from '@/lib/stripe'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

const FREE_FEATURES = [`${FREE_LIMIT} analyses per day`, 'Full strategy output', 'Industry benchmarks', '3-step action plan']
const PRO_FEATURES  = ['Unlimited analyses per day', 'Priority response time', 'Full strategy output', 'Industry benchmarks', '3-step action plan', 'Early access to new features', 'Cancel any time']

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
    <main style={{ background: '#FAFAF5' }}>
      <Nav />

      <section className="max-w-4xl mx-auto px-6 md:px-10 pt-20 pb-32">

        {/* Header */}
        <div className="text-center mb-16">
          <span className="label-caps block mb-5">Membership</span>
          <h1
            className="font-serif italic mb-4"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#1A1814', letterSpacing: '-0.025em' }}
          >
            Simple, honest pricing
          </h1>
          <p className="text-sm" style={{ color: '#7A7062', fontFamily: 'Jost', maxWidth: '34ch', margin: '0 auto', fontWeight: 300 }}>
            Start complimentary. Upgrade when you need more.
          </p>
        </div>

        <OrnamentRule />

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 mt-10">

          {/* Free */}
          <div className="card-cream p-8">
            <span className="label-caps block mb-6" style={{ color: '#7A7062' }}>Complimentary</span>
            <div className="flex items-baseline gap-2 mb-8">
              <span className="font-serif font-bold" style={{ fontSize: '3rem', color: '#1A1814', lineHeight: 1 }}>$0</span>
              <span className="text-sm" style={{ color: '#7A7062', fontFamily: 'Jost' }}>forever</span>
            </div>
            <div className="h-px mb-8" style={{ background: 'rgba(26,24,20,0.1)' }} />
            <ul className="space-y-3 mb-8">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#7A7062', fontFamily: 'Jost' }}>
                  <span style={{ color: '#2B4A2A', fontSize: '0.7rem' }}>✦</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/chat" className="btn-ghost w-full justify-center block text-center">
              Get started
            </Link>
          </div>

          {/* Pro */}
          <div className="card-linen p-8 relative overflow-hidden">
            {/* Vintage stripe at top */}
            <div className="stripe-accent absolute top-0 left-0 right-0" />
            {/* Watermark compass */}
            <div className="absolute bottom-4 right-4 pointer-events-none">
              <CompassRose size={80} color="#2B4A2A" opacity={0.06} />
            </div>

            <div className="flex items-start justify-between mb-6">
              <span className="label-caps" style={{ color: '#2B4A2A' }}>Pro</span>
              <span
                className="label-caps px-2.5 py-1"
                style={{ border: '1px solid rgba(43,74,42,0.3)', color: '#2B4A2A', background: 'rgba(43,74,42,0.06)' }}
              >
                Most popular
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-8">
              <span className="font-serif font-bold" style={{ fontSize: '3rem', color: '#1A1814', lineHeight: 1 }}>$4</span>
              <span className="text-sm" style={{ color: '#7A7062', fontFamily: 'Jost' }}>/month</span>
            </div>

            <div className="h-px mb-8" style={{ background: 'rgba(26,24,20,0.1)' }} />

            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#1A1814', fontFamily: 'Jost' }}>
                  <span style={{ color: '#2B4A2A', fontSize: '0.7rem' }}>✦</span> {f}
                </li>
              ))}
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-50"
            >
              {loading ? 'Redirecting…' : 'Upgrade to Pro →'}
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-20">
          <div className="flex items-center gap-6 mb-10">
            <span className="label-caps">Questions</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(26,24,20,0.1)' }} />
          </div>
          <div className="space-y-px">
            {[
              { q: 'How does the free tier work?',  a: `You receive ${FREE_LIMIT} full strategy analyses per day at no cost. Your allowance resets each midnight.` },
              { q: 'What does Pro include?',         a: 'Unlimited analyses per day, faster responses, and early access to every new feature we ship.' },
              { q: 'Can I cancel at any time?',     a: 'Yes — cancel from the Stripe customer portal with a single click. No questions asked.' },
              { q: 'Is my business data stored?',   a: 'No. Sail AI processes your input in real time and does not persist your business details.' },
            ].map((faq) => (
              <div
                key={faq.q}
                className="py-5"
                style={{ borderBottom: '1px solid rgba(26,24,20,0.08)' }}
              >
                <p className="font-serif font-semibold mb-1.5" style={{ color: '#1A1814' }}>{faq.q}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#7A7062', fontFamily: 'Jost', fontWeight: 300 }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
