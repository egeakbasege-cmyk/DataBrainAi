'use client'

/**
 * useAetherisSubmit
 *
 * Replaces useSailState for the Aetheris execution path.
 *
 * Key differences from useSailState:
 *  - Sends AetherisPayload (includes sessionId, userId, agentMode, language from store)
 *  - Expects JSON ExecutiveResponse (not a text stream — endpoint collects & validates)
 *  - State machine: IDLE → THINKING → COMPLETE | ERROR
 *  - Tracks message cadence → updates cognitiveLoadIndex in Zustand store
 *  - On error: always sets a valid mock ExecutiveResponse so UI never breaks
 *
 * Custom request headers forwarded to the Edge proxy:
 *   X-Client-Language:  current language code
 *   X-Aetheris-Session: current session ID
 */

import { useCallback, useRef, useState } from 'react'
import type { Attachment }         from '@/components/FileAttachmentPill'
import type { ExecutiveResponse }  from '@/types/architecture'
import type { ScopeMetadata }      from '@/lib/pipeline/types'
import {
  useAetherisStore,
  selectAgentMode,
} from '@/lib/aetherisStore'
import {
  validateExecutiveResponse,
  sanitiseExecutiveResponse,
  buildMockExecutiveResponse,
} from '@/lib/schemaValidatorClient'

export type AetherisSubmitState = 'IDLE' | 'THINKING' | 'COMPLETE' | 'ERROR'

export interface AetherisSubmitOptions {
  context?:           string
  attachment?:        Attachment
  analysisMode?:      'upwind' | 'downwind' | 'sail' | 'trim' | 'catamaran' | 'operator' | 'synergy' | 'scenario'
  /** BYOK — forwarded to the Edge proxy for Groq fallback calls. */
  apiKey?:            string
  primaryConstraint?: string
}

