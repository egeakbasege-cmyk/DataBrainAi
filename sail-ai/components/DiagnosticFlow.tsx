'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  type DiagnosticInput,
  type DiagnosticResult,
  calculateDiagnostic,
  INDUSTRY_BENCHMARKS,
  EMPTY_DIAGNOSTIC,
} from '@/lib/diagnostic'
import { useBusinessContext } from '@/lib/context/BusinessContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  'E-commerce', 'SaaS / Software', 'Agency / Consulting', 'Retail',
  'Hospitality', 'Professional Services', 'Healthcare', 'Other',
]
const TEAM_SIZES    = ['Solo', '2–5', '6–20', '21–50', '50+']
const REVENUE_RANGES = ['Under £50K', '£50K–£200K', '£200K–£1M', '£1M–£5M', 'Over £5M']
const OBSTACLES     = [
  'Lead Generation', 'Cash Flow', 'Operational Efficiency',
  'Customer Retention', 'Team & Talent', 'Product Quality',
]
const TOTAL_SCREENS = 5   // question screens before the result
const CIRC = 2 * Math.PI * 46

// ─── Slide variants ───────────────────────────────────────────────────────────

const makeVariants = (dir: 1 | -1) => ({
  initial:  { opacity: 0, x: dir * 40 },
  animate:  { opacity: 1, x: 0,       transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } },
  exit:     { opacity: 0, x: dir * -40, transition: { duration: 0.2 } },
})

// ─── Shared primitives ────────────────────────────────────────────────────────

const T = {
  label: {
    fontFamily:    'Inter, sans-serif',
    fontSize:      '0.65rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color:         '#C9A96E',
    marginBottom:  '0.5rem',
    display:       'block',
  },
  heading: {
    fontFamily:    'Cormorant Garamond, Georgia, serif',
    fontStyle:     'italic' as const,
    fontWeight:    600,
    fontSize:      'clamp(1.5rem, 4vw, 2rem)',
    color:         '#0C0C0E',
    lineHeight:    1.2,
    letterSpacing: '-0.01em',
    margin:        0,
  },
  sub: {
    fontFamily: 'Inter, sans-serif',
    fontSize:   '0.85rem',
    color:      '#71717A',
    marginTop:  '0.5rem',
    lineHeight: 1.5,
  },
  small: {
    fontFamily: 'Inter, sans-serif',
    fontSize:   '0.72rem',
    color:      '#A1A1AA',
    letterSpacing: '0.04em',
  },
}

function Tile({ label, selected, onClick, wide }: {
  label: string; selected: boolean; onClick: () => void; wide?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding:    wide ? '0.75rem 1.25rem' : '0.875rem 1rem',
        textAlign:  'left',
        border:     `1px solid ${selected ? 'rgba(201,169,110,0.65)' : 'rgba(12,12,14,0.1)'}`,
        background: selected ? 'rgba(201,169,110,0.07)' : '#FFFFFF',
        cursor:     'pointer',
        transition: 'all 0.14s',
        fontFamily: 'Inter, sans-serif',
        fontSize:   '0.875rem',
        fontWeight: selected ? 500 : 400,
        color:      selected ? '#0C0C0E' : '#71717A',
        width:      '100%',
        boxSizing:  'border-box' as const,
      }}
    >
      {label}
    </button>
  )
}

