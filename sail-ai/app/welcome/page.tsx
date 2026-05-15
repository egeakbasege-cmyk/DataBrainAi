'use client'

/**
 * /welcome — İnteraktif Onboarding + Subscription Sayfası
 *
 * Yeni kullanıcıları karşılayan all-in-one sayfa:
 *  1. Ürün turu (ProductWalkthrough animasyonu veya YouTube)
 *  2. Gerçek AI yanıt örnekleri
 *  3. Kayıt akışı (Google SSO + e-posta)
 *  4. İnteraktif subscription karşılaştırması
 *  5. SSS
 */

import { useState } from 'react'
import Link         from 'next/link'
import { signIn }   from 'next-auth/react'
import { Logo }     from '@/components/Logo'
import { ProductWalkthrough } from '@/components/ProductWalkthrough'
import { useLanguage }        from '@/lib/i18n/LanguageContext'

// ── Adım göstergesi ───────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Ürünü İzle',        icon: '▶' },
  { n: 2, label: 'Hesap Oluştur',     icon: '👤' },
  { n: 3, label: 'Ücretsiz Başla',    icon: '🚀' },
  { n: 4, label: 'Pro\'ya Geç',       icon: '◆' },
]

// ── Gerçek AI yanıt örneği (subscription sayfasında) ─────────────────────────

const EXAMPLE_RESPONSE = {
  query:    'Shopify mağazam var. Dönüşüm oranım %1.3. Ne yapmalıyım?',
  insight:  'CVR\'niz %1.3 ile Türkiye ortalamasının (%2.3) 1 puan altında. Checkout sadeleştirmesi + sepet terk e-postası ile 90 günde %1.8\'e ulaşmak mümkün.',
  actions: [
    'Checkout adımlarını 5\'ten 3\'e indirin',
    'Sepet terk e-postası: 1h / 24h / 72h dizisi kurun',
    'Ürün sayfasına ≥50 müşteri yorumu ekleyin',
  ],
  target: 'CVR: %1.3 → %1.8 (90 gün)',
  source: 'Baymard Institute · Klaviyo 2026 · Statista',
}

// ── Pricing tier data ─────────────────────────────────────────────────────────

const FREE_FEATURES = [
  '5 detaylı analiz / gün',
  'Upwind · SAIL · Operator · TRIM modları',
  'Deep Research (Tavily + Serper)',
  'Gerçek web verileri',
  'Sektör benchmark karşılaştırması',
]

const PRO_FEATURES = [
  'Sınırsız analiz',
  'Tüm 7 mod + Custom Synergy',
  'Session hafızası — bağlamı tekrar girme',
  'İş profili kalıcı kayıt',
  'E-posta raporu gönderme',
  'Öncelikli yanıt hızı',
  'Veri dashboard\'u',
]

