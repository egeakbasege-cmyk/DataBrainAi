'use client'

import { motion } from 'framer-motion'
import { WaveRule } from './Ornaments'
import { CaptainFigure } from './CaptainFigure'
import type { AIResponse, NeedsMetrics, StrategyResult, FreeTextResponse } from '@/hooks/useSailState'

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
  if ('freeText' in result) return <FreeTextCard data={result} />

  return <StrategyCard data={result} />
}

/* ── Free text conversation card ──────────────────── */
function FreeTextCard({ data }: { data: FreeTextResponse }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-linen overflow-hidden"
    >
      <div className="stripe-accent" />
      <div className="p-6 md:p-8">
        <span className="label-caps block mb-4" style={{ color: '#00695C' }}>Conversation</span>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.95rem',
            lineHeight: 1.7,
            color: '#0C0C0E',
            whiteSpace: 'pre-wrap',
          }}
        >
          {data.freeText}
        </div>
      </div>
    </motion.div>
  )
}

/* ── Captain asks for more info ───────────────────── */
function CaptainCard({ data }: { data: NeedsMetrics }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-linen overflow-hidden"
    >
      <div className="stripe-accent" />
      <div className="p-6 md:p-8">
        {/* Captain + speech bubble layout */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          {/* Captain figure */}
          <div style={{ flexShrink: 0 }}>
            <CaptainFigure size={88} />
          </div>

          {/* Speech area */}
          <div style={{ flex: 1, paddingTop: '0.5rem' }}>
            <span className="label-caps block mb-3" style={{ color: '#C9A96E' }}>
              Your captain asks
            </span>

            {/* Speech bubble */}
            <div
              style={{
                position:   'relative',
                background: '#FFFFFF',
                border:     '1px solid rgba(201,169,110,0.3)',
                borderRadius: '0 12px 12px 12px',
                padding:    '1rem 1.25rem',
                boxShadow:  '0 2px 12px rgba(0,0,0,0.05)',
              }}
            >
              {/* Triangle */}
              <div style={{
                position:    'absolute',
                top:         -1,
                left:        -10,
                width:       0,
                height:      0,
                borderTop:   '8px solid rgba(201,169,110,0.3)',
                borderLeft:  '10px solid transparent',
              }} />
              <div style={{
                position:    'absolute',
                top:         0,
                left:        -8,
                width:       0,
                height:      0,
                borderTop:   '7px solid #FFFFFF',
                borderLeft:  '9px solid transparent',
              }} />

              <p
                style={{
                  fontFamily: 'Cormorant Garamond, Georgia, serif',
                  fontStyle:  'italic',
                  fontSize:   'clamp(1rem, 2vw, 1.2rem)',
                  color:      '#0C0C0E',
                  lineHeight: 1.55,
                  margin:     0,
                }}
              >
                &ldquo;{data.question}&rdquo;
              </p>
            </div>

            <p
              style={{
                marginTop:  '0.875rem',
                fontFamily: 'Inter, sans-serif',
                fontSize:   '0.8rem',
                color:      '#71717A',
                lineHeight: 1.5,
              }}
            >
              Add your numbers above and I&apos;ll chart the course.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
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

      {/* Opportunity Cost */}
      {data.opportunity_cost && (
        <motion.div {...up(0.3)} className="card-linen p-4" style={{ borderColor: 'rgba(201,169,110,0.3)', background: 'rgba(201,169,110,0.04)' }}>
          <span className="label-caps block mb-2" style={{ color: '#C9A96E' }}>Opportunity cost</span>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', lineHeight: 1.65, color: '#0C0C0E' }}>
            {data.opportunity_cost}
          </p>
        </motion.div>
      )}

      {/* 30 / 60 / 90 day targets + Risk */}
      <motion.div {...up(0.36)} style={{ display: 'grid', gap: '0.75rem' }}>
        {/* Targets row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
          {data.target30 && (
            <div className="card-linen p-4">
              <span className="label-caps block mb-2" style={{ color: '#C9A96E' }}>30 days</span>
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: '#0C0C0E', lineHeight: 1.45 }}>
                {data.target30}
              </p>
            </div>
          )}
          {data.target60 && (
            <div className="card-linen p-4">
              <span className="label-caps block mb-2" style={{ color: '#A1855A' }}>60 days</span>
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: '#0C0C0E', lineHeight: 1.45 }}>
                {data.target60}
              </p>
            </div>
          )}
          {data.target90 && (
            <div className="card-linen p-4">
              <span className="label-caps block mb-2" style={{ color: '#71717A' }}>90 days</span>
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: '#0C0C0E', lineHeight: 1.45 }}>
                {data.target90}
              </p>
            </div>
          )}
        </div>

        {/* Risk */}
        {data.risk && (
          <div className="card-linen p-4" style={{ borderColor: 'rgba(153,27,27,0.18)', background: 'rgba(153,27,27,0.04)' }}>
            <span className="label-caps block mb-2" style={{ color: '#991B1B' }}>Watch out for</span>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', lineHeight: 1.6, color: '#71717A' }}>
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
