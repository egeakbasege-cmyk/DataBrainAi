'use client'

/**
 * ProductWalkthrough — flex.one-inspired premium interactive demo
 *
 * Visual shell upgraded to match flex.one's premium fintech aesthetic:
 *   • Oversized serif heading + eyebrow label
 *   • 3D perspective device frame with ambient glow + multi-layer shadow
 *   • Scroll-triggered staggered entrance (IntersectionObserver — no deps)
 *   • Premium timeline chapter list with progress track
 *   • Section gradient: deep navy → midnight, radial accent glow
 *
 * All inner slide components (Slide1–6), auto-advance, pause,
 * YouTube fallback and i18n are 100% unchanged.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// ── YouTube video ID — boş bırakırsanız animasyonlu demo görünür ──────────────
const YOUTUBE_VIDEO_ID = ''  // Örn: 'dQw4w9WgXcQ'

// ── Slide süresi (ms) ─────────────────────────────────────────────────────────
const SLIDE_DURATION = 12000   // 12s × 6 slide ≈ 72s total

// ── Demo sources (domain names — not translated) ──────────────────────────────
const REAL_SOURCES = [
  { domain: 'statista.com',       title: 'E-commerce Conversion Rate Turkey 2026',       rel: 90 },
  { domain: 'baymard.com',        title: 'Mobile Checkout Abandonment Research 2026',    rel: 95 },
  { domain: 'klaviyo.com',        title: 'Email Recovery Benchmark Report Q1 2026',      rel: 88 },
]

// ── Slide tanımları ────────────────────────────────────────────────────────────

interface Slide {
  id:      number
  chapter: string
  time:    string
}

// ── Yardımcı bileşenler ───────────────────────────────────────────────────────

function BenchmarkBar({ label, value, target, unit, lowerIsBetter, sectorLabel }: {
  label: string; value: number; target: number; unit: string; lowerIsBetter?: boolean; sectorLabel: string
}) {
  const max  = Math.max(value, target) * 1.25
  const vPct = Math.round((value  / max) * 100)
  const tPct = Math.round((target / max) * 100)
  const worse = lowerIsBetter ? value > target : value < target
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.65rem', color: worse ? '#F87171' : '#C9A96E', fontWeight: 700 }}>{value}{unit}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${vPct}%`, background: worse ? '#F87171' : '#C9A96E', borderRadius: 2, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{sectorLabel}</span>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, flex: 1, margin: '0 8px', marginTop: 2 }}>
          <div style={{ height: '100%', width: `${tPct}%`, background: 'rgba(255,255,255,0.28)', borderRadius: 2 }} />
        </div>
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>{target}{unit}</span>
      </div>
    </div>
  )
}

// ── Slide ekranları ───────────────────────────────────────────────────────────

function Slide1_Input() {
  const { t } = useLanguage()
  const [typed, setTyped] = useState('')
  const QUERY = t('walk.demoQuery')

  useEffect(() => {
    setTyped('')
    let i = 0
    const iv = setInterval(() => {
      i++
      setTyped(QUERY.slice(0, i))
      if (i >= QUERY.length) clearInterval(iv)
    }, 32)
    return () => clearInterval(iv)
  }, [QUERY])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Fake browser bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['#FF5F57','#FFBD2E','#28C840'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: '3px', display: 'flex', alignItems: 'center', paddingLeft: '0.5rem' }}>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>sail-ai.vercel.app/chat</span>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {/* Context badge */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[t('walk.demoTag1'), t('walk.demoTag2'), t('walk.demoTag3')].map(tag => (
            <span key={tag} style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.58rem', color: '#C9A96E', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '4px', padding: '2px 6px' }}>{tag}</span>
          ))}
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {['Upwind', 'SAIL', 'Operator', 'Downwind'].map((m, i) => (
            <div key={m} style={{ padding: '3px 8px', borderRadius: '4px', background: i === 0 ? 'rgba(201,169,110,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? 'rgba(201,169,110,0.4)' : 'rgba(255,255,255,0.08)'}`, fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.58rem', color: i === 0 ? '#C9A96E' : 'rgba(255,255,255,0.35)' }}>
              {m}
            </div>
          ))}
        </div>

        {/* Input field */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '0.625rem', position: 'relative' }}>
          <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0 }}>
            {typed}
            {typed.length < 140 && <span style={{ animation: 'blink 0.9s step-end infinite', borderRight: '2px solid #C9A96E', marginLeft: 1 }}>&nbsp;</span>}
          </p>
        </div>

        {/* Send button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ padding: '0.4rem 0.875rem', background: typed.length > 20 ? '#C9A96E' : 'rgba(201,169,110,0.2)', borderRadius: '5px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.65rem', fontWeight: 700, color: typed.length > 20 ? '#0C0C0E' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s' }}>
            {t('walk.analyzeBtnLabel')}
          </div>
        </div>
      </div>
    </div>
  )
}

function Slide2_ModeSelect() {
  const { t } = useLanguage()
  const [selected, setSelected] = useState('')
  useEffect(() => {
    const modes = ['Upwind', 'SAIL', 'Operator']
    let i = 0
    const iv = setInterval(() => {
      setSelected(modes[i % modes.length])
      i++
    }, 1400)
    setSelected('Upwind')
    return () => clearInterval(iv)
  }, [])

  const modes = [
    { name: 'Upwind',    badge: t('walk.demoMode1badge'), color: '#1A5276', desc: t('walk.demoMode1desc') },
    { name: 'SAIL',      badge: t('walk.demoMode2badge'), color: '#7C3AED', desc: t('walk.demoMode2desc') },
    { name: 'Operator',  badge: t('walk.demoMode3badge'), color: '#CC2200', desc: t('walk.demoMode3desc') },
    { name: 'Downwind',  badge: t('walk.demoMode4badge'), color: '#00695C', desc: t('walk.demoMode4desc') },
    { name: 'TRIM',      badge: t('walk.demoMode5badge'), color: '#B45309', desc: t('walk.demoMode5desc') },
    { name: 'Catamaran', badge: t('walk.demoMode6badge'), color: '#D4AF37', desc: t('walk.demoMode6desc') },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 0.25rem' }}>
        {t('walk.selectModeLabel')}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', flex: 1 }}>
        {modes.map(m => {
          const active = selected === m.name
          return (
            <div
              key={m.name}
              onClick={() => setSelected(m.name)}
              style={{
                padding:      '0.625rem 0.75rem',
                background:   active ? `${m.color}18` : 'rgba(255,255,255,0.03)',
                border:       `1px solid ${active ? m.color + '55' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '7px',
                cursor:       'pointer',
                transition:   'all 0.18s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                <span style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '0.95rem', fontWeight: 700, color: active ? m.color : 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{m.name}</span>
                {active && <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.08em', color: m.color, background: `${m.color}22`, padding: '1px 4px', borderRadius: '3px' }}>{m.badge}</span>}
              </div>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.62rem', color: active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', lineHeight: 1.4, margin: 0 }}>{m.desc}</p>
            </div>
          )
        })}
      </div>
      {selected && (
        <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: '6px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', color: '#C9A96E' }}>
          ✓ <strong>{selected}</strong> {t('walk.modeSelectedMsg')}
        </div>
      )}
    </div>
  )
}

function Slide3_Analyzing() {
  const { t } = useLanguage()
  const [dotCount, setDotCount] = useState(0)
  const [step, setStep] = useState(0)
  const SEARCH_STEPS = [
    t('walk.demoStep1'),
    t('walk.demoStep2'),
    t('walk.demoStep3'),
    t('walk.demoStep4'),
    t('walk.demoStep5'),
    t('walk.demoStep6'),
    t('walk.demoStep7'),
  ]

  useEffect(() => {
    const dotIv = setInterval(() => setDotCount(d => (d + 1) % 4), 400)
    const stepIv = setInterval(() => setStep(s => Math.min(s + 1, SEARCH_STEPS.length - 1)), 1600)
    return () => { clearInterval(dotIv); clearInterval(stepIv) }
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
      {/* Spinner */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid rgba(201,169,110,0.15)',
          borderTop: '3px solid #C9A96E',
          animation: 'spin 0.9s linear infinite',
          margin: '0 auto 0.75rem',
        }} />
        <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '1.1rem', color: '#FFFFFF', margin: 0 }}>
          {t('walk.analyzing')}{''.padEnd(dotCount, '.')}
        </p>
      </div>

      {/* Live search log */}
      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.62rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: 180, overflow: 'hidden' }}>
        {SEARCH_STEPS.slice(0, step + 1).map((s, i) => (
          <div key={i} style={{ color: i === step ? '#C9A96E' : 'rgba(255,255,255,0.35)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: i < step ? '#10B981' : i === step ? '#C9A96E' : 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
              {i < step ? '✓' : i === step ? '›' : '○'}
            </span>
            {s}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[
          { label: t('walk.sourcesScanned'), value: `${Math.min(step * 4, 20)}` },
          { label: t('walk.queryVectors'),   value: '3' },
          { label: 'Model',                  value: 'Groq 70B' },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '6px', padding: '0.5rem', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '1rem', fontWeight: 700, color: '#C9A96E', margin: 0 }}>{s.value}</p>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.57rem', color: 'rgba(255,255,255,0.3)', margin: 0, letterSpacing: '0.05em' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Slide4_Response() {
  const { t } = useLanguage()
  const DEMO_INSIGHT = t('walk.demoInsight')
  const DEMO_ACTIONS = [t('walk.demoAction1'), t('walk.demoAction2'), t('walk.demoAction3')]
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
      {/* Response card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.625rem', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '6px' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A96E' }} />
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A96E' }}>SAIL AI — Upwind</span>
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>Groq 70B · statista, baymard, klaviyo</span>
      </div>

      {/* Insight */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem' }}>
        <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontStyle: 'italic', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, margin: 0 }}>
          {DEMO_INSIGHT}
        </p>
      </div>

      {/* Benchmark */}
      <BenchmarkBar label={t('walk.demoCvrLabel')} value={1.3} target={2.3} unit="%" lowerIsBetter={false} sectorLabel={t('walk.sectorMedian')} />

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {DEMO_ACTIONS.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.025)', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '0.8rem', fontWeight: 700, color: '#C9A96E', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.67rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.5, margin: 0 }}>{a}</p>
          </div>
        ))}
      </div>

      {/* 30-day target */}
      <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px' }}>
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#10B981' }}>{t('walk.target30d')}</span>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', margin: '2px 0 0', lineHeight: 1.4 }}>
          {t('walk.demo30dTarget')}
        </p>
      </div>
    </div>
  )
}

