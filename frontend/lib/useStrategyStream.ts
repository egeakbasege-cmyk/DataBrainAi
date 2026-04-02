'use client'

import { useState, useCallback, useRef } from 'react'

export interface StrategyResult {
  headline:       string
  signal:         string
  actions:        Array<{ title: string; what: string; metric_impact: string }>
  thisWeek:       string
  risk:           string
  upside:         string
  metrics?:       Record<string, any>
  pipeline_steps?: any[]
}

type Status = 'idle' | 'streaming' | 'complete' | 'error'

const STEP_LABELS: Record<string, string> = {
  rate_limit:            'Verifying access…',
  cache_lookup:          'Checking cached strategies…',
  intent_classification: 'Classifying your business type…',
  metrics_computed:      'Computing industry benchmarks…',
  llm_generation:        'Building your strategy…',
  output_validation:     'Validating metrics for accuracy…',
  cache_written:         'Strategy ready.',
}

export function useStrategyStream() {
  const [progress,    setProgress]    = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [result,      setResult]      = useState<StrategyResult | null>(null)
  const [confidence,  setConfidence]  = useState<number | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [status,      setStatus]      = useState<Status>('idle')

  // AbortController ref — lets us cancel the in-flight stream
  const abortRef = useRef<AbortController | null>(null)

  const reset = useCallback(() => {
    // Cancel any running stream before resetting
    abortRef.current?.abort()
    abortRef.current = null
    setProgress(0)
    setCurrentStep('')
    setResult(null)
    setConfidence(null)
    setError(null)
    setStatus('idle')
  }, [])

  const analyse = useCallback(async (input: string, token: string) => {
    // Cancel previous run if still active
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setProgress(0)
    setCurrentStep('')
    setResult(null)
    setConfidence(null)
    setError(null)
    setStatus('streaming')

    // 3-minute hard timeout — prevents zombie streams
    const timeoutId = setTimeout(() => controller.abort(), 3 * 60 * 1000)

    try {
      const res = await fetch('/api/analyse/stream', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body:   JSON.stringify({ input }),
        signal: controller.signal,
      })

      if (!res.ok) {
        let msg: string
        try {
          const errData = await res.json()
          msg =
            res.status === 402 ? 'No credits remaining. Buy credits to continue.' :
            res.status === 429 ? 'Rate limit reached. Please wait a moment before retrying.' :
            errData?.detail?.message || errData?.detail || `Request failed (${res.status})`
        } catch {
          msg = `Request failed (${res.status})`
        }
        setError(msg)
        setStatus('error')
        return
      }

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let   buffer  = ''

      // eslint-disable-next-line no-constant-condition
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

          let event: Record<string, any>
          try {
            event = JSON.parse(raw)
          } catch {
            continue
          }

          if (event['type'] === 'step') {
            const label = STEP_LABELS[event['step']] ?? event['step'] ?? ''
            setCurrentStep(label)
            setProgress(typeof event['progress'] === 'number' ? event['progress'] : 0)
          }

          if (event['type'] === 'complete') {
            const strategy: StrategyResult = {
              ...(event['result'] as StrategyResult),
              metrics:        event['metrics'],
              pipeline_steps: event['pipeline_steps'],
            }
            setResult(strategy)
            setConfidence(typeof event['confidence'] === 'number' ? event['confidence'] : null)
            setProgress(100)
            setStatus('complete')
          }

          if (event['type'] === 'error') {
            setError(
              typeof event['message'] === 'string'
                ? event['message']
                : 'Analysis failed. Please try again.'
            )
            setStatus('error')
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        // Intentionally cancelled — silently revert to idle
        setStatus('idle')
        return
      }
      setError(
        e instanceof Error
          ? e.message || 'Network error. Please try again.'
          : 'Network error. Please try again.'
      )
      setStatus('error')
    } finally {
      clearTimeout(timeoutId)
      abortRef.current = null
    }
  }, [])

  return { analyse, reset, progress, currentStep, result, confidence, error, status }
}
