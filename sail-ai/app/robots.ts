import type { MetadataRoute } from 'next'

// B-04: Next.js 14 App Router robots.txt generator
// Allows all crawlers on public marketing pages; blocks /api and /chat routes.

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sail-ai.vercel.app'

  return {
    rules: [
      {
        userAgent: '*',
        allow:     ['/'],
        disallow:  ['/api/', '/chat'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
