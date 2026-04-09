'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { loadStripe } from '@stripe/stripe-js'
import { useState } from 'react'
import { Logo } from './Logo'

interface Props {
  open:    boolean
  onClose: () => void
}

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

export function PaywallModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    if (!stripePromise) { alert('Payments are not configured yet.'); return }
    setLoading(true)
    try {
      const res    = await fetch('/api/checkout', { method: 'POST' })
      const data   = await res.json()
      if (data.error) throw new Error(data.error)
      const stripe = await stripePromise
      await stripe?.redirectToCheckout({ sessionId: data.sessionId })
    } catch (err: any) {
      console.error('Checkout error:', err.message)
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(10,22,40,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.34, 1.1, 0.64, 1] }}
            className="fixed z-50 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 w-full sm:max-w-md overflow-hidden"
            style={{
              background:   '#0A1628',
              border:       '1px solid rgba(26,82,118,0.4)',
              borderRadius: '12px',
              boxShadow:    '0 24px 80px rgba(10,22,40,0.5)',
            }}
          >
            {/* Gradient top stripe */}
            <div className="stripe-accent" />

            <div className="p-8">
              {/* Brand */}
              <div className="flex items-center gap-3 mb-6">
                <Logo size={26} />
                <span
                  style={{
                    fontFamily:    'Cormorant Garamond, Georgia, serif',
                    fontWeight:    600,
                    fontSize:      '0.85rem',
                    letterSpacing: '0.1em',
                    color:         '#5DADE2',
                  }}
                >
                  SAIL AI PRO
                </span>
              </div>

              <h2
                style={{
                  fontFamily:    'Cormorant Garamond, Georgia, serif',
                  fontStyle:     'italic',
                  fontSize:      '1.5rem',
                  color:         '#FFFFFF',
                  letterSpacing: '-0.02em',
                  marginBottom:  '0.625rem',
                }}
              >
                You&apos;ve used your complimentary analyses
              </h2>
              <p
                style={{
                  fontFamily:   'Inter, sans-serif',
                  fontSize:     '0.875rem',
                  lineHeight:   1.7,
                  color:        'rgba(255,255,255,0.5)',
                  fontWeight:   300,
                  marginBottom: '1.75rem',
                }}
              >
                Upgrade to Pro for unlimited strategy sessions, priority responses,
                and early access to everything new.
              </p>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: '1.5rem' }} />

              {/* Pricing */}
              <div className="py-4">
                <div className="flex items-baseline gap-2 mb-5">
                  <span
                    style={{
                      fontFamily: 'Cormorant Garamond, Georgia, serif',
                      fontWeight: 700,
                      fontSize:   '2.5rem',
                      color:      '#FFFFFF',
                      lineHeight: 1,
                    }}
                  >
                    $4
                  </span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
                    /month · cancel any time
                  </span>
                </div>
                <ul className="space-y-2">
                  {['Unlimited analyses per day', 'Priority response time', 'Early access to new features'].map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5"
                      style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}
                    >
                      <span style={{ color: '#C49A3A', fontSize: '0.6rem' }}>◆</span> {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: '1.5rem', marginTop: '0.5rem' }} />

              <div className="space-y-3">
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                  style={{ display: 'flex' }}
                >
                  {loading ? 'Redirecting…' : 'Upgrade to Pro →'}
                </button>
                <button
                  onClick={onClose}
                  style={{
                    width:         '100%',
                    textAlign:     'center',
                    padding:       '0.625rem',
                    fontFamily:    'Inter, sans-serif',
                    fontSize:      '0.8rem',
                    color:         'rgba(255,255,255,0.35)',
                    letterSpacing: '0.05em',
                    cursor:        'pointer',
                    background:    'none',
                    border:        'none',
                    transition:    'color 0.2s',
                  }}
                >
                  Not now
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