function Slide5_Research() {
  const { t } = useLanguage()
  const DEMO_FINDINGS = [t('walk.demoFinding1'), t('walk.demoFinding2'), t('walk.demoFinding3'), t('walk.demoFinding4')]
  const IMAGE_LABELS  = [t('walk.demoChart'), t('walk.demoTrend'), t('walk.demoMap')]
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem' }}>🔍</span>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A96E', margin: 0 }}>Deep Research</p>
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.06em', color: '#0C0C0E', background: 'rgba(201,169,110,0.85)', padding: '1px 5px', borderRadius: '3px' }}>LIVE</span>
      </div>

      <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
        {t('walk.demoResearchTitle')}
      </p>

      {/* Key findings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {DEMO_FINDINGS.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', padding: '0.35rem 0.5rem', background: `rgba(${['201,169,110','16,185,129','99,102,241','245,158,11'][i]},0.08)`, borderLeft: `2px solid rgba(${['201,169,110','16,185,129','99,102,241','245,158,11'][i]},0.6)`, borderRadius: '0 4px 4px 0' }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.57rem', fontWeight: 700, color: `rgba(${['201,169,110','16,185,129','99,102,241','245,158,11'][i]},1)`, flexShrink: 0 }}>#{i+1}</span>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.4 }}>{f}</p>
          </div>
        ))}
      </div>

      {/* Sources */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.57rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{t('walk.sources')}</p>
        {REAL_SOURCES.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '5px' }}>
            <div>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{s.title}</p>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.57rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{s.domain}</p>
            </div>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.57rem', fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '3px', padding: '1px 4px' }}>
              {s.rel}%
            </span>
          </div>
        ))}
      </div>

      {/* Image placeholders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
        {IMAGE_LABELS.map(label => (
          <div key={label} style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.57rem', color: 'rgba(255,255,255,0.3)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Slide6_Signup() {
  const { t } = useLanguage()
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 0.25rem', lineHeight: 1.2 }}>
          {t('walk.slide6Chapter')}
        </p>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
          {t('walk.ctaSub')}
        </p>
      </div>

      {/* Google button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: 280, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.625rem', padding: '0.7rem 1rem', background: '#FFFFFF', borderRadius: '6px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8rem', fontWeight: 600, color: '#0C0C0E' }}>{t('walk.signupGoogle')}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{t('walk.orEmail')}</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <div style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
          {t('walk.signupFree')}
        </div>
      </div>

      {/* Free tier badge */}
      <div style={{ textAlign: 'center', padding: '0.625rem', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '8px', maxWidth: 280, margin: '0 auto', width: '100%' }}>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', color: '#C9A96E', fontWeight: 600, margin: '0 0 0.25rem' }}>
          {t('walk.freePlan')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center' }}>
          {[t('walk.feat1'), t('walk.feat2'), t('walk.feat3'), t('walk.feat4')].map(f => (
            <span key={f} style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', padding: '2px 5px' }}>◆ {f}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Slide render switch ────────────────────────────────────────────────────────

function SlideContent({ slide }: { slide: number }) {
  switch (slide) {
    case 1: return <Slide1_Input />
    case 2: return <Slide2_ModeSelect />
    case 3: return <Slide3_Analyzing />
    case 4: return <Slide4_Response />
    case 5: return <Slide5_Research />
    case 6: return <Slide6_Signup />
    default: return null
  }
}

// ── YouTube embed ─────────────────────────────────────────────────────────────

function YouTubeEmbed({ videoId }: { videoId: string }) {
  return (
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '16px' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`}
        title="SAIL AI Tutorial"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: '16px' }}
      />
    </div>
  )
}

// ── useInView hook — lightweight scroll entrance ───────────────────────────────

function useInView(threshold = 0.15): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, inView]
}

// ── Premium step indicator ─────────────────────────────────────────────────────

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <div style={{
      width:         done ? 22 : active ? 22 : 20,
      height:        done ? 22 : active ? 22 : 20,
      borderRadius:  '50%',
      background:    done ? '#C9A96E' : active ? 'rgba(201,169,110,0.2)' : 'rgba(255,255,255,0.06)',
      border:        `${active ? 1.5 : 1}px solid ${done || active ? '#C9A96E' : 'rgba(255,255,255,0.12)'}`,
      display:       'flex',
      alignItems:    'center',
      justifyContent:'center',
      flexShrink:    0,
      transition:    'all 0.25s ease',
      boxShadow:     active ? '0 0 12px rgba(201,169,110,0.35)' : 'none',
    }}>
      {done
        ? <span style={{ fontSize: '0.5rem', color: '#0C0C0E', fontWeight: 900 }}>✓</span>
        : <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.55rem', fontWeight: 700, color: active ? '#C9A96E' : 'rgba(255,255,255,0.25)' }} />
      }
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────────────────

export function ProductWalkthrough() {
  const { t } = useLanguage()
  const [current,   setCurrent]   = useState(1)
  const [paused,    setPaused]    = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [isMobile,  setIsMobile]  = useState(false)

  const [headerRef, headerInView] = useInView(0.1)
  const [demoRef,   demoInView]   = useInView(0.08)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Build translated slides list inside component to use t()
  const SLIDES_I18N: Slide[] = [
    { id: 1, chapter: t('walk.slide1Chapter'), time: '0:00' },
    { id: 2, chapter: t('walk.slide2Chapter'), time: '0:12' },
    { id: 3, chapter: t('walk.slide3Chapter'), time: '0:25' },
    { id: 4, chapter: t('walk.slide4Chapter'), time: '0:38' },
    { id: 5, chapter: t('walk.slide5Chapter'), time: '0:58' },
    { id: 6, chapter: t('walk.slide6Chapter'), time: '1:12' },
  ]

  const totalSlides = SLIDES_I18N.length

  const advance = useCallback(() => {
    setCurrent(c => c < totalSlides ? c + 1 : 1)
    setProgress(0)
  }, [totalSlides])

  // Auto-advance + progress bar
  useEffect(() => {
    if (paused) return
    const interval = 50
    const steps    = SLIDE_DURATION / interval

    let tick = 0
    const iv = setInterval(() => {
      tick++
      setProgress(Math.min((tick / steps) * 100, 100))
      if (tick >= steps) {
        tick = 0
        advance()
      }
    }, interval)

    return () => clearInterval(iv)
  }, [paused, advance, current])

  // ── Shared CSS animations + custom properties ──────────────────────────────
  const css = `
    @keyframes spin     { to { transform: rotate(360deg) } }
    @keyframes blink    { 50% { opacity: 0 } }
    @keyframes fadeUp   { from { opacity: 0; transform: translateY(28px) } to { opacity: 1; transform: translateY(0) } }
    @keyframes deviceIn { from { opacity: 0; transform: perspective(1200px) rotateX(8deg) rotateY(-4deg) scale(0.96) translateY(24px) } to { opacity: 1; transform: perspective(1200px) rotateX(2deg) rotateY(-1deg) scale(1) translateY(0) } }
    @keyframes glowPulse { 0%,100% { opacity: 0.55 } 50% { opacity: 0.85 } }
    @keyframes trackFill { from { width: 0% } }

    .pw-section { background: linear-gradient(180deg, #08090D 0%, #0D0F15 55%, #0A0C11 100%); }

    .pw-header-animate  { opacity: 0; }
    .pw-header-animate.in  { animation: fadeUp 0.75s cubic-bezier(0.22,1,0.36,1) forwards; }
    .pw-header-animate.in-d1 { animation-delay: 0.05s; }
    .pw-header-animate.in-d2 { animation-delay: 0.18s; }
    .pw-header-animate.in-d3 { animation-delay: 0.30s; }

    .pw-device-animate { opacity: 0; }
    .pw-device-animate.in { animation: deviceIn 0.95s cubic-bezier(0.22,1,0.36,1) 0.1s forwards; }

    .pw-sidebar-animate { opacity: 0; }
    .pw-sidebar-animate.in { animation: fadeUp 0.75s cubic-bezier(0.22,1,0.36,1) 0.35s forwards; }

    .pw-chapter-btn:hover { background: rgba(201,169,110,0.07) !important; }
    .pw-chapter-btn:hover .pw-chapter-name { color: rgba(255,255,255,0.75) !important; }
  `

  // ── Device frame shared styles ──────────────────────────────────────────────
  const deviceFrame = (
    <div
      style={{
        position:     'relative',
        perspective:  '1200px',
      }}
    >
      {/* Ambient glow — behind the device */}
      <div style={{
        position:      'absolute',
        inset:         '-40px -60px -60px -60px',
        background:    'radial-gradient(ellipse at 40% 60%, rgba(201,169,110,0.12) 0%, rgba(99,102,241,0.06) 45%, transparent 70%)',
        borderRadius:  '50%',
        pointerEvents: 'none',
        animation:     'glowPulse 4s ease-in-out infinite',
        zIndex:        0,
      }} />

      {/* The device itself */}
      <div
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        style={{
          position:     'relative',
          zIndex:       1,
          background:   'linear-gradient(145deg, #13151D 0%, #0E1017 100%)',
          border:       '1px solid rgba(255,255,255,0.09)',
          borderRadius: '16px',
          overflow:     'hidden',
          boxShadow:    [
            '0 2px 4px rgba(0,0,0,0.3)',
            '0 8px 24px rgba(0,0,0,0.45)',
            '0 32px 64px rgba(0,0,0,0.4)',
            '0 0 0 1px rgba(255,255,255,0.04)',
            'inset 0 1px 0 rgba(255,255,255,0.06)',
          ].join(', '),
          transform:    'perspective(1200px) rotateX(2deg) rotateY(-1deg)',
          transition:   'transform 0.4s ease, box-shadow 0.4s ease',
        }}
      >
        {/* Premium chrome bar */}
        <div style={{
          padding:         '0.55rem 0.875rem',
          background:      'linear-gradient(180deg, #1C1F2B 0%, #161820 100%)',
          borderBottom:    '1px solid rgba(255,255,255,0.06)',
          display:         'flex',
          alignItems:      'center',
          gap:             '0.625rem',
          backdropFilter:  'blur(8px)',
        }}>
          {/* Traffic lights */}
          <div style={{ display: 'flex', gap: '5px' }}>
            {['#FF5F57','#FFBD2E','#28C840'].map(c => (
              <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, boxShadow: `0 0 4px ${c}55` }} />
            ))}
          </div>

          {/* URL bar */}
          <div style={{
            flex:         1,
            height:       20,
            background:   'rgba(255,255,255,0.04)',
            borderRadius: '4px',
            border:       '1px solid rgba(255,255,255,0.07)',
            display:      'flex',
            alignItems:   'center',
            paddingLeft:  '0.625rem',
            gap:          '0.4rem',
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.02em' }}>
              sail-ai.vercel.app
            </span>
          </div>

          {/* Mode badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '2px 8px', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '20px' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A96E', animation: 'glowPulse 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.08em', color: '#C9A96E' }}>LIVE</span>
          </div>

          {paused && (
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.52rem', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>⏸</span>
          )}
        </div>

        {/* Hairline progress track */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.04)', position: 'relative' }}>
          <div style={{
            position:   'absolute',
            top:        0,
            left:       0,
            height:     '100%',
            width:      `${progress}%`,
            background: 'linear-gradient(90deg, #A07840, #C9A96E, #E8C87A)',
            transition: 'width 0.05s linear',
            boxShadow:  '0 0 6px rgba(201,169,110,0.6)',
          }} />
        </div>

        {/* Slide content */}
        <div style={{ padding: '1rem 1rem', minHeight: isMobile ? 300 : 360, position: 'relative' }}>
          <SlideContent slide={current} />
        </div>

        {/* Bottom reflection line */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.15), transparent)' }} />
      </div>
    </div>
  )

  return (
    <section
      id="tutorial"
      className="pw-section"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      <style>{css}</style>

      {/* Background grid mesh — flex.one-style depth texture */}
      <div style={{
        position:   'absolute',
        inset:      0,
        backgroundImage: [
          'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: '72px 72px',
        pointerEvents:  'none',
        zIndex:         0,
      }} />

      {/* Radial center glow */}
      <div style={{
        position:      'absolute',
        top:           '50%',
        left:          '50%',
        transform:     'translate(-50%, -50%)',
        width:         '80vw',
        height:        '60vh',
        background:    'radial-gradient(ellipse, rgba(201,169,110,0.055) 0%, transparent 65%)',
        pointerEvents: 'none',
        zIndex:        0,
      }} />

      <div className="max-w-6xl mx-auto px-6 md:px-10" style={{ position: 'relative', zIndex: 1, paddingTop: '6rem', paddingBottom: '6rem' }}>

        {/* ── Premium section header ─────────────────────────────────────── */}
        <div ref={headerRef} style={{ marginBottom: isMobile ? '3rem' : '4rem', maxWidth: 640 }}>
          <div
            className={`pw-header-animate in-d1 ${headerInView ? 'in' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}
          >
            <div style={{ width: 28, height: 1, background: 'rgba(201,169,110,0.6)' }} />
            <span style={{
              fontFamily:    'var(--font-inter), sans-serif',
              fontSize:      '0.62rem',
              fontWeight:    700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         '#C9A96E',
            }}>
              {t('walk.chapters')}
            </span>
          </div>

          <h2
            className={`pw-header-animate in-d2 ${headerInView ? 'in' : ''}`}
            style={{
              fontFamily:  'var(--font-cormorant), Georgia, serif',
              fontSize:    'clamp(2rem, 4.5vw, 3.25rem)',
              fontWeight:  600,
              fontStyle:   'italic',
              color:       '#FFFFFF',
              margin:      0,
              lineHeight:  1.1,
              letterSpacing: '-0.01em',
            }}
          >
            {t('welcome.heroTitle')}
          </h2>

          <p
            className={`pw-header-animate in-d3 ${headerInView ? 'in' : ''}`}
            style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:   '0.9rem',
              color:      'rgba(255,255,255,0.38)',
              marginTop:  '1rem',
              fontWeight: 300,
              lineHeight: 1.7,
            }}
          >
            {t('welcome.heroSub')}
          </p>
        </div>

        {/* ── Main demo area ─────────────────────────────────────────────── */}
        {YOUTUBE_VIDEO_ID ? (
          <YouTubeEmbed videoId={YOUTUBE_VIDEO_ID} />
        ) : isMobile ? (

          /* ── Mobile layout ─────────────────────────────────────────────── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Animated device */}
            <div ref={demoRef} className={`pw-device-animate ${demoInView ? 'in' : ''}`}>
              {deviceFrame}
            </div>

            {/* Horizontal scrollable chapter strip */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', paddingBottom: '0.25rem' }}>
                {SLIDES_I18N.map((slide) => {
                  const active = current === slide.id
                  const done   = current > slide.id
                  return (
                    <button
                      key={slide.id}
                      onClick={() => { setCurrent(slide.id); setProgress(0) }}
                      style={{
                        display:       'flex',
                        alignItems:    'center',
                        gap:           '0.35rem',
                        padding:       '0.4rem 0.75rem',
                        background:    active ? 'rgba(201,169,110,0.12)' : done ? 'rgba(201,169,110,0.06)' : 'rgba(255,255,255,0.04)',
                        border:        `1px solid ${active ? 'rgba(201,169,110,0.45)' : done ? 'rgba(201,169,110,0.2)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius:  '20px',
                        cursor:        'pointer',
                        whiteSpace:    'nowrap',
                        flexShrink:    0,
                        transition:    'all 0.18s',
                        boxShadow:     active ? '0 0 12px rgba(201,169,110,0.2)' : 'none',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.58rem', fontWeight: 700, color: active ? '#C9A96E' : done ? 'rgba(201,169,110,0.7)' : 'rgba(255,255,255,0.3)' }}>
                        {done ? '✓' : slide.id}
                      </span>
                      <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.65rem', fontWeight: active ? 600 : 400, color: active ? 'rgba(255,255,255,0.9)' : done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)' }}>
                        {slide.chapter}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* CTA */}
            <Link
              href="/welcome"
              style={{
                display:       'block',
                textAlign:     'center',
                padding:       '0.875rem',
                background:    'linear-gradient(135deg, #B8882A, #C9A96E, #D4B87E)',
                color:         '#0C0C0E',
                fontFamily:    'var(--font-inter), sans-serif',
                fontSize:      '0.75rem',
                fontWeight:    700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                borderRadius:  '8px',
                textDecoration:'none',
                boxShadow:     '0 4px 20px rgba(201,169,110,0.3)',
              }}
            >
              {t('walk.ctaBtn')}
            </Link>
          </div>

        ) : (

          /* ── Desktop two-column layout ────────────────────────────────── */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', gap: '2.5rem', alignItems: 'start' }}>

            {/* ── Device frame ──────────────────────────────────────────── */}
            <div ref={demoRef} className={`pw-device-animate ${demoInView ? 'in' : ''}`}>
              {deviceFrame}
            </div>

            {/* ── Premium chapter sidebar ─────────────────────────────── */}
            <div className={`pw-sidebar-animate ${demoInView ? 'in' : ''}`} style={{ display: 'flex', flexDirection: 'column' }}>

              {/* Timeline label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <div style={{ width: 16, height: 1, background: 'rgba(255,255,255,0.2)' }} />
                <p style={{
                  fontFamily:    'var(--font-inter), sans-serif',
                  fontSize:      '0.58rem',
                  fontWeight:    700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color:         'rgba(255,255,255,0.25)',
                  margin:        0,
                }}>
                  {t('walk.chapters')}
                </p>
              </div>

              {/* Timeline items */}
              <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>

                {/* Vertical track line */}
                <div style={{
                  position:   'absolute',
                  left:       10,
                  top:        11,
                  bottom:     11,
                  width:      1,
                  background: 'rgba(255,255,255,0.07)',
                  zIndex:     0,
                }} />

                {/* Filled portion of track */}
                <div style={{
                  position:   'absolute',
                  left:       10,
                  top:        11,
                  width:      1,
                  height:     `${((current - 1) / (totalSlides - 1)) * 100}%`,
                  background: 'linear-gradient(180deg, #C9A96E, rgba(201,169,110,0.3))',
                  transition: 'height 0.4s ease',
                  zIndex:     0,
                }} />

                {SLIDES_I18N.map((slide) => {
                  const active = current === slide.id
                  const done   = current > slide.id
                  return (
                    <button
                      key={slide.id}
                      className="pw-chapter-btn"
                      onClick={() => { setCurrent(slide.id); setProgress(0) }}
                      style={{
                        display:      'flex',
                        alignItems:   'center',
                        gap:          '0.875rem',
                        padding:      '0.6rem 0.75rem 0.6rem 0.25rem',
                        background:   active ? 'rgba(201,169,110,0.07)' : 'transparent',
                        border:       `1px solid ${active ? 'rgba(201,169,110,0.2)' : 'transparent'}`,
                        borderRadius: '8px',
                        cursor:       'pointer',
                        textAlign:    'left',
                        transition:   'all 0.18s',
                        position:     'relative',
                        zIndex:       1,
                        marginBottom: '0.125rem',
                        boxShadow:    active ? '0 0 20px rgba(201,169,110,0.08)' : 'none',
                      }}
                    >
                      <StepDot active={active} done={done} />

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          className="pw-chapter-name"
                          style={{
                            fontFamily: 'var(--font-inter), sans-serif',
                            fontSize:   '0.72rem',
                            fontWeight: active ? 600 : 400,
                            color:      active ? '#FFFFFF' : done ? 'rgba(255,255,255,0.48)' : 'rgba(255,255,255,0.28)',
                            margin:     0,
                            lineHeight: 1.3,
                            transition: 'color 0.18s',
                          }}
                        >
                          {slide.chapter}
                        </p>
                        {active && (
                          <div style={{ marginTop: '4px', height: 2, background: 'rgba(201,169,110,0.15)', borderRadius: 1, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: '#C9A96E', transition: 'width 0.05s linear', borderRadius: 1 }} />
                          </div>
                        )}
                      </div>

                      <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.56rem', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
                        {slide.time}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Spacer */}
              <div style={{ flex: 1, minHeight: '1.5rem' }} />

              {/* Premium CTA card */}
              <div style={{
                marginTop:    '1.5rem',
                padding:      '1.25rem',
                background:   'linear-gradient(145deg, rgba(201,169,110,0.08), rgba(201,169,110,0.04))',
                border:       '1px solid rgba(201,169,110,0.2)',
                borderRadius: '12px',
                position:     'relative',
                overflow:     'hidden',
              }}>
                {/* Corner decoration */}
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'radial-gradient(circle, rgba(201,169,110,0.15), transparent)', borderRadius: '50%', pointerEvents: 'none' }} />

                <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '1rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 0.375rem', lineHeight: 1.3 }}>
                  {t('walk.ctaHeadline')}
                </p>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', margin: '0 0 1rem', lineHeight: 1.5 }}>
                  {t('walk.ctaSub')}
                </p>
                <Link
                  href="/welcome"
                  style={{
                    display:       'block',
                    textAlign:     'center',
                    padding:       '0.6rem 1rem',
                    background:    'linear-gradient(135deg, #B8882A, #C9A96E)',
                    color:         '#0C0C0E',
                    fontFamily:    'var(--font-inter), sans-serif',
                    fontSize:      '0.65rem',
                    fontWeight:    700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    borderRadius:  '6px',
                    textDecoration:'none',
                    boxShadow:     '0 2px 12px rgba(201,169,110,0.35)',
                    transition:    'box-shadow 0.2s',
                  }}
                >
                  {t('walk.ctaBtn')}
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
