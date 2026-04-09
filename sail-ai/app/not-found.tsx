import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { CompassRose } from '@/components/Ornaments'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#0C0C0E' }}>
      <div className="relative mb-4">
        <CompassRose size={120} color="#C9A96E" opacity={0.08} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Logo size={40} />
        </div>
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 700, fontSize: 'clamp(4rem, 12vw, 7rem)', color: 'rgba(201,169,110,0.12)', letterSpacing: '-0.04em', lineHeight: 1 }}>
        404
      </p>
      <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', color: '#FFFFFF', marginTop: '0.5rem', marginBottom: '0.75rem' }}>
        This page drifted off the chart
      </h1>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', color: 'rgba(255,255,255,0.38)', marginBottom: '2.5rem' }}>
        The waters here are uncharted.
      </p>
      <Link href="/" className="btn-primary">Back to port →</Link>
    </main>
  )
}
