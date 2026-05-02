/**
 * Sentry Client Configuration — Next.js App Router
 *
 * Fixes vs. original:
 *   1. DSN guard: Sentry.init() is NOT called when DSN is absent.
 *      Original passed dsn:'' → Sentry throws SentryError on every page load.
 *
 *   2. tracesSampleRate reduced to 0.1 in production.
 *      1.0 exhausts quota within days at scale.
 *
 *   3. replaysOnErrorSampleRate added — critical for debugging mobile crashes.
 *
 *   4. Offline buffer note: transportOptions.bufferSize was removed in Sentry v8.
 *      True IndexedDB-backed offline queuing requires @sentry/capacitor (currently
 *      in beta). For now, in-memory retry handles brief network interruptions.
 *      Add @sentry/capacitor when it reaches GA for persistent offline support.
 */

import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

// GUARD: never initialise Sentry without a valid DSN.
// An empty string DSN causes a SentryError exception on every client page load.
if (dsn) {
  Sentry.init({
    dsn,

    // ── Sampling ──────────────────────────────────────────────────────────────
    // 1.0 in production sends every transaction → quota exhaustion at scale.
    tracesSampleRate:        process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Session replay — essential for mobile UX crash debugging
    replaysSessionSampleRate: 0.05,   // 5% of sessions
    replaysOnErrorSampleRate: 1.0,    // 100% of error sessions

    debug:       process.env.NODE_ENV === 'development',
    environment: process.env.NODE_ENV ?? 'production',

    // ── Sensitive data scrubbing ───────────────────────────────────────────────
    beforeSend(event) {
      if (event.request?.url) {
        try {
          const url = new URL(event.request.url)
          ;['token', 'apiKey', 'password', 'api_key', 'secret'].forEach(p =>
            url.searchParams.delete(p),
          )
          event.request.url = url.toString()
        } catch { /* ignore malformed URLs */ }
      }
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['Cookie']
        delete event.request.headers['X-Api-Key']
      }
      return event
    },
  })
}
