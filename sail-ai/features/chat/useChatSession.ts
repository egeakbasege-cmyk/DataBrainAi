'use client'

/**
 * features/chat/useChatSession.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Manages the lifecycle of a single chat session:
 *   • Generate / restore sessionId (persisted in sessionStorage)
 *   • Save session summary to /api/sessions on completion
 *   • Reset chatStore when starting a new session
 */

import { useCallback, useEffect, useRef } from 'react'
import { useChatStore }                   from '@/stores/chatStore'

const SESSION_KEY = 'sail-ai-session-id'

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  const existing = sessionStorage.getItem(SESSION_KEY)
  if (existing) return existing
  const id = crypto.randomUUID()
  sessionStorage.setItem(SESSION_KEY, id)
  return id
}

export function useChatSession() {
  const sessionIdRef  = useRef<string>('')
  const resetAll      = useChatStore(s => s.resetAll)
  const messages      = useChatStore(s => s.messages)

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId()
  }, [])

  const sessionId = sessionIdRef.current

  const newSession = useCallback(() => {
    const id = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, id)
    sessionIdRef.current = id
    resetAll()
  }, [resetAll])

  const saveSession = useCallback(async (summary: string, prompt: string) => {
    if (!sessionIdRef.current) return
    try {
      await fetch('/api/sessions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          prompt:    prompt.slice(0, 500),
          summary:   summary.slice(0, 500),
          messageCount: messages.length,
        }),
      })
    } catch { /* non-fatal */ }
  }, [messages.length])

  return { sessionId, newSession, saveSession }
}
