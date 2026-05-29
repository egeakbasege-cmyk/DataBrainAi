import type { Metadata, Viewport } from 'next'
import { Playfair_Display } from 'next/font/google'
import './globals.css'
import { BusinessProvider }   from '@/lib/context/BusinessContext'
import { AuthProvider }       from '@/components/AuthProvider'
import { AetherisProvider }   from '@/components/AetherisProvider'
import { Dock }               from '@/components/Dock'
import { LanguageProvider }   from '@/lib/i18n/LanguageContext'
import { LenisProvider }      from '@/components/LenisProvider'
import { CursorDot }          from '@/components/CursorDot'
import { ErrorBoundary }      from '@/components/ErrorBoundary'

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  title:       'SAIL AI+ | Sovereign Intelligence',
  description: 'Benchmarked AI strategy advisory for independent operators. Data-referenced analysis in under 60 seconds.',
  icons: { 
    icon: '/logo-gold.png',
    apple: '/logo-gold.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Sail AI',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#C9A96E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={playfair.variable}>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sail AI" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-TileColor" content="#0C0C0E" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="safe-area-top safe-area-bottom">
        {/* M-2: Global error boundary — prevents single-component crashes from wiping the whole app */}
        <ErrorBoundary>
          <AuthProvider>
            <AetherisProvider>
              <LanguageProvider>
                <BusinessProvider>
                  <LenisProvider>
                    {children}
                    <Dock />
                    <CursorDot />
                  </LenisProvider>
                </BusinessProvider>
              </LanguageProvider>
            </AetherisProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
