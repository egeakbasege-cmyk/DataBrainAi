'use client'

/**
 * ProductWalkthrough — sinematik ürün turu
 *
 * 6 ekranlık otomatik ilerleyen bir walkthrough.
 * Her ekran gerçek SAIL AI arayüzünü ve gerçek AI cevap formatını gösterir.
 * YouTube video URL'si varsa önce onu oynatır, yoksa bu animasyon devreye girer.
 *
 * YOUTUBE_VIDEO_ID sabitini gerçek video ID'nizle değiştirin.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/LanguageContext'

// ── YouTube video ID — boş bırakırsanız animasyonlu demo görünür ──────────────
const YOUTUBE_VIDEO_ID = ''  // Örn: 'dQw4w9WgXcQ'

// ── Slide süresi (ms) ─────────────────────────────────────────────────────────
const SLIDE_DURATION = 12000   // 12s × 7 slide ≈ 84s total

// ── Gerçek AI yanıt verisi ────────────────────────────────────────────────────
const REAL_INSIGHT = `Dönüşüm oranınız %1.3 ile Türkiye e-ticaret sektör ortalamasının (%2.3) 1 puan altında. En yüksek kaldıraç: checkout akışını 5 adımdan 3'e indirmek ve sepet terk e-postası kurmak. Bu iki adım, sektör verilerine göre 90 gün içinde 0.6–1.0 puanlık iyileşme sağlar.`

const REAL_ACTIONS = [
  'Checkout adımlarını 5\'ten 3\'e indirin — Baymard verisi: her ek adım %10 terk artışı yaratır',
  'Sepet terk dizisi kurun: 1. saat / 24. saat / 72. saat (Klaviyo benchmark: %12–15 geri dönüş)',
  'Ürün sayfasına sosyal kanıt ekleyin: ≥50 yorum hedefleyin, TrustPilot entegrasyonu öncelikli',
]

const REAL_FINDINGS = [
  'Türkiye e-ticaret ortalaması: %2.3 CVR (Q1 2026, Statista)',
  'Mobil checkout terk oranı: %72 (Baymard Institute)',
  'E-posta kurtarma oranı: %12–15 (Klaviyo 2026 Benchmark)',
  'Sosyal kanıt %18 dönüşüm artışı sağlıyor (Nielsen)',
]

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
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)' }}>{label}</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: worse ? '#F87171' : '#C9A96E', fontWeight: 700 }}>{value}{unit}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${vPct}%`, background: worse ? '#F87171' : '#C9A96E', borderRadius: 2, transition: 'width 0.8s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{sectorLabel}</span>
        <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, flex: 1, margin: '0 8px', marginTop: 2 }}>
          <div style={{ height: '100%', width: `${tPct}%`, background: 'rgba(255,255,255,0.28)', borderRadius: 2 }} />
        </div>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>{target}{unit}</span>
      </div>
    </div>
  )
}

// ── Slide ekranları ───────────────────────────────────────────────────────────

function Slide1_Input() {
  const { t } = useLanguage()
  const [typed, setTyped] = useState('')
  const QUERY = 'Shopify mağazam var. Aylık satış 85K TL, ama dönüşüm oranım %1.3. Sektörün nerede olduğunu ve ne yapabileceğimi analiz et.'

  useEffect(() => {
    let i = 0
    const iv = setInterval(() => {
      i++
      setTyped(QUERY.slice(0, i))
      if (i >= QUERY.length) clearInterval(iv)
    }, 32)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Fake browser bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['#FF5F57','#FFBD2E','#28C840'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
        </div>
        <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: '3px', display: 'flex', alignItems: 'center', paddingLeft: '0.5rem' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>sail-ai.vercel.app/chat</span>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {/* Context badge */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['E-Ticaret · Shopify', '85K TL/ay', 'Türkiye'].map(tag => (
            <span key={tag} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: '#C9A96E', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '4px', padding: '2px 6px' }}>{tag}</span>
          ))}
        </div>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {['Upwind', 'SAIL', 'Operator', 'Downwind'].map((m, i) => (
            <div key={m} style={{ padding: '3px 8px', borderRadius: '4px', background: i === 0 ? 'rgba(201,169,110,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i === 0 ? 'rgba(201,169,110,0.4)' : 'rgba(255,255,255,0.08)'}`, fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: i === 0 ? '#C9A96E' : 'rgba(255,255,255,0.35)' }}>
              {m}
            </div>
          ))}
        </div>

        {/* Input field */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '0.625rem', position: 'relative' }}>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0 }}>
            {typed}
            {typed.length < 140 && <span style={{ animation: 'blink 0.9s step-end infinite', borderRight: '2px solid #C9A96E', marginLeft: 1 }}>&nbsp;</span>}
          </p>
        </div>

        {/* Send button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ padding: '0.4rem 0.875rem', background: typed.length > 20 ? '#C9A96E' : 'rgba(201,169,110,0.2)', borderRadius: '5px', fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 700, color: typed.length > 20 ? '#0C0C0E' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s' }}>
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
    { name: 'Upwind',    badge: 'Hızlı Plan',      color: '#1A5276', desc: 'Benchmark + 3 eylem planı. Metrik bilenler için.' },
    { name: 'SAIL',      badge: 'Adaptif AI',       color: '#7C3AED', desc: 'Niyetinizi okur — analitik mi koçluk mu otomatik seçer.' },
    { name: 'Operator',  badge: 'Derin Analiz',     color: '#CC2200', desc: 'Çoklu domain, kapsamlı istihbarat, streaming.' },
    { name: 'Downwind',  badge: 'Koçluk',           color: '#00695C', desc: 'Sokrates diyaloğu ile içgörü geliştirme.' },
    { name: 'TRIM',      badge: '30/60/90 Gün',     color: '#B45309', desc: 'Milestone bazlı phased roadmap.' },
    { name: 'Catamaran', badge: 'Çift Kanal',       color: '#D4AF37', desc: 'Büyüme + müşteri deneyimi aynı anda.' },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', margin: '0 0 0.25rem' }}>
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
                <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '0.95rem', fontWeight: 700, color: active ? m.color : 'rgba(255,255,255,0.5)', lineHeight: 1 }}>{m.name}</span>
                {active && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.08em', color: m.color, background: `${m.color}22`, padding: '1px 4px', borderRadius: '3px' }}>{m.badge}</span>}
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', lineHeight: 1.4, margin: 0 }}>{m.desc}</p>
            </div>
          )
        })}
      </div>
      {selected && (
        <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(201,169,110,0.1)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: '6px', fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#C9A96E' }}>
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
    'Tavily araması başlatılıyor…',
    'Serper paralel taraması: Türkiye e-ticaret CVR 2026',
    'Kaynak bulunan: statista.com (güvenilirlik %90)',
    'Kaynak bulunan: baymard.com (güvenilirlik %95)',
    'Kaynak bulunan: klaviyo.com (güvenilirlik %88)',
    'Groq 70B — yanıt sentezleniyor…',
    'Analiz tamamlandı ✓',
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
        <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.1rem', color: '#FFFFFF', margin: 0 }}>
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
            <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1rem', fontWeight: 700, color: '#C9A96E', margin: 0 }}>{s.value}</p>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.57rem', color: 'rgba(255,255,255,0.3)', margin: 0, letterSpacing: '0.05em' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Slide4_Response() {
  const { t } = useLanguage()
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
      {/* Response card header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.625rem', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '6px' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#C9A96E' }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A96E' }}>SAIL AI — Upwind Analizi</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)', marginLeft: 'auto' }}>Groq 70B · statista, baymard, klaviyo</span>
      </div>

      {/* Insight */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '0.75rem' }}>
        <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, margin: 0 }}>
          {REAL_INSIGHT}
        </p>
      </div>

      {/* Benchmark */}
      <BenchmarkBar label="Dönüşüm oranı" value={1.3} target={2.3} unit="%" lowerIsBetter={false} sectorLabel={t('walk.sectorMedian')} />

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {REAL_ACTIONS.map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.4rem 0.6rem', background: 'rgba(255,255,255,0.025)', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '0.8rem', fontWeight: 700, color: '#C9A96E', flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.67rem', color: 'rgba(255,255,255,0.72)', lineHeight: 1.5, margin: 0 }}>{a}</p>
          </div>
        ))}
      </div>

      {/* 30-day target */}
      <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#10B981' }}>{t('walk.target30d')}</span>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', margin: '2px 0 0', lineHeight: 1.4 }}>
          CVR %1.3 → %1.8 — sektör medianesine %44 yaklaşmak
        </p>
      </div>
    </div>
  )
}

