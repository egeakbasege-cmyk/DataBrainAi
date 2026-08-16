import Link from 'next/link'
import { Logo } from './Logo'
import { POLICY_DATE_LABEL } from '@/lib/legal'

/**
 * components/LegalPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared shell for /terms, /privacy, /refund and /contact.
 *
 * These pages are deliberately server components with no dependency on
 * `Nav` or the session: a payment provider's reviewer visits them while signed
 * out, and anything that redirects to login makes the page unreachable and
 * fails verification. The header here is a plain link back to the landing page.
 *
 * Typography follows the app's tokens (Cormorant for headings, Inter for body)
 * so the pages do not read as bolted-on boilerplate.
 */

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h2
        style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize: '1rem',
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: '#0C0C0E',
          marginBottom: '0.75rem',
        }}
      >
        {title}
      </h2>
      <div className="legal-prose">{children}</div>
    </section>
  )
}

interface LegalPageProps {
  title:    string
  subtitle: string
  children: React.ReactNode
}

export function LegalPage({ title, subtitle, children }: LegalPageProps) {
  return (
    <main style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <header
        style={{
          background: '#FFFFFF',
          borderBottom: '1px solid rgba(12,12,14,0.08)',
          padding: '1.125rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
          <Link
            href="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}
          >
            <Logo size={26} />
            <span
              style={{
                fontFamily: 'var(--font-cormorant), Georgia, serif',
                fontWeight: 700,
                fontSize: '0.9rem',
                letterSpacing: '0.1em',
                color: '#0C0C0E',
              }}
            >
              SAIL AI
            </span>
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '3.5rem 1.5rem 6rem' }}>
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
          Legal
        </p>

        <h1
          style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 'clamp(2rem, 5vw, 2.75rem)',
            lineHeight: 1.15,
            color: '#0C0C0E',
            marginBottom: '0.875rem',
          }}
        >
          {title}
        </h1>

        <p
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '0.9375rem',
            lineHeight: 1.7,
            color: '#71717A',
            marginBottom: '0.5rem',
          }}
        >
          {subtitle}
        </p>

        <p
          style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: '0.75rem',
            color: '#A1A1AA',
            marginBottom: '3rem',
          }}
        >
          Effective {POLICY_DATE_LABEL}
        </p>

        {children}

        <nav
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.5rem',
            marginTop: '4rem',
            paddingTop: '2rem',
            borderTop: '1px solid rgba(12,12,14,0.08)',
          }}
        >
          {[
            { href: '/terms',   label: 'Terms of Service' },
            { href: '/privacy', label: 'Privacy Policy' },
            { href: '/refund',  label: 'Refund Policy' },
            { href: '/contact', label: 'Contact' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize: '0.8125rem',
                color: '#71717A',
                textDecoration: 'none',
              }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}
