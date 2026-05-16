'use client'

import React from 'react'
import Link from 'next/link'
import { Nav } from '@/components/Nav'
import { Logo } from '@/components/Logo'
import { CompassRose, EngravedSailboat } from '@/components/Ornaments'
import { TopoBackground } from '@/components/TopoBackground'
import { ProductWalkthrough } from '@/components/ProductWalkthrough'
import { useLanguage } from '@/lib/i18n/LanguageContext'

/* ── Arrays moved inside LandingPage to use t() ─────── */

/* ── Divider ─────────────────────────────────────── */
function Rule() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.09)' }} />
}

/* ── Mode card ───────────────────────────────────── */
function ModeCard({
  badge, name, color, bg, border, icon, desc, detail,
}: {
  badge:  string
  name:   string
  color:  string
  bg:     string
  border: string
  icon:   React.ReactNode
  desc:   string
  detail: string
}) {
  return (
    <div
      style={{
        padding:      '1.75rem',
        background:   bg,
        border:       `1px solid ${border}`,
        borderRadius: '10px',
        display:      'flex',
        flexDirection:'column',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1rem' }}>
        <div style={{
          width: 32, height: 32, borderRadius: '6px',
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          border: `1px solid ${border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {icon}
        </div>
        <div>
          <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.15rem', fontWeight: 700, color, display: 'block', lineHeight: 1.1 }}>
            {name}
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color, opacity: 0.65 }}>
            {badge}
          </span>
        </div>
      </div>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', lineHeight: 1.7, color: '#0C0C0E', fontWeight: 300, marginBottom: '0.875rem', flex: 1 }}>
        {desc}
      </p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.73rem', color: '#71717A', lineHeight: 1.5, borderTop: `1px solid ${border}`, paddingTop: '0.75rem', margin: 0 }}>
        {detail}
      </p>
    </div>
  )
}

export default function LandingPage() {
  const { t } = useLanguage()

  const STAT_PILLS = [t('landing.stat1'), t('landing.stat2'), t('landing.stat3')]

  const TRUST_CUES = [t('landing.trust1'), t('landing.trust2'), t('landing.trust3')]

  const HOW = [
    { n: '01', title: t('landing.how1title'), body: t('landing.how1body') },
    { n: '02', title: t('landing.how2title'), body: t('landing.how2body') },
    { n: '03', title: t('landing.how3title'), body: t('landing.how3body') },
  ]

  const CASES = [
    { n: '01', sector: t('landing.case1sector'), headline: t('landing.case1headline'), detail: t('landing.case1detail'), outcome: t('landing.case1outcome') },
    { n: '02', sector: t('landing.case2sector'), headline: t('landing.case2headline'), detail: t('landing.case2detail'), outcome: t('landing.case2outcome') },
    { n: '03', sector: t('landing.case3sector'), headline: t('landing.case3headline'), detail: t('landing.case3detail'), outcome: t('landing.case3outcome') },
  ]

  return (
    <main style={{ background: '#FAFAF8', paddingBottom: '6rem' }}>
      <Nav />

      {/* ══════════════════════════════════════════════
          SECTION 1: HERO
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#0C0C0E', paddingBottom: 0, position: 'relative', overflow: 'hidden' }}>
        <TopoBackground />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sail-vertical.jpg"
          alt=""
          aria-hidden="true"
          style={{
            position:       'absolute',
            inset:          0,
            width:          '100%',
            height:         '100%',
            objectFit:      'contain',
            objectPosition: 'center center',
            opacity:        0.32,
            pointerEvents:  'none',
            userSelect:     'none',
            zIndex:         3,
          }}
        />

        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-20 md:pt-28" style={{ position: 'relative', zIndex: 10 }}>

          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A96E' }}>
              {t('landing.eyebrow')}
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(201,169,110,0.2)' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>
              Est. 2024
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily:    'Cormorant Garamond, Georgia, serif',
              fontSize:      'clamp(3.5rem, 7vw, 6rem)',
              fontWeight:    600,
              fontStyle:     'italic',
              lineHeight:    1.04,
              letterSpacing: '-0.025em',
              color:         '#FFFFFF',
              maxWidth:      '16ch',
            }}
          >
            {t('landing.headline')}
          </h1>

          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '1rem',
              lineHeight: 1.75,
              color:      'rgba(255,255,255,0.5)',
              maxWidth:   '48ch',
              marginTop:  '1.75rem',
              fontWeight: 300,
            }}
          >
            {t('landing.subheadline')}
          </p>

          {/* Stat pills */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '2rem' }}>
            {STAT_PILLS.map(pill => (
              <span
                key={pill}
                style={{
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.68rem',
                  fontWeight:    500,
                  letterSpacing: '0.04em',
                  color:         'rgba(255,255,255,0.6)',
                  background:    'rgba(255,255,255,0.06)',
                  border:        '1px solid rgba(255,255,255,0.1)',
                  borderRadius:  '2px',
                  padding:       '0.3rem 0.75rem',
                  whiteSpace:    'nowrap',
                }}
              >
                {pill}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ marginTop: '1.75rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href="/welcome" className="btn-primary">
              {t('landing.beginFree')}
            </Link>
            <a
              href="#tutorial"
              className="btn-ghost-white"
              style={{ textDecoration: 'none' }}
            >
              {t('landing.watchHow')}
            </a>
          </div>

          <p style={{ marginTop: '1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
            {t('landing.freeNote')}
          </p>

          {/* Trust cues */}
          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            {TRUST_CUES.map(cue => (
              <span key={cue} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.06em' }}>
                {cue}
              </span>
            ))}
          </div>

          {/* Decorative sailboat */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '3rem', opacity: 0.28, pointerEvents: 'none', transform: 'scale(1.1)', transformOrigin: 'right bottom' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CompassRose size={260} color="#C9A96E" opacity={0.4} />
              </div>
              <EngravedSailboat size={200} color="#FFFFFF" opacity={0.7} />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 2: HOW IT WORKS
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.09)', borderBottom: '1px solid rgba(0,0,0,0.09)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3.5rem' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#71717A' }}>
              {t('landing.methodology')}
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.09)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0' }}>
            {HOW.map((h, i) => (
              <div
                key={h.n}
                style={{
                  padding:      '2rem',
                  borderRight:  i < HOW.length - 1 ? '1px solid rgba(0,0,0,0.09)' : 'none',
                  borderLeft:   i === 0 ? '1px solid rgba(0,0,0,0.09)' : 'none',
                  borderTop:    '1px solid rgba(0,0,0,0.09)',
                  borderBottom: '1px solid rgba(0,0,0,0.09)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2.5rem', fontWeight: 700, color: 'rgba(0,0,0,0.06)', lineHeight: 1 }}>
                    {h.n}
                  </span>
                  <div style={{ width: 24, height: 2, background: '#C9A96E', marginTop: '1rem' }} />
                </div>
                <h4 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.15rem', fontWeight: 600, color: '#0C0C0E', marginBottom: '0.625rem' }}>
                  {h.title}
                </h4>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', lineHeight: 1.75, color: '#71717A', fontWeight: 300 }}>
                  {h.body}
                </p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
            <Link
              href="/login"
              style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.78rem',
                fontWeight:    600,
                letterSpacing: '0.06em',
                color:         '#0C0C0E',
                textDecoration:'none',
                borderBottom:  '1px solid rgba(0,0,0,0.25)',
                paddingBottom: '2px',
              }}
            >
              {t('landing.startNow')}
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 3: TUTORIAL VIDEO
      ══════════════════════════════════════════════ */}
      <ProductWalkthrough />

      {/* ══════════════════════════════════════════════
          SECTION 4: INTELLIGENCE MODES (simplified — 3 modes)
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FAFAF8', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.625rem' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#71717A' }}>
              {t('landing.intelligenceModes')}
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.09)' }} />
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.825rem', color: '#71717A', fontWeight: 300, marginBottom: '2.5rem', maxWidth: '52ch' }}>
            {t('landing.modesCount')}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>

            {/* Upwind */}
            <ModeCard
              badge={t('landing.upwindBadge')}
              name="Upwind"
              color="#1A5276"
              bg="rgba(26,82,118,0.05)"
              border="rgba(26,82,118,0.18)"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3L12 19L4 19Z" fill="#1A5276" opacity="0.85"/>
                  <path d="M12 3L12 19L20 12Z" fill="#1A5276" opacity="0.3"/>
                  <line x1="12" y1="2" x2="12" y2="20" stroke="#1A5276" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M5 19Q12 22 19 19" stroke="#1A5276" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              }
              desc={t('landing.upwindDesc')}
              detail={t('landing.upwindDetail')}
            />

            {/* SAIL */}
            <ModeCard
              badge={t('landing.sailBadge')}
              name="SAIL"
              color="#7C3AED"
              bg="rgba(124,58,237,0.05)"
              border="rgba(124,58,237,0.18)"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3C18 5 22 11 20 19L12 19Z" fill="#7C3AED" opacity="0.85"/>
                  <path d="M12 8C16 9 18 14 17 19L12 19Z" fill="#7C3AED" opacity="0.4"/>
                  <line x1="12" y1="2" x2="12" y2="20" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M5 19Q12 22 19 19" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  <circle cx="5" cy="6" r="1.8" fill="#7C3AED" opacity="0.6"/>
                </svg>
              }
              desc={t('landing.sailDesc')}
              detail={t('landing.sailDetail')}
            />

            {/* Operator */}
            <ModeCard
              badge={t('landing.operatorBadge')}
              name="Operator"
              color="#CC2200"
              bg="rgba(204,34,0,0.04)"
              border="rgba(204,34,0,0.2)"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#CC2200" strokeWidth="1.4" opacity="0.4"/>
                  <circle cx="12" cy="12" r="3" fill="#CC2200" opacity="0.9"/>
                  <line x1="12" y1="3" x2="12" y2="7" stroke="#CC2200" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="12" y1="17" x2="12" y2="21" stroke="#CC2200" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="3" y1="12" x2="7" y2="12" stroke="#CC2200" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="17" y1="12" x2="21" y2="12" stroke="#CC2200" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              }
              desc={t('landing.operatorDesc')}
              detail={t('landing.operatorDetail')}
            />
          </div>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Link
              href="/chat"
              style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.75rem',
                fontWeight:    500,
                color:         '#71717A',
                textDecoration:'none',
                borderBottom:  '1px solid rgba(0,0,0,0.15)',
                paddingBottom: '2px',
                letterSpacing: '0.03em',
              }}
            >
              {t('landing.exploreAllModes')}
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 5: SAMPLE OUTCOMES
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FAFAF8' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#71717A' }}>
              {t('landing.indicativeOutputs')}
            </span>
            <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#71717A' }}>
              {t('landing.realisticProjections')}
            </span>
          </div>

          <Rule />

          {CASES.map(c => (
            <div
              key={c.n}
              style={{
                display:             'grid',
                gridTemplateColumns: '2.5rem 1fr auto',
                gap:                 '1.5rem',
                alignItems:          'center',
                padding:             '1.75rem 0',
                borderBottom:        '1px solid rgba(0,0,0,0.07)',
              }}
            >
              <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '0.8rem', color: '#D4D4D8', fontWeight: 600 }}>
                {c.n}
              </span>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#0C0C0E', padding: '2px 8px', border: '1px solid rgba(0,0,0,0.14)' }}>
                    {c.sector}
                  </span>
                </div>
                <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: '#0C0C0E', lineHeight: 1.4, marginBottom: '0.375rem' }}>
                  {c.headline}
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#71717A', lineHeight: 1.5 }}>
                  {c.detail}
                </p>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', fontWeight: 700, color: '#C9A96E', lineHeight: 1, display: 'block' }}>
                  {c.outcome}
                </span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#71717A', display: 'block', marginTop: '0.2rem' }}>
                  {t('landing.estOutcome')}
                </span>
              </div>
            </div>
          ))}

          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#A1A1AA', lineHeight: 1.6, marginTop: '1.25rem', maxWidth: '60ch' }}>
            {t('landing.disclaimer')}
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 6: CTA DARK
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#0C0C0E', position: 'relative', overflow: 'hidden' }}>
        <TopoBackground />
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20" style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative', zIndex: 10 }}>
          <Rule />
          <div style={{ paddingTop: '3rem', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                {t('landing.ctaHeadline')}
              </h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: 'rgba(255,255,255,0.38)', fontWeight: 300 }}>
                {t('landing.ctaBody')}
              </p>
            </div>
            <Link href="/welcome" className="btn-ghost-white" style={{ flexShrink: 0 }}>
              {t('landing.beginBtn')}
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 7: FOOTER
      ══════════════════════════════════════════════ */}
      <footer style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.09)', padding: '1.75rem 0' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Logo size={30} />
            <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 600, color: '#0C0C0E', fontSize: '0.875rem', letterSpacing: '0.08em' }}>
              SAIL AI
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <Link href="/chat" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', textDecoration: 'none', letterSpacing: '0.05em' }}>
              {t('landing.footerChat')}
            </Link>
            <Link href="/research" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', textDecoration: 'none', letterSpacing: '0.05em' }}>
              {t('landing.footerResearch')}
            </Link>
            <Link href="/dashboard" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', textDecoration: 'none', letterSpacing: '0.05em' }}>
              {t('landing.footerDashboard')}
            </Link>
            <Link href="/pricing" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', textDecoration: 'none', letterSpacing: '0.05em' }}>
              {t('landing.footerPricing')}
            </Link>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#A1A1AA', letterSpacing: '0.04em' }}>
              © {new Date().getFullYear()} Sail AI
            </span>
          </div>
        </div>
      </footer>
    </main>
  )
}
