'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Nav } from '@/components/Nav'
import { FREE_LIMIT } from '@/lib/stripe'

/* ── Tier definitions ──────────────────────────────── */
const TIERS = [
  {
    key:     'starter',
    name:    'Starter',
    price:   '$0',
    period:  'no charge',
    summary: 'For founders and operators evaluating the platform.',
    features: [
      `${FREE_LIMIT} strategy analyses per day`,
      'Full benchmark-referenced output',
      '3-step action plan per analysis',
      'Industry data comparisons',
    ],
    cta:    { label: 'Begin for free', href: '/chat', action: null },
    accent: false,
  },
  {
    key:     'professional',
    name:    'Professional',
    price:   '$9.99',
    period:  'per month',
    summary: 'Unlimited access with session memory — built for operators running ongoing strategy work.',
    features: [
      'Unlimited analyses per day',
      'Session memory across conversations',
      'Business profile persistence',
      'Priority response time',
      'Full benchmark-referenced output',
      'Exportable strategy summaries',
      'Cancel any time',
    ],
    cta:    { label: 'Upgrade to Professional', href: null, action: 'stripe' },
    accent: true,
  },
  {
    key:     'advisory',
    name:    'Advisory',
    price:   '$99',
    period:  'per month',
    summary: 'For advisory firms and operators requiring team access, API integration, and custom data inputs.',
    features: [
      'Everything in Professional',
      'Up to 5 team seats',
      'REST API access',
      'Custom benchmark data upload',
      'White-label output formatting',
      'Dedicated support channel',
      'Bespoke onboarding session',
    ],
    cta:    { label: 'Contact for Advisory', href: 'mailto:advisory@sailai.co', action: null },
    accent: false,
  },
]

const FAQ = [
  {
    q: 'How does the free tier work?',
    a: `You receive ${FREE_LIMIT} complete strategy analyses per day at no cost. Your daily allocation resets at midnight. No payment details are required.`,
  },
  {
    q: 'What does session memory mean?',
    a: 'Professional subscribers retain a persistent business profile — sector, key metrics, and prior strategies — that the AI draws on across sessions, eliminating the need to re-enter context each time.',
  },
  {
    q: 'Are the benchmarks current?',
    a: 'Benchmark data is drawn from publicly available industry reports (McKinsey, OpenView, Baymard, KPMG, and sector-specific sources). The underlying data is reviewed quarterly.',
  },
  {
    q: 'Can I cancel at any time?',
    a: 'Professional subscriptions are managed through Stripe and can be cancelled with a single click from your billing dashboard. No notice period required.',
  },
  {
    q: 'Is my business data stored?',
    a: 'Starter tier: no data is persisted. Professional tier: your business profile is stored locally in your browser and optionally synced to our servers. Advisory tier: governed by a data processing agreement.',
  },
]

function Rule() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.09)', margin: '0' }} />
}

