'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SignInForm() {
  const router       = useRouter()
  const params       = useSearchParams()
  const callbackUrl  = params.get('callbackUrl') || '/analyse'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', { email, password, redirect: false, callbackUrl })
    setLoading(false)
    if (res?.error) setError('Incorrect email or password. Please try again.')
    else router.push(callbackUrl)
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: '#F5F5F7' }}>

      <div className="w-full max-w-sm animate-fade-up">

        {/* Logo */}
        <div className="mb-10 text-center">
          <Link href="/"
            className="font-heading font-bold text-xl text-ink hover:opacity-70 transition-opacity">
            Starcoins
          </Link>
        </div>

        {/* Card */}
        <div className="bg-card rounded-card border border-border p-8"
          style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}>

          <h1 className="font-heading font-bold text-ink text-2xl mb-1">
            Welcome back.
          </h1>
          <p className="font-sans text-sm text-muted mb-8">
            Sign in to access your analyses.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email"
                className="block font-sans text-xs font-medium text-dim uppercase tracking-widest-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password"
                className="block font-sans text-xs font-medium text-dim uppercase tracking-widest-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 text-sm"
                placeholder="Your password"
              />
            </div>

            {error && (
              <div className="font-sans text-xs px-4 py-3 rounded-card"
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border:     '1px solid rgba(239,68,68,0.2)',
                  color:      '#DC2626',
                }}
                role="alert"
                aria-live="polite">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full font-heading font-bold text-ink text-sm py-3.5 rounded-pill transition-all disabled:opacity-50 glow-yellow mt-2"
              style={{ background: '#FACC15' }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <p className="text-center font-sans text-xs text-muted mt-6">
          Don't have an account?{' '}
          <Link href="/auth/signup" className="text-ink font-semibold hover:underline">
            Create one free
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: '#F5F5F7' }} />}>
      <SignInForm />
    </Suspense>
  )
}
