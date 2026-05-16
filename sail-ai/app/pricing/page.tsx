'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Nav } from '@/components/Nav'
import { FREE_LIMIT } from '@/lib/stripe'
import { useLanguage } from '@/lib/i18n/LanguageContext'

function Rule() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.09)', margin: '0' }} />
}

export default function PricingPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)

  /* ── Tier definitions ──────────────────────────────── */
  const TIERS = [
    {
      key:     'starter',
      name:    t('pricing.starter.name'),
      price:   '$0',
      period:  t('pricing.noCharge'),
      summary: t('pricing.starter.summary'),
      features: [
        `${FREE_LIMIT} ${t('pricing.starter.f1')}`,
        t('pricing.starter.f2'),
        t('pricing.starter.f3'),
        t('pricing.starter.f4'),
      ],
      cta:    { label: t('pricing.beginFree'), href: '/chat', action: null },
      accent: false,
    },
    {
      key:     'professional',
      name:    t('pricing.pro.name'),
      price:   '$9.99',
      period:  t('pricing.perMonth'),
      summary: t('pricing.pro.summary'),
      features: [
        t('pricing.pro.f1'),
        t('pricing.pro.f2'),
        t('pricing.pro.f3'),
        t('pricing.pro.f4'),
        t('pricing.pro.f5'),
        t('pricing.pro.f6'),
        t('pricing.pro.f7'),
      ],
      cta:    { label: t('pricing.upgradePro'), href: null, action: 'stripe' },
      accent: true,
    },
    {
      key:     'advisory',
      name:    t('pricing.advisory.name'),
      price:   '$99',
      period:  t('pricing.perMonth'),
      summary: t('pricing.advisory.summary'),
      features: [
        t('pricing.advisory.f1'),
        t('pricing.advisory.f2'),
        t('pricing.advisory.f3'),
        t('pricing.advisory.f4'),
        t('pricing.advisory.f5'),
        t('pricing.advisory.f6'),
        t('pricing.advisory.f7'),
      ],
      cta:    { label: t('pricing.contactAdvisory'), href: 'mailto:advisory@sailai.co', action: null },
      accent: false,
    },
  ]

  const FAQ = [
    { q: t('pricing.faq.q1'), a: t('pricing.faq.a1').replace('{limit}', String(FREE_LIMIT)) },
    { q: t('pricing.faq.q2'), a: t('pricing.faq.a2') },
    { q: t('pricing.faq.q3'), a: t('pricing.faq.a3') },
    { q: t('pricing.faq.q4'), a: t('pricing.faq.a4') },
    { q: t('pricing.faq.q5'), a: t('pricing.faq.a5') },
  ]

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
          <span className="label-caps" style={{ display: 'block', marginBottom: '1rem' }}>{t('pricing.membership')}</span>
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
            {t('pricing.headline')}
          </h1>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#71717A', maxWidth: '44ch', fontWeight: 300, lineHeight: 1.7 }}>
            {t('pricing.subheadline')}
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
                  {loading ? t('pricing.redirecting') : tier.cta.label}
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
            <span className="label-caps">{t('pricing.commonQ')}</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.09)' }} />
          </div>

          {FAQ.map((faq) => (
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