const FAQ = [
  {
    q: 'Ücretsiz planda ne var?',
    a: 'Günlük 5 tam analiz, tüm modlar, Deep Research ve gerçek web verisi. Kredi kartı gerekmez, süre sınırı yoktur.',
  },
  {
    q: 'AI gerçekten canlı web verisi kullanıyor mu?',
    a: 'Evet. Tavily + Serper API\'leri ile her sorguda gerçek zamanlı arama yapılır. Groq 70B bu verileri sentezler — eğitim verisi değil, bugünün verisi.',
  },
  {
    q: 'Session hafızası ne işe yarıyor?',
    a: 'Pro üyelerde iş profiliniz (sektör, metrikler, önceki stratejiler) korunur. Her seferinde tekrar anlatmanıza gerek kalmaz.',
  },
  {
    q: 'İptal edebilir miyim?',
    a: 'Evet. Stripe üzerinden tek tıkla, herhangi bir zamanda, bildirim süresi olmaksızın.',
  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function StepBar({ active }: { active: number }) {
  const { t } = useLanguage()
  const steps = [
    { n: 1, label: t('welcome.step1'), icon: '▶' },
    { n: 2, label: t('welcome.step2'), icon: '👤' },
    { n: 3, label: t('welcome.step3'), icon: '🚀' },
    { n: 4, label: t('welcome.step4'), icon: '◆' },
  ]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '2.5rem' }}>
      {steps.map((step, i) => {
        const done = active > step.n
        const curr = active === step.n
        return (
          <div key={step.n} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? '1 1 auto' : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{
                width:          36,
                height:         36,
                borderRadius:   '50%',
                background:     done ? '#C9A96E' : curr ? 'rgba(201,169,110,0.15)' : 'rgba(12,12,14,0.06)',
                border:         `2px solid ${done ? '#C9A96E' : curr ? '#C9A96E' : 'rgba(12,12,14,0.12)'}`,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                transition:     'all 0.3s',
                fontSize:       done ? '0.7rem' : '0.85rem',
              }}>
                {done ? <span style={{ color: '#0C0C0E', fontWeight: 900, fontSize: '0.65rem' }}>✓</span> : <span>{step.icon}</span>}
              </div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: curr ? 700 : 400, color: curr || done ? '#0C0C0E' : '#A1A1AA', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#C9A96E' : 'rgba(12,12,14,0.1)', margin: '0 0.25rem', marginBottom: '1.1rem', transition: 'background 0.3s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ExampleCard() {
  const { t } = useLanguage()
  return (
    <div style={{
      background:   '#0C0C0E',
      border:       '1px solid rgba(201,169,110,0.2)',
      borderRadius: '12px',
      overflow:     'hidden',
    }}>
      {/* Query pill */}
      <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#C9A96E', flexShrink: 0 }} />
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', margin: 0, fontStyle: 'italic' }}>
          "{EXAMPLE_RESPONSE.query}"
        </p>
      </div>

      <div style={{ padding: '1rem' }}>
        {/* Insight */}
        <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, marginBottom: '0.875rem' }}>
          {EXAMPLE_RESPONSE.insight}
        </p>

        {/* Benchmark bar */}
        <div style={{ marginBottom: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>{t('welcome.currentCvr')}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: '#F87171', fontWeight: 700 }}>%1.3</span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
            <div style={{ height: '100%', width: '57%', background: '#F87171', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)' }}>{t('welcome.sectorMedian')}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>%2.3</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.875rem' }}>
          {EXAMPLE_RESPONSE.actions.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#C9A96E', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: 1.45 }}>{a}</p>
            </div>
          ))}
        </div>

        {/* Target + source */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.625rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: '#10B981', fontWeight: 600 }}>🎯 {EXAMPLE_RESPONSE.target}</span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.57rem', color: 'rgba(255,255,255,0.2)' }}>{EXAMPLE_RESPONSE.source}</span>
        </div>
      </div>
    </div>
  )
}