function Slide5_Research() {
  const { t } = useLanguage()
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.75rem' }}>🔍</span>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A96E', margin: 0 }}>Deep Research</p>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.06em', color: '#0C0C0E', background: 'rgba(201,169,110,0.85)', padding: '1px 5px', borderRadius: '3px' }}>LIVE</span>
      </div>

      <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '0.95rem', fontWeight: 700, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
        Türkiye E-Ticaret CVR Analizi 2026
      </p>

      {/* Key findings */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {REAL_FINDINGS.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', padding: '0.35rem 0.5rem', background: `rgba(${['201,169,110','16,185,129','99,102,241','245,158,11'][i]},0.08)`, borderLeft: `2px solid rgba(${['201,169,110','16,185,129','99,102,241','245,158,11'][i]},0.6)`, borderRadius: '0 4px 4px 0' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.57rem', fontWeight: 700, color: `rgba(${['201,169,110','16,185,129','99,102,241','245,158,11'][i]},1)`, flexShrink: 0 }}>#{i+1}</span>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.4 }}>{f}</p>
          </div>
        ))}
      </div>

      {/* Sources */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.57rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{t('walk.sources')}</p>
        {REAL_SOURCES.map((s, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0.5rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '5px' }}>
            <div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 600, color: 'rgba(255,255,255,0.8)', margin: 0 }}>{s.title}</p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.57rem', color: 'rgba(255,255,255,0.3)', margin: 0 }}>{s.domain}</p>
            </div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.57rem', fontWeight: 700, color: '#10B981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '3px', padding: '1px 4px' }}>
              {s.rel}%
            </span>
          </div>
        ))}
      </div>

      {/* Image placeholders */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.35rem' }}>
        {['📊 Grafik', '📈 Trend', '🗺️ Harita'].map(label => (
          <div key={label} style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.57rem', color: 'rgba(255,255,255,0.3)' }}>{label}</span>
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
        <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.4rem', fontWeight: 700, color: '#FFFFFF', margin: '0 0 0.25rem', lineHeight: 1.2 }}>
          {t('walk.slide6Chapter')}
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
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
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 600, color: '#0C0C0E' }}>{t('walk.signupGoogle')}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)' }}>{t('walk.orEmail')}</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <div style={{ padding: '0.6rem 1rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
          {t('walk.signupFree')}
        </div>
      </div>

      {/* Free tier badge */}
      <div style={{ textAlign: 'center', padding: '0.625rem', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '8px', maxWidth: 280, margin: '0 auto', width: '100%' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#C9A96E', fontWeight: 600, margin: '0 0 0.25rem' }}>
          {t('walk.freePlan')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', justifyContent: 'center' }}>
          {[t('walk.feat1'), t('walk.feat2'), t('walk.feat3'), t('walk.feat4')].map(f => (
            <span key={f} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', padding: '2px 5px' }}>◆ {f}</span>
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
    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '12px' }}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1`}
        title="SAIL AI Tutorial"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none', borderRadius: '12px' }}
      />
    </div>
  )
}

// ── Main exported component ───────────────────────────────────────────────────

export function ProductWalkthrough() {
  const { t } = useLanguage()
  const [current,   setCurrent]   = useState(1)
  const [paused,    setPaused]    = useState(false)
  const [progress,  setProgress]  = useState(0)

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
    const interval = 50   // progress update interval ms
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

  return (
    <section
      id="tutorial"
      style={{ background: '#0C0C0E', borderTop: '1px solid rgba(201,169,110,0.15)', borderBottom: '1px solid rgba(201,169,110,0.1)' }}
    >
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes blink { 50% { opacity: 0 } }
      `}</style>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A96E' }}>
                {t('walk.chapters')}
              </span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.06em', color: '#0C0C0E', background: '#C9A96E', padding: '1px 6px', borderRadius: '3px' }}>
                {Math.round((SLIDE_DURATION * totalSlides) / 1000 / 60)}:{String(Math.round((SLIDE_DURATION * totalSlides / 1000) % 60)).padStart(2, '0')} dk
              </span>
            </div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 600, color: '#FFFFFF', margin: 0, lineHeight: 1.2 }}>
              {t('welcome.heroTitle')}
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontWeight: 300 }}>
              {t('welcome.heroSub')}
            </p>
          </div>
          <Link
            href="/welcome"
            style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C9A96E', border: '1px solid rgba(201,169,110,0.35)', borderRadius: '6px', padding: '0.5rem 1rem', textDecoration: 'none', flexShrink: 0 }}
          >
            {t('walk.ctaBtn')}
          </Link>
        </div>

        {/* Main content: YouTube or animated demo */}
        {YOUTUBE_VIDEO_ID ? (
          <YouTubeEmbed videoId={YOUTUBE_VIDEO_ID} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: '1.5rem', alignItems: 'start' }}>

            {/* ── Animated screen ─── */}
            <div
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              style={{
                background:   '#111318',
                border:       '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                overflow:     'hidden',
                position:     'relative',
              }}
            >
              {/* Fake window chrome */}
              <div style={{ padding: '0.625rem 0.875rem', background: '#1A1A22', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {['#FF5F57','#FFBD2E','#28C840'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
                </div>
                <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.05)', borderRadius: '3px', display: 'flex', alignItems: 'center', paddingLeft: '0.625rem' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.25)' }}>sail-ai.vercel.app</span>
                </div>
                {paused && (
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.55rem', color: '#C9A96E', letterSpacing: '0.05em' }}>⏸ {t('walk.pause')}</span>
                )}
              </div>

              {/* Progress bar */}
              <div style={{ height: 2, background: 'rgba(255,255,255,0.06)' }}>
                <div style={{ height: '100%', width: `${progress}%`, background: '#C9A96E', transition: 'width 0.05s linear' }} />
              </div>

              {/* Slide content */}
              <div style={{ padding: '1rem', minHeight: 340, position: 'relative' }}>
                <SlideContent slide={current} />
              </div>
            </div>

            {/* ── Chapter list ─── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: '0.5rem' }}>
                {t('walk.chapters')}
              </p>
              {SLIDES_I18N.map((slide) => {
                const active = current === slide.id
                const done   = current > slide.id
                return (
                  <button
                    key={slide.id}
                    onClick={() => { setCurrent(slide.id); setProgress(0) }}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '0.625rem',
                      padding:      '0.5rem 0.625rem',
                      background:   active ? 'rgba(201,169,110,0.1)' : 'transparent',
                      border:       `1px solid ${active ? 'rgba(201,169,110,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: '7px',
                      cursor:       'pointer',
                      textAlign:    'left',
                      transition:   'all 0.15s',
                    }}
                  >
                    <div style={{
                      width:          22,
                      height:         22,
                      borderRadius:   '50%',
                      background:     done ? '#C9A96E' : active ? 'rgba(201,169,110,0.2)' : 'rgba(255,255,255,0.05)',
                      border:         `1px solid ${done || active ? '#C9A96E' : 'rgba(255,255,255,0.12)'}`,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      flexShrink:     0,
                    }}>
                      {done
                        ? <span style={{ fontSize: '0.55rem', color: '#0C0C0E', fontWeight: 900 }}>✓</span>
                        : <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.57rem', fontWeight: 700, color: active ? '#C9A96E' : 'rgba(255,255,255,0.3)' }}>{slide.id}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', fontWeight: active ? 600 : 400, color: active ? '#FFFFFF' : done ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.3 }}>
                        {slide.chapter}
                      </p>
                    </div>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.57rem', color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                      {slide.time}
                    </span>
                  </button>
                )
              })}

              {/* CTA below chapters */}
              <div style={{ marginTop: '0.75rem', padding: '0.875rem', background: 'rgba(201,169,110,0.08)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: '8px' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#C9A96E', fontWeight: 600, margin: '0 0 0.5rem', lineHeight: 1.4 }}>
                  {t('walk.ctaHeadline')}
                </p>
                <Link
                  href="/welcome"
                  style={{
                    display:       'block',
                    textAlign:     'center',
                    padding:       '0.5rem',
                    background:    '#C9A96E',
                    color:         '#0C0C0E',
                    fontFamily:    'Inter, sans-serif',
                    fontSize:      '0.68rem',
                    fontWeight:    700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    borderRadius:  '5px',
                    textDecoration:'none',
                  }}
                >
                  {t('walk.ctaBtn')}
                </Link>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', margin: '0.4rem 0 0' }}>
                  {t('walk.ctaSub')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
