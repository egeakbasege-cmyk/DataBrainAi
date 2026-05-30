'use client'

/**
 * features/chat/useChatHistory.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Fetches past sessions from /api/sessions for the history sidebar.
 * Lightweight — no external query library dependency.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

export interface SessionRecord {
  id:          string
  sessionId:   string
  prompt:      string
  summary?:    string
  mode?:       string
  createdAt:   string
}

interface UseChatHistoryState {
  sessions:   SessionRecord[]
  loading:    boolean
  error:      string | null
  hasMore:    boolean
}

export function useChatHistory(limit = 20) {
  const [state, setState] = useState<UseChatHistoryState>({
    sessions: [], loading: false, error: null, hasMore: false,
  })
  const offsetRef = useRef(0)
  const abortRef  = useRef<AbortController | null>(null)

  const load = useCallback(async (reset = false) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    if (reset) offsetRef.current = 0

    setState(s => ({ ...s, loading: true, error: null }))

    try {
      const res = await fetch(
        `/api/sessions?limit=${limit}&offset=${offsetRef.current}`,
        { signal: controller.signal }
      )

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: { sessions: SessionRecord[]; total: number } = await res.json()

      setState(s => ({
        sessions: reset ? data.sessions : [...s.sessions, ...data.sessions],
        loading:  false,
        error:    null,
        hasMore:  offsetRef.current + data.sessions.length < data.total,
      }))

      offsetRef.current += data.sessions.length
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setState(s => ({
        ...s,
        loading: false,
        error:   err instanceof Error ? err.message : 'Failed to load history.',
      }))
    }
  }, [limit])

  const loadMore = useCallback(() => load(false), [load])
  const refresh  = useCallback(() => load(true),  [load])

  useEffect(() => { load(true) }, [load])
  useEffect(() => () => { abortRef.current?.abort() }, [])

  return { ...state, loadMore, refresh }
}
