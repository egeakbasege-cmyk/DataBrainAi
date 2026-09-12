'use client'

/**
 * PaywallModal — Upgrade Pro overlay
 * ─────────────────────────────────────────────────────────────
 * CSS fix: All positioning via inline styles only.
 * No Tailwind transform classes that conflict with Framer Motion
 * transforms (which override CSS transform, breaking centering).
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Infinity as InfinityIcon, History, Briefcase, Zap, FileDown, Compass } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from './Logo'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  open:    boolean
  onClose: () => void
}

const FEATURES: { icon: LucideIcon; text: string }[] = [
  { icon: InfinityIcon, text: 'Unlimited analyses per day' },
  { icon: History,      text: 'Session memory across conversations' },
  { icon: Briefcase,    text: 'Business profile persistence' },
  { icon: Zap,          text: 'Priority response time' },
  { icon: FileDown,     text: 'Exportable strategy summaries' },
  { icon: Compass,      text: 'Access to all 8 specialist modes' },
]

export function PaywallModal({ open, onClose }: Props) {
  const { t }     = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // Close on Escape — modals must be dismissible from the keyboard.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Reset transient state whenever the modal is reopened.
  useEffect(() => { if (open) { setError(null); setLoading(false) } }, [open])

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Checkout failed')
      if (!data.url) throw new Error('Checkout failed')
      window.location.href = data.url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout failed'
      console.error('Checkout error:', msg)
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        // Backdrop doubles as a flex container that centers the panel.
        // Centering lives here (flexbox), NOT on the panel — Framer Motion
        // owns the panel's `transform` for the scale/y animation, and a CSS
        // `translate(-50%,-50%)` on the panel would be overwritten by Motion,
        // leaving the panel pinned to the screen centre and spilling off the
        // right/bottom edge (the reported bug).
        <motion.div
          key="paywall"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
          style={{
            position:             'fixed',
            inset:                0,
            zIndex:               9998,
            background:           'rgba(6,14,28,0.72)',
            backdropFilter:       'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display:              'flex',
            alignItems:           'center',
            justifyContent:       'center',
            padding:              '1rem',
          }}
        >
          {/* ── Panel ─────────────────────────────────────── */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Upgrade to Sail AI Pro"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.96,  y: 12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={e => e.stopPropagation()}
            style={{
              /* ── Sizing ── */
              width:         'min(92vw, 440px)',
              maxHeight:     '90dvh',
              overflowY:     'auto',

              /* ── Visuals ── */
              background:    'linear-gradient(160deg, #080F1E 0%, #0D1B35 100%)',
              border:        '1px solid rgba(201,169,110,0.22)',
              borderRadius:  '16px',
              boxShadow:     '0 32px 96px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,169,110,0.08)',
            }}
          >
            {/* Gold top stripe */}
            <div style={{
              height:     2,
              background: 'linear-gradient(90deg, transparent, #C9A96E 40%, #E8C98A 60%, transparent)',
              borderRadius: '16px 16px 0 0',
            }} />

            <div style={{ padding: '1.75rem 2rem 2rem' }}>

              {/* ── Brand row ──────────────────────────────── */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Logo size={26} />
                <span style={{
                  fontFamily:    'var(--font-cormorant), Georgia, serif',
                  fontWeight:    700,
                  fontSize:      '0.8rem',
                  letterSpacing: '0.14em',
                  color:         '#C9A96E',
                  textTransform: 'uppercase',
                }}>
                  Sail AI
                </span>
                <span style={{
                  fontFamily:    'var(--font-inter), sans-serif',
                  fontWeight:    600,
                  fontSize:      '0.6rem',
                  letterSpacing: '0.16em',
                  color:         '#0C0C0E',
                  textTransform: 'uppercase',
                  background:    'linear-gradient(135deg, #C9A96E 0%, #E8C98A 100%)',
                  padding:       '0.18rem 0.45rem',
                  borderRadius:  '4px',
                  lineHeight:    1,
                }}>
                  Pro
                </span>
              </div>

              {/* ── Headline ───────────────────────────────── */}
              <h2 style={{
                fontFamily:    'var(--font-cormorant), Georgia, serif',
                fontStyle:     'italic',
                fontSize:      'clamp(1.3rem, 4vw, 1.65rem)',
                fontWeight:    600,
                color:         '#FFFFFF',
                lineHeight:    1.25,
                margin:        '0 0 0.5rem',
                letterSpacing: '-0.02em',
              }}>
                {t('paywall.title')}
              </h2>
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize:   '0.875rem',
                lineHeight: 1.65,
                color:      'rgba(255,255,255,0.5)',
                fontWeight: 300,
                margin:     '0 0 1.5rem',
              }}>
                {t('paywall.subtitle')}
              </p>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: '1.375rem' }} />

              {/* ── Pricing ────────────────────────────────── */}
              <div style={{ marginBottom: '1.375rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{
                    fontFamily: 'var(--font-cormorant), Georgia, serif',
                    fontWeight: 700,
                    fontSize:   '2.6rem',
                    color:      '#FFFFFF',
                    lineHeight: 1,
                  }}>
                    $9.99
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-inter), sans-serif',
                    fontSize:   '0.82rem',
                    color:      'rgba(255,255,255,0.35)',
                  }}>
                    {t('paywall.perMonth')}
                  </span>
                </div>

                {/* Features list */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {FEATURES.map(f => {
                    const Icon = f.icon
                    return (
                      <li
                        key={f.text}
                        style={{
                          display:    'flex',
                          alignItems: 'center',
                          gap:        '0.75rem',
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize:   '0.85rem',
                          color:      'rgba(255,255,255,0.82)',
                          fontWeight: 400,
                        }}
                      >
                        <span style={{
                          flexShrink:     0,
                          width:          30,
                          height:         30,
                          display:        'flex',
                          alignItems:     'center',
                          justifyContent: 'center',
                          borderRadius:   '8px',
                          background:     'rgba(201,169,110,0.10)',
                          border:         '1px solid rgba(201,169,110,0.18)',
                        }}>
                          <Icon size={15} strokeWidth={1.75} color="#D4B877" aria-hidden />
                        </span>
                        {f.text}
                      </li>
                    )
                  })}
                </ul>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: '1.375rem' }} />

              {/* ── CTA buttons ────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {error && (
                  <div
                    role="alert"
                    style={{
                      padding:      '0.6rem 0.75rem',
                      borderRadius: '8px',
                      background:   'rgba(220,80,80,0.10)',
                      border:       '1px solid rgba(220,80,80,0.32)',
                      color:        '#F0A5A5',
                      fontFamily:   'var(--font-inter), sans-serif',
                      fontSize:     '0.78rem',
                      lineHeight:   1.5,
                    }}
                  >
                    {error}
                  </div>
                )}
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  style={{
                    width:         '100%',
                    padding:       '0.85rem 1.25rem',
                    background:    loading
                      ? 'rgba(201,169,110,0.35)'
                      : 'linear-gradient(135deg, #B8902A 0%, #C9A96E 50%, #D4B877 100%)',
                    border:        '1px solid rgba(201,169,110,0.4)',
                    borderRadius:  '10px',
                    cursor:        loading ? 'not-allowed' : 'pointer',
                    fontFamily:    'var(--font-inter), sans-serif',
                    fontSize:      '0.875rem',
                    fontWeight:    600,
                    letterSpacing: '0.04em',
                    color:         '#0C0C0E',
                    transition:    'opacity 0.15s, transform 0.15s',
                    boxShadow:     '0 4px 16px rgba(201,169,110,0.3)',
                  }}
                  onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = '0.88' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                >
                  {loading ? t('paywall.redirecting') : t('paywall.upgrade')}
                </button>

                <button
                  onClick={onClose}
                  style={{
                    width:         '100%',
                    padding:       '0.625rem',
                    background:    'none',
                    border:        'none',
                    cursor:        'pointer',
                    fontFamily:    'var(--font-inter), sans-serif',
                    fontSize:      '0.78rem',
                    color:         'rgba(255,255,255,0.3)',
                    letterSpacing: '0.04em',
                    transition:    'color 0.2s',
                    textAlign:     'center',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.55)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.3)' }}
                >
                  {t('paywall.notNow')}
                </button>
              </div>

              {/* Fine print */}
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize:   '0.65rem',
                color:      'rgba(255,255,255,0.2)',
                textAlign:  'center',
                marginTop:  '0.75rem',
                lineHeight: 1.6,
              }}>
                Cancel anytime · Secure checkout
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
