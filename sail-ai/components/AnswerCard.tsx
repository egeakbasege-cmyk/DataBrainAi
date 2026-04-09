'use client'

import { motion } from 'framer-motion'
import { WaveRule } from './Ornaments'
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
      <motion.div {...up()} className="card-linen p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: '#C9A96E', animation: 'pulse 1.2s ease-in-out infinite' }}
          />
          <span className="label-caps">Generating your strategy</span>
        </div>
        <div className="overflow-hidden" style={{ height: 3, background: 'rgba(26,82,118,0.1)', borderRadius: 2 }}>
          <motion.div
            style={{ height: '100%', background: 'linear-gradient(90deg, #0C0C0E, #C9A96E)', borderRadius: 0 }}
            animate={{ width: ['0%', '80%', '93%'] }}
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

/* ── Captain asks for more info ───────────────────── */
function CaptainCard({ data }: { data: NeedsMetrics }) {
  return (
    <motion.div {...up()} className="card-linen overflow-hidden">
      <div className="stripe-accent" />
      <div className="p-6 md:p-8 flex gap-6 items-start">
        <div className="flex-shrink-0">
          <CaptainSVG />
        </div>
        <div>
          <span className="label-caps block mb-3" style={{ color: '#C9A96E' }}>
            Your captain asks
          </span>
          <p
            style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontStyle:  'italic',
              fontSize:   'clamp(1.1rem, 2vw, 1.3rem)',
              color:      '#0C0C0E',
              lineHeight: 1.5,
            }}
          >
            &ldquo;{data.question}&rdquo;
          </p>
          <p
            style={{
              marginTop:  '0.75rem',
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.85rem',
              color:      '#71717A',
            }}
          >
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
      <rect x="18" y="14" width="28" height="7" rx="2" fill="#163450" />
      <path d="M14 21 Q32 18 50 21 L52 25 Q32 22 12 25 Z" fill="#163450" />
      <line x1="14" y1="21" x2="50" y2="21" stroke="#C49A3A" strokeWidth="1.5" />
      <path d="M32 17 L34 21 L32 20 L30 21 Z" fill="#C49A3A" opacity="0.85" />
      {/* Head */}
      <ellipse cx="32" cy="34" rx="12" ry="13" fill="#E8D5B0" />
      {/* Eyes */}
      <ellipse cx="27" cy="32" rx="2" ry="2.2" fill="#0A1628" />
      <ellipse cx="37" cy="32" rx="2" ry="2.2" fill="#0A1628" />
      <circle cx="27.8" cy="31.5" r="0.7" fill="white" />
      <circle cx="37.8" cy="31.5" r="0.7" fill="white" />
      {/* Brows */}
      <path d="M24 28 Q27 26.5 30 28" stroke="#8B6914" strokeWidth="1" fill="none" />
      <path d="M34 28 Q37 26.5 40 28" stroke="#8B6914" strokeWidth="1" fill="none" />
      {/* Moustache */}
      <path d="M26 38 Q32 41 38 38" stroke="#8B6914" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M28 38 Q32 36 36 38" fill="#8B6914" opacity="0.4" />
      {/* Neck */}
      <rect x="28" y="46" width="8" height="6" rx="2" fill="#E8D5B0" />
      {/* Uniform body */}
      <path d="M14 52 Q32 48 50 52 L54 78 H10 Z" fill="#163450" />
      {/* Collar */}
      <path d="M28 52 L32 60 L36 52" fill="#FAFAF8" opacity="0.9" />
      {/* Buttons */}
      <circle cx="32" cy="63" r="1.5" fill="#C49A3A" />
      <circle cx="32" cy="70" r="1.5" fill="#C49A3A" />
      {/* Epaulettes */}
      <rect x="9"  y="52" width="8" height="4" rx="1" fill="#C49A3A" opacity="0.8" />
      <rect x="47" y="52" width="8" height="4" rx="1" fill="#C49A3A" opacity="0.8" />
      {/* Anchor badge */}
      <g opacity="0.55" transform="translate(23, 56)">
        <circle cx="5" cy="3" r="2" stroke="#C49A3A" strokeWidth="0.8" />
        <line x1="5" y1="5" x2="5" y2="10" stroke="#C49A3A" strokeWidth="0.8" />
        <line x1="2" y1="7" x2="8" y2="7" stroke="#C49A3A" strokeWidth="0.8" />
        <path d="M2 10 Q5 9 8 10" stroke="#C49A3A" strokeWidth="0.8" fill="none" />
      </g>
    </svg>
  )
}

