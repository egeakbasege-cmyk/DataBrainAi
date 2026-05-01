'use client'

import { motion } from 'framer-motion'
import { WaveRule } from './Ornaments'
import { CaptainFigure } from './CaptainFigure'
import type { AIResponse, NeedsMetrics, StrategyResult, ChatMessage, FreeTextResponse } from '@/hooks/useSailState'
import type { AgentMode } from '@/types/chat'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { TranslationKey } from '@/lib/i18n/translations'

interface Props {
  result:      AIResponse | null
  streamText:  string
  isStreaming: boolean
  agentMode?:  AgentMode
}

const up = (delay = 0) => ({
  initial:    { opacity: 0, y: 10 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
})

const AGENT_LABEL_KEY: Record<AgentMode, TranslationKey> = {
  auto:      'agent.mode.Auto',
  strategy:  'agent.mode.Strategy',
  analysis:  'agent.mode.Analysis',
  execution: 'agent.mode.Execution',
  review:    'agent.mode.Review',
}

function AgentBadge({ mode }: { mode: AgentMode }) {
  const { t } = useLanguage()
  if (mode === 'auto') return null
  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      gap:           '0.3rem',
      padding:       '2px 8px',
      border:        '1px solid rgba(201,169,110,0.3)',
      background:    'rgba(201,169,110,0.06)',
      fontFamily:    'Inter, sans-serif',
      fontSize:      '0.6rem',
      fontWeight:    600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color:         '#C9A96E',
      flexShrink:    0,
    }}>
      <span style={{ fontSize: '0.38rem' }}>◆</span>
      {t(AGENT_LABEL_KEY[mode])}
    </span>
  )
}

/** Extract the leading number from a value string like "2.3%", "£8k", "18%" */
function extractNum(s: string): number | null {
  const m = s.replace(/[£$€,]/g, '').match(/^([\d.]+)([kKmM]?)/)
  if (!m) return null
  let v = parseFloat(m[1])
  if (m[2].toLowerCase() === 'k') v *= 1_000
  if (m[2].toLowerCase() === 'm') v *= 1_000_000
  return isNaN(v) ? null : v
}