export function useAetherisSubmit() {
  const [state,         setState]         = useState<AetherisSubmitState>('IDLE')
  const [response,      setResponse]      = useState<ExecutiveResponse | null>(null)
  const [error,         setError]         = useState<string | null>(null)
  const [scopeMetadata, setScopeMetadata] = useState<ScopeMetadata | null>(null)
  const [prose,         setProse]         = useState<string | null>(null)
  const abortRef                          = useRef<AbortController | null>(null)

  // Message cadence tracking for cognitive load computation
  const timestampsRef    = useRef<number[]>([])
  const rapidCountRef    = useRef(0)
  const lastMsgTimeRef   = useRef(0)

  const sessionId  = useAetherisStore((s) => s.sessionId)
  const userId     = useAetherisStore((s) => s.userId)
  const language   = useAetherisStore((s) => s.language)
  const agentMode  = useAetherisStore(selectAgentMode)
  const computeCL  = useAetherisStore((s) => s.computeAndSetCognitiveLoad)

  const submit = useCallback(async (
    input:   string,
    opts?:   AetherisSubmitOptions,
  ) => {
    if (state === 'THINKING') return

    setError(null)
    setResponse(null)
    setState('THINKING')

    // ── Cognitive load telemetry ───────────────────────────────────────────
    const now = Date.now()
    timestampsRef.current = [...timestampsRef.current, now].filter(t => now - t < 300_000)

    const gap = now - lastMsgTimeRef.current
    if (lastMsgTimeRef.current > 0 && gap < 8_000) {
      rapidCountRef.current++
    } else {
      rapidCountRef.current = 0
    }
    lastMsgTimeRef.current = now

    computeCL({
      messagesInLastFiveMinutes:  timestampsRef.current.length,
      averageMessageLength:       input.length,
      consecutiveRapidExchanges:  rapidCountRef.current,
    })

    abortRef.current = new AbortController()

    try {
      const body: Record<string, unknown> = {
        message:      input,
        sessionId:    sessionId || 'init',
        userId:       userId    || 'anonymous',
        language,
        agentMode,
        analysisMode: opts?.analysisMode ?? 'upwind',
      }

      if (opts?.context)                  body.context             = opts.context
      if (opts?.apiKey?.trim())           body.apiKey              = opts.apiKey.trim()
      if (opts?.primaryConstraint)        body.primaryConstraint   = opts.primaryConstraint
      if (opts?.attachment?.isImage) {
        body.imageBase64   = opts.attachment.content
        body.imageMimeType = opts.attachment.mimeType
      } else if (opts?.attachment?.content) {
        body.fileContent = opts.attachment.content
      }

      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: {
          'Content-Type':       'application/json',
          'X-Client-Language':  language,
          'X-Aetheris-Session': sessionId || 'init',
        },
        body:   JSON.stringify(body),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const apiMsg = (data as Record<string, unknown>).error as string
                    ?? (data as Record<string, unknown>).message as string
        if (res.status === 429) throw new Error(apiMsg ?? 'RATE_LIMIT')
        if (res.status === 401) throw new Error(apiMsg ?? 'Invalid API key.')
        throw new Error(apiMsg ?? 'Request failed. Please try again.')
      }

      // ── Response routing: streaming (upwind/downwind) vs JSON (cache hit / others) ──
      //
      // upwind/downwind return text/plain with 2 newline-delimited JSON chunks:
      //   Line 1 — { __streamMeta: { scopeMetadata, healthReport } }  ← arrives immediately
      //   Line 2 — { __result: <full response> }                       ← arrives after LLM
      //   Line 2 — { __error: string, __status: number }              ← on any failure
      //
      // Cache hits and error responses return application/json (handled below).
      //
      const contentType = res.headers.get('Content-Type') ?? ''

      if (contentType.includes('text/plain')) {
        // ── Streaming path ──────────────────────────────────────────────────
        const reader  = res.body!.getReader()
        const decoder = new TextDecoder()
        let buf            = ''
        let resultReceived = false
        let streamError:   Error | null = null

        outer: while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.trim()) continue
            let parsed: Record<string, unknown>
            try { parsed = JSON.parse(line) as Record<string, unknown> } catch { continue }

            if (parsed.__streamMeta) {
              // Chunk 1: scope panel populates while LLM is still generating
              const meta = parsed.__streamMeta as { scopeMetadata?: ScopeMetadata }
              if (meta.scopeMetadata) setScopeMetadata(meta.scopeMetadata)

            } else if (parsed.__result) {
              // Chunk 2: full response
              resultReceived = true
              const rawResult = parsed.__result as Record<string, unknown>
              if (rawResult.scopeMetadata) setScopeMetadata(rawResult.scopeMetadata as ScopeMetadata)
              if (typeof rawResult.prose === 'string') setProse(rawResult.prose)
              const validated = validateExecutiveResponse(rawResult)
                ? (rawResult as ExecutiveResponse)
                : sanitiseExecutiveResponse(rawResult)
              setResponse(validated)
              setState('COMPLETE')
              break outer

            } else if (parsed.__error) {
              const errMsg = String(parsed.__error ?? 'Request failed. Please try again.')
              const status = typeof parsed.__status === 'number' ? parsed.__status : 500
              if (status === 429) streamError = new Error(errMsg || 'RATE_LIMIT')
              else if (status === 401) streamError = new Error(errMsg || 'Invalid API key.')
              else streamError = new Error(errMsg)
              break outer
            }
          }
        }

        if (streamError) throw streamError
        if (!resultReceived && !streamError) throw new Error('Response incomplete. Please try again.')

      } else {
        // ── JSON path: cache hits return application/json instantly ─────────
        const raw = await res.json()

        // [SAIL-PIPELINE] Extract pipeline-specific fields before schema validation
        const rawRecord = raw as Record<string, unknown>
        if (rawRecord.scopeMetadata) setScopeMetadata(rawRecord.scopeMetadata as ScopeMetadata)
        if (typeof rawRecord.prose === 'string') setProse(rawRecord.prose)

        // Client-side schema enforcement (last line of defence)
        const validated = validateExecutiveResponse(raw)
          ? (raw as ExecutiveResponse)
          : sanitiseExecutiveResponse(raw)

        setResponse(validated)
        setState('COMPLETE')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return

      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)

      // Always give the UI a structurally valid response — never a blank screen
      // Auth/session errors: show only the error banner, not a strategy card
      const isAuthError = msg.toLowerCase().includes('sign in') ||
                          msg.toLowerCase().includes('unauthorized') ||
                          msg.toLowerCase().includes('authentication')
      if (!isAuthError) {
        setResponse(buildMockExecutiveResponse(
          msg === 'RATE_LIMIT'
            ? 'Rate limit reached. Please wait a moment, then try again.'
            : msg,
        ))
      }
      setState('ERROR')
    }
  }, [state, sessionId, userId, language, agentMode, computeCL])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState('IDLE')
    setResponse(null)
    setError(null)
    setScopeMetadata(null)
    setProse(null)
  }, [])

  return { state, response, error, submit, reset, scopeMetadata, prose }
}
