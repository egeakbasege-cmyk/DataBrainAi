'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { loadStripe } from '@stripe/stripe-js'
import { useState } from 'react'
import { Logo } from './Logo'
import { OrnamentRule } from './Ornaments'

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
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(26,24,20,0.5)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
          />

          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: [0.34, 1.1, 0.64, 1] }}
            className="fixed z-50 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 w-full sm:max-w-md overflow-hidden"
            style={{ background: '#F0EBE0', border: '1px solid rgba(26,24,20,0.14)', boxShadow: '0 24px 80px rgba(26,24,20,0.2)' }}
          >
            {/* Vintage top stripe */}
            <div className="stripe-accent" />

            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Logo size={26} />
                <span
                  className="font-serif font-semibold tracking-widest"
                  style={{ color: '#2B4A2A', fontSize: '0.85rem', letterSpacing: '0.1em' }}
                >
                  SAIL AI PRO
                </span>
              </div>

              <h2 className="font-serif italic mb-2" style={{ fontSize: '1.5rem', color: '#1A1814', letterSpacing: '-0.02em' }}>
                You&apos;ve used your complimentary analyses
              </h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: '#7A7062', fontFamily: 'Jost', fontWeight: 300 }}>
                Upgrade to Pro for unlimited strategy sessions, priority responses, and early access to everything new.
              </p>

              <OrnamentRule />

              <div className="py-6">
                <div className="flex items-baseline gap-2 mb-5">
                  <span className="font-serif font-bold" style={{ fontSize: '2.5rem', color: '#1A1814', lineHeight: 1 }}>$4</span>
                  <span className="text-sm" style={{ color: '#7A7062', fontFamily: 'Jost' }}>/month · cancel any time</span>
                </div>
                <ul className="space-y-2">
                  {['Unlimited analyses per day', 'Priority response time', 'Early access to new features'].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm" style={{ color: '#1A1814', fontFamily: 'Jost' }}>
                      <span style={{ color: '#2B4A2A', fontSize: '0.7rem' }}>✦</span> {f}
                    </li>
                  ))}
                </ul>
              </div>

              <OrnamentRule />

              <div className="pt-6 space-y-3">
                <button
                  onClick={handleUpgrade}
                  disabled={loading}
                  className="btn-primary w-full justify-center disabled:opacity-50"
                >
                  {loading ? 'Redirecting…' : 'Upgrade to Pro →'}
                </button>
                <button
                  onClick={onClose}
                  className="w-full text-center py-2 text-sm transition-opacity hover:opacity-60"
                  style={{ color: '#7A7062', fontFamily: 'Jost', letterSpacing: '0.06em' }}
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
