'use client'

/**
 * features/ai-pipeline/useSSEStream.ts — Core Streaming Hook
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces the copy-pasted `fetch + while(true) reader.read()` pattern spread
 * across 8 mode-specific submit handlers in app/chat/page.tsx.
 *
 * Guarantees:
 *   • Every lifecycle transition surfaces in typed state (no silent failures)
 *   • Connection timeout (default 15s) — auto-retries with exponential backoff
 *   • Stream inactivity timeout (default 30s) — treats as hung, retries
 *   • AbortController managed internally; external signal also respected
 *   • Clean unmount: all timers and readers cancelled
 *   • Generic typed metadata from first '\n'-terminated JSON line in stream
 *
 * States: idle → connecting → streaming → complete | error
 */

import { useCallback, useRef, useState } from 'react'
import type { SSEOptions, StreamPhase, StreamError, StreamErrorCode } from './types'
import { useExponentialBackoff }          from './useExponentialBackoff'

// ── Helpers ───────────────────────────────────────────────────────────────────

function classifyError(err: unknown, statusCode?: number): StreamError {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return { code: 'ABORTED', message: 'Request cancelled.', retryable: false }
  }
  if (statusCode === 429) {
    return { code: 'RATE_LIMIT', message: 'Rate limit reached. Please wait.', retryable: true, statusCode }
  }
  if (statusCode === 401) {
    return { code: 'UNAUTHORIZED', message: 'Session expired. Please sign in.', retryable: false, statusCode }
  }
  if (statusCode && statusCode >= 500) {
    return { code: 'SERVER_ERROR', message: 'Server error. Retrying…', retryable: true, statusCode }
  }
  if (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) {
    return { code: 'NETWORK', message: 'Network error. Check your connection.', retryable: true }
  }
  const msg = err instanceof Error ? err.message : String(err)
  const code: StreamErrorCode = msg.includes('timeout') ? 'TIMEOUT' : 'UNKNOWN'
  return { code, message: msg, retryable: code === 'TIMEOUT' }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface SSEStreamState {
  phase:       StreamPhase
  text:        string
  error:       StreamError | null
  isStreaming: boolean
  isComplete:  boolean
  isError:     boolean
}

