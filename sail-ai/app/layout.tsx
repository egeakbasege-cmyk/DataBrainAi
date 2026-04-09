import type { Metadata } from 'next'
import './globals.css'
import { BusinessProvider } from '@/lib/context/BusinessContext'

export const metadata: Metadata = {
  title:       'Sail AI — Business Strategy, Grounded in Evidence',
  description: 'Benchmarked AI strategy advisory for independent operators. Data-referenced analysis in under 60 seconds.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BusinessProvider>
          {children}
        </BusinessProvider>
      </body>
    </html>
  )
}