function SignupSection({ onSignedUp }: { onSignedUp: () => void }) {
  const { t } = useLanguage()
  const [googleLoading, setGoogleLoading] = useState(false)
  const [emailMode,     setEmailMode]     = useState(false)
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [name,          setName]          = useState('')
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState(false)

  async function handleGoogle() {
    setGoogleLoading(true)
    try {
      await signIn('google', { callbackUrl: '/chat' })
    } catch {
      setError(t('welcome.signup.errGoogle'))
      setGoogleLoading(false)
    }
  }

  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim())        { setError(t('welcome.signup.errName')); return }
    if (password.length < 8) { setError(t('welcome.signup.errPw')); return }
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.message ?? t('welcome.signup.errFail')); setLoading(false); return }
      setSuccess(true)
      setTimeout(() => onSignedUp(), 800)
    } catch {
      setError(t('welcome.signup.errGeneral'))
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: 40, marginBottom: '0.75rem' }}>🎉</div>
        <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.2rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.25rem' }}>
          {t('welcome.signup.success')}
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#71717A' }}>{t('welcome.signup.successSub')}</p>
      </div>
    )
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.7rem 0', background: 'transparent',
    border: 'none', borderBottom: '1px solid rgba(12,12,14,0.15)',
    outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem',
    color: '#0C0C0E', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      {/* Google — primary */}
      <button
        onClick={handleGoogle}
        disabled={googleLoading}
        style={{
          width:          '100%',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          gap:            '0.75rem',
          padding:        '0.8rem',
          background:     '#FFFFFF',
          border:         '1px solid rgba(12,12,14,0.16)',
          borderRadius:   '6px',
          cursor:         googleLoading ? 'wait' : 'pointer',
          fontFamily:     'Inter, sans-serif',
          fontSize:       '0.875rem',
          fontWeight:     600,
          color:          '#0C0C0E',
          boxShadow:      '0 1px 4px rgba(0,0,0,0.08)',
          opacity:        googleLoading ? 0.7 : 1,
          transition:     'all 0.15s',
        }}
      >
        {googleLoading ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(12,12,14,0.1)" strokeWidth="3"/>
            <path d="M12 2 a10 10 0 0 1 10 10" stroke="#0C0C0E" strokeWidth="3" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.7s" repeatCount="indefinite"/>
            </path>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        {googleLoading ? t('login.connectingGoogle') : t('welcome.signup.google')}
      </button>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(12,12,14,0.09)' }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#A1A1AA' }}>{t('login.or')}</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(12,12,14,0.09)' }} />
      </div>

      {/* Email form */}
      {!emailMode ? (
        <button
          onClick={() => setEmailMode(true)}
          style={{
            width:         '100%',
            padding:       '0.75rem',
            background:    'transparent',
            border:        '1px solid rgba(12,12,14,0.2)',
            borderRadius:  '6px',
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.8rem',
            fontWeight:    500,
            color:         '#71717A',
            cursor:        'pointer',
            transition:    'all 0.15s',
          }}
        >
          {t('welcome.signup.emailMode')}
        </button>
      ) : (
        <form onSubmit={handleEmailRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input type="text" placeholder={t('welcome.signup.namePlaceholder')} value={name} onChange={e => setName(e.target.value)} required style={inp} />
          <input type="email" placeholder={t('welcome.signup.emailLabel')} value={email} onChange={e => setEmail(e.target.value)} required style={inp} />
          <input type="password" placeholder={t('welcome.signup.passwordLabel')} value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
          {error && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#991B1B', background: 'rgba(153,27,27,0.05)', border: '1px solid rgba(153,27,27,0.15)', padding: '0.5rem 0.75rem', borderRadius: '4px', margin: 0 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ padding: '0.8rem', background: loading ? '#3A3A3C' : '#0C0C0E', color: '#FAFAF8', border: 'none', borderRadius: '6px', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? t('welcome.signup.creating') : t('welcome.signup.createBtn')}
          </button>
        </form>
      )}

      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#A1A1AA', textAlign: 'center', margin: 0, lineHeight: 1.6 }}>
        {t('login.terms')}{' '}
        <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{t('login.termsLink')}</span>
        {' '}&amp;{' '}
        <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>{t('login.privacy')}</span>
      </p>

      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#71717A', textAlign: 'center', margin: 0 }}>
        <Link href="/login" style={{ color: '#C9A96E', textDecoration: 'none', fontWeight: 600 }}>{t('login.signIn')}</Link>
      </p>
    </div>
  )
}

