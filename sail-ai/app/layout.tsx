import type { Metadata } from 'next'
import './globals.css'
import { BusinessProvider } from '@/lib/context/BusinessContext'
import { AuthProvider }     from '@/components/AuthProvider'
import { Dock }             from '@/components/Dock'

export const metadata: Metadata = {
  title:       'Sail AI — Business Strategy, Grounded in Evidence',
  description: 'Benchmarked AI strategy advisory for independent operators. Data-referenced analysis in under 60 seconds.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <BusinessProvider>
            {children}
            <Dock />
          </BusinessProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