/** Pair user vs industry benchmarks by index (first half = user, second = industry, or interleaved) */
function BenchmarkSection({ benchmarks }: { benchmarks: StrategyResult['benchmarks'] }) {
  const { t } = useLanguage()

  const users     = benchmarks.filter(b => b.type === 'user')
  const industry  = benchmarks.filter(b => b.type === 'industry')
  const hasPairs  = users.length > 0 && industry.length > 0 && users.length === industry.length

  if (hasPairs) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {users.map((u, i) => {
          const ind   = industry[i]
          const uNum  = extractNum(u.value)
          const iNum  = extractNum(ind.value)
          const max   = uNum !== null && iNum !== null ? Math.max(uNum, iNum) * 1.25 : null

          return (
            <div key={i} style={{ background: '#F5F8FB', border: '1px solid rgba(26,82,118,0.1)', borderRadius: '6px', padding: '0.875rem 1rem' }}>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#71717A', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                {u.label}
              </p>

              {/* Visual comparison bars */}
              {max !== null && uNum !== null && iNum !== null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Your data */}
                  <div style={{ display: 'grid', gridTemplateColumns: '7rem 1fr 3.5rem', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.63rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#C9A96E' }}>
                      {t('answer.yourData')}
                    </span>
                    <div style={{ height: 3, background: 'rgba(0,0,0,0.08)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((uNum / max) * 100)}%` }}
                        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: 0.1 }}
                        style={{ height: '100%', background: '#C9A96E' }}
                      />
                    </div>
                    <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1rem', fontWeight: 600, color: '#C9A96E', textAlign: 'right', lineHeight: 1 }}>
                      {u.value}
                    </span>
                  </div>
                  {/* Industry median */}
                  <div style={{ display: 'grid', gridTemplateColumns: '7rem 1fr 3.5rem', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.63rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A1A1AA' }}>
                      {t('answer.industry')}
                    </span>
                    <div style={{ height: 3, background: 'rgba(0,0,0,0.08)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round((iNum / max) * 100)}%` }}
                        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1], delay: 0.25 }}
                        style={{ height: '100%', background: 'rgba(0,0,0,0.2)' }}
                      />
                    </div>
                    <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1rem', fontWeight: 600, color: '#D4B980', textAlign: 'right', lineHeight: 1 }}>
                      {ind.value}
                    </span>
                  </div>
                </div>
              ) : (
                /* Fallback: side-by-side chips when values aren't numeric */
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.63rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#C9A96E', marginBottom: '0.2rem' }}>
                      {t('answer.yourData')}
                    </p>
                    <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.3rem', fontWeight: 600, color: '#C9A96E', lineHeight: 1 }}>
                      {u.value}
                    </p>
                  </div>
                  <div style={{ width: 1, background: 'rgba(0,0,0,0.09)', alignSelf: 'stretch', margin: '0 0.25rem' }} />
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.63rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#A1A1AA', marginBottom: '0.2rem' }}>
                      {t('answer.industry')}
                    </p>
                    <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.3rem', fontWeight: 600, color: '#D4B980', lineHeight: 1 }}>
                      {ind.value}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  /* ── Fallback: original grid layout ── */
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {benchmarks.map((b, i) => (
        <div
          key={i}
          style={{
            background:   '#F5F8FB',
            border:       '1px solid rgba(26,82,118,0.1)',
            borderRadius: '6px',
            padding:      '0.75rem',
          }}
        >
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#D4B980', lineHeight: 1.4, marginBottom: '0.375rem' }}>
            {b.label}
          </p>
          <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.4rem', fontWeight: 600, color: '#C9A96E', lineHeight: 1 }}>
            {b.value}
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: b.type === 'user' ? '#C9A96E' : '#A1A1AA', marginTop: '0.25rem' }}>
            {b.type === 'user' ? t('answer.yourData') : t('answer.industry')}
          </p>
        </div>
      ))}
    </div>
  )
}

export function AnswerCard({ result, streamText, isStreaming, agentMode = 'auto' }: Props) {
  if (isStreaming) {
    return (
      <motion.div {...up()} className="card-linen p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: '#C9A96E', animation: 'pulse 1.2s ease-in-out infinite' }}
            />
            <span className="label-caps">Generating your strategy</span>
          </div>
          <AgentBadge mode={agentMode} />
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
  if ('freeText' in result)      return <FreeTextCard data={result} />
  if ('chatMessage' in result)   return <CoachCard data={result} agentMode={agentMode} />

  return <StrategyCard data={result} agentMode={agentMode} />
}

/* ── Free text conversation card ──────────────────── */
function FreeTextCard({ data }: { data: FreeTextResponse }) {
  const { t } = useLanguage()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-linen overflow-hidden"
    >
      <div className="stripe-accent" />
      <div className="p-6 md:p-8">
        <span className="label-caps block mb-4" style={{ color: '#00695C' }}>{t('answer.conversation')}</span>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:   '0.95rem',
            lineHeight: 1.7,
            color:      '#0C0C0E',
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
  const { t } = useLanguage()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-linen overflow-hidden"
    >
      <div className="stripe-accent" />
      <div className="p-6 md:p-8">
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            <CaptainFigure size={88} />
          </div>

          <div style={{ flex: 1, paddingTop: '0.5rem' }}>
            <span className="label-caps block mb-3" style={{ color: '#C9A96E' }}>
              {t('answer.captainAsks')}
            </span>

            <div
              style={{
                position:     'relative',
                background:   '#FFFFFF',
                border:       '1px solid rgba(201,169,110,0.3)',
                borderRadius: '0 12px 12px 12px',
                padding:      '1rem 1.25rem',
                boxShadow:    '0 2px 12px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ position: 'absolute', top: -1, left: -10, width: 0, height: 0, borderTop: '8px solid rgba(201,169,110,0.3)', borderLeft: '10px solid transparent' }} />
              <div style={{ position: 'absolute', top: 0,  left: -8,  width: 0, height: 0, borderTop: '7px solid #FFFFFF',              borderLeft: '9px solid transparent' }} />
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: '#C9A96E', lineHeight: 1.55, margin: 0 }}>
                &ldquo;{data.question}&rdquo;
              </p>
            </div>

            <p style={{ marginTop: '0.875rem', fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#D4B980', lineHeight: 1.5 }}>
              {t('answer.addNumbers')}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Downwind coaching turn ───────────────────────── */
function CoachCard({ data, agentMode }: { data: ChatMessage; agentMode: AgentMode }) {
  const { t } = useLanguage()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="card-linen overflow-hidden"
    >
      <div className="stripe-accent" style={{ background: 'linear-gradient(90deg, #00695C, #009688)' }} />
      <div className="p-6 md:p-8">
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            <CaptainFigure size={88} />
          </div>

          <div style={{ flex: 1, paddingTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span className="label-caps" style={{ color: '#00695C' }}>
                {t('answer.guidedMode')}
              </span>
              <AgentBadge mode={agentMode} />
            </div>

            <div
              style={{
                position:     'relative',
                background:   '#FFFFFF',
                border:       '1px solid rgba(0,150,136,0.25)',
                borderRadius: '0 12px 12px 12px',
                padding:      '1rem 1.25rem',
                boxShadow:    '0 2px 12px rgba(0,0,0,0.05)',
                marginBottom: data.followUpQuestion ? '1rem' : 0,
              }}
            >
              <div style={{ position: 'absolute', top: -1, left: -10, width: 0, height: 0, borderTop: '8px solid rgba(0,150,136,0.25)', borderLeft: '10px solid transparent' }} />
              <div style={{ position: 'absolute', top: 0,  left: -8,  width: 0, height: 0, borderTop: '7px solid #FFFFFF',             borderLeft: '9px solid transparent' }} />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#C9A96E', lineHeight: 1.7, margin: 0 }}>
                {data.chatMessage}
              </p>
            </div>

            {data.followUpQuestion && (
              <div style={{ background: 'rgba(0,150,136,0.05)', border: '1px solid rgba(0,150,136,0.2)', borderRadius: '8px', padding: '0.875rem 1rem' }}>
                <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: '#C9A96E', lineHeight: 1.5, margin: 0 }}>
                  &ldquo;{data.followUpQuestion}&rdquo;
                </p>
              </div>
            )}

            <p style={{ marginTop: '0.75rem', fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#D4B980', lineHeight: 1.5 }}>
              {t('chat.typeAnswer')}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Strategy card ────────────────────────────────── */
function StrategyCard({ data, agentMode }: { data: StrategyResult; agentMode: AgentMode }) {
  const { t } = useLanguage()
  return (
    <div className="space-y-4">

      {/* Headline */}
      <motion.div {...up(0)} className="card-linen overflow-hidden">
        <div className="stripe-accent" />
        <div className="p-6 md:p-8">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
            <span className="label-caps" style={{ color: '#C9A96E' }}>{t('answer.strategy')}</span>
            <AgentBadge mode={agentMode} />
          </div>
          <h2
            style={{
              fontFamily:    'Cormorant Garamond, Georgia, serif',
              fontStyle:     'italic',
              fontWeight:    600,
              fontSize:      'clamp(1.3rem, 2.5vw, 1.8rem)',
              color:         '#C9A96E',
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
          <span className="label-caps block mb-3" style={{ color: '#C9A96E' }}>{t('answer.keySignal')}</span>
          <WaveRule color="#C9A96E" opacity={0.3} />
          <p style={{ marginTop: '0.75rem', fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', lineHeight: 1.7, color: '#D4B980' }}>
            {data.signal}
          </p>
        </motion.div>
      )}

      {/* Tactics */}
      {data.tactics?.length > 0 && (
        <motion.div {...up(0.14)} className="space-y-2">
          <span className="label-caps block px-1">{t('answer.threeStepPlan')}</span>
          {data.tactics.map((tac, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18 + i * 0.08, duration: 0.35 }}
              className="card-linen p-4 flex gap-4"
            >
              <div
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center"
                style={{ border: '1px solid rgba(0,0,0,0.14)', borderRadius: '4px', background: 'rgba(0,0,0,0.04)', fontFamily: 'Cormorant Garamond, Georgia, serif', fontWeight: 700, fontSize: '1.1rem', color: '#C9A96E' }}
              >
                {tac.step}
              </div>
              <div className="flex-1">
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', fontWeight: 500, color: '#C9A96E', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                  {tac.action}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip color="navy">{tac.timeframe}</Chip>
                  <Chip color="coastal">↗ {tac.result}</Chip>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Benchmarks — enhanced with visual comparison bars */}
      {data.benchmarks?.length > 0 && (
        <motion.div {...up(0.3)} className="card-linen p-5">
          <span className="label-caps block mb-4">{t('answer.benchmarks')}</span>
          <div style={{ height: 1, background: 'rgba(26,82,118,0.1)', marginBottom: '1rem' }} />
          <BenchmarkSection benchmarks={data.benchmarks} />
        </motion.div>
      )}

      {/* Opportunity Cost */}
      {data.opportunity_cost && (
        <motion.div {...up(0.3)} className="card-linen p-4" style={{ borderColor: 'rgba(201,169,110,0.3)', background: 'rgba(201,169,110,0.04)' }}>
          <span className="label-caps block mb-2" style={{ color: '#C9A96E' }}>{t('answer.opportunityCost')}</span>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.875rem', lineHeight: 1.65, color: '#0C0C0E' }}>
            {data.opportunity_cost}
          </p>
        </motion.div>
      )}

      {/* 30 / 60 / 90 day targets + Risk */}
      <motion.div {...up(0.36)} style={{ display: 'grid', gap: '0.75rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
          {data.target30 && (
            <div className="card-linen p-4">
              <span className="label-caps block mb-2" style={{ color: '#C9A96E' }}>{t('answer.day30')}</span>
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: '#0C0C0E', lineHeight: 1.45 }}>
                {data.target30}
              </p>
            </div>
          )}
          {data.target60 && (
            <div className="card-linen p-4">
              <span className="label-caps block mb-2" style={{ color: '#A1855A' }}>{t('answer.day60')}</span>
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: '#0C0C0E', lineHeight: 1.45 }}>
                {data.target60}
              </p>
            </div>
          )}
          {data.target90 && (
            <div className="card-linen p-4">
              <span className="label-caps block mb-2" style={{ color: '#71717A' }}>{t('answer.day90')}</span>
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontStyle: 'italic', fontSize: '0.95rem', color: '#0C0C0E', lineHeight: 1.45 }}>
                {data.target90}
              </p>
            </div>
          )}
        </div>

        {data.risk && (
          <div className="card-linen p-4" style={{ borderColor: 'rgba(153,27,27,0.18)', background: 'rgba(153,27,27,0.04)' }}>
            <span className="label-caps block mb-2" style={{ color: '#991B1B' }}>{t('answer.watchOut')}</span>
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
    navy:    { background: 'rgba(12,12,14,0.06)',    color: '#0C0C0E', border: '1px solid rgba(12,12,14,0.14)',    borderRadius: '3px' },
    coastal: { background: 'rgba(201,169,110,0.08)', color: '#C9A96E', border: '1px solid rgba(201,169,110,0.25)', borderRadius: '3px' },
  }
  return (
    <span style={{ ...s[color], display: 'inline-flex', padding: '2px 10px', fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.04em' }}>
      {children}
    </span>
  )
}
