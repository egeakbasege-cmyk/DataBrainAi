import Link from 'next/link'
import { Logo } from '@/components/Logo'

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#0A0F1E' }}
    >
      <Logo size={36} />
      <p
        className="mt-6 font-bold tabular-nums"
        style={{ fontSize: 'clamp(4rem, 12vw, 8rem)', color: 'rgba(192,57,43,0.15)', letterSpacing: '-0.04em', lineHeight: 1 }}
      >
        404
      </p>
      <h1
        className="mt-2 font-bold"
        style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', color: '#F1F5F9', letterSpacing: '-0.02em' }}
      >
        Page not found
      </h1>
      <p className="mt-3 text-sm" style={{ color: '#94A3B8' }}>
        This page drifted off the chart.
      </p>
      <Link
        href="/"
        className="mt-8 px-6 py-3 rounded-pill text-sm font-semibold transition-all"
        style={{ background: '#C0392B', color: '#F1F5F9', boxShadow: '0 0 20px rgba(192,57,43,0.35)' }}
      >
        Back to port →
      </Link>
    </main>
  )
}
