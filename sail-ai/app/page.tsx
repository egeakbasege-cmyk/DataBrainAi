'use client'

/**
 * Landing page — Swiss Precision × Explora Journeys luxury redesign
 *
 * Motion system:
 *   • Hero headline — word-by-word stagger (Framer Motion animate)
 *   • Sub-headline + CTAs — staggered fade-up with delays
 *   • Marquee band — infinite CSS horizontal scroll between sections
 *   • All content sections — whileInView stagger (once, -80px margin)
 *   • Sailboat — parallax drift via useScroll/useTransform
 *   • Mode cards + cases — stagger grid/row reveals
 *   • Hover lift on cards, mode cards, case rows
 *
 * Typography:
 *   • Display — Cormorant Garamond 600 italic
 *   • Label — Inter 700, 0.6rem, tracking-widest, uppercase
 *   • Body — Inter 300, 0.875–0.9375rem, line-height 1.75
 *
 * Palette (Swiss restraint):
 *   • Ink: #0C0C0E · Canvas: #FAFAF8 · Champagne: #0ABAB5
 *   • Teal: #94A3B8 · Slate: #71717A · Silver: #A1A1AA
 */

import React, { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { motion, useScroll, useTransform, useInView, animate } from 'framer-motion'
import { Nav } from '@/components/Nav'
import { Logo } from '@/components/Logo'
import { CompassRose, EngravedSailboat } from '@/components/Ornaments'
import { TopoBackground } from '@/components/TopoBackground'
import { FineLineBackground } from '@/components/FineLineBackground'
import { PortofinoWalkthrough } from '@/components/PortofinoWalkthrough'
import { SectionDivider, ChampagneRule } from '@/components/SectionDivider'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { LiquidButton } from '@/components/LiquidButton'

// ── Animated counter — counts up from 0 when entering viewport ──
function AnimatedCounter({ value }: { value: string }) {
  const ref      = useRef<HTMLSpanElement>(null)
  const inView   = useInView(ref, { once: true, margin: '-40px' })

  useEffect(() => {
    if (!inView || !ref.current) return
    const match = value.match(/^([^0-9\-+]*)([0-9]+\.?[0-9]*)(.*)$/)
    if (!match) { ref.current.textContent = value; return }
    const [, prefix, numStr, suffix] = match
    const target  = parseFloat(numStr)
    const isFloat = numStr.includes('.')
    const ctrl = animate(0, target, {
      duration: 1.6,
      ease:     [0.22, 1, 0.36, 1],
      onUpdate: v => {
        if (ref.current)
          ref.current.textContent = prefix + (isFloat ? v.toFixed(1) : Math.round(v).toString()) + suffix
      },
    })
    return () => ctrl.stop()
  }, [inView, value])

  return <span ref={ref}>{value}</span>
}

// ── Animation constants ─────────────────────────────────────────
const EASE = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.68, ease: EASE } },
}

const stagger = (delay = 0.05) => ({
  hidden: {},
  show:   { transition: { staggerChildren: 0.12, delayChildren: delay } },
})

const wordVar = {
  hidden: { opacity: 0, y: 16, filter: 'blur(4px)' },
  show:   { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.52, ease: EASE } },
}

// ── Inline helpers ──────────────────────────────────────────────
function Rule() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.09)' }} />
}

function Eyebrow({ label, light }: { label: string; light?: boolean }) {
  return (
    <div className="sv-eyebrow" style={{ '--eyebrow-color': light ? 'rgba(10,186,181,0.8)' : undefined } as React.CSSProperties}>
      <span className="sv-eyebrow-label" style={{ color: light ? 'rgba(10,186,181,0.8)' : undefined }}>
        {label}
      </span>
    </div>
  )
}

