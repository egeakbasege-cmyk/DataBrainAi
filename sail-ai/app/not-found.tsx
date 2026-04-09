import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { CompassRose } from '@/components/Ornaments'

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{ background: '#FAFAF5' }}>
      <div className="relative mb-4">
        <CompassRose size={120} color="#2B4A2A" opacity={0.09} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Logo size={40} />
        </div>
      </div>
      <p className="font-serif font-bold" style={{ fontSize: 'clamp(4rem, 12vw, 7rem)', color: '#E5DECE', letterSpacing: '-0.04em', lineHeight: 1 }}>
        404
      </p>
      <h1 className="font-serif italic mt-2 mb-3" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', color: '#1A1814' }}>
        This page drifted off the chart
      </h1>
      <p className="text-sm mb-10" style={{ color: '#7A7062', fontFamily: 'Jost', fontWeight: 300 }}>
        The waters here are uncharted.
      </p>
      <Link href="/" className="btn-primary">Back to port →</Link>
    </main>
  )
}
