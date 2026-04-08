'use client'

import { motion } from 'framer-motion'
import type { AIResponse, NeedsMetrics, StrategyResult } from '@/hooks/useSailState'

interface Props {
  result:     AIResponse
  streamText: string
  isStreaming: boolean
}

export function AnswerCard({ result, streamText, isStreaming }: Props) {
  if (isStreaming) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-card p-6"
        style={{ background: 'rgba(28,35,51,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: '#94A3B8' }}>
          Reading the wind…
        </p>
        <p className="text-sm font-mono stream-cursor" style={{ color: '#94A3B8' }}>
          {streamText.length > 0 ? 'Generating your strategy…' : ''}
        </p>
      </motion.div>
    )
  }

  if (!result) return null

  // Follow-up question
  if ('needsMetrics' in result) {
    return <MetricsPrompt data={result} />
  }

  return <StrategyCard data={result} />
}

function MetricsPrompt({ data }: { data: NeedsMetrics }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-card p-6 space-y-3"
      style={{ background: 'rgba(28,35,51,0.8)', border: '1px solid rgba(192,57,43,0.2)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C0392B' }}>
          One more thing
        </span>
      </div>
      <p className="text-base font-medium leading-relaxed" style={{ color: '#F1F5F9' }}>
        {data.question}
      </p>
    </motion.div>
  )
}

function StrategyCard({ data }: { data: StrategyResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Headline */}
      <div
        className="rounded-card overflow-hidden"
        style={{ background: 'rgba(28,35,51,0.9)', border: '1px solid rgba(192,57,43,0.25)' }}
      >
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, #C0392B, rgba(192,57,43,0.1))' }} />
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#C0392B' }}>
            Strategy
          </p>
          <h2 className="font-bold leading-tight text-balance" style={{ fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', color: '#F1F5F9' }}>
            {data.headline}
          </h2>
        </div>
      </div>

      {/* Key Signal */}
      {data.signal && (
        <div
          className="rounded-card p-5"
          style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.18)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#C0392B' }}>Key signal</p>
          <p className="text-sm leading-relaxed" style={{ color: '#94A3B8' }}>{data.signal}</p>
        </div>
      )}

      {/* Tactics */}
      {data.tactics?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest px-1" style={{ color: '#94A3B8' }}>
            3-step plan
          </p>
          {data.tactics.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.35 }}
              className="rounded-card p-4"
              style={{ background: 'rgba(28,35,51,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex gap-4">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(192,57,43,0.15)', border: '1px solid rgba(192,57,43,0.3)', color: '#C0392B' }}
                >
                  {t.step}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold leading-snug" style={{ color: '#F1F5F9' }}>{t.action}</p>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className="text-xs font-medium px-2.5 py-0.5 rounded-pill"
                      style={{ background: 'rgba(30,58,138,0.2)', color: '#93C5FD', border: '1px solid rgba(59,130,246,0.2)' }}
                    >
                      {t.timeframe}
                    </span>
                    <span
                      className="text-xs font-medium px-2.5 py-0.5 rounded-pill"
                      style={{ background: 'rgba(22,163,74,0.12)', color: '#86EFAC', border: '1px solid rgba(22,163,74,0.2)' }}
                    >
                      ↗ {t.result}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Benchmarks */}
      {data.benchmarks?.length > 0 && (
        <div className="rounded-card p-5" style={{ background: 'rgba(28,35,51,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: '#94A3B8' }}>
            Benchmarks
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.benchmarks.map((b, i) => (
              <div key={i} className="rounded-card p-3" style={{ background: 'rgba(10,15,30,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="text-xs mb-1" style={{ color: '#94A3B8' }}>{b.label}</p>
                <p className="text-base font-bold" style={{ color: '#F1F5F9' }}>{b.value}</p>
                <p className="text-xs mt-1" style={{ color: b.type === 'user' ? '#86EFAC' : '#6B7280' }}>
                  {b.type === 'user' ? 'your data' : 'est.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-day target + Risk */}
      <div className="grid sm:grid-cols-2 gap-3">
        {data.target30 && (
          <div className="rounded-card p-4" style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#86EFAC' }}>30-day target</p>
            <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{data.target30}</p>
          </div>
        )}
        {data.risk && (
          <div className="rounded-card p-4" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#FCD34D' }}>Watch out for</p>
            <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{data.risk}</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
