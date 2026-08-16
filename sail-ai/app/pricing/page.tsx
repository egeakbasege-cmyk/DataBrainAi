'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Nav } from '@/components/Nav'
import { FREE_LIMIT } from '@/lib/stripe'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { ChampagneRule } from '@/components/SectionDivider'

// ── Animation constants ─────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const
const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
}
const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}

// ── Marquee items ───────────────────────────────────────────────
const MARQUEE_ITEMS = [
  'Cancel any time',
  'No hidden fees',
  'Groq 70B included',
  'Live web research',
  'Swiss precision AI',
  'Enterprise-grade output',
  'Free tier forever',
  'Stripe-secured checkout',
]

function MarqueeBand() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
  return (
    <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#F4F4F2', padding: '0.875rem 0', overflow: 'hidden' }}>
      <div className="sv-marquee-track">
        {doubled.map((item, i) => (
          <span key={i} style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.67rem', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA', padding: '0 2.75rem', display: 'inline-flex', alignItems: 'center', gap: '2.75rem' }}>
            {item}
            <span style={{ display: 'inline-block', width: 3, height: 3, borderRadius: '50%', background: '#C9A96E', flexShrink: 0 }} />
          </span>
        ))}
      </div>
    </div>
  )
}

export default function PricingPage() {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

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
    setCheckoutError(null)
    try {
      const res  = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Could not start checkout.')
      if (!data.url) throw new Error('Could not start checkout.')
      window.location.href = data.url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not start checkout.'
      console.error('Checkout error:', msg)
      setCheckoutError(msg)
      setLoading(false)
    }
  }

  return (
    <main style={{ background: '#FAFAF8', minHeight: '100vh' }}>
      <Nav />

      {/* ── Hero header ──────────────────────────────────────────── */}
      <section style={{ background: '#0C0C0E', borderBottom: 'none', position: 'relative', overflow: 'hidden' }}>
        {/* Grid overlay */}
        <div className="sv-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.4, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '60vw', height: '40vh', background: 'radial-gradient(ellipse, rgba(201,169,110,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="max-w-5xl mx-auto px-6 md:px-10 pt-20 pb-24" style={{ position: 'relative', zIndex: 10 }}>
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 28, height: 1, background: 'rgba(201,169,110,0.6)' }} />
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A96E' }}>
                {t('pricing.membership')}
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              style={{
                fontFamily:    'var(--font-cormorant), Georgia, serif',
                fontStyle:     'italic',
                fontSize:      'clamp(2.25rem, 5vw, 3.5rem)',
                fontWeight:    600,
                color:         '#FFFFFF',
                letterSpacing: '-0.025em',
                lineHeight:    1.08,
                marginBottom:  '1.25rem',
              }}
            >
              {t('pricing.headline')}
            </motion.h1>

            <motion.p
              variants={fadeUp}
              style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9375rem', color: 'rgba(255,255,255,0.42)', maxWidth: '44ch', fontWeight: 300, lineHeight: 1.78 }}
            >
              {t('pricing.subheadline')}
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Marquee between hero and tiers */}
      <MarqueeBand />

      {/* ── Tier cards ───────────────────────────────────────────── */}
      <section style={{ background: '#FFFFFF' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20">

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 0 }}
          >
            {TIERS.map((tier, i) => (
              <motion.div
                key={tier.key}
                variants={fadeUp}
                style={{
                  padding:    '2.5rem',
                  background: tier.accent
                    ? '#0C0C0E'
                    : tier.key === 'advisory'
                      ? 'linear-gradient(160deg, #FFFFFF 0%, #f8fffe 100%)'
                      : '#FFFFFF',
                  border:    '1px solid rgba(0,0,0,0.1)',
                  borderLeft: i === 0 ? '1px solid rgba(0,0,0,0.1)' : 'none',
                  position:  'relative',
                  boxShadow: tier.accent
                    ? '0 0 0 1px rgba(20,184,166,0.15), 0 24px 64px rgba(0,0,0,0.3)'
                    : tier.key === 'advisory'
                      ? '0 4px 24px rgba(20,184,166,0.06)'
                      : undefined,
                  transition: 'transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s',
                }}
                whileHover={{
                  y: tier.accent ? -6 : -4,
                  boxShadow: tier.accent
                    ? '0 0 0 1px rgba(20,184,166,0.2), 0 32px 80px rgba(0,0,0,0.4)'
                    : '0 16px 48px rgba(0,0,0,0.1)',
                }}
              >
                {tier.accent && (
                  <>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #0C0C0E, #C9A96E, #0C0C0E)' }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/sail-square.jpg" alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1, pointerEvents: 'none', borderRadius: 'inherit' }} />
                  </>
                )}

                <span className={tier.accent ? 'label-gold' : 'label-caps'} style={{ display: 'block', marginBottom: '1.25rem' }}>
                  {tier.name}
                </span>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '3rem', fontWeight: 700, color: tier.accent ? '#FFFFFF' : '#0C0C0E', lineHeight: 1, letterSpacing: '-0.02em' }}>
                    {tier.price}
                  </span>
                  <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8rem', color: tier.accent ? 'rgba(255,255,255,0.35)' : '#A1A1AA', fontWeight: 300 }}>
                    {tier.period}
                  </span>
                </div>

                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.85rem', color: tier.accent ? 'rgba(255,255,255,0.45)' : '#71717A', lineHeight: 1.7, marginBottom: '2rem', fontWeight: 300 }}>
                  {tier.summary}
                </p>

                <div style={{ height: 1, background: tier.accent ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', marginBottom: '1.75rem' }} />

                <ul style={{ listStyle: 'none', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {tier.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.85rem', color: tier.accent ? 'rgba(255,255,255,0.65)' : '#3A3A3C', lineHeight: 1.5 }}>
                      <span style={{ color: tier.accent ? '#C9A96E' : 'var(--sv-teal)', fontSize: '0.5rem', flexShrink: 0, marginTop: '0.4rem' }}>◆</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {tier.cta.action === 'stripe' ? (
                  <>
                    <button
                      onClick={handleStripe}
                      disabled={loading}
                      aria-busy={loading}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.9rem', background: 'linear-gradient(135deg, #B8882A, #C9A96E)', color: '#0C0C0E', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s', boxShadow: '0 4px 16px rgba(201,169,110,0.4)' }}
                    >
                      {loading ? t('pricing.redirecting') : tier.cta.label}
                    </button>
                    {checkoutError && (
                      <p
                        role="alert"
                        style={{ marginTop: '0.6rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.7rem', lineHeight: 1.5, color: '#B4302B' }}
                      >
                        {checkoutError}
                      </p>
                    )}
                  </>
                ) : tier.cta.href?.startsWith('mailto') ? (
                  <a
                    href={tier.cta.href}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.9rem', background: 'transparent', color: '#0C0C0E', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid rgba(0,0,0,0.18)', textDecoration: 'none', textAlign: 'center', transition: 'background 0.18s' }}
                  >
                    {tier.cta.label}
                  </a>
                ) : (
                  <Link
                    href={tier.cta.href!}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.9rem', background: 'transparent', color: '#0C0C0E', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', border: '1px solid rgba(0,0,0,0.18)', textDecoration: 'none', textAlign: 'center' }}
                  >
                    {tier.cta.label}
                  </Link>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <ChampagneRule />

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section style={{ background: '#FAFAF8' }}>
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20">

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            style={{ marginBottom: '3rem' }}
          >
            <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '0' }}>
              <div style={{ width: 28, height: 1, background: '#C9A96E', opacity: 0.6 }} />
              <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A96E' }}>
                {t('pricing.commonQ')}
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
            </motion.div>
          </motion.div>

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
          >
            {FAQ.map((faq) => (
              <motion.div
                key={faq.q}
                variants={fadeUp}
                style={{ padding: '1.75rem 0', borderBottom: '1px solid rgba(0,0,0,0.07)' }}
              >
                <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 600, fontSize: '1.15rem', color: '#0C0C0E', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                  <span style={{ color: 'var(--sv-teal)', marginRight: '0.5rem', fontSize: '0.7rem' }}>◈</span>
                  {faq.q}
                </p>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.875rem', lineHeight: 1.78, color: '#71717A', fontWeight: 300 }}>
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>
    </main>
  )
}
