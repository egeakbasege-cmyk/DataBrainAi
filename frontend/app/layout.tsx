import type { Metadata, Viewport } from 'next'
import dynamic from 'next/dynamic'
import './globals.css'
import { AuthProvider } from '../components/AuthProvider'

// Dynamically import Background3D — WebGL is browser-only, must never SSR
const Background3D = dynamic(
  () => import('../components/Background3D'),
  { ssr: false }
)

export const metadata: Metadata = {
  title: {
    default:  'Starcoins — Business Strategy in 60 seconds',
    template: '%s · Starcoins',
  },
  description:
    'Describe your business, ask your hardest question. Get a targeted strategy backed by real industry benchmarks — not guesswork.',
  keywords: ['business strategy', 'AI strategy', 'benchmarks', 'startup', 'growth'],
  authors:  [{ name: 'Starcoins Strategy AI' }],
  manifest: '/site.webmanifest',
  icons: {
    icon:  [{ url: '/favicon.ico' }],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  openGraph: {
    title:       'Starcoins Strategy AI',
    description: 'AI business strategy backed by real benchmarks, not hallucinations.',
    type:        'website',
    locale:      'en_US',
    siteName:    'Starcoins',
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Starcoins Strategy AI',
    description: 'Business strategy in 60 seconds. Real numbers, no guesswork.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#FFFFFF',
  colorScheme:  'light',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-airy-pearl text-dim font-sans antialiased">
        {/* Liquid chrome 3D layer — sits behind all content, z-index: -1 */}
        <Background3D />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
