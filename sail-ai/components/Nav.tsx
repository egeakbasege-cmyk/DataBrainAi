'use client'

import Link from 'next/link'
import { Logo } from './Logo'

export function Nav() {
  return (
    <header
      className="sticky top-0 z-30"
      style={{ background: 'rgba(250,250,245,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(26,24,20,0.1)' }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 md:px-10 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo size={28} />
          <span
            className="font-serif font-semibold tracking-wide"
            style={{ fontSize: '1.05rem', color: '#2B4A2A', letterSpacing: '0.05em' }}
          >
            SAIL AI
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="label-caps hover:opacity-70 transition-opacity"
            style={{ color: '#7A7062' }}
          >
            Pricing
          </Link>
          <Link href="/chat" className="btn-primary">
            Launch →
          </Link>
        </nav>
      </div>
    </header>
  )
}
