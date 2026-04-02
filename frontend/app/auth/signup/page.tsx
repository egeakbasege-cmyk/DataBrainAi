'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signIn } from 'next-auth/react'

export default function SignUpPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed.')
        setLoading(false)
        return
      }

      // Auto sign-in after registration
      await signIn('credentials', { email, password, redirect: false })
      router.push('/analyse')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-heading text-2xl text-white">Starcoins</span>
          <p className="text-muted text-sm mt-1 font-mono">Create your free account</p>
          <div className="inline-flex items-center gap-1 bg-green/10 border border-green/30 text-green text-xs px-3 py-1 rounded-pill font-mono mt-2">
            ✦ First analysis free
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-card p-6 space-y-4"
        >
          <div>
            <label className="block text-xs text-muted font-mono mb-1 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-surface border border-border rounded-card px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs text-muted font-mono mb-1 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full bg-surface border border-border rounded-card px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder="At least 8 characters"
            />
          </div>

          {error && (
            <p className="text-danger text-xs font-mono bg-danger/10 border border-danger/30 px-3 py-2 rounded-chip">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green text-bg font-medium py-3 rounded-pill text-sm hover:shadow-green transition-all disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Create account — free →'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-4 font-mono">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
