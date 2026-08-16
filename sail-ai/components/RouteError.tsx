'use client'

/**
 * components/RouteError.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared body for every route-level `error.tsx`.
 *
 * Why per-route error boundaries at all: without one, a failure inside
 * `/data-lab` unmounts the whole app and the user loses their chat thread and
 * any in-flight state on other routes. A route boundary contains the blast
 * radius — the shell, dock and stores survive, and `reset()` re-renders only
 * the broken segment.
 *
 * The raw error message is never rendered. Server-side messages routinely leak
 * stack frames, table names and provider keys; the digest is enough to
 * correlate with the server log.
 */

import { useEffect } from 'react'
import Link from 'next/link'

interface Props {
  error:   Error & { digest?: string }
  reset:   () => void
  /** Human name of the section, e.g. "Data Lab". */
  section: string
  /** Optional one-line hint tailored to the section. */
  hint?:   string
}

export function RouteError({ error, reset, section, hint }: Props) {
  useEffect(() => {
    console.error(`[${section}] route error:`, error)
  }, [error, section])

  return (
    <main
      role="alert"
      style={{
        minHeight: '100vh',
        background: '#FAFAF8',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 1.5rem 7rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '34rem' }}>
        <p
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '0.6875rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#8A6D3B',
            marginBottom: '1rem',
          }}
        >
          {section}
        </p>

        <h1
          style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            color: '#0C0C0E',
            marginBottom: '0.75rem',
          }}
        >
          This section didn&apos;t load
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            color: '#71717A',
          }}
        >
          {hint ?? 'Something failed while preparing this page. Your other work is unaffected — retrying usually resolves it.'}
        </p>

        {error.digest && (
          <p
            style={{
              fontFamily: 'var(--font-mono), Menlo, monospace',
              fontSize: '0.75rem',
              color: '#A1A1AA',
              marginTop: '1.25rem',
            }}
          >
            Reference: {error.digest}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
            marginTop: '2.25rem',
          }}
        >
          <button onClick={reset} className="btn-primary">Try again</button>
          <Link href="/dashboard" className="btn-ghost">Go to dashboard</Link>
        </div>
      </div>
    </main>
  )
}
