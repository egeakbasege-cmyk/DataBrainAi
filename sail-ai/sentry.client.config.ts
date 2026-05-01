/**
 * Sentry Client Configuration
 * 
 * Next.js App Router için Sentry client-side init.
 * Bu dosya app/sentry.client.config.ts olarak da kullanılabilir.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  
  // Adjust this value in production
  tracesSampleRate: 1.0,
  
  // Setting this option to true will print useful information to the console
  debug: process.env.NODE_ENV === 'development',
  
  // Before sending error, filter sensitive data
  beforeSend(event) {
    if (event.exception && event.request) {
      // Remove potentially sensitive query parameters
      const url = event.request.url
      if (url) {
        try {
          const parsed = new URL(url)
          parsed.searchParams.delete('token')
          parsed.searchParams.delete('apiKey')
          parsed.searchParams.delete('password')
          event.request.url = parsed.toString()
        } catch {
          // Ignore URL parse errors
        }
      }
    }
    return event
  },
})
