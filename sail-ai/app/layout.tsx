import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'
import './globals.css'
import { BusinessProvider }   from '@/lib/context/BusinessContext'
import { AuthProvider }       from '@/components/AuthProvider'
import { AetherisProvider }   from '@/components/AetherisProvider'
import { Dock }               from '@/components/Dock'
import { LanguageProvider }   from '@/lib/i18n/LanguageContext'

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
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={playfair.variable}>
      <body>
        <AuthProvider>
          {/* AetherisProvider initialises the Zustand store with the
              authenticated user identity and a fresh session ID.
              It must live inside AuthProvider (needs useSession). */}
          <AetherisProvider>
            <LanguageProvider>
              <BusinessProvider>
                {children}
                <Dock />
              </BusinessProvider>
            </LanguageProvider>
          </AetherisProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
