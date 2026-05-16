import type { MetadataRoute } from 'next'

// B-04: Next.js 14 App Router sitemap generator
// Covers public-facing pages only; omits authenticated and API routes.

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sail-ai.vercel.app'

  return [
    {
      url:              baseUrl,
      lastModified:     new Date(),
      changeFrequency:  'weekly',
      priority:         1.0,
    },
    {
      url:              `${baseUrl}/pricing`,
      lastModified:     new Date(),
      changeFrequency:  'monthly',
      priority:         0.8,
    },
    {
      url:              `${baseUrl}/auth/signin`,
      lastModified:     new Date(),
      changeFrequency:  'yearly',
      priority:         0.5,
    },
  ]
}
