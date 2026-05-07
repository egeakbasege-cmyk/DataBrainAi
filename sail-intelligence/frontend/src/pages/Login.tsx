/**
 * src/pages/Login.tsx
 *
 * Full-page login. On success: stores tokens + redirects to Dashboard.
 */

import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion }      from 'framer-motion'
import { api }         from '@/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Button }      from '@/components/ui/Button'

export default function Login() {
  const navigate    = useNavigate()
  const setTokens   = useAuthStore((s) => s.setTokens)
  const setUser     = useAuthStore((s) => s.setUser)

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data } = await api.auth.login(email, password)
      setTokens(data.access_token, data.refresh_token)

      // Fetch profile to store email + role
      const me = await api.auth.me()
      setUser(me.data.sub, me.data.role)

      navigate('/', { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Invalid credentials.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-sail-900 px-4">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative"
      >
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl
                          bg-gradient-to-br from-sail-accent/20 to-blue-600/20
                          border border-sail-accent/30 mb-4 shadow-glow-cyan">
            <svg className="w-7 h-7 text-sail-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Sail Intelligence</h1>
          <p className="text-sail-muted text-sm mt-1">Enterprise Market Intelligence OS</p>
        </div>

        {/* Card */}
        <div className="card shadow-xl border-sail-700">
          <h2 className="text-base font-semibold text-white mb-6">Sign in to your workspace</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="section-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input-field w-full"
                placeholder="admin@sail.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="section-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-field w-full"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-sail-danger bg-red-950/30 border border-sail-danger/30
                           rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              loading={loading}
            >
              Sign in
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-sail-muted mt-6">
          Sail Intelligence v1.0 · Secure workspace
        </p>
      </motion.div>
    </div>
  )
}
