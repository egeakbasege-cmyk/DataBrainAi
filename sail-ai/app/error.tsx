'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { WaveRule } from '@/components/Ornaments'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('App error:', error) }, [error])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#FAFAF8' }}>
      <Logo size={36} />
      <div className="mt-8 mb-6 w-24 mx-auto">
        <WaveRule color="#0C0C0E" opacity={0.15} />
      </div>
      <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#0C0C0E', marginBottom: '0.75rem' }}>
        Something went off course
      </h1>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: '#71717A', maxWidth: '34ch', lineHeight: 1.7 }}>
        An unexpected error occurred. Try again — it&apos;s usually a network blip.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-10">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-ghost">Return home</Link>
      </div>
    </main>
  )
}
