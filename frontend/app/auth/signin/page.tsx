'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function SignInForm() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/analyse'

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
    if (res?.error) setError('Invalid email or password.')
    else router.push(callbackUrl)
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-6">

      {/* Ambient editorial number */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none"
        aria-hidden="true">
        <span className="editorial-number" style={{ opacity: 0.025 }}>∅</span>
      </div>

      <div className="relative z-10 w-full max-w-sm animate-fade-up">

        {/* Back link + heading */}
        <div className="mb-10">
          <Link href="/"
            className="font-mono text-2xs text-muted uppercase tracking-widest-2 hover:text-ink transition-colors">
            ← Starcoins
          </Link>
          <h1 className="font-heading text-ink mt-6 mb-1"
            style={{ fontSize: '2.25rem', lineHeight: '1.1' }}>
            Welcome back.
          </h1>
          <p className="font-mono text-2xs text-muted tracking-wider">
            Sign in to access your strategies
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <label className="block font-mono text-2xs text-muted uppercase tracking-widest"
              htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-card text-ink text-sm"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block font-mono text-2xs text-muted uppercase tracking-widest"
              htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-card text-ink text-sm"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="font-mono text-xs px-4 py-3 rounded-card"
              style={{
                background: 'rgba(201,79,79,0.08)',
                border: '1px solid rgba(201,79,79,0.25)',
                color: '#c94f4f',
              }}
              role="alert"
              aria-live="polite">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-mono text-sm font-medium py-3.5 rounded-pill transition-all disabled:opacity-50 glow-green"
            style={{ background: '#1ed48a', color: '#07080e' }}>
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="font-mono text-2xs text-muted">
            No account?{' '}
            <Link href="/auth/signup" className="text-green hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <SignInForm />
    </Suspense>
  )
}
