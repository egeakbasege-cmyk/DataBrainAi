'use client'

/**
 * features/ai-pipeline/useChatSubmit.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Orchestrates a full chat round-trip:
 *   1. Pulls input/mode/attachment from chatStore
 *   2. Adds user message to thread
 *   3. Starts assistant message (streaming placeholder)
 *   4. Calls useSSEStream.send() → appends chunks live
 *   5. Finalizes or errors the assistant message
 *   6. Appends both turns to convHistory
 *   7. Resets input/attachment
 *
 * All mode-specific logic lives in modeRouter — this hook is mode-agnostic.
 */

import { useCallback, useRef } from 'react'
import { useSSEStream }        from './useSSEStream'
import { isStreamMode }        from './modeRouter'
import { useChatStore }        from '@/stores/chatStore'
import { useUserStore, selectGroqApiKey, selectPreferences } from '@/stores/userStore'
import { useUIStore }          from '@/stores/uiStore'
import type { ChatSubmitPayload, AnalysisMode } from './types'

interface UseChatSubmitOptions {
  /** Extra payload fields merged into every request (e.g. sessionId, connector_ids) */
  extraPayload?: Partial<ChatSubmitPayload>
}

export function useChatSubmit(opts: UseChatSubmitOptions = {}) {
  const { extraPayload = {} } = opts

  // ── Store selectors ───────────────────────────────────────────────────────
  const input          = useChatStore(s => s.input)
  const attachment     = useChatStore(s => s.attachment)
  const mode           = useChatStore(s => s.mode)
  const convHistory    = useChatStore(s => s.convHistory)
  const setInput       = useChatStore(s => s.setInput)
  const setAttachment  = useChatStore(s => s.setAttachment)
  const addUser        = useChatStore(s => s.addUserMessage)
  const startAssistant = useChatStore(s => s.startAssistantMessage)
  const appendChunk    = useChatStore(s => s.appendChunk)
  const finalizeMsg    = useChatStore(s => s.finalizeMessage)
  const errorMsg       = useChatStore(s => s.errorMessage)
  const appendHistory  = useChatStore(s => s.appendConvHistory)

  const groqApiKey     = useUserStore(selectGroqApiKey)
  const preferences    = useUserStore(selectPreferences)
  const pushToast      = useUIStore(s => s.pushToast)
  const triggerScroll  = useUIStore(s => s.triggerScrollToBottom)

  const assistantIdRef = useRef<string | null>(null)
  const sse            = useSSEStream<never>()

  // ── Submit ────────────────────────────────────────────────────────────────
  const submit = useCallback(async () => {
    const message = input.trim()
    if (!message || sse.isStreaming) return

    // 1. Capture & clear input
    setInput('')
    const snap = { message, attachment, mode: mode as AnalysisMode }
    setAttachment(null)

    // 2. Add user message to thread
    addUser(message, snap.mode)
    appendHistory('user', message)
    triggerScroll()

    // 3. Placeholder assistant message
    const assistantId = startAssistant(snap.mode)
    assistantIdRef.current = assistantId

    // 4. Build request payload
    const payload: ChatSubmitPayload = {
      message,
      mode:          snap.mode,
      apiKey:        groqApiKey || undefined,
      language:      preferences.language,
      businessMode:  preferences.businessMode,
      messages:      convHistory.slice(-20),  // last 20 turns context window
      ...(snap.attachment?.isImage
        ? { imageBase64: snap.attachment.content, imageMimeType: snap.attachment.mimeType }
        : snap.attachment
          ? { fileContent: snap.attachment.content }
          : {}),
      ...extraPayload,
    }

    const streamable = isStreamMode(snap.mode)

    // 5. Stream or JSON
    if (streamable) {
      sse.send({
        endpoint: '/api/chat',
        body:     payload as unknown as Record<string, unknown>,

        onChunk: (chunk, accumulated) => {
          appendChunk(assistantId, chunk)
          triggerScroll()
          void accumulated // suppress unused warning
        },

        onComplete: (fullText) => {
          finalizeMsg(assistantId, fullText)
          appendHistory('assistant', fullText)
          triggerScroll()
        },

        onError: (err) => {
          errorMsg(assistantId, err.message)
          pushToast({ variant: 'error', message: err.message })
        },
      })
    } else {
      // JSON mode (upwind, trim, catamaran)
      try {
        const res  = await fetch('/api/chat', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        })

        if (!res.ok) {
          const text = await res.text().catch(() => 'Unknown error')
          throw new Error(text || `HTTP ${res.status}`)
        }

        const data = await res.json()
        const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2)

        finalizeMsg(assistantId, text)
        appendHistory('assistant', text)
        triggerScroll()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Request failed.'
        errorMsg(assistantId, msg)
        pushToast({ variant: 'error', message: msg })
      }
    }
  }, [
    input, attachment, mode, convHistory, sse, groqApiKey, preferences,
    extraPayload, setInput, setAttachment, addUser, appendHistory, triggerScroll,
    startAssistant, appendChunk, finalizeMsg, errorMsg, pushToast,
  ])

  // ── Cancel ────────────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    sse.cancel()
    if (assistantIdRef.current) {
      const partial = useChatStore.getState().messages
        .find(m => m.id === assistantIdRef.current)?.content ?? ''
      finalizeMsg(assistantIdRef.current, partial || '[Cancelled]')
      assistantIdRef.current = null
    }
  }, [sse, finalizeMsg])

  return {
    submit,
    cancel,
    isStreaming:  sse.isStreaming,
    isConnecting: sse.phase === 'connecting',
    retryCount:   sse.retryCount,
  }
}
