'use client'

import { useCallback, useRef, useState } from 'react'
import type { Attachment } from '@/components/FileAttachmentPill'
import type { AgentMode } from '@/types/chat'
import { useAetherisStore } from '@/lib/aetherisStore'

// 'CONVERSING' = Downwind coach returned a chatMessage; input stays open
export type SailState = 'IDLE' | 'THINKING' | 'STREAMING' | 'COMPLETE' | 'CONVERSING'

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
  headline:         string
  signal:           string
  opportunity_cost: string
  tactics:          Tactic[]
  target30:         string
  target60:         string
  target90:         string
  risk:             string
  benchmarks:       Benchmark[]
}

export interface NeedsMetrics {
  needsMetrics: true
  question:     string
}

// Downwind structured coaching turn
export interface ChatMessage {
  chatMessage:       string
  followUpQuestion?: string
}

// Fallback when AI returns plain text instead of JSON
export interface FreeTextResponse {
  freeText: string
}

export type AIResponse = StrategyResult | NeedsMetrics | ChatMessage | FreeTextResponse

export interface ConvMessage {
  role:    'user' | 'assistant'
  content: string
}

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
  const start = cleaned.indexOf('{')
  if (start === -1) {
    // No JSON found — treat as free text (safety net)
    return { freeText: cleaned }
  }
  try {
    return JSON.parse(cleaned.slice(start)) as AIResponse
  } catch {
    // JSON parse failed — treat as free text
    return { freeText: cleaned }
  }
}

export function useSailState() {
  const [state, setState]           = useState<SailState>('IDLE')
  const [streamText, setStreamText] = useState('')
  const [result, setResult]         = useState<AIResponse | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const abortRef                    = useRef<AbortController | null>(null)
  const language                    = useAetherisStore((s) => s.language)

  const submit = useCallback(async (
    input:       string,
    context?:    string,
    apiKey?:     string,
    attachment?: Attachment,
    mode?:       'upwind' | 'downwind' | 'trim',
    messages?:   ConvMessage[],
    agentMode?:  AgentMode,
  ) => {
    if (state === 'THINKING' || state === 'STREAMING') return

    setError(null)
    setResult(null)
    setStreamText('')
    setState('THINKING')

    abortRef.current = new AbortController()

    try {
      const body: Record<string, unknown> = { message: input }
      if (context)                 body.context       = context
      if (apiKey)                  body.apiKey        = apiKey
      if (mode)                    body.mode          = mode
      if (messages?.length)        body.messages      = messages
      body.agentMode = agentMode ?? 'auto'
      body.language  = language ?? 'en'
      if (attachment?.isImage) {
        body.imageBase64   = attachment.content
        body.imageMimeType = attachment.mimeType
      } else if (attachment?.content) {
        body.fileContent = attachment.content
      }

      const res = await fetch('/api/downwind', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
        signal:  abortRef.current.signal,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 429) throw new Error('RATE_LIMIT')
        throw new Error(data.message ?? data.error ?? 'Request failed. Please try again.')
      }

      setState('STREAMING')

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        setStreamText(buffer)
      }
      buffer += decoder.decode()

      const parsed = parseJSON(buffer)

      if ('error' in parsed && typeof (parsed as Record<string, unknown>).error === 'string') {
        throw new Error((parsed as Record<string, unknown>).error as string)
      }

      setResult(parsed)

      // Downwind coaching turn — keep input open for next reply
      if ('chatMessage' in parsed) {
        setState('CONVERSING')
      } else {
        setState('COMPLETE')
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
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
