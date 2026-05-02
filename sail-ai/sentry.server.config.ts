/**
 * Sentry Server Configuration — Next.js App Router
 *
 * Server config runs in Node.js — no offline transport needed here.
 * DSN guard applied (same as client config).
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
