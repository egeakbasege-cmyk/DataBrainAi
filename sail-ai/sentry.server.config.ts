/**
 * Sentry Server Configuration
 * 
 * Next.js App Router için Sentry server-side init.
 */

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  
  // Adjust this value in production
  tracesSampleRate: 1.0,
  
  // Setting this option to true will print useful information to the console
  debug: process.env.NODE_ENV === 'development',
})