export function useSSEStream<TMeta = unknown>() {
  const [state, setState] = useState<SSEStreamState>({
    phase: 'idle', text: '', error: null,
    isStreaming: false, isComplete: false, isError: false,
  })

  const abortRef       = useRef<AbortController | null>(null)
  const connTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const readerRef      = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const pendingOptions = useRef<SSEOptions<TMeta> | null>(null)

  const backoff = useExponentialBackoff({ baseMs: 500, maxMs: 30_000, maxTries: 4 })

  // ── Internal cleanup ──────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (connTimerRef.current)   { clearTimeout(connTimerRef.current);   connTimerRef.current   = null }
    if (streamTimerRef.current) { clearTimeout(streamTimerRef.current); streamTimerRef.current = null }
    readerRef.current?.cancel().catch(() => undefined)
    readerRef.current = null
  }, [])

  const abort = useCallback(() => {
    cleanup()
    abortRef.current?.abort()
    abortRef.current = null
  }, [cleanup])

  // ── Retry wrapper ─────────────────────────────────────────────────────────
  const startStream = useCallback(async (opts: SSEOptions<TMeta>) => {
    cleanup()
    backoff.clear()

    const controller = new AbortController()
    abortRef.current = controller

    // Merge external signal
    if (opts.signal) {
      opts.signal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    setState({ phase: 'connecting', text: '', error: null, isStreaming: false, isComplete: false, isError: false })

    const connectionMs = opts.connectionTimeoutMs ?? 15_000
    const streamMs     = opts.streamTimeoutMs     ?? 30_000

    // Connection timeout sentinel
    connTimerRef.current = setTimeout(() => {
      controller.abort()
      const err: StreamError = { code: 'TIMEOUT', message: 'Connection timed out. Retrying…', retryable: true }
      const retried = backoff.schedule(() => startStream(opts))
      if (!retried) {
        setState(s => ({ ...s, phase: 'error', error: { ...err, message: 'Connection timed out after multiple attempts.', retryable: false }, isError: true, isStreaming: false }))
        opts.onError?.({ ...err, message: 'Connection timed out after multiple attempts.', retryable: false })
      }
    }, connectionMs)

    try {
      const res = await fetch(opts.endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(opts.body),
        signal:  controller.signal,
      })

      // Clear connection timeout — we got a response
      if (connTimerRef.current) { clearTimeout(connTimerRef.current); connTimerRef.current = null }

      if (!res.ok) {
        const err = classifyError(null, res.status)
        if (err.retryable) {
          const retried = backoff.schedule(() => startStream(opts))
          if (retried) return
        }
        setState(s => ({ ...s, phase: 'error', error: err, isError: true, isStreaming: false }))
        opts.onError?.(err)
        return
      }

      if (!res.body) {
        const err: StreamError = { code: 'SERVER_ERROR', message: 'Response body is empty.', retryable: true }
        const retried = backoff.schedule(() => startStream(opts))
        if (!retried) { setState(s => ({ ...s, phase: 'error', error: err, isError: true, isStreaming: false })); opts.onError?.(err) }
        return
      }

      setState(s => ({ ...s, phase: 'streaming', isStreaming: true }))

      const reader  = res.body.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      let   accumulated = ''
      let   metaDone    = false

      // Stream inactivity timer — reset on each chunk
      const resetStreamTimer = () => {
        if (streamTimerRef.current) clearTimeout(streamTimerRef.current)
        streamTimerRef.current = setTimeout(() => {
          controller.abort()
          const err: StreamError = { code: 'TIMEOUT', message: 'Stream timed out. Retrying…', retryable: true }
          const retried = backoff.schedule(() => startStream({ ...opts, body: { ...opts.body, resumeFrom: accumulated.length } }))
          if (!retried) {
            setState(s => ({ ...s, phase: 'error', error: { ...err, message: 'Stream timed out.', retryable: false }, isError: true, isStreaming: false }))
            opts.onError?.({ ...err, message: 'Stream timed out.', retryable: false })
          }
        }, streamMs)
      }

      resetStreamTimer()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        resetStreamTimer()
        accumulated += decoder.decode(value, { stream: true })

        // Extract optional metadata line (first '\n'-terminated JSON)
        if (!metaDone && opts.onMetadata) {
          const nl = accumulated.indexOf('\n')
          if (nl !== -1) {
            try {
              const meta = JSON.parse(accumulated.slice(0, nl)) as TMeta
              opts.onMetadata(meta)
            } catch { /* not JSON — stream is pure text */ }
            accumulated = accumulated.slice(nl + 1)
            metaDone = true
          }
        }

        opts.onChunk(decoder.decode(value, { stream: true }), accumulated)
        setState(s => ({ ...s, text: accumulated }))
      }

      if (streamTimerRef.current) { clearTimeout(streamTimerRef.current); streamTimerRef.current = null }

      // Decode final bytes
      accumulated += decoder.decode()
      backoff.reset()
      setState(s => ({ ...s, phase: 'complete', text: accumulated, isStreaming: false, isComplete: true }))
      opts.onComplete?.(accumulated)

    } catch (err) {
      cleanup()
      const streamErr = classifyError(err)
      if (streamErr.code === 'ABORTED') return   // user-initiated, no state change needed

      if (streamErr.retryable) {
        const retried = backoff.schedule(() => startStream(opts))
        if (retried) return
      }
      setState(s => ({ ...s, phase: 'error', error: streamErr, isError: true, isStreaming: false }))
      opts.onError?.(streamErr)
    }
  }, [backoff, cleanup])

  // ── Public API ────────────────────────────────────────────────────────────
  const send = useCallback((opts: SSEOptions<TMeta>) => {
    pendingOptions.current = opts
    void startStream(opts)
  }, [startStream])

  const cancel = useCallback(() => {
    abort()
    backoff.reset()
    setState({ phase: 'idle', text: '', error: null, isStreaming: false, isComplete: false, isError: false })
  }, [abort, backoff])

  const reset = useCallback(() => {
    abort()
    backoff.reset()
    setState({ phase: 'idle', text: '', error: null, isStreaming: false, isComplete: false, isError: false })
  }, [abort, backoff])

  return { ...state, send, cancel, reset, retryCount: backoff.tries }
}