function RangeSlider({ value, min, max, onChange, formatLabel, hint }: {
  value: number; min: number; max: number
  onChange: (v: number) => void
  formatLabel: (v: number) => string
  hint?: string
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <span style={{
          fontFamily:    'Cormorant Garamond, Georgia, serif',
          fontSize:      'clamp(2rem, 7vw, 3rem)',
          fontWeight:    600,
          color:         '#0C0C0E',
          lineHeight:    1,
          letterSpacing: '-0.02em',
        }}>
          {formatLabel(value)}
        </span>
        {hint && <span style={T.small}>{hint}</span>}
      </div>

      <div style={{ position: 'relative', paddingBlock: '8px' }}>
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0,
          height: '2px', background: 'rgba(12,12,14,0.08)',
          transform: 'translateY(-50%)',
        }}>
          <div style={{ height: '100%', background: '#C9A96E', width: `${pct}%`, transition: 'width 0.05s' }} />
        </div>
        <input
          type="range" min={min} max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'relative', width: '100%', zIndex: 1,
            appearance: 'none', WebkitAppearance: 'none',
            background: 'transparent', cursor: 'pointer',
            outline: 'none', height: '20px',
          }}
        />
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: #FAFAF8; border: 1.5px solid #0C0C0E;
          box-shadow: 0 1px 4px rgba(0,0,0,0.12); cursor: pointer;
        }
        input[type=range]:active::-webkit-slider-thumb {
          border-color: #C9A96E; box-shadow: 0 0 0 5px rgba(201,169,110,0.14);
        }
        input[type=range]::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: #FAFAF8; border: 1.5px solid #0C0C0E; cursor: pointer;
        }
      `}</style>
    </div>
  )
}

// ─── Step screens ─────────────────────────────────────────────────────────────

function StepIndustry({ data, update }: { data: DiagnosticInput; update: (k: keyof DiagnosticInput, v: any) => void }) {
  return (
    <div>
      <p style={T.label}>Step 1 of 4 — The Basics</p>
      <h2 style={T.heading}>What is your primary industry?</h2>
      <p style={T.sub}>We calibrate every benchmark and projection to your sector.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '1.75rem' }}>
        {INDUSTRIES.map(ind => (
          <Tile key={ind} label={ind} selected={data.industry === ind} onClick={() => update('industry', ind)} />
        ))}
      </div>
    </div>
  )
}

function StepTeamSize({ data, update }: { data: DiagnosticInput; update: (k: keyof DiagnosticInput, v: any) => void }) {
  return (
    <div>
      <p style={T.label}>Step 1 of 4 — The Basics</p>
      <h2 style={T.heading}>How large is your team?</h2>
      <p style={T.sub}>Include full-time, part-time, and regular contractors.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.75rem' }}>
        {TEAM_SIZES.map(size => (
          <Tile key={size} label={size} wide selected={data.teamSize === size} onClick={() => update('teamSize', size)} />
        ))}
      </div>
    </div>
  )
}

function StepFinancials({ data, update }: { data: DiagnosticInput; update: (k: keyof DiagnosticInput, v: any) => void }) {
  return (
    <div>
      <p style={T.label}>Step 2 of 4 — The Financials</p>
      <h2 style={T.heading}>Revenue and profitability.</h2>
      <p style={T.sub}>Approximate figures are fine — we need order-of-magnitude context.</p>

      <div style={{ marginTop: '1.75rem' }}>
        <p style={{ ...T.small, marginBottom: '0.625rem' }}>Annual revenue</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          {REVENUE_RANGES.map(r => (
            <Tile key={r} label={r} wide selected={data.revenue === r} onClick={() => update('revenue', r)} />
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: '2rem', padding: '1.25rem',
          background: 'rgba(12,12,14,0.025)', border: '1px solid rgba(12,12,14,0.07)',
        }}
      >
        <p style={{ ...T.small, marginBottom: '0.25rem' }}>Estimated net profit margin</p>
        <RangeSlider
          value={data.margin} min={0} max={50} hint="% net margin"
          onChange={v => update('margin', v)}
          formatLabel={v => v >= 50 ? '50%+' : `${v}%`}
        />
        {data.industry && (
          <p style={{ ...T.small, marginTop: '0.5rem', color: '#C9A96E' }}>
            {(() => {
              const b = INDUSTRY_BENCHMARKS[data.industry]
              return `${data.industry} benchmark: ${b.low}–${b.high}%`
            })()}
          </p>
        )}
      </div>
    </div>
  )
}

function StepCashReserves({ data, update }: { data: DiagnosticInput; update: (k: keyof DiagnosticInput, v: any) => void }) {
  const months = data.cashReserves
  const health =
    months < 1  ? { label: 'Critical',    color: '#991B1B' } :
    months < 3  ? { label: 'Vulnerable',  color: '#B45309' } :
    months < 6  ? { label: 'Moderate',    color: '#0C0C0E' } :
    months < 9  ? { label: 'Healthy',     color: '#1A5276' } :
                  { label: 'Strong',      color: '#C9A96E' }

  return (
    <div>
      <p style={T.label}>Step 3 of 4 — The Growth</p>
      <h2 style={T.heading}>How much cash runway do you carry?</h2>
      <p style={T.sub}>Months of operating expenses currently held in liquid reserves.</p>

      <div style={{ marginTop: '2rem' }}>
        <RangeSlider
          value={months} min={0} max={12}
          onChange={v => update('cashReserves', v)}
          formatLabel={v => v >= 12 ? '12+ mo' : `${v} mo`}
          hint="months of reserves"
        />
        <div style={{
          marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.625rem',
          padding: '0.75rem', background: 'rgba(12,12,14,0.025)', border: '1px solid rgba(12,12,14,0.07)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: health.color, flexShrink: 0 }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#0C0C0E', fontWeight: 500 }}>
            {health.label}
          </span>
          <span style={T.small}>
            — Global advisory firms recommend a minimum 6-month reserve floor.
          </span>
        </div>
      </div>
    </div>
  )
}

function StepObstacle({ data, update }: { data: DiagnosticInput; update: (k: keyof DiagnosticInput, v: any) => void }) {
  return (
    <div>
      <p style={T.label}>Step 4 of 4 — The Obstacle</p>
      <h2 style={T.heading}>What's your single biggest growth bottleneck?</h2>
      <p style={T.sub}>The AI will prioritise this constraint in every recommendation it gives you.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '1.75rem' }}>
        {OBSTACLES.map(obs => (
          <Tile key={obs} label={obs} selected={data.obstacle === obs} onClick={() => update('obstacle', obs)} />
        ))}
      </div>
    </div>
  )
}

// ─── Result screen ────────────────────────────────────────────────────────────

const BREAKDOWN_META = [
  { key: 'profitability' as const, label: 'Profitability', max: 30 },
  { key: 'liquidity'     as const, label: 'Liquidity',     max: 25 },
  { key: 'scale'         as const, label: 'Scale',         max: 25 },
  { key: 'resilience'    as const, label: 'Resilience',    max: 20 },
]

function useCountUp(target: number) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const dur = 1300, delay = 350
    let raf: number
    const t0 = Date.now() + delay
    const tick = () => {
      const elapsed = Math.max(0, Date.now() - t0)
      const p = Math.min(elapsed / dur, 1)
      setN(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return n
}

function ResultScreen({ result, onConfirm }: { result: DiagnosticResult; onConfirm: () => void }) {
  const displayed = useCountUp(result.score)
  const offset    = CIRC * (1 - result.score / 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Score + grade */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(12,12,14,0.07)" strokeWidth="7" />
            <motion.circle
              cx="60" cy="60" r="46" fill="none"
              stroke={result.gradeColor} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={CIRC}
              initial={{ strokeDashoffset: CIRC }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.2 }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              fontFamily:    'Cormorant Garamond, Georgia, serif',
              fontSize:      '1.75rem',
              fontWeight:    600,
              color:         '#0C0C0E',
              lineHeight:    1,
              letterSpacing: '-0.02em',
            }}>
              {displayed}
            </span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: '#A1A1AA', letterSpacing: '0.06em' }}>
              / 100
            </span>
          </div>
        </div>

        <div>
          <p style={T.label}>Business Health Score</p>
          <h2 style={{ ...T.heading, fontSize: 'clamp(1.6rem, 5vw, 2.2rem)' }}>
            {result.grade}
          </h2>
          <p style={{ ...T.sub, fontSize: '0.78rem', marginTop: '0.375rem' }}>
            Based on profitability, liquidity,<br />scale, and organisational resilience.
          </p>
        </div>
      </div>

      {/* Breakdown bars */}
      <div style={{
        padding: '1.25rem', border: '1px solid rgba(12,12,14,0.08)',
        background: '#FFFFFF', marginBottom: '1rem',
      }}>
        {BREAKDOWN_META.map(({ key, label, max }, i) => {
          const pct = Math.round((result.breakdown[key] / max) * 100)
          return (
            <div key={key} style={{ marginBottom: i < BREAKDOWN_META.length - 1 ? '1rem' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#71717A' }}>{label}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#0C0C0E', fontWeight: 500 }}>{result.breakdown[key]}<span style={{ color: '#A1A1AA' }}>/{max}</span></span>
              </div>
              <div style={{ height: 3, background: 'rgba(12,12,14,0.07)' }}>
                <motion.div
                  style={{ height: '100%', background: result.gradeColor }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 + i * 0.1 }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Insights */}
      <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1.75rem' }}>
        <InsightBox icon="margin" text={result.marginInsight} />
        <InsightBox icon="cash"   text={result.cashInsight}   />
      </div>

      {/* CTA */}
      <button
        onClick={onConfirm}
        className="btn-primary"
        style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem', letterSpacing: '0.09em', padding: '0.9rem' }}
      >
        Chart My Course →
      </button>
      <p style={{ ...T.small, textAlign: 'center', marginTop: '0.75rem' }}>
        Your diagnostic will be pre-loaded into the AI
      </p>
    </motion.div>
  )
}

function InsightBox({ icon, text }: { icon: 'margin' | 'cash'; text: string }) {
  return (
    <div style={{
      padding:    '0.875rem 1rem',
      background: '#FFFFFF',
      border:     '1px solid rgba(12,12,14,0.08)',
      display:    'flex',
      gap:        '0.75rem',
      alignItems: 'flex-start',
    }}>
      <span style={{ color: '#C9A96E', flexShrink: 0, marginTop: '1px', lineHeight: 1 }}>
        {icon === 'margin' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="2" y="7" width="20" height="14" rx="1" />
            <path d="M16 7V5a2 2 0 0 0-4 0v2" />
          </svg>
        )}
      </span>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#71717A', lineHeight: 1.55, margin: 0 }}>
        {text}
      </p>
    </div>
  )
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

const SCREENS = [
  { key: 'industry',  canProceed: (d: DiagnosticInput) => !!d.industry },
  { key: 'teamSize',  canProceed: (d: DiagnosticInput) => !!d.teamSize },
  { key: 'financials',canProceed: (d: DiagnosticInput) => !!d.revenue },
  { key: 'cash',      canProceed: () => true },
  { key: 'obstacle',  canProceed: (d: DiagnosticInput) => !!d.obstacle },
]

export function DiagnosticFlow() {
  const router = useRouter()
  const { setDiagnostic } = useBusinessContext()
  const [screen,    setScreen]    = useState(0)
  const [direction, setDirection] = useState<1 | -1>(1)
  const [data,      setData]      = useState<DiagnosticInput>(EMPTY_DIAGNOSTIC)
  const [result,    setResult]    = useState<DiagnosticResult | null>(null)

  const update = (key: keyof DiagnosticInput, value: any) =>
    setData(prev => ({ ...prev, [key]: value }))

  const goTo = (next: number) => {
    setDirection(next > screen ? 1 : -1)
    setScreen(next)
  }

  function handleContinue() {
    if (screen < SCREENS.length - 1) {
      goTo(screen + 1)
    } else {
      // All questions answered — compute result
      const r = calculateDiagnostic(data)
      setResult(r)
      setDirection(1)
      setScreen(SCREENS.length)   // result screen index
    }
  }

  function handleConfirm() {
    if (!result) return
    setDiagnostic(data, result.systemPrompt)
    router.push('/chat')
  }

  const progress = result ? 1 : screen / TOTAL_SCREENS
  const canProceed = screen < SCREENS.length && SCREENS[screen].canProceed(data)
  const variants   = makeVariants(direction)
  const isResult   = screen === SCREENS.length

  return (
    <main style={{
      minHeight:  '100vh',
      background: '#FAFAF8',
      display:    'flex',
      flexDirection: 'column',
    }}>
      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(12,12,14,0.07)', flexShrink: 0 }}>
        <motion.div
          style={{ height: '100%', background: '#C9A96E' }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Step dots */}
      {!isResult && (
        <div style={{
          display:        'flex',
          justifyContent: 'center',
          gap:            '6px',
          paddingBlock:   '1.25rem',
          flexShrink:     0,
        }}>
          {SCREENS.map((_, i) => (
            <div
              key={i}
              style={{
                width:     i === screen ? 20 : 6,
                height:    6,
                background: i <= screen ? '#C9A96E' : 'rgba(12,12,14,0.12)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{
        flex:      1,
        maxWidth:  '560px',
        width:     '100%',
        margin:    '0 auto',
        padding:   '1.5rem 1.25rem 8rem',
        boxSizing: 'border-box',
      }}>
        <AnimatePresence mode="wait">
          <motion.div key={screen} {...variants}>
            {isResult && result ? (
              <>
                <p style={T.label}>Diagnostic Complete</p>
                <h2 style={{ ...T.heading, marginBottom: '1.75rem' }}>Your Business Health Report.</h2>
                <ResultScreen result={result} onConfirm={handleConfirm} />
              </>
            ) : screen === 0 ? <StepIndustry    data={data} update={update} />
            : screen === 1 ? <StepTeamSize      data={data} update={update} />
            : screen === 2 ? <StepFinancials    data={data} update={update} />
            : screen === 3 ? <StepCashReserves  data={data} update={update} />
            :                <StepObstacle      data={data} update={update} />
            }
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {!isResult && (
        <div style={{
          position:   'fixed',
          bottom:     0,
          left:       0,
          right:      0,
          background: 'rgba(250,250,248,0.92)',
          backdropFilter:       'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop:  '1px solid rgba(12,12,14,0.08)',
          padding:    '1rem 1.25rem',
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap:        '1rem',
          zIndex:     20,
        }}>
          <button
            type="button"
            onClick={() => goTo(screen - 1)}
            disabled={screen === 0}
            style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:      '0.75rem',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color:         screen === 0 ? '#D0D0D0' : '#71717A',
              background:    'none',
              border:        'none',
              cursor:        screen === 0 ? 'default' : 'pointer',
              padding:       '0.5rem 0',
            }}
          >
            ← Back
          </button>

          <div style={{ flex: 1, maxWidth: '320px' }}>
            <button
              type="button"
              onClick={handleContinue}
              disabled={!canProceed}
              className="btn-primary"
              style={{
                width:          '100%',
                justifyContent: 'center',
                fontSize:       '0.75rem',
                letterSpacing:  '0.09em',
                opacity:        canProceed ? 1 : 0.35,
                cursor:         canProceed ? 'pointer' : 'not-allowed',
              }}
            >
              {screen === SCREENS.length - 1 ? 'Run Diagnostic →' : 'Continue →'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
