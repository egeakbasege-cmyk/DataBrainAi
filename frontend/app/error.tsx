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
    <main className="min-h-screen bg-bg flex items-center justify-center px-6">
      <div className="text-center max-w-sm animate-fade-up space-y-6">
        <div className="editorial-number" style={{ opacity: 0.04, fontSize: '10rem' }}>!</div>
        <div className="-mt-16 space-y-3">
          <p className="font-mono text-2xs text-muted uppercase tracking-widest-2">Error</p>
          <h1 className="font-heading text-ink" style={{ fontSize: '2rem', lineHeight: 1.1 }}>
            Something went wrong.
          </h1>
          <p className="font-sans text-dim text-sm" style={{ fontWeight: 300 }}>
            An unexpected error occurred. We've logged it automatically.
          </p>
          {error.digest && (
            <p className="font-mono text-2xs text-muted">ref: {error.digest}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="font-mono text-sm px-6 py-3 rounded-pill transition-all"
            style={{ background: 'var(--green)', color: 'var(--bg)' }}
          >
            Try again
          </button>
          <Link href="/"
            className="font-mono text-sm px-6 py-3 rounded-pill border border-border text-dim hover:text-ink transition-all">
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
