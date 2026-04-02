'use client'

import { useEffect, useState } from 'react'

type Status = 'idle' | 'streaming' | 'complete' | 'error'

interface Props {
  progress:    number
  currentStep: string
  status:      Status
}

const STEPS = [
  { key: 'rate_limit',            label: 'Access',      pct: 7   },
  { key: 'cache_lookup',          label: 'Cache',       pct: 14  },
  { key: 'intent_classification', label: 'Intent',      pct: 28  },
  { key: 'metrics_computed',      label: 'Benchmarks',  pct: 42  },
  { key: 'llm_generation',        label: 'Strategy',    pct: 70  },
  { key: 'output_validation',     label: 'Validation',  pct: 84  },
  { key: 'cache_written',         label: 'Complete',    pct: 100 },
]

export function ProgressBar({ progress, currentStep, status }: Props) {
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (status === 'idle') { setDisplay(0); return }
    setDisplay(progress)
  }, [progress, status])

  const trackColor =
    status === 'complete' ? '#1ed48a' :
    status === 'error'    ? '#c94f4f' :
    '#18b8e0'

  return (
    <div className="space-y-4">

      {/* Track */}
      <div className="relative h-px bg-border rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 progress-bar rounded-full"
          style={{ width: `${display}%`, background: trackColor }}
        />
      </div>

      {/* Step dots with labels */}
      <div className="flex items-start justify-between">
        {STEPS.map((s) => {
          const done    = progress >= s.pct
          const current = currentStep === s.key
          return (
            <div key={s.key} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className="w-1 h-1 rounded-full transition-all duration-500"
                style={{
                  background:  done ? trackColor : 'var(--border)',
                  transform:   current ? 'scale(2)' : 'scale(1)',
                  boxShadow:   current ? `0 0 6px ${trackColor}` : 'none',
                }}
              />
              <span
                className="font-mono text-center leading-tight hidden md:block"
                style={{
                  fontSize: '0.58rem',
                  color: done ? trackColor : 'var(--muted)',
                  letterSpacing: '0.05em',
                }}>
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Status line */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-2xs text-muted tracking-wider">
          {status === 'complete'
            ? '✦ Strategy ready'
            : status === 'error'
            ? '✕ Analysis failed'
            : currentStep || 'Initialising…'}
        </span>
        <span className="font-mono text-2xs tabular-nums"
          style={{ color: trackColor }}>
          {Math.round(display)}%
        </span>
      </div>
    </div>
  )
}
