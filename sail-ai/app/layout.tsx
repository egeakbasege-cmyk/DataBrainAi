import type { Metadata } from 'next'
import './globals.css'
import { BusinessProvider }   from '@/lib/context/BusinessContext'
import { AuthProvider }       from '@/components/AuthProvider'
import { AetherisProvider }   from '@/components/AetherisProvider'
import { Dock }               from '@/components/Dock'
import { LanguageProvider }   from '@/lib/i18n/LanguageContext'
import { Inter, Playfair_Display } from 'next/font/google'

// Modern metinler için Inter fontu
const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter' 
})

// Lüks ve vurucu başlıklar için Playfair Display fontu
const playfair = Playfair_Display({ 
  subsets: ['latin'], 
  variable: '--font-playfair',
  style: ['normal', 'italic']
})

export const metadata: Metadata = {
  title:       'Sail AI — Business Strategy, Grounded in Evidence',
  description: 'Benchmarked AI strategy advisory for independent operators. Data-referenced analysis in under 60 seconds.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-[#09090b] antialiased selection:bg-[#d4af37]/30 selection:text-white">
        <AuthProvider>
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
