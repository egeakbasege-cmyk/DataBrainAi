'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useSession } from 'next-auth/react'
import { createCheckout } from '@/lib/api'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

const BUNDLES: Array<{ credits: 1 | 3 | 10; price: string; label: string; highlight?: boolean }> = [
  { credits: 1,  price: '$3',  label: 'Best for trying' },
  { credits: 3,  price: '$9',  label: 'Most popular',   highlight: true },
  { credits: 10, price: '$25', label: 'Best value' },
]

interface Props {
  onClose:   () => void
  onSuccess: (credits: number) => void
}

export function PaywallModal({ onClose, onSuccess }: Props) {
  const { data: session } = useSession()
  const [selected, setSelected]     = useState<1 | 3 | 10>(3)
  const [clientSecret, setSecret]   = useState<string | null>(null)
  const [loadingCS, setLoadingCS]   = useState(false)
  const [error, setError]           = useState('')

  const handleSelectBundle = async (credits: 1 | 3 | 10) => {
    setSelected(credits)
    setSecret(null)
    setError('')
    setLoadingCS(true)
    try {
      const token = (session as any)?.accessToken || ''
      const data  = await createCheckout(credits, token)
      setSecret(data.client_secret)
    } catch (e: any) {
      setError(e.message || 'Failed to load payment form.')
    } finally {
      setLoadingCS(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-border rounded-card w-full max-w-md p-6 relative animate-fade-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted hover:text-white text-lg leading-none"
        >
          ×
        </button>

        <h2 className="font-heading text-2xl text-white mb-1">Buy Credits</h2>
        <p className="text-sm text-muted font-mono mb-6">$3 per analysis · no subscription</p>

        {/* Bundle selector */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {BUNDLES.map((b) => (
            <button
              key={b.credits}
              onClick={() => handleSelectBundle(b.credits)}
              className="relative rounded-card p-4 border text-center transition-all"
              style={{
                borderColor: selected === b.credits ? '#2bc4e8' : '#1a2840',
                background:  selected === b.credits ? '#2bc4e810' : '#0b1325',
              }}
            >
              {b.highlight && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-mono bg-accent text-bg px-2 py-0.5 rounded-pill">
                  Popular
                </span>
              )}
              <div className="text-white font-mono font-bold text-lg">{b.price}</div>
              <div className="text-muted text-xs mt-0.5">{b.credits} analysis{b.credits > 1 ? 'es' : ''}</div>
              <div className="text-muted text-xs mt-1">{b.label}</div>
            </button>
          ))}
        </div>

        {/* Payment form */}
        {loadingCS && (
          <div className="h-24 flex items-center justify-center text-muted font-mono text-sm animate-pulse">
            Loading payment form…
          </div>
        )}

        {error && (
          <p className="text-danger text-xs font-mono mb-4 bg-danger/10 border border-danger/30 px-3 py-2 rounded-chip">
            {error}
          </p>
        )}

        {clientSecret && !loadingCS && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'night',
                variables: { colorBackground: '#060c1a', colorText: '#e8eef8', fontFamily: 'IBM Plex Mono, monospace' },
              },
            }}
          >
            <CheckoutForm
              selected={selected}
              clientSecret={clientSecret}
              onSuccess={() => { onSuccess(selected); onClose() }}
            />
          </Elements>
        )}

        {!clientSecret && !loadingCS && !error && (
          <button
            onClick={() => handleSelectBundle(selected)}
            className="w-full bg-accent text-bg font-medium py-3 rounded-pill text-sm hover:shadow-accent transition-all"
          >
            Continue to payment →
          </button>
        )}
      </div>
    </div>
  )
}

function CheckoutForm({
  selected,
  clientSecret,
  onSuccess,
}: {
  selected:     number
  clientSecret: string
  onSuccess:    () => void
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
      confirmParams: { return_url: window.location.origin + '/analyse' },
      redirect: 'if_required',
    })
    setLoading(false)
    if (stripeErr) {
      setError(stripeErr.message || 'Payment failed.')
    } else {
      onSuccess()
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <p className="text-danger text-xs font-mono bg-danger/10 border border-danger/30 px-3 py-2 rounded-chip">
          {error}
        </p>
      )}
      <button
        onClick={handlePay}
        disabled={loading || !stripe}
        className="w-full bg-green text-bg font-medium py-3 rounded-pill text-sm hover:shadow-green transition-all disabled:opacity-60"
      >
        {loading ? 'Processing…' : `Pay $${[3,9,25][[1,3,10].indexOf(selected)]} →`}
      </button>
    </div>
  )
}
