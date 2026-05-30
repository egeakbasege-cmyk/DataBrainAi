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
 *   • Ink: #0C0C0E · Canvas: #FAFAF8 · Champagne: #C9A96E
 *   • Teal: #14B8A6 · Slate: #71717A · Silver: #A1A1AA
 */

import React, { useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, useInView, animate } from 'framer-motion'
import { Nav } from '@/components/Nav'
import { Logo } from '@/components/Logo'
import { CompassRose, EngravedSailboat } from '@/components/Ornaments'
import { TopoBackground } from '@/components/TopoBackground'
import { ProductWalkthrough } from '@/components/ProductWalkthrough'
import { SectionDivider, ChampagneRule } from '@/components/SectionDivider'
import { useLanguage } from '@/lib/i18n/LanguageContext'

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
    <div className="sv-eyebrow" style={{ '--eyebrow-color': light ? 'rgba(201,169,110,0.8)' : undefined } as React.CSSProperties}>
      <span className="sv-eyebrow-label" style={{ color: light ? 'rgba(201,169,110,0.8)' : undefined }}>
        {label}
      </span>
    </div>
  )
}

// ── Infinite marquee band ──────────────────────────────────────
const MARQUEE_ITEMS = [
  'Groq 70B · Live Intelligence',
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
  const dotCol  = dark ? 'rgba(201,169,110,0.5)'  : '#C9A96E'

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
              fontFamily:    'Inter, sans-serif',
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

// ── Mode card ──────────────────────────────────────────────────
function ModeCard({
  badge, name, color, bg, border, icon, desc, detail,
}: {
  badge:  string; name: string; color: string; bg: string
  border: string; icon: React.ReactNode; desc: string; detail: string
}) {
  return (
    <div
      className="hover-lift"
      style={{
        padding:       '2.25rem',
        background:    bg,
        border:        `1px solid ${border}`,
        borderRadius:  '12px',
        display:       'flex',
        flexDirection: 'column',
        height:        '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div
          className="mode-icon-box"
          style={{
            width: 34, height: 34, borderRadius: '8px',
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            border: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {icon}
        </div>
        <div>
          <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.2rem', fontWeight: 700, color, display: 'block', lineHeight: 1.1 }}>
            {name}
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color, opacity: 0.6 }}>
            {badge}
          </span>
        </div>
      </div>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', lineHeight: 1.78, color: '#0C0C0E', fontWeight: 300, marginBottom: '1rem', flex: 1 }}>
        {desc}
      </p>
      <div style={{ height: 1, background: border, marginBottom: '0.875rem' }} />
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', lineHeight: 1.6, margin: 0 }}>
        {detail}
      </p>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────
export default function LandingPage() {
  const { t } = useLanguage()
  const { scrollY } = useScroll()

  // Parallax transforms for hero sailboat
  const sailboatY = useTransform(scrollY, [0, 500], [0, -70])
  const heroImgOp = useTransform(scrollY, [0, 350], [0.3, 0.08])

  const STAT_PILLS  = [t('landing.stat1'), t('landing.stat2'), t('landing.stat3')]
  const TRUST_CUES  = [t('landing.trust1'), t('landing.trust2'), t('landing.trust3')]
  const headlineWords = t('landing.headline').split(' ')

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
    <main style={{ background: '#FAFAF8', paddingBottom: '0' }}>
      <Nav />

      {/* ══════════════════════════════════════════════
          SECTION 1 — HERO
          Dark full-bleed. Word-by-word headline stagger.
          Sailboat has parallax drift on scroll.
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#0C0C0E', paddingBottom: 0, position: 'relative', overflow: 'hidden' }}>
        <TopoBackground />

        {/* Grid overlay */}
        <div className="sv-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none', zIndex: 2 }} />

        {/* Parallax hero image */}
        <motion.img
          src="/sail-vertical.svg"
          alt=""
          aria-hidden="true"
          style={{
            position:       'absolute',
            inset:          0,
            width:          '100%',
            height:         '100%',
            objectFit:      'contain',
            objectPosition: 'center center',
            opacity:        heroImgOp,
            pointerEvents:  'none',
            userSelect:     'none',
            zIndex:         3,
            y:              sailboatY,
          }}
        />

        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-24 md:pt-32 pb-20 md:pb-28" style={{ position: 'relative', zIndex: 10 }}>

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2.25rem' }}
          >
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A96E' }}>
              {t('landing.eyebrow')}
            </span>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(201,169,110,0.4), transparent)' }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)' }}>
              {t('landing.est')}
            </span>
          </motion.div>

          {/* Headline — word-by-word stagger */}
          <motion.h1
            variants={stagger(0.08)}
            initial="hidden"
            animate="show"
            style={{
              fontFamily:    'Cormorant Garamond, Georgia, serif',
              fontSize:      'clamp(3.5rem, 7.5vw, 6.5rem)',
              fontWeight:    600,
              fontStyle:     'italic',
              lineHeight:    1.03,
              letterSpacing: '-0.02em',
              color:         '#FFFFFF',
              maxWidth:      '15ch',
              margin:        0,
            }}
          >
            {headlineWords.map((word, i) => (
              <motion.span
                key={i}
                variants={wordVar}
                style={{ display: 'inline-block', marginRight: '0.28em' }}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.52, ease: EASE }}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.9375rem',
              lineHeight: 1.78,
              color:      'rgba(255,255,255,0.48)',
              maxWidth:   '46ch',
              marginTop:  '2rem',
              fontWeight: 300,
            }}
          >
            {t('landing.subheadline')}
          </motion.p>

          {/* Stat pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.68, ease: EASE }}
            style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '2rem' }}
          >
            {STAT_PILLS.map(pill => (
              <span
                key={pill}
                style={{
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.67rem',
                  fontWeight:    500,
                  letterSpacing: '0.05em',
                  color:         'rgba(255,255,255,0.55)',
                  background:    'rgba(255,255,255,0.055)',
                  border:        '1px solid rgba(255,255,255,0.09)',
                  borderRadius:  '2px',
                  padding:       '0.3rem 0.75rem',
                  whiteSpace:    'nowrap',
                }}
              >
                {pill}
              </span>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.82, ease: EASE }}
            style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}
          >
            <Link href="/welcome" className="btn-primary">
              {t('landing.beginFree')}
            </Link>
            <a href="#tutorial" className="btn-ghost-white" style={{ textDecoration: 'none' }}>
              {t('landing.watchHow')}
            </a>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.1 }}
            style={{ marginTop: '0.875rem', fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em' }}
          >
            {t('landing.freeNote')}
          </motion.p>

          {/* Trust cues */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.55, delay: 1.2 }}
            style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}
          >
            {TRUST_CUES.map(cue => (
              <span key={cue} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>
                {cue}
              </span>
            ))}
          </motion.div>

          {/* Decorative sailboat — parallax Y applied to inner div */}
          <motion.div
            style={{ y: sailboatY }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.28 }}
            transition={{ duration: 1.2, delay: 0.6 }}
          >
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '3rem', pointerEvents: 'none', transform: 'scale(1.1)', transformOrigin: 'right bottom' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position:     'absolute',
                  inset:        0,
                  borderRadius: '50%',
                  background:   'radial-gradient(circle 200px, rgba(20,184,166,0.18) 0%, transparent 70%)',
                  pointerEvents:'none',
                }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CompassRose size={260} color="#C9A96E" opacity={0.35} />
                </div>
                <EngravedSailboat size={200} color="#FFFFFF" opacity={0.7} />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Diagonal divider: dark hero → white ─────── */}
      <SectionDivider from="#0C0C0E" to="#FFFFFF" direction="down-right" height={52} />

      {/* ── Marquee Band 1 ───────────────────────────── */}
      <MarqueeBand />

      {/* ══════════════════════════════════════════════
          SECTION 2 — HOW IT WORKS
          White. Staggered 3-column grid.
          Oversized decorative numbers (Swiss typographic anchors).
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-28">

          {/* Section header */}
          <motion.div
            variants={stagger()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            style={{ marginBottom: '4.5rem' }}
          >
            <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
              <div style={{ width: 28, height: 1, background: '#C9A96E', opacity: 0.6 }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A96E' }}>
                {t('landing.methodology')}
              </span>
            </motion.div>
            <motion.h2
              variants={fadeUp}
              style={{
                fontFamily:    'Cormorant Garamond, Georgia, serif',
                fontStyle:     'italic',
                fontSize:      'clamp(1.75rem, 3.5vw, 2.75rem)',
                fontWeight:    600,
                color:         '#0C0C0E',
                letterSpacing: '-0.02em',
                lineHeight:    1.15,
                maxWidth:      '22ch',
                margin:        0,
              }}
            >
              {t('landing.how1title') && 'Three steps. One sovereign intelligence layer.'}
            </motion.h2>
          </motion.div>

          {/* 3-column How grid */}
          <motion.div
            variants={stagger(0.08)}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-60px' }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 0 }}
          >
            {HOW.map((h, i) => (
              <motion.div
                key={h.n}
                variants={fadeUp}
                className="hover-lift"
                style={{
                  padding:      '2.5rem 2rem 2.5rem',
                  borderRight:  i < HOW.length - 1 ? '1px solid rgba(0,0,0,0.09)' : 'none',
                  borderLeft:   i === 0 ? '1px solid rgba(0,0,0,0.09)' : 'none',
                  borderTop:    '1px solid rgba(0,0,0,0.09)',
                  borderBottom: '1px solid rgba(0,0,0,0.09)',
                  display:      'flex',
                  flexDirection:'column',
                }}
              >
                {/* Big decorative number — Swiss typographic anchor */}
                <span style={{
                  fontFamily:    'Cormorant Garamond, Georgia, serif',
                  fontSize:      'clamp(4.5rem, 8vw, 7rem)',
                  fontWeight:    700,
                  color:         'rgba(0,0,0,0.04)',
                  lineHeight:    0.9,
                  display:       'block',
                  marginBottom:  '1.75rem',
                  letterSpacing: '-0.03em',
                  userSelect:    'none',
                }}>
                  {h.n}
                </span>

                {/* Teal accent stroke */}
                <div style={{ width: 20, height: 2, background: 'var(--sv-teal)', marginBottom: '1.25rem', borderRadius: 1 }} />

                <h4 style={{
                  fontFamily: 'Cormorant Garamond, Georgia, serif',
                  fontSize:   '1.25rem',
                  fontWeight: 600,
                  color:      '#0C0C0E',
                  marginBottom:'0.75rem',
                  lineHeight: 1.25,
                }}>
                  {h.title}
                </h4>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize:   '0.875rem',
                  lineHeight: 1.78,
                  color:      '#71717A',
                  fontWeight: 300,
                  flex:       1,
                }}>
                  {h.body}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA link */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.3, ease: EASE }}
            style={{ marginTop: '3rem', textAlign: 'center' }}
          >
            <Link
              href="/login"
              className="link-editorial"
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
              {t('landing.startNow')} →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 3 — TUTORIAL (ProductWalkthrough)
          Already has its own premium animation system.
      ══════════════════════════════════════════════ */}
      <ProductWalkthrough />

      {/* ── Diagonal divider: dark video → light ─────── */}
      <SectionDivider from="#08090D" to="#F4F4F2" direction="down-left" height={52} />

      {/* ── Marquee Band 2 ───────────────────────────── */}
      <MarqueeBand />

      {/* ══════════════════════════════════════════════
          SECTION 4 — INTELLIGENCE MODES
          Light canvas. Stagger 3 cards.
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FAFAF8', borderTop: '1px solid rgba(0,0,0,0.07)', position: 'relative', overflow: 'hidden' }}>
        <div className="sv-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.35, pointerEvents: 'none' }} />

        <div className="max-w-6xl mx-auto px-6 md:px-10 py-24" style={{ position: 'relative' }}>

          {/* Header */}
          <motion.div
            variants={stagger()}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            style={{ marginBottom: '3.5rem' }}
          >
            <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
              <div style={{ width: 28, height: 1, background: '#C9A96E', opacity: 0.6 }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A96E' }}>
                {t('landing.intelligenceModes')}
              </span>
            </motion.div>
            <motion.p variants={fadeUp} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#71717A', fontWeight: 300, maxWidth: '52ch', lineHeight: 1.75 }}>
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
                color="#1A5276"
                bg="rgba(26,82,118,0.04)"
                border="rgba(26,82,118,0.15)"
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
            </motion.div>

            {/* SAIL */}
            <motion.div variants={fadeUp} className="mode-card-sv">
              <ModeCard
                badge={t('landing.sailBadge')}
                name="SAIL"
                color="#7C3AED"
                bg="rgba(124,58,237,0.04)"
                border="rgba(124,58,237,0.15)"
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
            </motion.div>

            {/* Operator */}
            <motion.div variants={fadeUp} className="mode-card-sv">
              <ModeCard
                badge={t('landing.operatorBadge')}
                name="Operator"
                color="#CC2200"
                bg="rgba(204,34,0,0.03)"
                border="rgba(204,34,0,0.18)"
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
              {t('landing.exploreAllModes')} →
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 5 — SAMPLE OUTCOMES
          Off-white. Stagger rows. Hover highlight.
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-24">

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
                <div style={{ width: 28, height: 1, background: '#C9A96E', opacity: 0.6 }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A96E' }}>
                  {t('landing.indicativeOutputs')}
                </span>
              </div>
              <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#A1A1AA' }}>
                {t('landing.realisticProjections')}
              </span>
            </motion.div>
          </motion.div>

          <div style={{ height: 1, background: 'rgba(0,0,0,0.09)', marginBottom: 0 }} />

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
                  padding:             '2rem 0.5rem',
                  borderBottom:        '1px solid rgba(0,0,0,0.07)',
                  borderRadius:        '6px',
                }}
              >
                <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '0.875rem', color: 'var(--sv-teal)', fontWeight: 600, paddingLeft: '0.25rem' }}>
                  ◈ {c.n}
                </span>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.625rem' }}>
                    <span style={{
                      fontFamily:    'Inter, sans-serif',
                      fontSize:      '0.62rem',
                      fontWeight:    700,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color:         '#0C0C0E',
                      padding:       '2px 8px',
                      border:        '1px solid rgba(0,0,0,0.12)',
                      borderRadius:  '2px',
                    }}>
                      {c.sector}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1rem, 1.5vw, 1.15rem)', color: '#0C0C0E', lineHeight: 1.4, marginBottom: '0.4rem' }}>
                    {c.headline}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#71717A', lineHeight: 1.6 }}>
                    {c.detail}
                  </p>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(1.3rem, 2.2vw, 1.75rem)', fontWeight: 700, color: '#C9A96E', lineHeight: 1, display: 'block', letterSpacing: '-0.01em' }}>
                    <AnimatedCounter value={c.outcome} />
                  </span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#A1A1AA', display: 'block', marginTop: '0.25rem' }}>
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
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#A1A1AA', lineHeight: 1.6, marginTop: '1.5rem', maxWidth: '60ch' }}
          >
            {t('landing.disclaimer')}
          </motion.p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 6 — CTA DARK
          Premium dark banner. Fade-up text + button.
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#0C0C0E', position: 'relative', overflow: 'hidden' }}>
        <TopoBackground />
        <div className="sv-grid-bg" style={{ position: 'absolute', inset: 0, opacity: 0.3, pointerEvents: 'none', zIndex: 2 }} />

        {/* Radial champagne glow */}
        <div style={{
          position:      'absolute',
          top:           '50%',
          left:          '50%',
          transform:     'translate(-50%, -50%)',
          width:         '70vw',
          height:        '50vh',
          background:    'radial-gradient(ellipse, rgba(201,169,110,0.07) 0%, transparent 65%)',
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
                <div style={{ width: 28, height: 1, background: 'rgba(201,169,110,0.5)' }} />
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(201,169,110,0.7)' }}>
                  {t('landing.eyebrow')}
                </span>
              </motion.div>
              <motion.h2 variants={fadeUp} style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.75rem, 3.5vw, 2.75rem)', color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '1rem' }}>
                {t('landing.ctaHeadline')}
              </motion.h2>
              <motion.p variants={fadeUp} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: 'rgba(255,255,255,0.35)', fontWeight: 300, lineHeight: 1.75, maxWidth: '42ch' }}>
                {t('landing.ctaBody')}
              </motion.p>
            </div>
            <motion.div variants={fadeUp} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem', alignItems: 'flex-start' }}>
              <Link href="/welcome" className="btn-primary" style={{ background: '#C9A96E', borderColor: '#C9A96E', color: '#0C0C0E' }}>
                {t('landing.beginBtn')}
              </Link>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em' }}>
                {t('landing.freeNote')}
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SECTION 7 — FOOTER
          Clean. Swiss. Brand mark + nav links.
      ══════════════════════════════════════════════ */}
      <footer style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.09)' }}>
        <div className="champagne-rule" />

        <div className="max-w-6xl mx-auto px-6 md:px-10 py-10">
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'start', gap: '3rem', flexWrap: 'wrap' }}>

            {/* Brand */}
            <div>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', marginBottom: '0.75rem' }}>
                <Logo size={28} />
                <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 700, color: '#0C0C0E', fontSize: '0.9rem', letterSpacing: '0.1em' }}>
                  SAIL AI
                </span>
              </Link>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#A1A1AA', lineHeight: 1.6, maxWidth: '24ch', fontWeight: 300 }}>
                {t('landing.footerTagline')}
              </p>
            </div>

            {/* Nav columns */}
            <div style={{ display: 'flex', gap: '4rem', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '0.875rem' }}>
                  {t('landing.footerProduct')}
                </p>
                {[
                  { href: '/chat',      label: t('landing.footerChat') },
                  { href: '/research',  label: t('landing.footerResearch') },
                  { href: '/data-lab',  label: t('landing.footerDataLab') },
                  { href: '/dashboard', label: t('landing.footerDashboard') },
                ].map(l => (
                  <Link key={l.href} href={l.href} style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#71717A', textDecoration: 'none', marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
                    {l.label}
                  </Link>
                ))}
              </div>
              <div>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '0.875rem' }}>
                  {t('landing.footerCompany')}
                </p>
                {[
                  { href: '/pricing',    label: t('landing.footerPricing') },
                  { href: '/welcome',    label: t('landing.footerGetStarted') },
                ].map(l => (
                  <Link key={l.href} href={l.href} style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#71717A', textDecoration: 'none', marginBottom: '0.5rem', letterSpacing: '0.02em' }}>
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Copyright + Est. */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.85rem', color: '#C9A96E', marginBottom: '0.25rem' }}>
                {t('landing.est')}
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#A1A1AA', letterSpacing: '0.04em' }}>
                © {new Date().getFullYear()} Sail AI
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  )
}
