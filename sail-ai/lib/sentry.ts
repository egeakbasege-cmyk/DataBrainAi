/**
 * Sentry Configuration for Mobile Error Tracking
 * 
 * Runtime hatalarını yakalamak için Sentry entegrasyonu.
 * Mobil uygulamada crash ve error tracking için kullanılır.
 * 
 * Kurulum:
 * 1. Sentry hesabı oluştur: https://sentry.io
 * 2. Next.js projesi ekle
 * 3. DSN key'i al ve .env.local'a ekle:
 *    NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.sentry.io/zzz
 */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance monitoring
    tracesSampleRate: 1.0,
    
    // Session replay for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Environment
    environment: process.env.NODE_ENV,
    
    // Mobile-specific: offline queue
    transportOptions: {
      // Hata gönderilemezse kuyrukta tut
      bufferSize: 30,
    },
    
    // Before send: sensitive data filtering
    beforeSend(event) {
      // Kullanıcı verilerini filtrele
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['Cookie']
      }
      return event
    },
  })
}

export { Sentry }

// Helper fonksiyonlar
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (SENTRY_DSN) {
    Sentry.captureException(error, { extra: context })
  } else {
    console.error('[Sentry] Error captured:', error, context)
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (SENTRY_DSN) {
    Sentry.captureMessage(message, level)
  } else {
    console.log(`[Sentry] ${level}:`, message)
  }
}

export function setUserContext(user: { id: string; email?: string; username?: string }) {
  if (SENTRY_DSN) {
    Sentry.setUser(user)
  }
}

export function clearUserContext() {
  if (SENTRY_DSN) {
    Sentry.setUser(null)
  }
}