/* ── Strategy card ────────────────────────────────── */
function StrategyCard({ data }: { data: StrategyResult }) {
  return (
    <div className="space-y-4">

      {/* Headline */}
      <motion.div {...up(0)} className="card-linen overflow-hidden">
        <div className="stripe-accent" />
        <div className="p-6 md:p-8">
          <span className="label-caps block mb-4" style={{ color: '#C9A96E' }}>Strategy</span>
          <h2
            style={{
              fontFamily:    'Cormorant Garamond, Georgia, serif',
              fontStyle:     'italic',
              fontWeight:    600,
              fontSize:      'clamp(1.3rem, 2.5vw, 1.8rem)',
              color:         '#0C0C0E',
              lineHeight:    1.3,
              letterSpacing: '-0.01em',
            }}
          >
            {data.headline}
          </h2>
        </div>
      </motion.div>

      {/* Signal */}
      {data.signal && (
        <motion.div {...up(0.07)} className="card-linen p-5">
          <span className="label-caps block mb-3" style={{ color: '#C9A96E' }}>Key signal</span>
          <WaveRule color="#0C0C0E" opacity={0.2} />
          <p
            style={{
              marginTop:  '0.75rem',
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.875rem',
              lineHeight: 1.7,
              color:      '#71717A',
            }}
          >
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
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
                style={{
                  border:       '1px solid rgba(0,0,0,0.14)',
                  borderRadius: '4px',
                  background:   'rgba(0,0,0,0.04)',
                  fontFamily:   'Cormorant Garamond, Georgia, serif',
                  fontWeight:   700,
                  fontSize:     '1.1rem',
                  color:        '#C9A96E',
                }}
              >
                {t.step}
              </div>
              <div className="flex-1">
                <p
                  style={{
                    fontFamily:   'Inter, sans-serif',
                    fontSize:     '0.875rem',
                    fontWeight:   500,
                    color:        '#0C0C0E',
                    lineHeight:   1.5,
                    marginBottom: '0.5rem',
                  }}
                >
                  {t.action}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip color="navy">{t.timeframe}</Chip>
                  <Chip color="coastal">↗ {t.result}</Chip>
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
          <div style={{ height: 1, background: 'rgba(26,82,118,0.1)', marginBottom: '1rem' }} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.benchmarks.map((b, i) => (
              <div
                key={i}
                style={{
                  background:   '#F5F8FB',
                  border:       '1px solid rgba(26,82,118,0.1)',
                  borderRadius: '6px',
                  padding:      '0.75rem',
                }}
              >
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize:   '0.72rem',
                    color:      '#71717A',
                    lineHeight: 1.4,
                    marginBottom: '0.375rem',
                  }}
                >
                  {b.label}
                </p>
                <p
                  style={{
                    fontFamily: 'Cormorant Garamond, Georgia, serif',
                    fontSize:   '1.4rem',
                    fontWeight: 600,
                    color:      '#0C0C0E',
                    lineHeight: 1,
                  }}
                >
                  {b.value}
                </p>
                <p
                  style={{
                    fontFamily:    'Inter, sans-serif',
                    fontSize:      '0.68rem',
                    fontWeight:    600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:         b.type === 'user' ? '#C9A96E' : '#A1A1AA',
                    marginTop:     '0.25rem',
                  }}
                >
                  {b.type === 'user' ? 'Your data' : 'Industry'}
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
            <span className="label-caps block mb-2" style={{ color: '#C9A96E' }}>30-day target</span>
            <p
              style={{
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontStyle:  'italic',
                fontSize:   '1rem',
                color:      '#0C0C0E',
              }}
            >
              {data.target30}
            </p>
          </div>
        )}
        {data.risk && (
          <div
            className="card-linen p-4"
            style={{ borderColor: 'rgba(153,27,27,0.18)', background: 'rgba(153,27,27,0.04)' }}
          >
            <span className="label-caps block mb-2" style={{ color: '#991B1B' }}>Watch out for</span>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize:   '0.85rem',
                lineHeight: 1.6,
                color:      '#71717A',
              }}
            >
              {data.risk}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function Chip({ color, children }: { color: 'navy' | 'coastal'; children: React.ReactNode }) {
  const s = {
    navy:    { background: 'rgba(12,12,14,0.06)',  color: '#0C0C0E', border: '1px solid rgba(12,12,14,0.14)',  borderRadius: '3px' },
    coastal: { background: 'rgba(201,169,110,0.08)', color: '#C9A96E', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '3px' },
  }
  return (
    <span
      style={{
        ...s[color],
        display:       'inline-flex',
        padding:       '2px 10px',
        fontFamily:    'Inter, sans-serif',
        fontSize:      '0.72rem',
        fontWeight:    500,
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  )
}
