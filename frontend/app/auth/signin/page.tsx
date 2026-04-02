'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SignInPage() {
  const router = useRouter()
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/analyse'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl,
    })
    setLoading(false)
    if (res?.error) {
      setError('Invalid email or password.')
    } else {
      router.push(callbackUrl)
    }
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="font-heading text-2xl text-white">Starcoins</span>
          <p className="text-muted text-sm mt-1 font-mono">Sign in to your account</p>
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
              className="w-full bg-surface border border-border rounded-card px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder="••••••••"
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
            className="w-full bg-accent text-bg font-medium py-3 rounded-pill text-sm hover:shadow-accent transition-all disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-4 font-mono">
          No account?{' '}
          <Link href="/auth/signup" className="text-accent hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </main>
  )
}
