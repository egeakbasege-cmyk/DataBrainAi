'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Nav } from '@/components/Nav'
import { Logo } from '@/components/Logo'
import { MicroAnalysis } from '@/components/MicroAnalysis'
import { CompassRose, EngravedSailboat } from '@/components/Ornaments'
import { AgentModeButton } from '@/components/AgentModeButton'
import { TopoBackground } from '@/components/TopoBackground'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { AgentMode } from '@/types/chat'

/* ── Realistic outcome examples ───────────────────────
   Copy principles: measurable, qualified, no superlatives.
   All projections are time-bounded and verifiable.         */
const CASES = [
  {
    n:       '01',
    sector:  'E-Commerce',
    headline:'Structured checkout optimisation to close a 0.8-point conversion gap',
    detail:  'Median sector CVR: 2.3% · Client starting point: 1.5% · 90-day horizon',
    outcome: '+0.8pp CVR',
  },
  {
    n:       '02',
    sector:  'B2B SaaS',
    headline:'Onboarding sequence redesign to reduce month-1 churn from 12% to below 8%',
    detail:  'OpenView benchmark for sub-$2M ARR: 7–9% monthly churn · 60-day implementation',
    outcome: '−4pp churn',
  },
  {
    n:       '03',
    sector:  'Professional Services',
    headline:'Referral programme implementation targeting 20% of new clients from existing base',
    detail:  'Industry average referral rate: 18–22% of new business · Standard payback: <45 days',
    outcome: '+20% new clients',
  },
]

const HOW = [
  {
    n:     '01',
    title: 'Describe your situation',
    body:  'Provide your sector, one or two key metrics, and the primary constraint you are working against. Plain language is sufficient.',
  },
  {
    n:     '02',
    title: 'Receive a benchmarked analysis',
    body:  'The system retrieves relevant industry benchmarks, compares your position, and identifies the highest-leverage action available to you.',
  },
  {
    n:     '03',
    title: 'A clear, executable plan',
    body:  'Three specific actions with defined timeframes, a realistic 30-day target, and the single risk most likely to undermine execution.',
  },
]

/* ── Preset action scenarios ─────────────────────────── */
interface Preset {
  id:        string
  label:     string
  sector:    string
  problem:   string
  insight:   string
  source:    string
  agent:     AgentMode
  bars: { label: string; value: number; target: number; unit: string; lowerIsBetter?: boolean }[]
}

const PRESETS: Preset[] = [
  {
    id:      'ecom-cvr',
    label:   'E-Commerce CVR',
    sector:  'E-Commerce',
    problem: 'Checkout abandonment is keeping conversion below the sector median.',
    insight: 'Simplifying checkout to 3 steps and adding one recovery email sequence can close a 7.8-point abandonment gap within 90 days.',
    source:  'Baymard Institute, 2024',
    agent:   'analysis',
    bars: [{ label: 'Your position', value: 78, target: 70.2, unit: '%', lowerIsBetter: true }],
  },
  {
    id:      'saas-churn',
    label:   'B2B SaaS Churn',
    sector:  'B2B SaaS',
    problem: 'Month-1 churn is compounding ARR erosion beyond the OpenView benchmark.',
    insight: 'Improving onboarding activation to reach the 7–9% benchmark from 12% recovers roughly £1,400 of ARR per 100 users monthly.',
    source:  'OpenView Partners, 2024',
    agent:   'strategy',
    bars: [{ label: 'Monthly churn', value: 12, target: 8, unit: '%', lowerIsBetter: true }],
  },
  {
    id:      'agency-pipeline',
    label:   'Agency Pipeline',
    sector:  'Professional Services',
    problem: 'Revenue concentrated in 2–3 clients creates existential pipeline risk.',
    insight: 'Structured quarterly business reviews reduce involuntary churn by 18–22%. For a 6-client book, that recovers 1–2 retainers annually.',
    source:  'Agency Analytics, 2024',
    agent:   'execution',
    bars: [{ label: 'Referral rate', value: 8, target: 20, unit: '%' }],
  },
  {
    id:      'retail-basket',
    label:   'Retail Basket Size',
    sector:  'Retail',
    problem: 'Average basket size is below category benchmarks.',
    insight: 'A tier-1 loyalty programme increases average basket by 11–14% and visit frequency by 20% over 6 months. Payback period: under 60 days.',
    source:  'KPMG Retail Pulse, 2024',
    agent:   'analysis',
    bars: [{ label: 'Basket uplift', value: 0, target: 13, unit: '%' }],
  },
]

