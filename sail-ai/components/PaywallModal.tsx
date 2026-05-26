'use client'

/**
 * PaywallModal — Upgrade Pro overlay
 * ─────────────────────────────────────────────────────────────
 * CSS fix: All positioning via inline styles only.
 * No Tailwind transform classes that conflict with Framer Motion
 * transforms (which override CSS transform, breaking centering).
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Logo } from './Logo'
import { useLanguage } from '@/lib/i18n/LanguageContext'

interface Props {
  open:    boolean
  onClose: () => void
}

const FEATURES = [
  { icon: '∞',  text: 'Unlimited analyses per day' },
  { icon: '💾', text: 'Session memory across conversations' },
  { icon: '💼', text: 'Business profile persistence' },
  { icon: '⚡', text: 'Priority response time' },
  { icon: '📤', text: 'Exportable strategy summaries' },
  { icon: '🧠', text: 'Access to all 8 specialist modes' },
]

export function PaywallModal({ open, onClose }: Props) {
  const { t }     = useLanguage()
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res  = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      window.location.href = data.url
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Checkout failed'
      console.error('Checkout error:', msg)
      alert(msg)
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ──────────────────────────────────── */}
          <motion.div
            key="paywall-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position:        'fixed',
              inset:           0,
              zIndex:          9998,
              background:      'rgba(6,14,28,0.72)',
              backdropFilter:  'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          />

          {/* ── Panel ─────────────────────────────────────── */}
          <motion.div
            key="paywall-panel"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{   opacity: 0, scale: 0.96,  y: 12 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{
              /* ── Centering — pure CSS, no Tailwind transforms ── */
              position:      'fixed',
              top:           '50%',
              left:          '50%',
              transform:     'translate(-50%, -50%)',
              zIndex:        9999,

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
                  fontFamily:    'Cormorant Garamond, Georgia, serif',
                  fontWeight:    700,
                  fontSize:      '0.8rem',
                  letterSpacing: '0.14em',
                  color:         '#C9A96E',
                  textTransform: 'uppercase',
                }}>
                  Sail AI Pro
                </span>
              </div>

              {/* ── Headline ───────────────────────────────── */}
              <h2 style={{
                fontFamily:    'Cormorant Garamond, Georgia, serif',
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
                fontFamily: 'Inter, sans-serif',
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
                    fontFamily: 'Cormorant Garamond, Georgia, serif',
                    fontWeight: 700,
                    fontSize:   '2.6rem',
                    color:      '#FFFFFF',
                    lineHeight: 1,
                  }}>
                    $9.99
                  </span>
                  <span style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize:   '0.82rem',
                    color:      'rgba(255,255,255,0.35)',
                  }}>
                    {t('paywall.perMonth')}
                  </span>
                </div>

                {/* Features list */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {FEATURES.map(f => (
                    <li
                      key={f.text}
                      style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        '0.625rem',
                        fontFamily: 'Inter, sans-serif',
                        fontSize:   '0.83rem',
                        color:      'rgba(255,255,255,0.72)',
                        fontWeight: 300,
                      }}
                    >
                      <span style={{
                        fontSize:   '0.7rem',
                        color:      '#C9A96E',
                        flexShrink: 0,
                        width:      18,
                        textAlign:  'center',
                      }}>
                        {f.icon}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', marginBottom: '1.375rem' }} />

              {/* ── CTA buttons ────────────────────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
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
                    fontFamily:    'Inter, sans-serif',
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
                    fontFamily:    'Inter, sans-serif',
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
                fontFamily: 'Inter, sans-serif',
                fontSize:   '0.65rem',
                color:      'rgba(255,255,255,0.2)',
                textAlign:  'center',
                marginTop:  '0.75rem',
                lineHeight: 1.6,
              }}>
                Cancel anytime · Secure payment via Stripe
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
