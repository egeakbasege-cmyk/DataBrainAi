'use client'

import Link from 'next/link'
import { Logo } from './Logo'

interface Props {
  transparent?: boolean
}

export function Nav({ transparent = false }: Props) {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-6 md:px-10 py-4"
      style={{
        background:     transparent ? 'transparent' : 'rgba(10,15,30,0.85)',
        backdropFilter: transparent ? 'none' : 'blur(20px)',
        borderBottom:   transparent ? 'none' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <Link href="/" className="flex items-center gap-2.5 group">
        <Logo size={26} />
        <span className="font-bold text-sm tracking-tight" style={{ color: '#F1F5F9' }}>
          Sail AI
        </span>
      </Link>

      <nav className="flex items-center gap-3">
        <Link
          href="/pricing"
          className="text-sm transition-opacity hover:opacity-80"
          style={{ color: '#94A3B8' }}
        >
          Pricing
        </Link>
        <Link
          href="/chat"
          className="text-sm font-semibold px-4 py-2 rounded-pill transition-all"
          style={{ background: '#C0392B', color: '#F1F5F9', boxShadow: '0 0 16px rgba(192,57,43,0.3)' }}
        >
          Launch app →
        </Link>
      </nav>
    </header>
  )
}
