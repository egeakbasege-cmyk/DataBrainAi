'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function SignUpPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.')
        setLoading(false)
        return
      }

      // Auto sign-in after registration
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError('Account created — please sign in.')
        router.push('/auth/signin')
        return
      }
      router.push('/analyse')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-6">

      {/* Ambient glyph */}
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none select-none"
        aria-hidden="true">
        <span className="editorial-number" style={{ opacity: 0.025 }}>✦</span>
      </div>

      <div className="relative z-10 w-full max-w-sm animate-fade-up">

        {/* Header */}
        <div className="mb-10">
          <Link href="/"
            className="font-mono text-2xs text-muted uppercase tracking-widest-2 hover:text-ink transition-colors">
            ← Starcoins
          </Link>
          <h1 className="font-heading text-ink mt-6 mb-1"
            style={{ fontSize: '2.25rem', lineHeight: '1.1' }}>
            Get started.
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }} />
            <p className="font-mono text-2xs text-green uppercase tracking-widest">
              First analysis completely free
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-1.5">
            <label htmlFor="email"
              className="block font-mono text-2xs text-muted uppercase tracking-widest">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-card text-ink text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password"
              className="block font-mono text-2xs text-muted uppercase tracking-widest">
              Password
              <span className="ml-2 normal-case tracking-normal opacity-60">(8+ characters)</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-3 rounded-card text-ink text-sm"
              placeholder="At least 8 characters"
            />
            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="flex gap-1 mt-1" aria-label="Password strength">
                {[1, 2, 3, 4].map((lvl) => {
                  const strength = password.length >= 12 ? 4 : password.length >= 10 ? 3 : password.length >= 8 ? 2 : 1
                  return (
                    <div key={lvl} className="h-0.5 flex-1 rounded-full transition-all duration-300"
                      style={{ background: lvl <= strength
                        ? strength >= 3 ? 'var(--green)' : strength === 2 ? 'var(--gold)' : 'var(--warning)'
                        : 'var(--border)' }} />
                  )
                })}
              </div>
            )}
          </div>

          {error && (
            <div className="font-mono text-xs px-4 py-3 rounded-card"
              style={{
                background: 'rgba(201,79,79,0.08)',
                border:     '1px solid rgba(201,79,79,0.25)',
                color:      'var(--danger)',
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
            style={{ background: 'var(--green)', color: 'var(--bg)' }}>
            {loading ? 'Creating account…' : 'Create account — free →'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border space-y-3 text-center">
          <p className="font-mono text-2xs text-muted">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
          <p className="font-mono text-2xs text-muted opacity-60">
            By creating an account you agree to our terms of service.
          </p>
        </div>
      </div>
    </main>
  )
}
