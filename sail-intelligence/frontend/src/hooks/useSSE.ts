/**
 * src/hooks/useSSE.ts
 *
 * EventSource wrapper with:
 *  - Auto-reconnect (exponential backoff, max 30 s)
 *  - Auth header injection via URL param (EventSource doesn't support headers)
 *  - Typed message parsing and dispatch to signalStore
 *  - Cleanup on unmount
 */

import { useEffect, useRef } from 'react'
import { useAuthStore }  from '@/stores/authStore'
import { useSignalStore } from '@/stores/signalStore'
import type { HITLSignal } from '@/api/client'

const SSE_URL = '/api/v1/signals/live'

function buildUrl(token: string): string {
  // Pass token as query param — EventSource cannot set custom headers
  return `${SSE_URL}?token=${encodeURIComponent(token)}`
}

export function useSSE(): void {
  const token      = useAuthStore((s)  => s.accessToken)
  const addSignal  = useSignalStore((s) => s.addSignal)
  const setConn    = useSignalStore((s) => s.setConnection)

  const esRef      = useRef<EventSource | null>(null)
  const retryDelay = useRef(1_000)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!token) return

    function connect() {
      setConn('connecting')
      const es = new EventSource(buildUrl(token!))
      esRef.current = es

      es.onopen = () => {
        setConn('connected')
        retryDelay.current = 1_000   // reset backoff on successful connect
      }

      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data) as HITLSignal
          if (data.type === 'hitl_queued') {
            addSignal(data)
          }
        } catch {
          // ignore malformed frames
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        setConn('disconnected')

        // Exponential backoff: 1s → 2s → 4s → … max 30s
        const delay = Math.min(retryDelay.current, 30_000)
        retryDelay.current = delay * 2
        retryTimer.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      esRef.current?.close()
      if (retryTimer.current) clearTimeout(retryTimer.current)
      setConn('disconnected')
    }
  }, [token, addSignal, setConn])
}
