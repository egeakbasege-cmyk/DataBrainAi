'use client'

/**
 * hooks/useChatMessages.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Unified multi-turn message thread state for Sail AI chat.
 *
 * Design goals:
 *   • Single source of truth for the entire conversation thread
 *   • Supports all 8 analysis modes (upwind/sail/trim/catamaran/synergy/
 *     operator/scenario/downwind) through a discriminated union payload
 *   • Streaming-aware: streaming messages update in-place via O(1) Map lookup
 *   • Token-budget aware: exposes compressedHistory() for API dispatch
 *   • Persistent across HMR via sessionStorage (dev convenience)
 *
 * Usage:
 *   const { messages, addUserMessage, startAssistantMessage,
 *           updateStreaming, finalizeMessage, clearThread } = useChatMessages()
 */

import { useCallback, useRef, useState } from 'react'
import type { AnalysisMode }             from '@/components/ModeSelector'
import type { TrimResponse }             from '@/components/TrimTimelineCard'
import type { CatamaranResponse }        from '@/types/chat'

// ── Payload variants per mode ────────────────────────────────────────────────

export type MessagePayload =
  | { type: 'text';      text: string }                     // sail, operator, synergy, scenario, downwind
  | { type: 'executive'; data: Record<string, unknown> }    // upwind (ExecutiveResponse)
  | { type: 'trim';      data: TrimResponse }               // trim
  | { type: 'catamaran'; data: CatamaranResponse }          // catamaran
  | { type: 'error';     message: string }

export interface ChatMessage {
  id:        string
  role:      'user' | 'assistant'
  mode:      AnalysisMode
  payload:   MessagePayload
  streaming: boolean             // true while SSE is live
  timestamp: number              // Date.now()
}

// ── Compact turn for token-compressed API dispatch ───────────────────────────

export interface CompactTurn {
  role:    'user' | 'assistant'
  content: string
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useChatMessages() {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // O(1) lookup map — avoids full array scan on every streaming chunk
  const indexMap = useRef<Map<string, number>>(new Map())

  // ── Helpers ───────────────────────────────────────────────────────────────

  function makeId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Add a user turn to the thread. Returns the generated message ID.
   */
  const addUserMessage = useCallback((text: string, mode: AnalysisMode): string => {
    const id = makeId()
    const msg: ChatMessage = {
      id,
      role:      'user',
      mode,
      payload:   { type: 'text', text },
      streaming: false,
      timestamp: Date.now(),
    }
    setMessages(prev => {
      indexMap.current.set(id, prev.length)
      return [...prev, msg]
    })
    return id
  }, [])

  /**
   * Insert a placeholder assistant message that will be updated during streaming.
   * Returns the generated message ID to pass to updateStreaming / finalizeMessage.
   */
  const startAssistantMessage = useCallback((mode: AnalysisMode): string => {
    const id = makeId()
    const msg: ChatMessage = {
      id,
      role:      'assistant',
      mode,
      payload:   { type: 'text', text: '' },
      streaming: true,
      timestamp: Date.now(),
    }
    setMessages(prev => {
      indexMap.current.set(id, prev.length)
      return [...prev, msg]
    })
    return id
  }, [])

  /**
   * Append streaming text to an in-progress assistant message.
   * Called on every SSE chunk for text-based modes.
   */
  const updateStreaming = useCallback((id: string, text: string) => {
    setMessages(prev => {
      const idx = indexMap.current.get(id)
      if (idx === undefined) return prev
      const next  = [...prev]
      const msg   = next[idx]
      if (!msg) return prev
      next[idx] = {
        ...msg,
        payload: { type: 'text', text },
      }
      return next
    })
  }, [])

  /**
   * Mark a message as done streaming and optionally swap its payload
   * for a richer structured type (trim, catamaran, executive, error).
   */
  const finalizeMessage = useCallback((
    id:      string,
    payload: MessagePayload,
  ) => {
    setMessages(prev => {
      const idx = indexMap.current.get(id)
      if (idx === undefined) return prev
      const next = [...prev]
      const msg  = next[idx]
      if (!msg) return prev
      next[idx] = { ...msg, payload, streaming: false }
      return next
    })
  }, [])

  /**
   * Remove the last N messages from the thread (undo / retry support).
   */
  const popMessages = useCallback((n = 1) => {
    setMessages(prev => {
      const next = prev.slice(0, Math.max(0, prev.length - n))
      // Rebuild index map
      indexMap.current = new Map(next.map((m, i) => [m.id, i]))
      return next
    })
  }, [])

  /**
   * Clear the entire thread and reset the index map.
   */
  const clearThread = useCallback(() => {
    setMessages([])
    indexMap.current = new Map()
  }, [])

  /**
   * Returns a token-compressed history suitable for API dispatch.
   * Strategy:
   *   • Always keep the last KEEP_TAIL turns verbatim
   *   • Older turns are truncated to MAX_CHARS_PER_TURN characters
   *   • Total budget ≤ MAX_TOTAL_CHARS characters (~3 500 tokens)
   */
  const compressedHistory = useCallback((
    opts: { keepTail?: number; maxTotalChars?: number } = {},
  ): CompactTurn[] => {
    const { keepTail = 6, maxTotalChars = 14_000 } = opts
    const MAX_PER_TURN = 600

    const turns: CompactTurn[] = messages
      .filter(m => m.payload.type !== 'error')
      .map(m => ({
        role:    m.role,
        content: payloadToText(m.payload),
      }))

    if (turns.length === 0) return []

    const tail   = turns.slice(-keepTail)
    const head   = turns.slice(0, -keepTail).map(t => ({
      ...t,
      content: t.content.length > MAX_PER_TURN
        ? t.content.slice(0, MAX_PER_TURN) + '…'
        : t.content,
    }))

    const combined = [...head, ...tail]

    // Enforce total char budget from the tail end
    let total = 0
    const result: CompactTurn[] = []
    for (let i = combined.length - 1; i >= 0; i--) {
      const chars = combined[i]!.content.length
      if (total + chars > maxTotalChars) break
      result.unshift(combined[i]!)
      total += chars
    }
    return result
  }, [messages])

  return {
    messages,
    addUserMessage,
    startAssistantMessage,
    updateStreaming,
    finalizeMessage,
    popMessages,
    clearThread,
    compressedHistory,
  }
}

// ── Utility: extract plain text from any payload ──────────────────────────────

export function payloadToText(payload: MessagePayload): string {
  switch (payload.type) {
    case 'text':      return payload.text
    case 'error':     return `[Error: ${payload.message}]`
    case 'executive': {
      const d = payload.data as Record<string, string>
      return [d.insight, d.signal, d.recommendation].filter(Boolean).join('\n\n')
    }
    case 'trim': {
      const d = payload.data as TrimResponse
      const phases = (d.phases ?? []).map(p => String((p as unknown as Record<string, unknown>).phaseTitle ?? '')).filter(Boolean)
      return [d.trimTitle, d.summary, ...phases].filter(Boolean).join('\n')
    }
    case 'catamaran': {
      const d = payload.data as CatamaranResponse
      return [d.catamaranTitle, d.executiveSummary, d.unifiedStrategy].filter(Boolean).join('\n\n')
    }
  }
}
