'use client'

import { useState, useCallback } from 'react'

export interface StrategyResult {
  headline:      string
  signal:        string
  actions:       Array<{ title: string; what: string; metric_impact: string }>
  thisWeek:      string
  risk:          string
  upside:        string
  metrics?:      Record<string, any>
  pipeline_steps?: any[]
}

type Status = 'idle' | 'streaming' | 'complete' | 'error'

const STEP_LABELS: Record<string, string> = {
  rate_limit:              'Verifying your access...',
  cache_lookup:            'Checking cached strategies...',
  intent_classification:   'Classifying your business type...',
  metrics_computed:        'Computing industry benchmarks...',
  llm_generation:          'Building your strategy...',
  output_validation:       'Validating metrics for accuracy...',
  cache_written:           'Strategy ready.',
}

export function useStrategyStream() {
  const [progress,    setProgress]    = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [result,      setResult]      = useState<StrategyResult | null>(null)
  const [confidence,  setConfidence]  = useState<number | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [status,      setStatus]      = useState<Status>('idle')

  const reset = useCallback(() => {
    setProgress(0)
    setCurrentStep('')
    setResult(null)
    setConfidence(null)
    setError(null)
    setStatus('idle')
  }, [])

  const analyse = useCallback(async (input: string, token: string) => {
    reset()
    setStatus('streaming')

    try {
      const res = await fetch('/api/analyse/stream', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ input }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const msg =
          res.status === 402
            ? 'No credits remaining. Buy credits to continue.'
            : res.status === 429
            ? 'Rate limit reached. Please wait before trying again.'
            : errData?.detail?.message || errData?.detail || 'Analysis failed. Please try again.'
        setError(msg)
        setStatus('error')
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let event: any
          try {
            event = JSON.parse(raw)
          } catch {
            continue
          }

          if (event.type === 'step') {
            setCurrentStep(STEP_LABELS[event.step] || event.step)
            setProgress(event.progress ?? 0)
          }

          if (event.type === 'complete') {
            const strategy: StrategyResult = {
              ...event.result,
              metrics:        event.metrics,
              pipeline_steps: event.pipeline_steps,
            }
            setResult(strategy)
            setConfidence(event.confidence ?? null)
            setProgress(100)
            setStatus('complete')
          }

          if (event.type === 'error') {
            setError(event.message || 'Analysis failed.')
            setStatus('error')
          }
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Network error. Please try again.')
      setStatus('error')
    }
  }, [reset])

  return { analyse, reset, progress, currentStep, result, confidence, error, status }
}
