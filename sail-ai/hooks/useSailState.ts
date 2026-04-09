'use client'

import { useCallback, useRef, useState } from 'react'

export type SailState = 'IDLE' | 'THINKING' | 'STREAMING' | 'COMPLETE'

export interface Tactic {
  step:      number
  action:    string
  timeframe: string
  result:    string
}

export interface Benchmark {
  label: string
  value: string
  type:  'user' | 'industry'
}

export interface StrategyResult {
  headline:   string
  signal:     string
  tactics:    Tactic[]
  target30:   string
  risk:       string
  benchmarks: Benchmark[]
}

export interface NeedsMetrics {
  needsMetrics: true
  question:     string
}

export type AIResponse = StrategyResult | NeedsMetrics

function stripFences(raw: string): string {
  const s = raw.trim()
  if (!s.startsWith('```')) return s
  const lines = s.split('\n')
  if (lines[0].startsWith('```')) lines.shift()
  if (lines[lines.length - 1].startsWith('```')) lines.pop()
  return lines.join('\n').trim()
}

function parseJSON(raw: string): AIResponse {
  const cleaned = stripFences(raw)
  // Find first { or [ to handle any leading whitespace/text
  const start = cleaned.indexOf('{')
  if (start === -1) throw new Error('No JSON object in response')
  return JSON.parse(cleaned.slice(start)) as AIResponse
}

export function useSailState() {
  const [state, setState]           = useState<SailState>('IDLE')
  const [streamText, setStreamText] = useState('')
  const [result, setResult]         = useState<AIResponse | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const abortRef                    = useRef<AbortController | null>(null)

  const submit = useCallback(async (input: string, context?: string) => {
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
        body:    JSON.stringify({ message: input, context }),
        signal:  abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 429) throw new Error('RATE_LIMIT')
        throw new Error(data.error || 'Request failed. Please try again.')
      }

      setState('STREAMING')

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        // Server sends deltas — accumulate on client
        buffer += decoder.decode(value, { stream: true })
        setStreamText(buffer)
      }

      // Flush any remaining bytes
      buffer += decoder.decode()

      const parsed = parseJSON(buffer)

      // Surface embedded errors from the AI
      if ('error' in parsed) throw new Error((parsed as any).error)

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
