'use client'

import { useEffect, useRef, useState } from 'react'

type Status = 'idle' | 'streaming' | 'complete' | 'error'

interface Props {
  progress:    number
  currentStep: string
  status:      Status
}

const STEPS = [
  { key: 'rate_limit',            label: 'Verifying access',              pct: 7  },
  { key: 'cache_lookup',          label: 'Checking cache',                pct: 14 },
  { key: 'intent_classification', label: 'Classifying your business type', pct: 28 },
  { key: 'metrics_computed',      label: 'Computing industry benchmarks',  pct: 42 },
  { key: 'llm_generation',        label: 'Building your strategy',         pct: 70 },
  { key: 'output_validation',     label: 'Validating metrics for accuracy', pct: 84 },
  { key: 'cache_written',         label: 'Strategy ready',                 pct: 100 },
]

export function ProgressBar({ progress, currentStep, status }: Props) {
  const [display, setDisplay] = useState(0)
  const raf = useRef<number>()

  useEffect(() => {
    if (status === 'idle') { setDisplay(0); return }

    const start = display
    const end   = progress
    const dur   = 600
    const t0    = performance.now()

    const animate = (now: number) => {
      const p = Math.min((now - t0) / dur, 1)
      // ease out cubic
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(start + (end - start) * eased)
      if (p < 1) raf.current = requestAnimationFrame(animate)
    }

    raf.current = requestAnimationFrame(animate)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [progress, status]) // eslint-disable-line react-hooks/exhaustive-deps

  const barColor =
    status === 'complete' ? '#2de8a0' :
    status === 'error'    ? '#e06060' :
    '#2bc4e8'

  return (
    <div className="space-y-3">
      {/* Bar */}
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-none"
          style={{ width: `${display}%`, background: barColor }}
        />
      </div>

      {/* Step labels */}
      <div className="flex justify-between text-xs font-mono text-muted">
        <span>{status === 'complete' ? 'Strategy ready.' : currentStep}</span>
        <span style={{ color: barColor }}>{Math.round(display)}%</span>
      </div>

      {/* Step dots */}
      <div className="flex gap-1.5 items-center">
        {STEPS.slice(2).map((s) => {
          const done = progress >= s.pct
          return (
            <div
              key={s.key}
              className="h-1 flex-1 rounded-full transition-all duration-500"
              style={{ background: done ? barColor : '#1a2840' }}
              title={s.label}
            />
          )
        })}
      </div>
    </div>
  )
}
