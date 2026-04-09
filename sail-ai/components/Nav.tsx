'use client'

import Link from 'next/link'
import { Logo } from './Logo'

export function Nav() {
  return (
    <header
      style={{
        position:    'sticky',
        top:         0,
        zIndex:      30,
        background:  'rgba(250,250,248,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom:'1px solid rgba(0,0,0,0.09)',
      }}
    >
      <div
        className="max-w-6xl mx-auto px-6 md:px-10"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '3.75rem' }}
      >
        {/* Brand */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <Logo size={26} />
          <span
            style={{
              fontFamily:    'Cormorant Garamond, Georgia, serif',
              fontSize:      '1rem',
              fontWeight:    600,
              color:         '#0C0C0E',
              letterSpacing: '0.07em',
            }}
          >
            SAIL AI
          </span>
        </Link>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
          <Link
            href="/pricing"
            style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.6875rem',
              fontWeight:    600,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         '#71717A',
              textDecoration:'none',
              transition:    'color 0.15s',
            }}
          >
            Pricing
          </Link>
          <Link href="/onboarding" className="btn-primary" style={{ padding: '0.5625rem 1.25rem', fontSize: '0.7rem' }}>
            Launch →
          </Link>
        </nav>
      </div>
    </header>
  )
}
