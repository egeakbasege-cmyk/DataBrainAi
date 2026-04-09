'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { WaveRule } from '@/components/Ornaments'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('App error:', error) }, [error])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#FAFAF5' }}>
      <Logo size={36} />
      <div className="mt-8 mb-6 w-24 mx-auto">
        <WaveRule color="#2B4A2A" opacity={0.3} />
      </div>
      <h1 className="font-serif italic mb-3" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#1A1814' }}>
        Something went off course
      </h1>
      <p className="text-sm max-w-sm" style={{ color: '#7A7062', fontFamily: 'Jost', fontWeight: 300 }}>
        An unexpected error occurred. Try again — it&apos;s usually a network blip.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mt-10">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-ghost">Return home</Link>
      </div>
    </main>
  )
}
