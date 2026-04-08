'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { loadStripe } from '@stripe/stripe-js'
import { useState } from 'react'
import { Logo } from './Logo'

interface Props {
  open:    boolean
  onClose: () => void
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export function PaywallModal({ open, onClose }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    try {
      const res  = await fetch('/api/checkout', { method: 'POST' })
      const data = await res.json()
      const stripe = await stripePromise
      await stripe?.redirectToCheckout({ sessionId: data.sessionId })
    } catch {
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
            style={{ background: 'rgba(10,15,30,0.8)', backdropFilter: 'blur(6px)' }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25, ease: [0.34, 1.2, 0.64, 1] }}
            className="fixed z-50 inset-x-4 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 top-1/2 -translate-y-1/2 w-full sm:max-w-md rounded-card overflow-hidden"
            style={{ background: '#111827', border: '1px solid rgba(192,57,43,0.25)', boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 40px rgba(192,57,43,0.1)' }}
          >
            {/* Crimson bar */}
            <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #C0392B, rgba(192,57,43,0.1))' }} />

            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <Logo size={28} />
                <span className="font-bold text-lg" style={{ color: '#F1F5F9' }}>Sail AI Pro</span>
              </div>

              <h2 className="font-bold mb-2" style={{ fontSize: '1.4rem', color: '#F1F5F9', letterSpacing: '-0.02em' }}>
                You&apos;ve used your 5 free analyses
              </h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: '#94A3B8' }}>
                Upgrade to Pro for unlimited strategy sessions, priority responses, and early access to new features.
              </p>

              {/* Pricing */}
              <div className="rounded-card p-5 mb-6" style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.2)' }}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-bold text-3xl" style={{ color: '#F1F5F9' }}>$4</span>
                  <span className="text-sm" style={{ color: '#94A3B8' }}>/month</span>
                </div>
                <ul className="space-y-1 mt-3">
                  {[
                    'Unlimited analyses per day',
                    'Faster response time',
                    'Early access to new features',
                    'Cancel any time',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm" style={{ color: '#CBD5E1' }}>
                      <span style={{ color: '#C0392B' }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full py-3.5 rounded-pill font-bold text-sm transition-all disabled:opacity-60"
                style={{ background: '#C0392B', color: '#F1F5F9', boxShadow: '0 0 20px rgba(192,57,43,0.4)' }}
              >
                {loading ? 'Redirecting…' : 'Upgrade to Pro →'}
              </button>

              <button
                onClick={onClose}
                className="w-full mt-3 py-2.5 text-sm transition-opacity hover:opacity-70"
                style={{ color: '#94A3B8' }}
              >
                Not now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
