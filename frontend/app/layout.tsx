import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'Starcoins Strategy AI — Business Strategy in 60 seconds',
  description:
    'Describe your business, ask your hardest question. Get a targeted strategy backed by industry benchmarks — not guesswork.',
  openGraph: {
    title: 'Starcoins Strategy AI',
    description: 'AI business strategy backed by real benchmarks, not hallucinations.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-white font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
