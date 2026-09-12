'use client'

import Link from 'next/link'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Nav } from '@/components/Nav'
import { FineLineBackground } from '@/components/FineLineBackground'
import { FREE_LIMIT } from '@/lib/stripe'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// ── Modern Azulejo palette ──────────────────────────────────────
const COBALT      = '#0A7E79'   // primary brand cobalt
const COBALT_DEEP = '#002147'   // imperial navy — headings
const COBALT_MID  = '#0F4C81'   // secondary cobalt
const CERAMIC     = 'transparent'            // reveal liquid-silver backdrop
const CERAMIC_DIM = 'rgba(241,244,250,0.45)' // recessed tile, translucent over liquid
const INK         = '#0A1A3F'   // primary text
const MUTED       = '#5B6B8C'   // secondary text
const GROUT       = 'rgba(10,126,121,0.10)'

// Subtle cobalt grout grid — mimics the ceramic tile joints
const GROUT_GRID = {
  backgroundImage: `linear-gradient(${GROUT} 1px, transparent 1px), linear-gradient(90deg, ${GROUT} 1px, transparent 1px)`,
  backgroundSize:  '48px 48px',
} as const

// ── Animation constants ─────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const

// ── Baroque line-art: compass rose ──────────────────────────────
function CompassRose({ size = 220, opacity = 0.07 }: { size?: number; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" stroke={COBALT} strokeWidth="0.5" style={{ opacity }} aria-hidden="true">
      <circle cx="50" cy="50" r="47" />
      <circle cx="50" cy="50" r="35" />
      <circle cx="50" cy="50" r="7" />
      <path d="M50 3 L55 45 L50 50 L45 45 Z" />
      <path d="M97 50 L55 55 L50 50 L55 45 Z" />
      <path d="M50 97 L45 55 L50 50 L55 55 Z" />
      <path d="M3 50 L45 45 L50 50 L45 55 Z" />
      <line x1="22" y1="22" x2="36" y2="36" />
      <line x1="78" y1="22" x2="64" y2="36" />
      <line x1="78" y1="78" x2="64" y2="64" />
      <line x1="22" y1="78" x2="36" y2="64" />
    </svg>
  )
}

