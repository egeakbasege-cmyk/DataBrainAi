'use client'

import { useCallback, useRef, useState } from 'react'

export type SailState = 'IDLE' | 'THINKING' | 'STREAMING' | 'COMPLETE'

export interface StrategyResult {
  headline:   string
  signal:     string
  tactics:    { step: number; action: string; timeframe: string; result: string }[]
  target30:   string
  risk:       string
  benchmarks: { label: string; value: string; type: 'user' | 'industry' }[]
}

export interface NeedsMetrics {
  needsMetrics: true
  question:     string
}

export type AIResponse = StrategyResult | NeedsMetrics

export function useSailState() {
  const [state, setState]           = useState<SailState>('IDLE')
  const [streamText, setStreamText] = useState('')
  const [result, setResult]         = useState<AIResponse | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const abortRef                    = useRef<AbortController | null>(null)

  const submit = useCallback(async (input: string) => {
    if (state === 'THINKING' || state === 'STREAMING') return

    setError(null)
    setResult(null)
    setStreamText('')
    setState('THINKING')

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: input }),
        signal:  abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 429) throw new Error('RATE_LIMIT')
        throw new Error(data.error || 'Request failed')
      }

      setState('STREAMING')

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        setStreamText(buffer)
      }

      // Parse final accumulated JSON
      const parsed = JSON.parse(buffer) as AIResponse
      setResult(parsed)
      setState('COMPLETE')
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Something went wrong. Please try again.')
      setState('IDLE')
    }
  }, [state])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState('IDLE')
    setStreamText('')
    setResult(null)
    setError(null)
  }, [])

  return { state, streamText, result, error, submit, reset }
}
