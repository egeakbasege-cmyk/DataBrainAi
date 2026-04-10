'use client'

import { Suspense, useState, useEffect } from 'react'
import { signIn, getProviders } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Logo } from '@/components/Logo'

type Mode = 'signin' | 'register'

// ── Inner component — uses useSearchParams() so must be inside <Suspense> ──
function LoginForm() {
  const router      = useRouter()
  const params      = useSearchParams()
  const callbackUrl = params.get('callbackUrl') ?? '/onboarding'
  const errorCode   = params.get('error')

  const [mode,        setMode]       = useState<Mode>('signin')
  const [name,        setName]       = useState('')
  const [email,       setEmail]      = useState('')
  const [password,    setPassword]   = useState('')
  const [confirm,     setConfirm]    = useState('')
  const [showPw,      setShowPw]     = useState(false)
  const [loading,     setLoading]    = useState(false)
  const [error,       setError]      = useState('')
  const [googleAvail, setGoogleAvail] = useState(false)

  useEffect(() => {
    getProviders().then(p => setGoogleAvail(!!p?.google))
  }, [])

  useEffect(() => {
    if (errorCode === 'CredentialsSignin')       setError('Incorrect email or password.')
    if (errorCode === 'OAuthAccountNotLinked')   setError('An account already exists with this email. Please sign in with your original method.')
  }, [errorCode])

  function switchMode(m: Mode) {
    setMode(m); setError(''); setPassword(''); setConfirm(''); setShowPw(false)
  }

  async function handleGoogle() {
    setLoading(true); setError('')
    await signIn('google', { callbackUrl })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (mode === 'register') {
      if (!name.trim())          { setError('Please enter your name.'); return }
      if (password !== confirm)  { setError('Passwords do not match.'); return }
      if (password.length < 8)   { setError('Password must be at least 8 characters.'); return }

      setLoading(true)
      try {
        const res  = await fetch('/api/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body:   JSON.stringify({ email, password, name }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.message ?? data.error ?? 'Registration failed.'); setLoading(false); return }

        const result = await signIn('credentials', { email, password, redirect: false })
        if (result?.error) { setError('Registered — please sign in.'); setMode('signin'); setLoading(false); return }
        router.push(callbackUrl)
      } catch {
        setError('Registration failed. Please try again.')
        setLoading(false)
      }
      return
    }

    setLoading(true)
    const result = await signIn('credentials', { email, password, redirect: false })
    if (result?.error) { setError('Incorrect email or password.'); setLoading(false); return }
    router.push(callbackUrl)
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '0.75rem 0', background: 'transparent',
    border: 'none', borderBottom: '1px solid rgba(12,12,14,0.15)',
    outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
    color: '#0C0C0E', boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>

      {/* Card */}
      <div style={{ width: '100%', maxWidth: '400px', background: '#FFFFFF', border: '1px solid rgba(12,12,14,0.09)', boxShadow: '0 4px 32px rgba(0,0,0,0.07)', padding: '2.5rem 2rem' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem', justifyContent: 'center' }}>
          <Logo size={28} />
          <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.08em', color: '#0C0C0E' }}>
            SAIL AI
          </span>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', marginBottom: '1.75rem', border: '1px solid rgba(12,12,14,0.1)' }}>
          {(['signin', 'register'] as Mode[]).map(m => (
            <button
              key={m} type="button" onClick={() => switchMode(m)}
              style={{
                padding: '0.625rem', fontFamily: 'Inter, sans-serif',
                fontSize: '0.72rem', fontWeight: mode === m ? 600 : 400,
                letterSpacing: '0.07em', textTransform: 'uppercase',
                background: mode === m ? '#0C0C0E' : 'transparent',
                color: mode === m ? '#FAFAF8' : '#71717A',
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {m === 'signin' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Google */}
        {googleAvail && (
          <>
            <button
              type="button" onClick={handleGoogle} disabled={loading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.75rem', background: '#FFFFFF', border: '1px solid rgba(12,12,14,0.14)', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', fontWeight: 500, color: '#0C0C0E', transition: 'background 0.15s', opacity: loading ? 0.6 : 1 }}
            >
              <GoogleIcon /> Continue with Google
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(12,12,14,0.09)' }} />
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#A1A1AA', letterSpacing: '0.05em' }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(12,12,14,0.09)' }} />
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {mode === 'register' && (
            <div>
              <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: '#A1A1AA' }}>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required style={inp} autoComplete="name" />
            </div>
          )}

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: '#A1A1AA' }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inp} autoComplete="email" />
          </div>

          <div>
            <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: '#A1A1AA' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Minimum 8 characters' : '••••••••'}
                required style={{ ...inp, paddingRight: '2rem' }}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
              <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} style={{ position: 'absolute', right: 0, bottom: '0.65rem', background: 'none', border: 'none', cursor: 'pointer', color: '#A1A1AA', padding: 0, lineHeight: 1 }}>
                {showPw ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', letterSpacing: '0.09em', textTransform: 'uppercase', color: '#A1A1AA' }}>Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" required style={inp} autoComplete="new-password" />
            </div>
          )}

          {error && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#991B1B', background: 'rgba(153,27,27,0.05)', border: '1px solid rgba(153,27,27,0.15)', padding: '0.625rem 0.75rem', margin: 0 }}>
              {error}
            </p>
          )}

          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: '0.8125rem', background: loading ? '#3A3A3C' : '#0C0C0E', color: '#FAFAF8', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', transition: 'background 0.15s' }}
          >
            {loading
              ? (mode === 'register' ? 'Creating account…' : 'Signing in…')
              : (mode === 'register' ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#A1A1AA', textAlign: 'center', marginTop: '1.5rem', lineHeight: 1.6 }}>
          By continuing, you agree to our{' '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Terms</span>
          {' & '}
          <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>Privacy Policy</span>.
        </p>
      </div>

      <a href="/" style={{ marginTop: '1.5rem', fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#A1A1AA', textDecoration: 'none', letterSpacing: '0.04em' }}>
        ← Back to home
      </a>
    </main>
  )
}

// ── Page — wraps LoginForm in Suspense (required by Next.js 14 for useSearchParams) ──
export default function LoginPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid rgba(12,12,14,0.1)', borderTopColor: '#0C0C0E', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