const TRUST_CUES = [
  'Baymard · McKinsey · OpenView · KPMG',
  '12 verified data sources',
  'Quarterly refresh',
]

function BenchmarkBars({ bars }: { bars: Preset['bars'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {bars.map(b => {
        const max   = Math.max(b.value, b.target) * 1.2
        const vPct  = Math.round((b.value  / max) * 100)
        const tPct  = Math.round((b.target / max) * 100)
        const worse = b.lowerIsBetter ? b.value > b.target : b.value < b.target
        return (
          <div key={b.label}>
            <div style={{ display: 'grid', gridTemplateColumns: '8rem 1fr 2.5rem', gap: '0.5rem', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.03em' }}>
                {b.label}
              </span>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ height: '100%', width: `${vPct}%`, background: worse ? '#C07A6A' : '#C9A96E', transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: worse ? '#C07A6A' : '#C9A96E', textAlign: 'right' }}>
                {b.value}{b.unit}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '8rem 1fr 2.5rem', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', letterSpacing: '0.03em' }}>
                Sector median
              </span>
              <div style={{ height: 3, background: 'rgba(255,255,255,0.08)' }}>
                <div style={{ height: '100%', width: `${tPct}%`, background: 'rgba(255,255,255,0.28)', transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', textAlign: 'right' }}>
                {b.target}{b.unit}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── Divider component ───────────────────────────────── */
function Rule() {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.09)' }} />
}

/* ── Mode card — reusable across all 6 grid modes ────── */
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
  const [agentMode,    setAgentMode]    = useState<AgentMode>('auto')
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const selectedPreset = PRESETS.find(p => p.id === activePreset) ?? null

  return (
    <main style={{ background: '#FAFAF8', paddingBottom: '6rem' }}>
      <Nav />

      {/* ══════════════════════════════════════════════
          HERO — Swiss typographic statement
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#0C0C0E', paddingBottom: 0, position: 'relative', overflow: 'hidden' }}>
        {/* Animated topographic contour lines fill the whole section.
            They are especially visible in the empty space on both sides
            of the narrow vertical photo below.                          */}
        <TopoBackground />

        {/* Vertical sail photo — objectFit:contain so the full 592×2000
            image is shown at its natural proportions without any crop or
            zoom.  On any viewport the photo stays centred; the dark
            background + topo animation fill the space on both sides.
            z:3 places it above the topo canvas (z:2).                  */}
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

          {/* Headline grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '3rem' }}>
            <div>
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

              <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/login" className="btn-primary">
                  {t('landing.cta')}
                </Link>
                <Link href="/pricing" className="btn-ghost-white">
                  {t('landing.viewPlans')}
                </Link>
              </div>

              <p style={{ marginTop: '1rem', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
                {t('landing.freeNote')}
              </p>
            </div>
          </div>

          {/* ── First-entry preview experience ────────── */}
          <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>

            {/* Row: label + agent mode selector */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                {t('landing.previewLabel')}
              </p>
              <AgentModeButton value={agentMode} onChange={setAgentMode} variant="dark" />
            </div>

            {/* Preset action chips */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              {PRESETS.map(p => {
                const active = activePreset === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePreset(active ? null : p.id)}
                    style={{
                      padding:       '0.35rem 0.875rem',
                      background:    active ? 'rgba(201,169,110,0.14)' : 'rgba(255,255,255,0.06)',
                      border:        `1px solid ${active ? 'rgba(201,169,110,0.45)' : 'rgba(255,255,255,0.1)'}`,
                      color:         active ? '#C9A96E' : 'rgba(255,255,255,0.5)',
                      fontFamily:    'Inter, sans-serif',
                      fontSize:      '0.7rem',
                      fontWeight:    500,
                      letterSpacing: '0.04em',
                      cursor:        'pointer',
                      borderRadius:  '2px',
                      transition:    'all 0.18s',
                      whiteSpace:    'nowrap',
                    }}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>

            {/* Benchmark insight card or free-text input */}
            <AnimatePresence mode="wait">
              {selectedPreset ? (
                <motion.div
                  key={selectedPreset.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                  style={{
                    background:  'rgba(255,255,255,0.03)',
                    border:      '1px solid rgba(255,255,255,0.09)',
                    borderTop:   '2px solid #C9A96E',
                  }}
                >
                  {/* Card header */}
                  <div style={{ padding: '1rem 1.25rem 0.875rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A96E', padding: '2px 7px', border: '1px solid rgba(201,169,110,0.3)' }}>
                        {selectedPreset.agent}
                      </span>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', padding: '2px 7px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {selectedPreset.sector}
                      </span>
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.03em' }}>
                      Benchmark Engine
                    </span>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '1.25rem' }}>
                    <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(0.95rem, 1.6vw, 1.1rem)', lineHeight: 1.55, color: 'rgba(255,255,255,0.82)', marginBottom: '1.25rem' }}>
                      {selectedPreset.insight}
                    </p>

                    {/* Benchmark bars */}
                    <BenchmarkBars bars={selectedPreset.bars} />

                    {/* Footer */}
                    <div style={{ marginTop: '1.125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
                        {selectedPreset.source}
                      </span>
                      <Link
                        href={`/chat?q=${encodeURIComponent(selectedPreset.problem)}`}
                        style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#C9A96E', textDecoration: 'none', borderBottom: '1px solid rgba(201,169,110,0.35)', paddingBottom: '1px' }}
                      >
                        Full analysis →
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="micro"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <MicroAnalysis />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Trust cues */}
            <div style={{ marginTop: '0.875rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              {TRUST_CUES.map(cue => (
                <span key={cue} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: 'rgba(255,255,255,0.22)', letterSpacing: '0.06em' }}>
                  {cue}
                </span>
              ))}
            </div>
          </div>

          {/* Sailboat visual — decorative, below fold */}
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
          STATS BAR — 4-column, gold accent numbers
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#111318', borderBottom: '1px solid rgba(201,169,110,0.12)' }}>
        <div
          className="max-w-6xl mx-auto px-6 md:px-10"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}
        >
          {[
            { v: '< 60s',   l: t('stats.timeToAnalysis'),      sub: t('stats.timeToAnalysisSub')      },
            { v: '100%',    l: t('stats.benchmarkReferenced'),  sub: t('stats.benchmarkReferencedSub') },
            { v: '5 free',  l: t('stats.analysesIncluded'),     sub: t('stats.analysesIncludedSub')    },
            { v: '3 tiers', l: t('stats.transparentPricing'),   sub: t('stats.transparentPricingSub')  },
          ].map((s, i) => (
            <div
              key={s.l}
              style={{
                padding:      'clamp(1.25rem,3vw,2rem) clamp(1rem,2.5vw,2rem)',
                borderRight:  i < 3 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                display:      'flex',
                flexDirection:'column',
                gap:          '0.15rem',
              }}
            >
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(1.6rem,2.8vw,2.2rem)', fontWeight: 700, letterSpacing: '-0.03em', color: '#C9A96E', lineHeight: 1, margin: 0 }}>
                {s.v}
              </p>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: '0.35rem', display: 'block' }}>
                {s.l}
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.28)', display: 'block' }}>
                {s.sub}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          SAMPLE OUTCOMES
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FAFAF8' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <span className="label-caps">{t('landing.indicativeOutputs')}</span>
            <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: '#71717A' }}>
              {t('landing.realisticProjections')}
            </span>
          </div>

          <Rule />

          {CASES.map((c, i) => (
            <div
              key={c.n}
              style={{
                display:       'grid',
                gridTemplateColumns: '2.5rem 1fr auto',
                gap:           '1.5rem',
                alignItems:    'center',
                padding:       '1.75rem 0',
                borderBottom:  '1px solid rgba(0,0,0,0.07)',
              }}
            >
              {/* Number */}
              <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '0.8rem', color: '#D4D4D8', fontWeight: 600 }}>
                {c.n}
              </span>

              {/* Content */}
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

              {/* Outcome */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: 'clamp(1.2rem, 2vw, 1.6rem)', fontWeight: 700, color: '#C9A96E', lineHeight: 1, display: 'block' }}>
                  {c.outcome}
                </span>
                <span className="label-caps" style={{ display: 'block', marginTop: '0.2rem' }}>{t('landing.estOutcome')}</span>
              </div>
            </div>
          ))}

          {/* Disclaimer */}
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#A1A1AA', lineHeight: 1.6, marginTop: '1.25rem', maxWidth: '60ch' }}>
            Projections are indicative, based on published industry benchmarks. Individual results depend on execution quality and market conditions.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          MODE CARDS — all 7 intelligence modes
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FAFAF8', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.625rem' }}>
            <span className="label-caps">Intelligence Modes</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.09)' }} />
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.825rem', color: '#71717A', fontWeight: 300, marginBottom: '2.5rem', maxWidth: '52ch' }}>
            Seven specialist engines. Each optimised for a different strategic posture — select the one that matches your current situation.
          </p>

          {/* ── Rows 1–3: 2-column grid ─────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>

            {/* ── Upwind ── */}
            <ModeCard
              badge="Direct"
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
              desc="Feed your numbers and get an instant, benchmark-grounded action plan. No clarifying questions — sparse data is filled from sector medians and labelled."
              detail="Best for: operators who know their metrics and need fast execution clarity."
            />

            {/* ── Downwind ── */}
            <ModeCard
              badge="Guided"
              name="Downwind"
              color="#00695C"
              bg="rgba(0,105,92,0.05)"
              border="rgba(0,105,92,0.18)"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M12 4C6 6 3 12 5 19L12 19Z" fill="#00695C" opacity="0.85"/>
                  <path d="M12 4C18 6 21 12 19 19L12 19Z" fill="#00695C" opacity="0.35"/>
                  <line x1="12" y1="3" x2="12" y2="20" stroke="#00695C" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M5 19Q12 22 19 19" stroke="#00695C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                </svg>
              }
              desc="Begin with a diagnostic summary, then follow a Socratic coaching flow. Every recommendation surfaces the reasoning behind it."
              detail="Best for: founders working through ambiguity who want to understand the why."
            />

            {/* ── SAIL ── */}
            <ModeCard
              badge="AI+"
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
              desc="Adaptive intelligence that reads your intent and chooses between analytical depth and coaching dialogue automatically — no mode selection required."
              detail="Best for: users who move between strategic and operational thinking within the same session."
            />

            {/* ── TRIM ── */}
            <ModeCard
              badge="NEW"
              name="TRIM"
              color="#B45309"
              bg="rgba(180,83,9,0.05)"
              border="rgba(201,169,110,0.28)"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <line x1="6" y1="4" x2="6" y2="20" stroke="#B45309" strokeWidth="1.3" strokeLinecap="round" opacity="0.35"/>
                  <circle cx="6" cy="6"  r="2.2" fill="#B45309" opacity="0.9"/>
                  <circle cx="6" cy="12" r="2.2" fill="#B45309" opacity="0.65"/>
                  <circle cx="6" cy="18" r="2.2" fill="#B45309" opacity="0.4"/>
                  <rect x="11" y="5"  width="9" height="2" rx="1" fill="#B45309" opacity="0.85"/>
                  <rect x="11" y="11" width="7" height="2" rx="1" fill="#B45309" opacity="0.65"/>
                  <rect x="11" y="17" width="5" height="2" rx="1" fill="#B45309" opacity="0.45"/>
                </svg>
              }
              desc="Generates a phased strategic timeline — 30, 60, and 90-day milestones with measurable targets. Translates your brief into a locked execution roadmap."
              detail="Best for: leaders who need a structured plan with accountability checkpoints."
            />

            {/* ── Catamaran ── */}
            <ModeCard
              badge="PRO"
              name="Catamaran"
              color="#D4AF37"
              bg="rgba(212,175,55,0.06)"
              border="rgba(212,175,55,0.28)"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 18L6 20L8 18" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M16 18L18 20L20 18" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="6" y1="14" x2="18" y2="14" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1="12" y1="14" x2="12" y2="4" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M8 4C10 6 14 6 16 4" stroke="#D4AF37" strokeWidth="1.3" strokeLinecap="round" fill="none"/>
                </svg>
              }
              desc="Dual-track system overhaul. Market Growth and Customer Experience are analysed in parallel, then unified into a single executable strategy with one 30-day target."
              detail="Best for: scaling businesses facing simultaneous revenue and retention pressure."
            />

            {/* ── Custom Synergy ── */}
            <ModeCard
              badge="HYBRID"
              name="Custom Synergy"
              color="#0891B2"
              bg="rgba(8,145,178,0.05)"
              border="rgba(8,145,178,0.18)"
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="3" stroke="#0891B2" strokeWidth="1.5" fill="rgba(8,145,178,0.2)"/>
                  <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#0891B2" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" stroke="#0891B2" strokeWidth="1.2" strokeLinecap="round" opacity="0.55"/>
                </svg>
              }
              desc="Select 2 to 4 intelligence modes and the system fuses them into a single coherent persona — a personalised AI council with weighted directives and one voice."
              detail="Best for: complex situations that require simultaneous strategic, operational, and coaching lenses."
            />
          </div>

          {/* ── Operator — full-width horizontal panel ──────────── */}
          <div
            style={{
              marginTop:    '1rem',
              padding:      '1.5rem 1.75rem',
              background:   'rgba(204,34,0,0.04)',
              border:       '1px solid rgba(204,34,0,0.2)',
              borderRadius: '10px',
              display:      'flex',
              alignItems:   'flex-start',
              gap:          '1.25rem',
            }}
          >
            {/* Icon + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, minWidth: '9rem' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#CC2200" strokeWidth="1.4" opacity="0.4"/>
                <circle cx="12" cy="12" r="3" fill="#CC2200" opacity="0.9"/>
                <line x1="12" y1="3" x2="12" y2="7" stroke="#CC2200" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="12" y1="17" x2="12" y2="21" stroke="#CC2200" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="3" y1="12" x2="7" y2="12" stroke="#CC2200" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="17" y1="12" x2="21" y2="12" stroke="#CC2200" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div>
                <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.1rem', fontWeight: 700, color: '#CC2200', display: 'block', lineHeight: 1.1 }}>
                  Operator
                </span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#CC2200', opacity: 0.7 }}>
                  Universal
                </span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(204,34,0,0.15)', flexShrink: 0 }} />

            {/* Description */}
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', lineHeight: 1.65, color: '#0C0C0E', fontWeight: 300, margin: '0 0 0.4rem' }}>
                Domain-agnostic intelligence — real estate, law, medicine, finance, logistics. The same benchmark discipline applied to any question, streamed in real time with zero padding.
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', lineHeight: 1.5, margin: 0 }}>
                Best for: cross-domain operators and consultants who switch contexts rapidly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FEATURES ROW — voice, file, export, dashboard
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-16">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <span className="label-caps">Capabilities</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.09)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0' }}>
            {[
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <rect x="9" y="2" width="6" height="11" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                    <line x1="9" y1="22" x2="15" y2="22"/>
                  </svg>
                ),
                title: 'Voice Input',
                body:  'Dictate your situation in English or Turkish. Transcript added directly to the input field.',
              },
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="11" x2="12" y2="17"/>
                    <line x1="9" y1="14" x2="15" y2="14"/>
                  </svg>
                ),
                title: 'File & Image Upload',
                body:  'Attach CSV, XLSX, PDF, or screenshots. Data is parsed and synthesised into the analysis.',
              },
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M4 4h16v2H4z"/><path d="M4 10h10"/><path d="M4 16h7"/>
                    <path d="M15 14l5 5m0-5l-5 5"/>
                  </svg>
                ),
                title: 'Email Export',
                body:  'Send the full strategy report — headline, tactics, benchmarks, targets — directly to your inbox.',
              },
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                ),
                title: 'Analytics Dashboard',
                body:  'Track every analysis you run. Weekly and monthly charts show your strategic momentum over time.',
              },
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M3 3l18 18M3 21L21 3"/>
                  </svg>
                ),
                title: 'Session Memory',
                body:  'Prior strategies are stored in context. Each new analysis builds on what came before.',
              },
              {
                svg: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                    <path d="M2 17l10 5 10-5"/>
                    <path d="M2 12l10 5 10-5"/>
                  </svg>
                ),
                title: 'Benchmark Engine',
                body:  'Every output references verified industry data. User metrics are compared against sector medians.',
              },
            ].map((f, i) => (
              <div
                key={f.title}
                style={{
                  padding:      '1.5rem',
                  borderRight:  i % 3 < 2 ? '1px solid rgba(0,0,0,0.07)' : 'none',
                  borderBottom: i < 3 ? '1px solid rgba(0,0,0,0.07)' : 'none',
                }}
              >
                <div style={{ marginBottom: '0.875rem' }}>{f.svg}</div>
                <h5 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 700, color: '#0C0C0E', marginBottom: '0.375rem', letterSpacing: '0.02em' }}>
                  {f.title}
                </h5>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#71717A', lineHeight: 1.65, margin: 0, fontWeight: 300 }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          HOW IT WORKS — numbered list, Swiss grid
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.09)', borderBottom: '1px solid rgba(0,0,0,0.09)' }}>
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '3.5rem' }}>
            <span className="label-caps">Methodology</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.09)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0' }}>
            {HOW.map((h, i) => (
              <div
                key={h.n}
                style={{
                  padding:     '2rem',
                  borderRight: i < HOW.length - 1 ? '1px solid rgba(0,0,0,0.09)' : 'none',
                  borderLeft:  i === 0 ? '1px solid rgba(0,0,0,0.09)' : 'none',
                  borderTop:   '1px solid rgba(0,0,0,0.09)',
                  borderBottom:'1px solid rgba(0,0,0,0.09)',
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
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CTA — dark, minimal
      ══════════════════════════════════════════════ */}
      <section style={{ background: '#0C0C0E', position: 'relative', overflow: 'hidden' }}>
        {/* Topo lines mirror the hero treatment on the CTA dark panel */}
        <TopoBackground />
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-20" style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative', zIndex: 10 }}>
          <Rule />
          <div style={{ paddingTop: '3rem', display: 'flex', flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', color: '#FFFFFF', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                Your first five analyses are complimentary.
              </h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: 'rgba(255,255,255,0.38)', fontWeight: 300 }}>
                Zero friction. No payment details. Professional-grade strategy, validated by data.
              </p>
            </div>
            <Link href="/login" className="btn-ghost-white" style={{ flexShrink: 0 }}>
              Begin →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FOOTER
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
              Chat
            </Link>
            <Link href="/dashboard" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', textDecoration: 'none', letterSpacing: '0.05em' }}>
              Dashboard
            </Link>
            <Link href="/pricing" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#71717A', textDecoration: 'none', letterSpacing: '0.05em' }}>
              Pricing
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
