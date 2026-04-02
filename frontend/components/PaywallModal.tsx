'use client'

import { useEffect, useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useSession } from 'next-auth/react'
import { createCheckout } from '../lib/api'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

const BUNDLES: Array<{
  credits: 1 | 3 | 10
  price:   number
  label:   string
  note:    string
  popular?: boolean
}> = [
  { credits: 1,  price: 3,  label: '$3',  note: '1 analysis',    },
  { credits: 3,  price: 9,  label: '$9',  note: '3 analyses',  popular: true },
  { credits: 10, price: 25, label: '$25', note: '10 analyses — best value' },
]

interface Props {
  onClose:   () => void
  onSuccess: (credits: number) => void
}

export function PaywallModal({ onClose, onSuccess }: Props) {
  const { data: session } = useSession()
  const [selected,   setSelected]   = useState<1 | 3 | 10>(3)
  const [secret,     setSecret]     = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  // Auto-load payment form for default bundle on mount
  useEffect(() => {
    loadSecret(3)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSecret = async (credits: 1 | 3 | 10) => {
    setSelected(credits)
    setSecret(null)
    setError('')
    setLoading(true)
    try {
      const token = (session as any)?.accessToken || ''
      const data  = await createCheckout(credits, token)
      setSecret(data.client_secret)
    } catch (e: any) {
      setError(e.message || 'Failed to load payment form. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const bundle = BUNDLES.find((b) => b.credits === selected)!

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Buy credits"
    >
      <div
        className="w-full max-w-md rounded-card animate-fade-up"
        style={{
          background: 'var(--card)',
          border:     '1px solid rgba(255,255,255,0.08)',
          boxShadow:  '0 24px 64px rgba(0,0,0,0.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-border">
          <div>
            <h2 className="font-heading text-ink" style={{ fontSize: '1.6rem', lineHeight: 1.1 }}>
              Buy credits
            </h2>
            <p className="font-mono text-2xs text-muted mt-1">
              $3 per analysis · no subscription · never expires
            </p>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-dim hover:text-ink transition-colors text-lg leading-none mt-0.5"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Bundle selector */}
          <div className="grid grid-cols-3 gap-2">
            {BUNDLES.map((b) => {
              const active = selected === b.credits
              return (
                <button
                  key={b.credits}
                  onClick={() => loadSecret(b.credits)}
                  disabled={loading}
                  className="relative rounded-card p-3.5 text-center transition-all disabled:opacity-60"
                  style={{
                    background:  active ? 'rgba(24,184,224,0.08)' : 'var(--surface)',
                    border:      `1px solid ${active ? 'rgba(24,184,224,0.5)' : 'var(--border)'}`,
                  }}
                  aria-pressed={active}
                >
                  {b.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 font-mono text-2xs px-2 py-0.5 rounded-pill"
                      style={{ background: 'var(--accent)', color: 'var(--bg)', fontSize: '0.58rem' }}>
                      Popular
                    </span>
                  )}
                  <div className="font-heading text-ink" style={{ fontSize: '1.4rem' }}>
                    {b.label}
                  </div>
                  <div className="font-mono text-2xs text-muted mt-1 leading-tight">
                    {b.note}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Selected bundle summary */}
          <div className="flex items-center justify-between px-4 py-3 rounded-card"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span className="font-mono text-2xs text-muted uppercase tracking-widest">
              {bundle.note}
            </span>
            <span className="font-mono text-sm text-ink font-medium">
              {bundle.label}
            </span>
          </div>

          {/* Payment form */}
          {loading && (
            <div className="rounded-card p-5 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="skeleton h-10 rounded-card" />
              <div className="skeleton h-10 rounded-card" />
            </div>
          )}

          {error && !loading && (
            <div className="font-mono text-xs px-4 py-3 rounded-card"
              style={{
                background: 'rgba(201,79,79,0.08)',
                border:     '1px solid rgba(201,79,79,0.25)',
                color:      'var(--danger)',
              }}
              role="alert">
              {error}
              <button onClick={() => loadSecret(selected)} className="ml-2 underline opacity-70 hover:opacity-100">
                Retry
              </button>
            </div>
          )}

          {secret && !loading && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret: secret,
                appearance: {
                  theme: 'night',
                  variables: {
                    colorBackground:    '#0d1020',
                    colorText:          '#dce4f5',
                    colorTextSecondary: '#526478',
                    fontFamily:         '"IBM Plex Mono", monospace',
                    borderRadius:       '6px',
                  },
                },
              }}
            >
              <CheckoutForm
                bundle={bundle}
                onSuccess={() => { onSuccess(selected); onClose() }}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  )
}

function CheckoutForm({
  bundle,
  onSuccess,
}: {
  bundle:    { credits: number; price: number; label: string; note: string }
  onSuccess: () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handlePay = async () => {
    if (!stripe || !elements) return
    setLoading(true)
    setError('')

    const { error: stripeErr } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/analyse` },
      redirect: 'if_required',
    })
    setLoading(false)

    if (stripeErr) {
      setError(stripeErr.message || 'Payment failed. Please try again.')
    } else {
      onSuccess()
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />

      {error && (
        <div className="font-mono text-xs px-4 py-3 rounded-card"
          style={{ background: 'rgba(201,79,79,0.08)', border: '1px solid rgba(201,79,79,0.25)', color: 'var(--danger)' }}
          role="alert">
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={loading || !stripe || !elements}
        className="w-full font-mono text-sm font-medium py-3.5 rounded-pill transition-all disabled:opacity-50 glow-green"
        style={{ background: 'var(--green)', color: 'var(--bg)' }}
      >
        {loading ? 'Processing…' : `Pay ${bundle.label} — ${bundle.note} →`}
      </button>

      <p className="text-center font-mono text-2xs text-muted">
        Powered by Stripe · Secured with 256-bit encryption
      </p>
    </div>
  )
}
