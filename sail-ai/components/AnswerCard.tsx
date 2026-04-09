'use client'

import { motion } from 'framer-motion'
import { OrnamentRule, WaveRule } from './Ornaments'
import type { AIResponse, NeedsMetrics, StrategyResult } from '@/hooks/useSailState'

interface Props {
  result:      AIResponse | null
  streamText:  string
  isStreaming: boolean
}

const up = (delay = 0) => ({
  initial:    { opacity: 0, y: 10 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
})

export function AnswerCard({ result, streamText, isStreaming }: Props) {
  if (isStreaming) {
    return (
      <motion.div
        {...up()}
        className="card-linen p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: '#2B4A2A', animation: 'pulse 1.2s ease-in-out infinite' }}
          />
          <span className="label-caps">Generating your strategy</span>
        </div>
        <div className="h-1.5 overflow-hidden" style={{ background: '#E5DECE' }}>
          <motion.div
            className="h-full"
            style={{ background: 'linear-gradient(90deg, #2B4A2A, rgba(43,74,42,0.3))' }}
            animate={{ width: ['0%', '80%', '92%'] }}
            transition={{ duration: 9, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </motion.div>
    )
  }

  if (!result) return null

  if ('needsMetrics' in result) return <CaptainCard data={result} />

  return <StrategyCard data={result} />
}

/* ── Captain asks for metrics ─────────────────────────── */

function CaptainCard({ data }: { data: NeedsMetrics }) {
  return (
    <motion.div {...up()} className="card-linen overflow-hidden">
      {/* Top stripe — vintage racing green */}
      <div className="stripe-accent" />

      <div className="p-6 md:p-8 flex gap-6 items-start">
        {/* Captain figure */}
        <div className="flex-shrink-0">
          <CaptainSVG />
        </div>

        <div>
          <span className="label-caps block mb-3" style={{ color: '#2B4A2A' }}>
            Your captain asks
          </span>
          <p
            className="font-serif leading-relaxed"
            style={{ fontSize: 'clamp(1.1rem, 2vw, 1.35rem)', color: '#1A1814', fontStyle: 'italic' }}
          >
            &ldquo;{data.question}&rdquo;
          </p>
          <p className="mt-3 text-sm" style={{ color: '#7A7062', fontFamily: 'Jost' }}>
            Add your numbers and I&apos;ll chart the course.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function CaptainSVG() {
  return (
    <svg width="64" height="80" viewBox="0 0 64 80" fill="none">
      {/* Captain's hat */}
      <rect x="18" y="14" width="28" height="7" rx="2" fill="#1B3649" />
      <path d="M14 21 Q32 18 50 21 L52 25 Q32 22 12 25 Z" fill="#1B3649" />
      {/* Hat band */}
      <line x1="14" y1="21" x2="50" y2="21" stroke="#C4973A" strokeWidth="1.5" />
      {/* Hat badge */}
      <path d="M32 17 L34 21 L32 20 L30 21 Z" fill="#C4973A" opacity="0.8" />

      {/* Head */}
      <ellipse cx="32" cy="34" rx="12" ry="13" fill="#E8D5B0" />

      {/* Face details */}
      {/* Eyes */}
      <ellipse cx="27" cy="32" rx="2" ry="2.2" fill="#1A1814" />
      <ellipse cx="37" cy="32" rx="2" ry="2.2" fill="#1A1814" />
      <circle cx="27.8" cy="31.5" r="0.7" fill="white" />
      <circle cx="37.8" cy="31.5" r="0.7" fill="white" />
      {/* Brow */}
      <path d="M24 28 Q27 26.5 30 28" stroke="#8B6914" strokeWidth="1" fill="none" />
      <path d="M34 28 Q37 26.5 40 28" stroke="#8B6914" strokeWidth="1" fill="none" />
      {/* Moustache */}
      <path d="M26 38 Q32 41 38 38" stroke="#8B6914" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M28 38 Q32 36 36 38" fill="#8B6914" opacity="0.4" />

      {/* Neck */}
      <rect x="28" y="46" width="8" height="6" rx="2" fill="#E8D5B0" />

      {/* Uniform body */}
      <path d="M14 52 Q32 48 50 52 L54 78 H10 Z" fill="#1B3649" />

      {/* Uniform details */}
      {/* Collar */}
      <path d="M28 52 L32 60 L36 52" fill="#FAFAF5" opacity="0.9" />
      {/* Buttons */}
      <circle cx="32" cy="63" r="1.5" fill="#C4973A" />
      <circle cx="32" cy="70" r="1.5" fill="#C4973A" />
      {/* Epaulettes */}
      <rect x="9"  y="52" width="8" height="4" rx="1" fill="#C4973A" opacity="0.8" />
      <rect x="47" y="52" width="8" height="4" rx="1" fill="#C4973A" opacity="0.8" />
      {/* Anchor badge on chest */}
      <g opacity="0.55" transform="translate(23, 56)">
        <circle cx="5" cy="3" r="2" stroke="#C4973A" strokeWidth="0.8" />
        <line x1="5" y1="5" x2="5" y2="10" stroke="#C4973A" strokeWidth="0.8" />
        <line x1="2" y1="7" x2="8" y2="7" stroke="#C4973A" strokeWidth="0.8" />
        <path d="M2 10 Q5 9 8 10" stroke="#C4973A" strokeWidth="0.8" fill="none" />
      </g>
    </svg>
  )
}

/* ── Strategy card ────────────────────────────────────── */

function StrategyCard({ data }: { data: StrategyResult }) {
  return (
    <div className="space-y-4">

      {/* Headline */}
      <motion.div {...up(0)} className="card-linen overflow-hidden">
        <div className="stripe-accent" />
        <div className="p-6 md:p-8">
          <span className="label-caps block mb-4" style={{ color: '#2B4A2A' }}>Strategy</span>
          <h2
            className="font-serif font-semibold text-balance leading-tight"
            style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', color: '#1A1814', fontStyle: 'italic' }}
          >
            {data.headline}
          </h2>
        </div>
      </motion.div>

      {/* Signal */}
      {data.signal && (
        <motion.div {...up(0.07)} className="card-linen p-5">
          <span className="label-caps block mb-2.5" style={{ color: '#2B4A2A' }}>Key signal</span>
          <WaveRule />
          <p className="mt-3 text-sm leading-relaxed" style={{ color: '#7A7062', fontFamily: 'Jost' }}>
            {data.signal}
          </p>
        </motion.div>
      )}

      {/* Tactics */}
      {data.tactics?.length > 0 && (
        <motion.div {...up(0.14)} className="space-y-2">
          <span className="label-caps block px-1">Your 3-step plan</span>
          {data.tactics.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18 + i * 0.08, duration: 0.35 }}
              className="card-linen p-4 flex gap-4"
            >
              <div
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center font-serif font-bold text-lg"
                style={{ border: '1px solid rgba(43,74,42,0.3)', color: '#2B4A2A', background: 'rgba(43,74,42,0.06)' }}
              >
                {t.step}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium leading-snug mb-2" style={{ color: '#1A1814', fontFamily: 'Jost' }}>{t.action}</p>
                <div className="flex flex-wrap gap-2">
                  <Chip color="navy">{t.timeframe}</Chip>
                  <Chip color="green">↗ {t.result}</Chip>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Benchmarks */}
      {data.benchmarks?.length > 0 && (
        <motion.div {...up(0.3)} className="card-linen p-5">
          <span className="label-caps block mb-4">Benchmarks</span>
          <OrnamentRule />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {data.benchmarks.map((b, i) => (
              <div key={i} className="card-cream p-3">
                <p className="text-xs mb-1.5 leading-tight" style={{ color: '#7A7062', fontFamily: 'Jost' }}>{b.label}</p>
                <p className="font-serif font-semibold text-lg" style={{ color: '#1A1814' }}>{b.value}</p>
                <p className="text-xs mt-1 font-medium" style={{ color: b.type === 'user' ? '#2B4A2A' : '#7A7062', fontFamily: 'Jost', letterSpacing: '0.06em' }}>
                  {b.type === 'user' ? 'YOUR DATA' : 'INDUSTRY'}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 30-day + Risk */}
      <motion.div {...up(0.36)} className="grid sm:grid-cols-2 gap-3">
        {data.target30 && (
          <div className="card-linen p-4">
            <span className="label-caps block mb-2" style={{ color: '#2B4A2A' }}>30-day target</span>
            <p className="font-serif italic text-base" style={{ color: '#1A1814' }}>{data.target30}</p>
          </div>
        )}
        {data.risk && (
          <div className="card-linen p-4" style={{ borderColor: 'rgba(107,39,55,0.2)', background: 'rgba(107,39,55,0.03)' }}>
            <span className="label-caps block mb-2" style={{ color: '#6B2737' }}>Watch out for</span>
            <p className="text-sm leading-relaxed" style={{ color: '#7A7062', fontFamily: 'Jost' }}>{data.risk}</p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function Chip({ color, children }: { color: 'navy' | 'green'; children: React.ReactNode }) {
  const s = {
    navy:  { background: 'rgba(27,54,73,0.08)',  color: '#1B3649', border: '1px solid rgba(27,54,73,0.2)'  },
    green: { background: 'rgba(43,74,42,0.08)',  color: '#2B4A2A', border: '1px solid rgba(43,74,42,0.22)' },
  }
  return (
    <span className="text-xs font-medium px-2.5 py-0.5" style={{ ...s[color], fontFamily: 'Jost', letterSpacing: '0.04em' }}>
      {children}
    </span>
  )
}
