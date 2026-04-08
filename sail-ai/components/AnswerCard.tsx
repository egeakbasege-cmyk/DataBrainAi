'use client'

import { motion } from 'framer-motion'
import type { AIResponse, NeedsMetrics, StrategyResult } from '@/hooks/useSailState'

interface Props {
  result:      AIResponse | null
  streamText:  string
  isStreaming: boolean
}

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 10 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay },
})

export function AnswerCard({ result, streamText, isStreaming }: Props) {
  if (isStreaming) {
    return (
      <motion.div
        {...fadeUp()}
        className="rounded-card p-6"
        style={{ background: 'rgba(28,35,51,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: '#C0392B', boxShadow: '0 0 6px rgba(192,57,43,0.8)', animation: 'pulse 1s ease-in-out infinite' }}
          />
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#94A3B8' }}>
            Generating strategy…
          </p>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #C0392B, rgba(192,57,43,0.3))' }}
            animate={{ width: ['0%', '85%', '92%'] }}
            transition={{ duration: 8, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </motion.div>
    )
  }

  if (!result) return null

  if ('needsMetrics' in result) return <MetricsPrompt data={result} />

  return <StrategyCard data={result} />
}

/* ── Follow-up question ──────────────────────────────── */

function MetricsPrompt({ data }: { data: NeedsMetrics }) {
  return (
    <motion.div
      {...fadeUp()}
      className="rounded-card p-6 space-y-3"
      style={{ background: 'rgba(28,35,51,0.8)', border: '1px solid rgba(192,57,43,0.22)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#C0392B' }}>
          One quick thing
        </span>
      </div>
      <p className="text-base font-medium leading-relaxed" style={{ color: '#F1F5F9' }}>
        {data.question}
      </p>
    </motion.div>
  )
}

/* ── Full strategy card ──────────────────────────────── */

function StrategyCard({ data }: { data: StrategyResult }) {
  return (
    <div className="space-y-4">

      {/* Headline */}
      <motion.div
        {...fadeUp(0)}
        className="rounded-card overflow-hidden"
        style={{ background: 'rgba(28,35,51,0.9)', border: '1px solid rgba(192,57,43,0.28)' }}
      >
        <div className="h-px w-full" style={{ background: 'linear-gradient(90deg, #C0392B 0%, rgba(192,57,43,0.08) 100%)' }} />
        <div className="p-6">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#C0392B' }}>
            Strategy
          </p>
          <h2
            className="font-bold leading-tight text-balance"
            style={{ fontSize: 'clamp(1.15rem, 2.5vw, 1.55rem)', color: '#F1F5F9', letterSpacing: '-0.02em' }}
          >
            {data.headline}
          </h2>
        </div>
      </motion.div>

      {/* Key Signal */}
      {data.signal && (
        <motion.div
          {...fadeUp(0.06)}
          className="rounded-card p-5"
          style={{ background: 'rgba(192,57,43,0.06)', border: '1px solid rgba(192,57,43,0.18)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#C0392B' }}>
            Key signal
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{data.signal}</p>
        </motion.div>
      )}

      {/* 3-step tactics */}
      {data.tactics?.length > 0 && (
        <motion.div {...fadeUp(0.12)} className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest px-1" style={{ color: '#94A3B8' }}>
            3-step plan
          </p>
          {data.tactics.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.3 }}
              className="rounded-card p-4"
              style={{ background: 'rgba(28,35,51,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex gap-4">
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: 'rgba(192,57,43,0.14)', border: '1px solid rgba(192,57,43,0.3)', color: '#C0392B' }}
                >
                  {t.step}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold leading-snug" style={{ color: '#F1F5F9' }}>{t.action}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge color="blue">{t.timeframe}</Badge>
                    <Badge color="green">↗ {t.result}</Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Benchmarks */}
      {data.benchmarks?.length > 0 && (
        <motion.div
          {...fadeUp(0.28)}
          className="rounded-card p-5"
          style={{ background: 'rgba(28,35,51,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs font-medium uppercase tracking-widest mb-4" style={{ color: '#94A3B8' }}>
            Benchmarks
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.benchmarks.map((b, i) => (
              <div
                key={i}
                className="rounded-card p-3"
                style={{ background: 'rgba(10,15,30,0.5)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <p className="text-xs mb-1.5 leading-tight" style={{ color: '#94A3B8' }}>{b.label}</p>
                <p className="text-base font-bold" style={{ color: '#F1F5F9' }}>{b.value}</p>
                <p className="text-xs mt-1" style={{ color: b.type === 'user' ? '#86EFAC' : '#6B7280' }}>
                  {b.type === 'user' ? 'your data' : 'industry'}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 30-day target + risk */}
      <motion.div {...fadeUp(0.34)} className="grid sm:grid-cols-2 gap-3">
        {data.target30 && (
          <div
            className="rounded-card p-4"
            style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#86EFAC' }}>
              30-day target
            </p>
            <p className="text-sm leading-relaxed font-medium" style={{ color: '#CBD5E1' }}>{data.target30}</p>
          </div>
        )}
        {data.risk && (
          <div
            className="rounded-card p-4"
            style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#FCD34D' }}>
              Watch out for
            </p>
            <p className="text-sm leading-relaxed" style={{ color: '#CBD5E1' }}>{data.risk}</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function Badge({ color, children }: { color: 'blue' | 'green'; children: React.ReactNode }) {
  const styles = {
    blue:  { background: 'rgba(30,58,138,0.2)',  color: '#93C5FD', border: '1px solid rgba(59,130,246,0.2)'  },
    green: { background: 'rgba(22,163,74,0.12)', color: '#86EFAC', border: '1px solid rgba(22,163,74,0.2)'  },
  }
  return (
    <span className="text-xs font-medium px-2.5 py-0.5 rounded-pill" style={styles[color]}>
      {children}
    </span>
  )
}
