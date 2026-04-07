'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Starcoins Error]', error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12"
      style={{ background: '#F5F5F7' }}>
      <div className="text-center max-w-sm animate-fade-up space-y-6">

        <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <span className="font-heading font-bold text-2xl" style={{ color: '#DC2626' }}>!</span>
        </div>

        <div className="space-y-2">
          <p className="font-sans text-xs font-medium text-muted uppercase tracking-widest-2">Error</p>
          <h1 className="font-heading font-bold text-ink text-2xl">
            Something went wrong.
          </h1>
          <p className="font-sans text-sm text-dim">
            An unexpected error occurred. We've logged it automatically.
          </p>
          {error.message && (
            <p className="font-sans text-xs text-muted font-mono mt-2 px-3 py-2 rounded-lg bg-gray-100 text-left break-all">
              {error.message}
            </p>
          )}
          {error.digest && (
            <p className="font-sans text-xs text-muted">ref: {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="font-heading font-bold text-ink text-sm px-6 py-3 rounded-pill transition-all glow-yellow"
            style={{ background: '#FACC15' }}>
            Try again
          </button>
          <Link href="/"
            className="font-sans text-sm px-6 py-3 rounded-pill border border-border bg-card text-dim hover:text-ink transition-all">
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
