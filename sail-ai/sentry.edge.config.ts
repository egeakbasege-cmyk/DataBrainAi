/**
 * Sentry Edge Runtime Configuration
 *
 * Edge runtime: no Node.js APIs, no offline transport.
 * DSN guard: never init with empty string — throws SentryError at runtime.
 */

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    debug:            process.env.NODE_ENV === 'development',
    environment:      process.env.NODE_ENV ?? 'production',
  })
}