function PricingSection({ onUpgrade }: { onUpgrade: () => void }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [yearly,  setYearly]  = useState(false)

  async function handleStripe() {
    setLoading(true)
    try {
      const res  = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch {
      setLoading(false)
    }
  }

  const proPrice   = yearly ? '$7.99' : '$9.99'
  const proPeriod  = yearly ? t('welcome.pricing.yearly').replace('Yearly', '').replace('Jährlich', '').replace('Anual', '').replace('Annuel', '').replace('按年', '') || '/yr' : '/mo'
  const proBadge   = yearly ? '–20%' : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Billing toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: !yearly ? '#0C0C0E' : '#A1A1AA', fontWeight: !yearly ? 600 : 400 }}>{t('welcome.pricing.monthly')}</span>
        <button
          onClick={() => setYearly(v => !v)}
          style={{
            position: 'relative', width: 36, height: 18, borderRadius: 999,
            background: yearly ? '#C9A96E' : '#D1D5DB', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <span style={{ position: 'absolute', top: 2, left: yearly ? 18 : 2, width: 14, height: 14, borderRadius: '50%', background: '#FFF', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s', display: 'block' }} />
        </button>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: yearly ? '#0C0C0E' : '#A1A1AA', fontWeight: yearly ? 600 : 400, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {t('welcome.pricing.yearly').split('(')[0].trim()} {yearly && <span style={{ fontSize: '0.58rem', background: 'rgba(201,169,110,0.15)', color: '#C9A96E', border: '1px solid rgba(201,169,110,0.3)', borderRadius: '4px', padding: '1px 5px', fontWeight: 700 }}>–20%</span>}
        </span>
      </div>

      {/* Two tiers side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

        {/* Free */}
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#71717A' }}>Starter</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.4rem' }}>
              <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2.2rem', fontWeight: 700, color: '#0C0C0E', lineHeight: 1 }}>$0</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#A1A1AA' }}>/süresiz</span>
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            {FREE_FEATURES.map(f => (
              <li key={f} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#3A3A3C', lineHeight: 1.4, display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#C9A96E', fontSize: '0.55rem', flexShrink: 0, marginTop: '0.3rem' }}>◆</span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/chat"
            style={{ display: 'block', textAlign: 'center', padding: '0.7rem', background: 'transparent', border: '1px solid rgba(0,0,0,0.18)', borderRadius: '6px', fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0C0C0E', textDecoration: 'none' }}
          >
            {t('welcome.pricing.startFree')}
          </Link>
        </div>

        {/* Pro */}
        <div style={{ background: '#0C0C0E', border: '2px solid rgba(201,169,110,0.4)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem', position: 'relative', overflow: 'hidden' }}>
          {/* Gold top line */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #0C0C0E, #C9A96E, #0C0C0E)' }} />
          {proBadge && (
            <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', fontFamily: 'Inter, sans-serif', fontSize: '0.55rem', fontWeight: 700, color: '#0C0C0E', background: '#C9A96E', padding: '2px 7px', borderRadius: '10px' }}>
              {proBadge}
            </div>
          )}
          <div>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A96E' }}>Professional</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginTop: '0.4rem' }}>
              <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '2.2rem', fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>{proPrice}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{proPeriod}</span>
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
            {PRO_FEATURES.map(f => (
              <li key={f} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={{ color: '#C9A96E', fontSize: '0.55rem', flexShrink: 0, marginTop: '0.3rem' }}>◆</span>
                {f}
              </li>
            ))}
          </ul>
          <button
            onClick={handleStripe}
            disabled={loading}
            style={{ padding: '0.7rem', background: '#C9A96E', border: 'none', borderRadius: '6px', fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#0C0C0E', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? t('pricing.redirecting') : t('welcome.pricing.upgradePro')}
          </button>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>
            {t('paywall.perMonth').replace('/month · ', '').replace('/ay · ', '').replace('/mes · ', '').replace('/Monat · ', '').replace('/mois · ', '').replace('/月 · ', '') || 'Cancel any time'}
          </p>
        </div>
      </div>

      {/* Skip to free */}
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#A1A1AA', textAlign: 'center', margin: 0 }}>
        <Link href="/chat" style={{ color: '#C9A96E', textDecoration: 'none', fontWeight: 600 }}>{t('welcome.pricing.skip')}</Link>
      </p>
    </div>
  )
}

function FAQSection() {
  const { t } = useLanguage()
  const [open, setOpen] = useState<number | null>(null)
  const faqItems = [
    { q: t('welcome.faq.q1'), a: t('welcome.faq.a1') },
    { q: t('welcome.faq.q2'), a: t('welcome.faq.a2') },
    { q: t('welcome.faq.q3'), a: t('welcome.faq.a3') },
    { q: t('welcome.faq.q4'), a: t('welcome.faq.a4') },
  ]
  return (
    <div>
      <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.2rem', fontWeight: 600, color: '#0C0C0E', marginBottom: '1.25rem' }}>
        {t('welcome.faq.title')}
      </h3>
      {faqItems.map((faq, i) => (
        <div key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '1rem' }}
          >
            <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1rem', fontWeight: 600, color: '#0C0C0E', lineHeight: 1.3 }}>{faq.q}</span>
            <span style={{ color: '#C9A96E', fontSize: '1rem', flexShrink: 0, transition: 'transform 0.2s', transform: open === i ? 'rotate(45deg)' : 'none' }}>+</span>
          </button>
          {open === i && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#71717A', lineHeight: 1.7, paddingBottom: '1rem', margin: 0, fontWeight: 300 }}>
              {faq.a}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WelcomePage() {
  const { t } = useLanguage()
  // 1=watch, 2=signup, 3=free, 4=upgrade
  const [activeStep, setActiveStep] = useState(1)

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>

      {/* Minimal nav for welcome flow */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(250,250,248,0.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.07)', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <Logo size={24} />
          <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '0.07em', color: '#0C0C0E' }}>SAIL AI</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/login" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#71717A', textDecoration: 'none', letterSpacing: '0.05em' }}>{t('welcome.signIn')}</Link>
          <Link href="/chat" style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 700, color: '#0C0C0E', background: 'rgba(201,169,110,0.15)', border: '1px solid rgba(201,169,110,0.3)', borderRadius: '5px', padding: '0.35rem 0.875rem', textDecoration: 'none', letterSpacing: '0.06em' }}>
            {t('welcome.tryCta')}
          </Link>
        </div>
      </header>

      {/* ── SECTION 1: Product Tour ──────────────────────────────────── */}
      <section style={{ background: '#0C0C0E' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3rem 1.5rem 2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A96E' }}>
              SAIL AI
            </span>
            <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 600, color: '#FFFFFF', margin: '0.5rem 0 0.5rem', lineHeight: 1.2 }}>
              {t('welcome.heroTitle')}
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}>
              {t('welcome.heroSub')}
            </p>
          </div>
        </div>

        {/* Full-width walkthrough */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.5rem 3rem' }}>
          <ProductWalkthrough />
        </div>
      </section>

      {/* ── SECTION 2: Gerçek AI Yanıt Örneği ─────────────────────── */}
      <section style={{ background: '#FAFAF8', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'center' }}>
            <div>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C9A96E', display: 'block', marginBottom: '0.75rem' }}>
                {t('walk.insight')}
              </span>
              <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.5rem', fontWeight: 600, color: '#0C0C0E', lineHeight: 1.3, margin: '0 0 1rem' }}>
                {t('welcome.heroTitle')}
              </h2>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#71717A', lineHeight: 1.7, fontWeight: 300, margin: '0 0 1.5rem' }}>
                {t('research.subtitle')}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  `→ 20+ ${t('walk.sourcesScanned')}`,
                  `→ ${t('walk.sectorMedian')}`,
                  `→ ${t('walk.recActions')} + ${t('walk.target30d')}`,
                ].map(item => (
                  <p key={item} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#0C0C0E', margin: 0, fontWeight: 500 }}>{item}</p>
                ))}
              </div>
            </div>
            <ExampleCard />
          </div>
        </div>
      </section>

      {/* ── SECTION 3: Kayıt + Abonelik ────────────────────────────── */}
      <section id="signup" style={{ background: '#FFFFFF' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '4rem 1.5rem' }}>

          <StepBar active={activeStep} />

          {/* Sign up form */}
          <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '14px', padding: '2rem 2.25rem', marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.3rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.5rem' }}>
              {t('welcome.signup.title')}
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#71717A', margin: '0 0 1.5rem', fontWeight: 300 }}>
              {t('welcome.signup.sub')}
            </p>
            <SignupSection onSignedUp={() => setActiveStep(3)} />
          </div>

          {/* Pricing */}
          <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '14px', padding: '2rem 2.25rem', marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.3rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.25rem' }}>
              {t('welcome.pricing.title')}
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#71717A', margin: '0 0 1.5rem', fontWeight: 300 }}>
              {t('pricing.subheadline')}
            </p>
            <PricingSection onUpgrade={() => setActiveStep(4)} />
          </div>

          {/* FAQ */}
          <div style={{ background: '#FAFAF8', border: '1px solid rgba(0,0,0,0.09)', borderRadius: '14px', padding: '2rem 2.25rem' }}>
            <FAQSection />
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer style={{ background: '#0C0C0E', padding: '1.5rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
          © {new Date().getFullYear()} SAIL AI · <Link href="/pricing" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>{t('nav.pricing')}</Link> · <Link href="/chat" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>{t('nav.chartCourse')}</Link>
        </p>
      </footer>
    </div>
  )
}
