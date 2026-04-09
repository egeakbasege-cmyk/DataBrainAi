'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export default function ErrorPage({
  error,
  reset,
}: {
  error:  Error & { digest?: string }
  reset:  () => void
}) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#0A0F1E' }}
    >
      <Logo size={36} />
      <h1
        className="mt-6 font-bold"
        style={{ fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#F1F5F9', letterSpacing: '-0.02em' }}
      >
        Something went off course
      </h1>
      <p className="mt-3 text-sm max-w-sm" style={{ color: '#94A3B8' }}>
        An unexpected error occurred. Try again — it&apos;s usually a network blip.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-8">
        <button
          onClick={reset}
          className="px-6 py-3 rounded-pill text-sm font-semibold transition-all"
          style={{ background: '#C0392B', color: '#F1F5F9', boxShadow: '0 0 20px rgba(192,57,43,0.35)' }}
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-6 py-3 rounded-pill text-sm font-medium transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', color: '#F1F5F9', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          Go home
        </Link>
      </div>
    </main>
  )
}