export default function PricingPage() {
  const [loading, setLoading] = useState(false)

  async function handleStripe() {
    setLoading(true)
    try {
      const res  = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: any) {
      console.error('Checkout error:', err.message)
      alert(err.message)
      setLoading(false)
    }
  }

  return (
    <main style={{ background: '#FAFAF8' }}>
      <Nav />

      <section className="max-w-5xl mx-auto px-6 md:px-10 pt-20 pb-32">

        {/* Header */}
        <div style={{ marginBottom: '3.5rem' }}>
          <span className="label-caps" style={{ display: 'block', marginBottom: '1rem' }}>Membership</span>
          <h1
            style={{
              fontFamily:    'Cormorant Garamond, Georgia, serif',
              fontStyle:     'italic',
              fontSize:      'clamp(2rem, 4vw, 3.2rem)',
              color:         '#0C0C0E',
              letterSpacing: '-0.025em',
              lineHeight:    1.1,
              marginBottom:  '1rem',
            }}
          >
            Transparent pricing.<br />No lock-in.
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#71717A', maxWidth: '44ch', fontWeight: 300, lineHeight: 1.7 }}>
            Every tier includes the full strategy output. Higher tiers add persistence,
            team access, and integration capabilities.
          </p>
        </div>

        <Rule />

        {/* Tiers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginTop: '2rem', gap: 0 }}>
          {TIERS.map((tier, i) => (
            <div
              key={tier.key}
              style={{
                padding:     '2.25rem',
                background:  tier.accent ? '#0C0C0E' : '#FFFFFF',
                border:      '1px solid rgba(0,0,0,0.1)',
                borderLeft:  i === 0 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                position:    'relative',
              }}
            >
              {/* Champagne top rule for Pro */}
              {tier.accent && (
                <>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #0C0C0E, #C9A96E, #0C0C0E)' }} />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/sail-square.jpg" alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', opacity: 0.12, pointerEvents: 'none', borderRadius: 'inherit' }} />
                </>
              )}

              <span
                className={tier.accent ? 'label-gold' : 'label-caps'}
                style={{ display: 'block', marginBottom: '1.25rem' }}
              >
                {tier.name}
              </span>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2.75rem', fontWeight: 700, color: tier.accent ? '#FFFFFF' : '#0C0C0E', lineHeight: 1 }}>
                  {tier.price}
                </span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: tier.accent ? 'rgba(255,255,255,0.4)' : '#A1A1AA' }}>
                  {tier.period}
                </span>
              </div>

              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: tier.accent ? 'rgba(255,255,255,0.5)' : '#71717A', lineHeight: 1.6, marginBottom: '1.75rem', fontWeight: 300 }}>
                {tier.summary}
              </p>

              <div style={{ height: 1, background: tier.accent ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)', marginBottom: '1.5rem' }} />

              <ul style={{ listStyle: 'none', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {tier.features.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: tier.accent ? 'rgba(255,255,255,0.7)' : '#3A3A3C', lineHeight: 1.4 }}>
                    <span style={{ color: '#C9A96E', fontSize: '0.55rem', flexShrink: 0, marginTop: '0.35rem' }}>◆</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {tier.cta.action === 'stripe' ? (
                <button
                  onClick={handleStripe}
                  disabled={loading}
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    justifyContent:'center',
                    width:         '100%',
                    padding:       '0.875rem',
                    background:    '#C9A96E',
                    color:         '#0C0C0E',
                    fontFamily:    'Inter, sans-serif',
                    fontSize:      '0.75rem',
                    fontWeight:    700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    border:        '1px solid #C9A96E',
                    cursor:        loading ? 'wait' : 'pointer',
                    opacity:       loading ? 0.6 : 1,
                    transition:    'opacity 0.2s',
                  }}
                >
                  {loading ? 'Redirecting…' : tier.cta.label}
                </button>
              ) : tier.cta.href?.startsWith('mailto') ? (
                <a
                  href={tier.cta.href}
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    justifyContent:'center',
                    width:         '100%',
                    padding:       '0.875rem',
                    background:    'transparent',
                    color:         '#0C0C0E',
                    fontFamily:    'Inter, sans-serif',
                    fontSize:      '0.75rem',
                    fontWeight:    600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    border:        '1px solid rgba(0,0,0,0.2)',
                    textDecoration:'none',
                    textAlign:     'center',
                    transition:    'background 0.18s',
                  }}
                >
                  {tier.cta.label}
                </a>
              ) : (
                <Link
                  href={tier.cta.href!}
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    justifyContent:'center',
                    padding:       '0.875rem',
                    background:    'transparent',
                    color:         '#0C0C0E',
                    fontFamily:    'Inter, sans-serif',
                    fontSize:      '0.75rem',
                    fontWeight:    600,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    border:        '1px solid rgba(0,0,0,0.2)',
                    textDecoration:'none',
                    textAlign:     'center',
                  }}
                >
                  {tier.cta.label}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div style={{ marginTop: '5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <span className="label-caps">Common questions</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.09)' }} />
          </div>

          {FAQ.map((faq, i) => (
            <div
              key={faq.q}
              style={{ padding: '1.25rem 0', borderBottom: '1px solid rgba(0,0,0,0.07)' }}
            >
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600, fontSize: '1.1rem', color: '#0C0C0E', marginBottom: '0.375rem' }}>
                {faq.q}
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', lineHeight: 1.7, color: '#71717A', fontWeight: 300 }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
