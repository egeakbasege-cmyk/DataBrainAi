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
  { credits: 1,  price: 3,  label: '$3',  note: '1 analysis'                 },
  { credits: 3,  price: 9,  label: '$9',  note: '3 analyses',  popular: true },
  { credits: 10, price: 25, label: '$25', note: '10 analyses — best value'   },
]

interface Props {
  onClose:   () => void
  onSuccess: (credits: number) => void
}

export function PaywallModal({ onClose, onSuccess }: Props) {
  const { data: session } = useSession()
  const [selected, setSelected] = useState<1 | 3 | 10>(3)
  const [secret,   setSecret]   = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

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

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(17,24,39,0.4)', backdropFilter: 'blur(8px)' }}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label="Buy credits"
    >
      <div
        className="w-full max-w-md rounded-card animate-fade-up"
        style={{
          background: '#FFFFFF',
          border:     '1px solid #E5E7EB',
          boxShadow:  '0 24px 64px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-border">
          <div>
            <h2 className="font-heading font-bold text-ink text-2xl mb-1">
              Buy credits
            </h2>
            <p className="font-sans text-xs text-muted">
              $3 per analysis · no subscription · never expires
            </p>
          </div>
          <button
            onClick={onClose}
            className="font-sans text-muted hover:text-ink transition-colors text-xl leading-none mt-0.5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface"
            aria-label="Close">
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
                  className="relative rounded-card p-3.5 text-center transition-all disabled:opacity-60 border"
                  style={{
                    background:   active ? '#FEFCE8' : '#F9FAFB',
                    borderColor:  active ? '#FEF08A' : '#E5E7EB',
                    boxShadow:    active ? '0 0 0 2px rgba(250,204,21,0.3)' : 'none',
                  }}
                  aria-pressed={active}
                >
                  {b.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 font-sans text-xs font-bold px-2 py-0.5 rounded-pill"
                      style={{ background: '#FACC15', color: '#111827', fontSize: '0.58rem' }}>
                      Popular
                    </span>
                  )}
                  <div className="font-heading font-bold text-ink" style={{ fontSize: '1.35rem' }}>
                    {b.label}
                  </div>
                  <div className="font-sans text-xs text-muted mt-1 leading-tight">
                    {b.note}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between px-4 py-3 rounded-card bg-surface border border-border">
            <span className="font-sans text-xs text-muted font-medium uppercase tracking-widest-2">
              {bundle.note}
            </span>
            <span className="font-heading font-bold text-ink text-lg">
              {bundle.label}
            </span>
          </div>

          {/* Payment form */}
          {loading && (
            <div className="rounded-card p-5 space-y-3 bg-surface border border-border">
              <div className="skeleton h-10 rounded-card" />
              <div className="skeleton h-10 rounded-card" />
            </div>
          )}

          {error && !loading && (
            <div className="font-sans text-xs px-4 py-3 rounded-card"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border:     '1px solid rgba(239,68,68,0.2)',
                color:      '#DC2626',
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
                  theme: 'stripe',
                  variables: {
                    colorPrimary:        '#FACC15',
                    colorBackground:     '#FFFFFF',
                    colorText:           '#111827',
                    colorTextSecondary:  '#6B7280',
                    colorDanger:         '#EF4444',
                    fontFamily:          'Inter, system-ui, sans-serif',
                    borderRadius:        '12px',
                    spacingUnit:         '4px',
                  },
                  rules: {
                    '.Input': {
                      border:      '1px solid #E5E7EB',
                      boxShadow:   'none',
                      fontSize:    '14px',
                    },
                    '.Input:focus': {
                      border:      '1px solid #FACC15',
                      boxShadow:   '0 0 0 3px rgba(250,204,21,0.15)',
                      outline:     'none',
                    },
                    '.Label': {
                      fontSize:      '11px',
                      fontWeight:    '500',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color:         '#6B7280',
                    },
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
        <div className="font-sans text-xs px-4 py-3 rounded-card"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}
          role="alert">
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={loading || !stripe || !elements}
        className="w-full font-heading font-bold text-ink text-sm py-3.5 rounded-pill transition-all disabled:opacity-50 glow-yellow"
        style={{ background: '#FACC15' }}
      >
        {loading ? 'Processing…' : `Pay ${bundle.label} — ${bundle.note} →`}
      </button>

      <p className="text-center font-sans text-xs text-muted">
        Secured by Stripe · 256-bit encryption
      </p>
    </div>
  )
}
