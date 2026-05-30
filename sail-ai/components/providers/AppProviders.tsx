'use client'

/**
 * components/providers/AppProviders.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Single provider boundary that wraps all app-level context:
 *   • SessionProvider (next-auth)
 *   • ThemeProvider (next-themes)
 *   • QueryClientProvider (react-query, if used)
 *   • ToastPortal (renders toast queue from uiStore)
 *
 * Import this once in app/layout.tsx — never nest it.
 */

import React, { useEffect }  from 'react'
import { SessionProvider }   from 'next-auth/react'
import { useUIStore }        from '@/stores/uiStore'

// ── Toast portal ──────────────────────────────────────────────────────────────

function ToastPortal() {
  const toasts      = useUIStore(s => s.toasts)
  const dismissToast = useUIStore(s => s.dismissToast)

  if (toasts.length === 0) return null

  const variantStyles: Record<string, string> = {
    info:    'border-blue-500/30 bg-blue-500/10 text-blue-300',
    success: 'border-green-500/30 bg-green-500/10 text-green-300',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    error:   'border-red-500/30 bg-red-500/10 text-red-300',
  }

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-6 right-6 z-[var(--z-toast)] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map(t => (
        <div
          key={t.id}
          className={[
            'flex items-start gap-3 px-4 py-3 rounded-xl border text-sm',
            'backdrop-blur-[12px] shadow-xl pointer-events-auto',
            'animate-in slide-in-from-bottom-2 fade-in duration-200',
            variantStyles[t.variant] ?? variantStyles.info,
          ].join(' ')}
        >
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity text-base leading-none mt-0.5"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}

// ── Root provider ─────────────────────────────────────────────────────────────

interface AppProvidersProps {
  children:    React.ReactNode
  session?:    Parameters<typeof SessionProvider>[0]['session']
}

export function AppProviders({ children, session }: AppProvidersProps) {
  return (
    <SessionProvider session={session}>
      {children}
      <ToastPortal />
    </SessionProvider>
  )
}
