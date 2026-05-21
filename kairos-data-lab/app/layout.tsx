import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title:       'KAIROS Data Lab — E-Commerce Intelligence Platform',
  description: 'Spy on any Shopify store or Amazon product. Extract revenue estimates, supplier costs, and AI-powered competitive playbooks in seconds.',
  keywords:    ['shopify spy', 'amazon intelligence', 'ecommerce analysis', 'competitor research'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="min-h-screen bg-[#09090b] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  )
}
