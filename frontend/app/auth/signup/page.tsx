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
    if (password.length > 64) {
      setError('Password must be 64 characters or fewer.')
      return
    }

    setLoading(true)
    try {
      // /api/register is an explicit Next.js API route that proxies to the
      // Railway backend server-side — completely separate from NextAuth routes.
      const res = await fetch('/api/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        const rawErr = data.error
      setError(typeof rawErr === 'string' ? rawErr : 'Registration failed. Please try again.')
        setLoading(false)
        return
      }

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

  const strength = password.length >= 12 ? 4
    : password.length >= 10 ? 3
    : password.length >= 8  ? 2
    : password.length > 0   ? 1
    : 0

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

          {/* Free badge */}
          <div className="flex items-center gap-2 mb-5">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FACC15', display: 'inline-block', boxShadow: '0 0 6px rgba(250,204,21,0.5)', flexShrink: 0 }} />
            <span className="font-sans text-xs font-medium uppercase tracking-widest-2"
              style={{ color: '#92400E' }}>
              First analysis completely free
            </span>
          </div>

          <h1 className="font-heading font-bold text-ink text-2xl mb-1">
            Get started.
          </h1>
          <p className="font-sans text-sm text-muted mb-8">
            Create your free account in seconds.
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
              <div className="flex items-center justify-between">
                <label htmlFor="password"
                  className="block font-sans text-xs font-medium text-dim uppercase tracking-widest-2">
                  Password
                </label>
                <span className="font-sans text-xs text-muted">8+ characters</span>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3 text-sm"
                placeholder="At least 8 characters"
              />
              {/* Strength indicator */}
              {password.length > 0 && (
                <div className="flex gap-1 mt-1.5" aria-label="Password strength">
                  {[1, 2, 3, 4].map((lvl) => (
                    <div key={lvl} className="h-1 flex-1 rounded-full transition-all duration-300"
                      style={{
                        background: lvl <= strength
                          ? strength >= 3 ? '#16A34A'
                          : strength === 2 ? '#FACC15'
                          : '#F59E0B'
                          : '#E5E7EB',
                      }} />
                  ))}
                </div>
              )}
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
              {loading ? 'Creating account…' : 'Create account — free →'}
            </button>
          </form>
        </div>

        {/* Footer links */}
        <div className="text-center mt-6 space-y-2">
          <p className="font-sans text-xs text-muted">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-ink font-medium hover:underline">
              Sign in
            </Link>
          </p>
          <p className="font-sans text-xs text-muted opacity-60">
            By creating an account you agree to our terms of service.
          </p>
        </div>
      </div>
    </main>
  )
}
