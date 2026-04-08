import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title:       'Sail AI — Business Strategy, Charted',
  description: 'Premium AI strategy advisor for small businesses. Benchmark-backed plans in seconds.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