// ── Infinite marquee band ──────────────────────────────────────
const MARQUEE_ITEMS = [
  'Rocket-Speed AI · Live Intelligence',
  '60-Second Deep Analysis',
  '5 Sovereign Modes',
  'Swiss Precision AI',
  'Benchmarked Strategy',
  'Executive-Grade Output',
  'Free to Start',
  'Real-Time Web Research',
]

function MarqueeBand({ dark }: { dark?: boolean }) {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS]
  const bg      = dark ? 'rgba(255,255,255,0.04)' : '#F4F4F2'
  const border  = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'
  const textCol = dark ? 'rgba(255,255,255,0.35)' : '#A1A1AA'
  const dotCol  = dark ? 'rgba(10,186,181,0.5)'  : '#0ABAB5'

  return (
    <div style={{
      borderTop:    `1px solid ${border}`,
      borderBottom: `1px solid ${border}`,
      background:   bg,
      padding:      '0.875rem 0',
      overflow:     'hidden',
    }}>
      <div className="sv-marquee-track">
        {doubled.map((item, i) => (
          <span
            key={i}
            style={{
              fontFamily:    'var(--font-inter), sans-serif',
              fontSize:      '0.67rem',
              fontWeight:    500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color:         textCol,
              padding:       '0 2.75rem',
              display:       'inline-flex',
              alignItems:    'center',
              gap:           '2.75rem',
            }}
          >
            {item}
            <span style={{ display: 'inline-block', width: 3, height: 3, borderRadius: '50%', background: dotCol, flexShrink: 0 }} />
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Mode card — dark glassmorphism edition ─────────────────────
function ModeCard({
  badge, name, color, border, icon, desc, detail,
}: {
  badge:  string; name: string; color: string
  border: string; icon: React.ReactNode; desc: string; detail: string
}) {
  return (
    <div
      className="hover-lift"
      style={{
        padding:             '2.25rem',
        background:          'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 60%, rgba(148,163,184,0.04) 100%)',
        backdropFilter:      'blur(32px)',
        WebkitBackdropFilter:'blur(32px)',
        border:              `1px solid rgba(255,255,255,0.13)`,
        borderRadius:        '18px',
        display:             'flex',
        flexDirection:       'column',
        height:              '100%',
        position:            'relative',
        overflow:            'hidden',
        boxShadow:           '0 8px 40px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}
    >
      {/* Colour top hairline */}
      <div style={{
        position:   'absolute', top: 0, left: '10%', right: '10%', height: 1,
        background: `linear-gradient(90deg, transparent, ${border}, transparent)`,
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div
          className="mode-icon-box"
          style={{
            width: 36, height: 36, borderRadius: '9px',
            background: `rgba(255,255,255,0.08)`,
            border: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {icon}
        </div>
        <div>
          <span style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '1.25rem', fontWeight: 700, color, display: 'block', lineHeight: 1.1, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
            {name}
          </span>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, opacity: 0.85 }}>
            {badge}
          </span>
        </div>
      </div>

      <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.875rem', lineHeight: 1.78, color: '#FFFFFF', fontWeight: 400, marginBottom: '1rem', flex: 1, textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
        {desc}
      </p>
      <div style={{ height: 1, background: border, opacity: 0.6, marginBottom: '0.875rem' }} />
      <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.70)', lineHeight: 1.6, margin: 0, textShadow: '0 1px 6px rgba(0,0,0,0.7)' }}>
        {detail}
      </p>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────
export default function LandingPage() {
  const { t } = useLanguage()
  const { data: session } = useSession()
  const { scrollY } = useScroll()

  const [proLoading, setProLoading] = useState(false)

  // Pro plan CTA: signed-out → register, Pro member → app, otherwise start checkout.
  async function handleProUpgrade() {
    if (proLoading) return
    if (!session?.user) {
      window.location.href = '/login?mode=register&next=/pricing'
      return
    }
    if ((session.user as { isPro?: boolean }).isPro) {
      window.location.href = '/home'
      return
    }
    setProLoading(true)
    try {
      const res  = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || data.error || !data.url) throw new Error(data.error ?? 'Could not start checkout.')
      window.location.href = data.url
    } catch (err) {
      console.error('Checkout error:', err instanceof Error ? err.message : 'unknown')
      window.location.href = '/pricing'
    } finally {
      setProLoading(false)
    }
  }

  // Parallax transforms for hero sailboat
  const sailboatY = useTransform(scrollY, [0, 500], [0, -70])
  const heroImgOp = useTransform(scrollY, [0, 350], [0.3, 0.08])

  const FEATURE_BADGES = [
    { label: t('landing.stat1'),       locked: false },
    { label: t('landing.stat2'),       locked: false },
    { label: t('landing.stat3'),       locked: false },
    { label: t('landing.badgeLocked'), locked: true  },
  ]
  const TRUST_CUES  = [t('landing.trust1')]
  const headlineWords = t('landing.headline').split(' ')

  const CASES = [
    { n: '01', sector: t('landing.case1sector'), headline: t('landing.case1headline'), detail: t('landing.case1detail'), outcome: t('landing.case1outcome') },
    { n: '02', sector: t('landing.case2sector'), headline: t('landing.case2headline'), detail: t('landing.case2detail'), outcome: t('landing.case2outcome') },
    { n: '03', sector: t('landing.case3sector'), headline: t('landing.case3headline'), detail: t('landing.case3detail'), outcome: t('landing.case3outcome') },
  ]

  return (
    <main style={{ background: '#E3E6EB', paddingBottom: '0', position: 'relative', overflowX: 'clip' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Sail AI+',
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            description:
              'AI-powered market analysis, revenue optimization, and verified business advisory strategies for independent operators and founders.',
            offers: {
              '@type': 'Offer',
              price: '9.99',
              priceCurrency: 'USD',
            },
          }),
        }}
      />
      <FineLineBackground />
      <Nav />

      {/* ══════════════════════════════════════════════
          SECTION 1 — HERO
          Dark full-bleed. Word-by-word headline stagger.
          Sailboat has parallax drift on scroll.
      ══════════════════════════════════════════════ */}
      <section style={{ paddingBottom: 0, position: 'relative', zIndex: 1, overflow: 'hidden', background: 'transparent', color: '#1A1725' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-24 md:pt-32 pb-20 md:pb-28" style={{ position: 'relative', zIndex: 10 }}>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>

          {/* Eyebrow */}
          <div
            className="azx-reveal"
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.25rem' }}
          >
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#96731E' }}>
              {t('landing.eyebrow')}
            </span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(150,115,30,0.45), transparent)' }} />
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#4C3A6E' }}>
              {t('landing.est')}
            </span>
          </div>

          {/* Headline — word-by-word stagger (CSS-driven) */}
          <h1
            style={{
              fontFamily:    'var(--font-playfair), Georgia, serif',
              fontSize:      'clamp(2rem, 5vw, 3.125rem)',
              fontWeight:    700,
              fontStyle:     'normal',
              lineHeight:    1.08,
              letterSpacing: '-0.02em',
              color:         '#181528',
              maxWidth:      '15ch',
              margin:        0,
              textShadow:    '0 1px 0 rgba(255,255,255,0.5)',
            }}
          >
            {headlineWords.map((word, i) => (
              <span
                key={i}
                className="azx-reveal-word"
                style={{ ['--azx-delay' as string]: `${0.1 + i * 0.09}s` }}
              >
                {word}
              </span>
            ))}
          </h1>

          {/* Subheadline */}
          <p
            className="azx-reveal"
            style={{
              ['--azx-delay' as string]: '0.5s',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:   'clamp(1.0625rem, 1.1vw, 1.15rem)',
              lineHeight: 1.65,
              color:      '#3C3A4A',
              maxWidth:   '46ch',
              marginTop:  '1.75rem',
              fontWeight: 400,
            }}
          >
            {t('landing.subheadline')}
          </p>

          {/* Supporting text — what SAIL actually does */}
          <p
            className="azx-reveal"
            style={{
              ['--azx-delay' as string]: '0.58s',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:   'clamp(0.9375rem, 1vw, 1rem)',
              lineHeight: 1.7,
              color:      '#5A5768',
              maxWidth:   '48ch',
              marginTop:  '0.875rem',
              fontWeight: 400,
            }}
          >
            {t('landing.heroSupport')}
          </p>

          {/* Feature badges */}
          <div
            className="azx-reveal"
            style={{ ['--azx-delay' as string]: '0.62s', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '2rem' }}
          >
            {FEATURE_BADGES.map(badge => (
              <span
                key={badge.label}
                style={{
                  display:       'inline-flex',
                  alignItems:    'center',
                  gap:           '0.4rem',
                  fontFamily:    'var(--font-inter), sans-serif',
                  fontSize:      '0.9375rem',
                  fontWeight:    600,
                  letterSpacing: '0.01em',
                  color:         badge.locked ? '#8A6D1F' : '#33303F',
                  background:    badge.locked ? 'rgba(201,169,110,0.16)' : 'rgba(255,255,255,0.7)',
                  backdropFilter:'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border:        `1px solid ${badge.locked ? 'rgba(150,115,30,0.4)' : 'rgba(24,21,40,0.12)'}`,
                  borderRadius:  '999px',
                  padding:       '0.5rem 1.05rem',
                  whiteSpace:    'nowrap',
                  boxShadow:     '0 4px 14px -8px rgba(24,21,40,0.35)',
                }}
              >
                {!badge.locked && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#96731E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
                {badge.label}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div
            className="azx-reveal"
            style={{ ['--azx-delay' as string]: '0.74s', marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
          >
            <LiquidButton href="/login?mode=register" variant="gold" size="lg">
              {t('landing.beginFree')}
            </LiquidButton>
            <LiquidButton
              variant="silver"
              size="lg"
              onClick={() =>
                document.getElementById('tutorial')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              {t('landing.seeHowItWorks')}
            </LiquidButton>
          </div>

          <p
            className="azx-reveal"
            style={{ ['--azx-delay' as string]: '0.9s', marginTop: '1rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9375rem', color: '#5A5768', letterSpacing: '0.01em', lineHeight: 1.6 }}
          >
            {t('landing.freeNote')}
          </p>

          {/* Trust cues */}
          <div
            className="azx-reveal"
            style={{ ['--azx-delay' as string]: '1s', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}
          >
            {TRUST_CUES.map(cue => (
              <span key={cue} style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9375rem', color: '#5A5768', letterSpacing: '0.01em' }}>
                {cue}
              </span>
            ))}
          </div>

          </div>{/* end hero left column */}

          {/* ── Royal amethyst Professional plan card — hero centerpiece ── */}
          <div className="azx-reveal-mural relative mx-auto w-full max-w-[440px] lg:max-w-none">
            {/* Hand-painted azulejo sailboat mural — marine heritage */}
            <div
              role="img"
              aria-label="Hand-painted Portuguese azulejo sailboat mural"
              style={{
                position:            'relative',
                aspectRatio:         '16 / 9',
                borderRadius:        '18px',
                overflow:            'hidden',
                marginBottom:        '1.25rem',
                border:              '1px solid rgba(201,169,110,0.45)',
                boxShadow:           '0 26px 60px -30px rgba(24,21,40,0.55), inset 0 1px 0 rgba(255,255,255,0.4)',
                backgroundImage:     'url(/azulejo/hero-sailboat.png)',
                backgroundSize:      'cover',
                backgroundPosition:  'center',
              }}
            >
              <span
                aria-hidden
                style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 52%, rgba(22,12,40,0.5) 100%)' }}
              />
              <span
                style={{
                  position: 'absolute', left: '1.1rem', bottom: '0.85rem',
                  fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'italic',
                  fontSize: '1rem', color: '#F4E9C8', letterSpacing: '0.02em',
                  textShadow: '0 1px 8px rgba(0,0,0,0.6)',
                }}
              >
                {t('landing.est')}
              </span>
            </div>
            <div
              id="hero-plan"
              style={{
                position:     'relative',
                background:   'linear-gradient(165deg, #241640 0%, #1F1335 55%, #160C28 100%)',
                borderRadius: '22px',
                padding:      '2.25rem 2rem',
                color:        '#FFFFFF',
                border:       '1px solid rgba(201,169,110,0.45)',
                boxShadow:    '0 40px 90px -34px rgba(0,0,0,0.8), inset 0 1px 0 rgba(201,169,110,0.22)',
                overflow:     'hidden',
              }}
            >
              <span
                aria-hidden
                style={{
                  position: 'absolute', top: -50, right: -50, width: 180, height: 180,
                  borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.20), transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              {/* Most-chosen badge */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.875rem', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase', color: '#D4AF37',
                border: '1px solid rgba(201,169,110,0.5)', background: 'rgba(201,169,110,0.1)',
                borderRadius: '999px', padding: '0.35rem 0.85rem',
              }}>
                ◆ {t('landing.proBadge')}
              </span>

              <h3 style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 'clamp(1.35rem, 5vw, 1.6rem)', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: '#F4E9C8', margin: '1.15rem 0 0' }}>
                {t('landing.proTitle')}
              </h3>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginTop: '0.6rem' }}>
                <span style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 'clamp(2.1rem, 8vw, 2.6rem)', fontWeight: 700, lineHeight: 1, color: '#D4AF37' }}>
                  $9.99
                </span>
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '1rem', color: '#CBD5E1' }}>
                  {t('landing.proPer')}
                </span>
              </div>

              <div style={{ height: 1, background: 'rgba(201,169,110,0.22)', margin: '1.5rem 0' }} />

              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {[t('landing.proFeat1'), t('landing.proFeat2'), t('landing.proFeat3'), t('landing.proFeat4')].map(feat => (
                  <li key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: 'clamp(0.9rem, 3.6vw, 0.975rem)', lineHeight: 1.5, color: '#E8ECF3' }}>
                    <span aria-hidden style={{ color: '#D4AF37', fontSize: '0.8rem', lineHeight: 1.7, flexShrink: 0 }}>◆</span>
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={handleProUpgrade}
                disabled={proLoading}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: '1.75rem', minHeight: '56px', width: '100%', border: 'none',
                  background: 'linear-gradient(105deg, #B8860B 0%, #D4AF37 30%, #F9E29D 50%, #D4AF37 70%, #B8860B 100%)',
                  color: '#1A102F',
                  fontFamily: 'var(--font-inter), sans-serif', fontSize: 'clamp(0.9rem, 3.6vw, 1rem)', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none',
                  borderRadius: '12px', boxShadow: '0 14px 30px -12px rgba(212,175,55,0.55)',
                  cursor: proLoading ? 'wait' : 'pointer', opacity: proLoading ? 0.75 : 1,
                }}
              >
                {proLoading ? t('pricing.redirecting') : t('landing.proCta')}
              </button>
            </div>
          </div>
         </div>{/* end hero grid */}
        </div>
      </section>

      {/* ── Diagonal divider: amethyst hero → obsidian ─── */}
      <SectionDivider from="#E3E6EB" to="#08090D" direction="down-right" height={52} />

      {/* ── Marquee Band 1 ───────────────────────────── */}
      <MarqueeBand dark />

      {/* ══════════════════════════════════════════════
          SECTION 2 — HOW IT WORKS (PortofinoWalkthrough)
      ══════════════════════════════════════════════ */}
      <PortofinoWalkthrough />

      {/* ── Marquee Band 2 (dark) ─────────────────────── */}
      <MarqueeBand dark />

      {/* ══════════════════════════════════════════════
          SECTION 4 — INTELLIGENCE MODES
          Dark — glassmorphism cards over topo texture.
      ═══════════════��══════════════════════════════ */}
      <section style={{ background: 'rgba(8,9,13,0.94)', position: 'relative', overflow: 'hidden' }}>
        <TopoBackground />
        <div className="sv-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none', zIndex: 1 }} />

        <div className="max-w-6xl mx-auto px-6 md:px-10 py-24" style={{ position: 'relative', zIndex: 2 }}>

          {/* Header */}
          <motion.div
            variants={stagger()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            style={{ marginBottom: '3.5rem' }}
          >
            <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
              <div style={{ width: 28, height: 1, background: 'rgba(201,169,110,0.6)' }} />
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D4AF37' }}>
                  {t('landing.intelligenceModes')}
              </span>
            </motion.div>
            <motion.p variants={fadeUp} style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.875rem', color: '#FFFFFF', fontWeight: 400, maxWidth: '52ch', lineHeight: 1.75, textShadow: '0 1px 10px rgba(0,0,0,0.9)' }}>
              {t('landing.modesCount')}
            </motion.p>
          </motion.div>

          {/* Mode cards — stagger grid */}
          <motion.div
            variants={stagger(0.06)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}
          >
            {/* Upwind */}
            <motion.div variants={fadeUp} className="mode-card-sv">
              <ModeCard
                badge={t('landing.upwindBadge')}
                name="Upwind"
                color="#5B9BD5"
                border="rgba(91,155,213,0.28)"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3L12 19L4 19Z" fill="#5B9BD5" opacity="0.85"/>
                    <path d="M12 3L12 19L20 12Z" fill="#5B9BD5" opacity="0.3"/>
                    <line x1="12" y1="2" x2="12" y2="20" stroke="#5B9BD5" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M5 19Q12 22 19 19" stroke="#5B9BD5" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  </svg>
                }
                desc={t('landing.upwindDesc')}
                detail={t('landing.upwindDetail')}
              />
            </motion.div>

            {/* SAIL */}
            <motion.div variants={fadeUp} className="mode-card-sv">
              <ModeCard
                badge={t('landing.sailBadge')}
                name="SAIL"
                color="#A78BFA"
                border="rgba(167,139,250,0.30)"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 3C18 5 22 11 20 19L12 19Z" fill="#A78BFA" opacity="0.85"/>
                    <path d="M12 8C16 9 18 14 17 19L12 19Z" fill="#A78BFA" opacity="0.4"/>
                    <line x1="12" y1="2" x2="12" y2="20" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M5 19Q12 22 19 19" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                    <circle cx="5" cy="6" r="1.8" fill="#A78BFA" opacity="0.6"/>
                  </svg>
                }
                desc={t('landing.sailDesc')}
                detail={t('landing.sailDetail')}
              />
            </motion.div>

            {/* Operator */}
            <motion.div variants={fadeUp} className="mode-card-sv">
              <ModeCard
                badge={t('landing.operatorBadge')}
                name="Operator"
                color="#F87171"
                border="rgba(248,113,113,0.28)"
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#F87171" strokeWidth="1.4" opacity="0.4"/>
                    <circle cx="12" cy="12" r="3" fill="#F87171" opacity="0.9"/>
                    <line x1="12" y1="3" x2="12" y2="7" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="12" y1="17" x2="12" y2="21" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="3" y1="12" x2="7" y2="12" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="17" y1="12" x2="21" y2="12" stroke="#F87171" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                }
                desc={t('landing.operatorDesc')}
                detail={t('landing.operatorDetail')}
              />
            </motion.div>
          </motion.div>

          {/* Explore all modes */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.25, ease: EASE }}
            style={{ marginTop: '2.5rem', textAlign: 'center' }}
          >
            <Link
              href="/chat"
              style={{
                fontFamily:    'var(--font-inter), sans-serif',
                fontSize:      '0.75rem',
                fontWeight:    500,
                color:         '#D4AF37',
                textDecoration:'none',
                borderBottom:  '1px solid rgba(201,169,110,0.4)',
                paddingBottom: '2px',
                letterSpacing: '0.06em',
              }}
            >
              {t('landing.exploreAllModes')} →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 5 — SAMPLE OUTCOMES
          Dark — stagger rows with light text.
      ══════════════════════════════════════════════ */}
      <section style={{ background: 'rgba(8,9,13,0.94)', borderTop: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-24" style={{ position: 'relative', zIndex: 1 }}>

          {/* Header */}
          <motion.div
            variants={stagger()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            style={{ marginBottom: '3rem' }}
          >
            <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                <div style={{ width: 28, height: 1, background: 'rgba(201,169,110,0.6)' }} />
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D4AF37' }}>
                  {t('landing.indicativeOutputs')}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: 'rgba(255,255,255,0.70)', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
                {t('landing.realisticProjections')}
              </span>
            </motion.div>
          </motion.div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 0 }} />

          {/* Case rows — stagger */}
          <motion.div
            variants={stagger(0.06)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
          >
            {CASES.map(c => (
              <motion.div
                key={c.n}
                variants={fadeUp}
                className="case-row"
                style={{
                  display:             'grid',
                  gridTemplateColumns: '2.5rem 1fr auto',
                  gap:                 '1.75rem',
                  alignItems:          'center',
                  padding:             '1.75rem 1rem',
                  borderBottom:        '1px solid rgba(255,255,255,0.10)',
                  borderRadius:        '10px',
                  background:          'rgba(255,255,255,0.04)',
                  backdropFilter:      'blur(12px)',
                  WebkitBackdropFilter:'blur(12px)',
                  marginBottom:        '4px',
                }}
              >
                <span style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '0.875rem', color: '#94A3B8', fontWeight: 600, paddingLeft: '0.25rem' }}>
                  ◈ {c.n}
                </span>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                    <span style={{
                      fontFamily:    'var(--font-inter), sans-serif',
                      fontSize:      '0.62rem',
                      fontWeight:    700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color:         'rgba(232,237,243,0.75)',
                      padding:       '2px 8px',
                      border:        '1px solid rgba(255,255,255,0.12)',
                      borderRadius:  '2px',
                    }}>
                      {c.sector}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: '#FFFFFF', lineHeight: 1.4, marginBottom: '0.4rem', textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}>
                    {c.headline}
                  </p>
                  <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
                    {c.detail}
                  </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: 'clamp(1.3rem, 2.2vw, 1.75rem)', fontWeight: 700, color: '#D4AF37', lineHeight: 1, display: 'block', letterSpacing: '-0.01em' }}>
                    <AnimatedCounter value={c.outcome} />
                  </span>
                  <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(232,237,243,0.35)', display: 'block', marginTop: '0.25rem' }}>
                    {t('landing.estOutcome')}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.4 }}
            style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', color: 'rgba(232,237,243,0.35)', lineHeight: 1.6, marginTop: '1.5rem', maxWidth: '60ch' }}
          >
            {t('landing.disclaimer')}
          </motion.p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 6 — CTA DARK
          Premium dark banner. Fade-up text + button.
      ══════════════════════════════════════════���═══ */}
      <section style={{ background: 'rgba(8,9,13,0.94)', position: 'relative', overflow: 'hidden' }}>
        <TopoBackground />
        <div className="sv-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none', zIndex: 2 }} />

        {/* Radial champagne glow */}
        <div style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%, -50%)',
          width:         '70vw',
          height:        '50vh',
          background:    'radial-gradient(ellipse, rgba(10,186,181,0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex:        3,
        }} />

        <div className="max-w-6xl mx-auto px-6 md:px-10 py-24" style={{ position: 'relative', zIndex: 10 }}>
          <div className="champagne-rule" style={{ marginBottom: '4rem' }} />

          <motion.div
            variants={stagger(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2.5rem', flexWrap: 'wrap' }}
          >
            <div>
              <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
                <div style={{ width: 28, height: 1, background: 'rgba(201,169,110,0.6)' }} />
                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8125rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#D4AF37' }}>
                  {t('landing.eyebrow')}
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'normal', fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', color: '#F4E9C8', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '1rem' }}>
                {t('landing.ctaHeadline')}
              </motion.h2>
              <motion.p variants={fadeUp} style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9375rem', color: '#CBD5E1', fontWeight: 400, lineHeight: 1.75, maxWidth: '42ch' }}>
                {t('landing.ctaBody')}
              </motion.p>
            </div>
            <motion.div variants={fadeUp} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem', alignItems: 'flex-start' }}>
              <LiquidButton href="/login?mode=register" variant="gold" size="lg">
                {t('landing.beginBtn')}
              </LiquidButton>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8125rem', color: '#94A3B8', letterSpacing: '0.02em' }}>
                {t('landing.freeNote')}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ═════════════════════════════════════════════���
          SECTION 7 — FOOTER
          Clean. Swiss. Brand mark + nav links.
      ══════════════════════════════════════════════ */}
      <footer style={{ background: '#08090D', borderTop: '1px solid rgba(201,169,110,0.16)', position: 'relative', zIndex: 1 }}>
        <div className="champagne-rule" />

        <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'start', gap: '3rem', flexWrap: 'wrap' }}>

            {/* Brand */}
            <div>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', marginBottom: '0.75rem' }}>
                <Logo size={28} />
                <span style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 700, color: '#F4E9C8', fontSize: '1rem', letterSpacing: '0.1em' }}>
                  SAIL AI+
                </span>
              </Link>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8125rem', color: '#94A3B8', lineHeight: 1.6, maxWidth: '24ch', fontWeight: 400 }}>
                {t('landing.footerTagline')}
              </p>
            </div>

            {/* Nav columns */}
            <div style={{ display: 'flex', gap: '4rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.875rem' }}>
                  {t('landing.footerProduct')}
                </p>
                {[
                  { href: '/chat',      label: t('landing.footerChat') },
                  { href: '/research',  label: t('landing.footerResearch') },
                  { href: '/data-lab',  label: t('landing.footerDataLab') },
                  { href: '/dashboard', label: t('landing.footerDashboard') },
                ].map(l => (
                  <Link key={l.href} href={l.href} style={{ display: 'block', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8125rem', color: '#B4BCCB', textDecoration: 'none', marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
                    {l.label}
                  </Link>
                ))}
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.875rem' }}>
                  {t('landing.footerCompany')}
                </p>
                {[
                  { href: '/pricing',    label: t('landing.footerPricing') },
                  { href: '/login?mode=register',    label: t('landing.footerGetStarted') },
                ].map(l => (
                  <Link key={l.href} href={l.href} style={{ display: 'block', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8125rem', color: '#B4BCCB', textDecoration: 'none', marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
                    {l.label}
                  </Link>
                ))}
              </div>
              {/* Legal — required for payment-provider verification; the review
                  team checks these are reachable from the public site. */}
              <div>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#D4AF37', marginBottom: '0.875rem' }}>
                  Legal
                </p>
                {[
                  { href: '/terms',   label: 'Terms of Service' },
                  { href: '/privacy', label: 'Privacy Policy' },
                  { href: '/refund',  label: 'Refund Policy' },
                  { href: '/contact', label: 'Contact' },
                ].map(l => (
                  <Link key={l.href} href={l.href} style={{ display: 'block', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8125rem', color: '#B4BCCB', textDecoration: 'none', marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Copyright + Est. */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#D4AF37', marginBottom: '0.25rem' }}>
                {t('landing.est')}
              </p>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.75rem', color: '#8A93A6', letterSpacing: '0.04em' }}>
                © {new Date().getFullYear()} Sail AI+
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