// ── Baroque line-art: maritime waves ────────────────────────────
function WaveMotif({ width = 260, opacity = 0.14, animate = false }: { width?: number; opacity?: number; animate?: boolean }) {
  const d1 = 'M0 22 Q 16 6 32 22 T 64 22 T 96 22 T 128 22 T 160 22 T 192 22 T 224 22 T 256 22'
  const d2 = 'M0 32 Q 16 16 32 32 T 64 32 T 96 32 T 128 32 T 160 32 T 192 32 T 224 32 T 256 32'
  return (
    <svg width={width} height="42" viewBox="0 0 260 42" fill="none" stroke={COBALT} strokeWidth="1" style={{ opacity }} aria-hidden="true">
      {animate ? (
        <motion.path
          d={d1}
          strokeDasharray="6 8"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -140 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      ) : (
        <path d={d1} />
      )}
      <path d={d2} opacity={0.6} />
    </svg>
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

  const eyebrow = (label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
      <span style={{ width: 8, height: 8, background: COBALT, transform: 'rotate(45deg)', flexShrink: 0 }} />
      <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: COBALT }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: GROUT }} />
    </div>
  )

  return (
    <main style={{ background: CERAMIC, minHeight: '100vh', position: 'relative', overflowX: 'clip' }}>
      <FineLineBackground />
      <Nav />

      {/* ── Hero header ──────────────────────────────────────────── */}
      <section style={{ background: CERAMIC, position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${GROUT}` }}>
        <div style={{ position: 'absolute', inset: 0, ...GROUT_GRID, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -40, right: -40, pointerEvents: 'none' }}>
          <CompassRose size={280} opacity={0.06} />
        </div>

        <div className="max-w-5xl mx-auto px-6 md:px-10 pt-20 pb-20" style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ maxWidth: '52ch' }}>
            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
              {eyebrow(t('pricing.membership'))}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.1, ease: EASE }}
              style={{
                fontFamily:    'var(--font-playfair), Georgia, serif',
                fontStyle:     'italic',
                fontSize:      'clamp(2.5rem, 5.5vw, 4rem)',
                fontWeight:    700,
                color:         COBALT_DEEP,
                letterSpacing: '-0.02em',
                lineHeight:    1.06,
                marginBottom:  '1.5rem',
                textWrap:      'balance',
              }}
            >
              {t('pricing.headline')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.2, ease: EASE }}
              style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '1rem', color: MUTED, maxWidth: '46ch', fontWeight: 400, lineHeight: 1.75 }}
            >
              {t('pricing.subheadline')}
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.3, ease: EASE }} style={{ marginTop: '2rem' }}>
              <WaveMotif width={260} opacity={0.2} animate />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Tier cards — ceramic bento mosaic ────────────────────── */}
      <section style={{ background: CERAMIC_DIM, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, ...GROUT_GRID, pointerEvents: 'none', opacity: 0.5 }} />
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20" style={{ position: 'relative', zIndex: 10 }}>
          <div
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(268px, 1fr))', gap: '1.25rem', alignItems: 'start' }}
          >
            {TIERS.map((tier, i) => {
              const isAccent = tier.accent
              return (
                <motion.div
                  key={tier.key}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
                  style={{
                    position:     'relative',
                    padding:      '2.5rem 2rem',
                    background:   isAccent ? `linear-gradient(165deg, ${COBALT} 0%, ${COBALT_DEEP} 100%)` : '#FFFFFF',
                    border:       `1px solid ${isAccent ? COBALT_DEEP : 'rgba(10,126,121,0.22)'}`,
                    borderRadius: 3,
                    overflow:     'hidden',
                    // Glazed ceramic: soft top-inset highlight + deep drop
                    boxShadow: isAccent
                      ? `inset 0 2px 4px rgba(255,255,255,0.12), 0 30px 60px -22px rgba(10,126,121,0.55)`
                      : `inset 0 2px 4px rgba(0,0,0,0.04), 0 12px 32px -18px rgba(10,126,121,0.25)`,
                    marginTop: isAccent ? -12 : 0,
                  }}
                >
                  {/* Corner line-art flourish */}
                  <div style={{ position: 'absolute', top: -30, right: -30, pointerEvents: 'none' }}>
                    <CompassRose size={130} opacity={isAccent ? 0.16 : 0.07} />
                  </div>

                  {isAccent && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.1rem', padding: '0.3rem 0.7rem', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 2 }}>
                      <span style={{ width: 5, height: 5, background: '#FFFFFF', transform: 'rotate(45deg)' }} />
                      <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.56rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#FFFFFF' }}>
                        Most chosen
                      </span>
                    </div>
                  )}

                  <span style={{ display: 'block', marginBottom: '1.1rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: isAccent ? 'rgba(255,255,255,0.8)' : COBALT }}>
                    {tier.name}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.6rem' }}>
                    <span style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontSize: '3.25rem', fontWeight: 700, color: isAccent ? '#FFFFFF' : COBALT_DEEP, lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {tier.price}
                    </span>
                    <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8rem', color: isAccent ? 'rgba(255,255,255,0.5)' : MUTED, fontWeight: 400 }}>
                      {tier.period}
                    </span>
                  </div>

                  <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.85rem', color: isAccent ? 'rgba(255,255,255,0.6)' : MUTED, lineHeight: 1.7, marginBottom: '1.75rem', fontWeight: 400 }}>
                    {tier.summary}
                  </p>

                  <div style={{ height: 1, background: isAccent ? 'rgba(255,255,255,0.16)' : GROUT, marginBottom: '1.6rem' }} />

                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, marginBottom: '2.25rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {tier.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.85rem', color: isAccent ? 'rgba(255,255,255,0.82)' : INK, lineHeight: 1.5 }}>
                        <span style={{ width: 6, height: 6, background: isAccent ? '#FFFFFF' : COBALT, transform: 'rotate(45deg)', flexShrink: 0, marginTop: '0.35rem' }} />
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
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.95rem', background: '#FFFFFF', color: COBALT_DEEP, fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', border: 'none', borderRadius: 2, cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'opacity 0.2s, transform 0.2s', boxShadow: '0 6px 18px rgba(0,0,0,0.2)' }}
                      >
                        {loading && (
                          <motion.span
                            aria-hidden
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.7, ease: 'linear', repeat: Infinity }}
                            style={{ width: 13, height: 13, borderRadius: '50%', border: `2px solid ${COBALT_DEEP}33`, borderTopColor: COBALT_DEEP, display: 'inline-block' }}
                          />
                        )}
                        {loading ? t('pricing.redirecting') : tier.cta.label}
                      </button>
                      {checkoutError && (
                        <p role="alert" style={{ marginTop: '0.6rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.7rem', lineHeight: 1.5, color: '#FFD9D6' }}>
                          {checkoutError}
                        </p>
                      )}
                    </>
                  ) : tier.cta.href?.startsWith('mailto') ? (
                    <a
                      href={tier.cta.href}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '0.95rem', background: 'transparent', color: COBALT, fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', border: `1px solid ${COBALT}`, borderRadius: 2, textDecoration: 'none', textAlign: 'center', transition: 'background 0.18s, color 0.18s' }}
                    >
                      {tier.cta.label}
                    </a>
                  ) : (
                    <Link
                      href={tier.cta.href!}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.95rem', background: COBALT, color: '#FFFFFF', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', border: `1px solid ${COBALT}`, borderRadius: 2, textDecoration: 'none', textAlign: 'center', boxShadow: '0 8px 22px -10px rgba(10,126,121,0.6)' }}
                    >
                      {tier.cta.label}
                    </Link>
                  )}
                </motion.div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '3rem' }}>
            <WaveMotif width={300} opacity={0.16} />
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section style={{ background: CERAMIC, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: -60, left: -50, pointerEvents: 'none' }}>
          <CompassRose size={240} opacity={0.05} />
        </div>
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-20" style={{ position: 'relative', zIndex: 10 }}>
          <motion.div initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.6, ease: EASE }} style={{ marginBottom: '2.5rem' }}>
            {eyebrow(t('pricing.commonQ'))}
          </motion.div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {FAQ.map((faq, i) => (
              <motion.div
                key={faq.q}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: EASE }}
                style={{ padding: '1.6rem 1.75rem', background: '#FFFFFF', border: `1px solid ${GROUT}`, borderRadius: 3, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.03)' }}
              >
                <p style={{ fontFamily: 'var(--font-playfair), Georgia, serif', fontWeight: 700, fontSize: '1.2rem', color: COBALT_DEEP, marginBottom: '0.55rem', lineHeight: 1.3, display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                  <span style={{ width: 7, height: 7, background: COBALT, transform: 'rotate(45deg)', flexShrink: 0, alignSelf: 'center' }} />
                  {faq.q}
                </p>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9rem', lineHeight: 1.78, color: MUTED, fontWeight: 400, paddingLeft: '1.3rem' }}>
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
