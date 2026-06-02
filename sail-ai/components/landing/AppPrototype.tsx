/**
 * components/landing/AppPrototype.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The fully interactive SAIL AI mini-app that runs inside the iPhone frame.
 * Five screens mirror the five narrative nodes — each user action advances
 * both the iPhone state and the background cinematic scene.
 *
 * Screens:
 *   1. INTRO      — Hero splash, "Begin Analysis" CTA
 *   2. DIAGNOSE   — Sector chip selector (8 sectors)
 *   3. STRATEGIZE — Three metric inputs with demo autofill
 *   4. EXECUTE    — Streaming typewriter AI analysis
 *   5. CONVERT    — Blurred strategy preview + sign-up CTA
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence }                   from 'framer-motion'
import { useNarrative, NarrativeNode, SCENES }       from './narrativeStore'

// ── Animation presets ─────────────────────────────────────────────────────────

const SLIDE_UP = {
  initial:   { opacity: 0, y: 28 },
  animate:   { opacity: 1, y: 0 },
  exit:      { opacity: 0, y: -20 },
  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
}

// ── Sectors ───────────────────────────────────────────────────────────────────

const SECTORS = [
  { id: 'ecommerce',  label: 'E-Commerce',     icon: '🛒' },
  { id: 'saas',       label: 'B2B SaaS',        icon: '⚡' },
  { id: 'retail',     label: 'Retail',          icon: '🏪' },
  { id: 'services',   label: 'Pro Services',    icon: '💼' },
  { id: 'hospitality',label: 'Hospitality',     icon: '🍽️' },
  { id: 'realestate', label: 'Real Estate',     icon: '🏢' },
  { id: 'wellness',   label: 'Wellness',        icon: '🧘' },
  { id: 'marketing',  label: 'Agency',          icon: '📊' },
]

// ── Demo streaming text ────────────────────────────────────────────────────────

const ANALYSIS_TEXT = `Your primary growth constraint is **retention**, not acquisition.

At your current churn rate, you're refilling a leaking bucket. Every new customer costs 4–6× more than retaining an existing one.

**Three precise moves:**

1. Month-1 Onboarding Audit — map every drop-off point in the first 30 days. This single action typically recovers 12–18% of churned revenue.

2. Value-Moment Acceleration — identify the feature or outcome that correlates with 90-day retention. Drive every new user to it within 72 hours.

3. Expansion Revenue Engine — your NRR has 40–60pp of headroom. A single tier upgrade flow, AB-tested over 60 days, closes most of it.

Estimated annual impact: **+£124,000** ARR from retention alone.`

// ── Screen: INTRO ─────────────────────────────────────────────────────────────

function ScreenIntro({ onNext }: { onNext: () => void }) {
  const scene = SCENES['INTRO']

  return (
    <motion.div {...SLIDE_UP}
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #040818 0%, #0C1929 100%)' }}
    >
      {/* Logo mark */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1,   opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6"
      >
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
          boxShadow: '0 0 24px rgba(20,184,166,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 4L4 24H24L14 4Z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round"/>
            <path d="M9 20H19" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2"/>
            <circle cx="14" cy="14" r="2" fill="rgba(255,255,255,0.7)"/>
          </svg>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
        style={{ color: '#14B8A6', fontSize: 10, fontFamily: 'Inter, sans-serif',
                 letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 10 }}
      >
        SAIL AI · Business Intelligence
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        style={{
          color: '#FAFAF8', fontSize: 22, fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontWeight: 600, fontStyle: 'italic', textAlign: 'center', lineHeight: 1.3, marginBottom: 10
        }}
      >
        Your business has a heading.
        <br />Is it right?
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        style={{
          color: 'rgba(161,161,170,0.9)', fontSize: 12, textAlign: 'center',
          lineHeight: 1.6, marginBottom: 32, fontFamily: 'Inter, sans-serif',
        }}
      >
        60-second business diagnosis powered by KAIROS AI.
        No login required.
      </motion.p>

      {/* Stat pills */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}
        style={{ display: 'flex', gap: 8, marginBottom: 28 }}
      >
        {['7,400+ businesses', 'Avg. +34% revenue'].map((s) => (
          <div key={s} style={{
            padding: '4px 10px', borderRadius: 100,
            background: 'rgba(20,184,166,0.10)',
            border: '1px solid rgba(20,184,166,0.25)',
            color: '#2DD4BF', fontSize: 9.5, fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.04em',
          }}>
            {s}
          </div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.85 }}
        whileTap={{ scale: 0.97 }}
        onClick={onNext}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
          background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
          color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.02em',
          boxShadow: '0 8px 24px rgba(20,184,166,0.35)',
        }}
      >
        Begin Analysis →
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.0 }}
        style={{ color: 'rgba(113,113,122,0.8)', fontSize: 10, marginTop: 12, fontFamily: 'Inter, sans-serif' }}
      >
        Takes 60 seconds · No card required
      </motion.p>
    </motion.div>
  )
}

// ── Screen: DIAGNOSE ──────────────────────────────────────────────────────────

function ScreenDiagnose({ onSelect }: { onSelect: (sector: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null)

  function handleTap(id: string) {
    setSelected(id)
    setTimeout(() => onSelect(id), 420)
  }

  return (
    <motion.div {...SLIDE_UP}
      className="absolute inset-0 flex flex-col px-5 pt-20 pb-6"
      style={{ background: 'linear-gradient(160deg, #080E20 0%, #111827 100%)' }}
    >
      <p style={{
        color: '#2DD4BF', fontSize: 9.5, fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8
      }}>
        Step 1 of 3 · Sector
      </p>
      <h2 style={{
        color: '#FAFAF8', fontSize: 18, fontFamily: 'Cormorant Garamond, Georgia, serif',
        fontWeight: 600, fontStyle: 'italic', lineHeight: 1.3, marginBottom: 20,
      }}>
        What kind of business are you running?
      </h2>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1,
      }}>
        {SECTORS.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleTap(s.id)}
            style={{
              borderRadius: 12, border: 'none', cursor: 'pointer',
              padding: '12px 8px',
              background: selected === s.id
                ? 'linear-gradient(135deg, rgba(45,212,191,0.20) 0%, rgba(20,184,166,0.12) 100%)'
                : 'rgba(255,255,255,0.04)',
              borderColor: selected === s.id ? '#2DD4BF' : 'rgba(255,255,255,0.08)',
              borderStyle: 'solid', borderWidth: 1,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <span style={{
              color: selected === s.id ? '#2DD4BF' : 'rgba(250,250,248,0.7)',
              fontSize: 10.5, fontFamily: 'Inter, sans-serif', fontWeight: 500,
              textAlign: 'center',
            }}>
              {s.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

// ── Screen: STRATEGIZE ────────────────────────────────────────────────────────

interface Metrics { revenue: string; churn: string; growth: string }

function ScreenStrategize({ sector, onAnalyze }: { sector: string; onAnalyze: (m: Metrics) => void }) {
  const [metrics, setMetrics] = useState<Metrics>({ revenue: '', churn: '', growth: '' })
  const [autofilling, setAutofilling] = useState(false)

  const sectorLabel = SECTORS.find(s => s.id === sector)?.label ?? sector

  // Demo autofill after 1.2s
  useEffect(() => {
    const t = setTimeout(() => {
      setAutofilling(true)
      setTimeout(() => setMetrics({ revenue: '£42,000', churn: '8.2%', growth: '+12%' }), 300)
      setTimeout(() => { setAutofilling(false); onAnalyze({ revenue: '£42,000', churn: '8.2%', growth: '+12%' }) }, 1800)
    }, 1200)
    return () => clearTimeout(t)
  }, [onAnalyze])

  const FIELDS: { key: keyof Metrics; label: string; placeholder: string; hint: string }[] = [
    { key: 'revenue',  label: 'Monthly Revenue',  placeholder: 'e.g. £42,000', hint: 'MRR or average monthly' },
    { key: 'churn',    label: 'Churn Rate',        placeholder: 'e.g. 8.2%',    hint: 'Monthly customer loss %' },
    { key: 'growth',   label: 'MoM Growth',        placeholder: 'e.g. +12%',    hint: 'Last 3-month average' },
  ]

  return (
    <motion.div {...SLIDE_UP}
      className="absolute inset-0 flex flex-col px-5 pt-20 pb-6"
      style={{ background: 'linear-gradient(160deg, #0A0D18 0%, #1C1830 100%)' }}
    >
      <p style={{ color: '#C9A96E', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>
        Step 2 of 3 · Metrics
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <h2 style={{
          color: '#FAFAF8', fontSize: 17, fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontWeight: 600, fontStyle: 'italic', lineHeight: 1.3, flex: 1,
        }}>
          Three numbers reveal everything.
        </h2>
        <div style={{
          padding: '3px 8px', borderRadius: 6,
          background: 'rgba(201,169,110,0.12)', border: '1px solid rgba(201,169,110,0.28)',
          color: '#C9A96E', fontSize: 9.5, fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
        }}>
          {sectorLabel}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {FIELDS.map((f, i) => (
          <motion.div
            key={f.key}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <label style={{ color: 'rgba(161,161,170,0.8)', fontSize: 10, display: 'block', marginBottom: 4, fontFamily: 'Inter, sans-serif', letterSpacing: '0.05em' }}>
              {f.label}
            </label>
            <div style={{
              position: 'relative',
              background: metrics[f.key] ? 'rgba(201,169,110,0.07)' : 'rgba(255,255,255,0.04)',
              borderRadius: 10, border: `1px solid ${metrics[f.key] ? 'rgba(201,169,110,0.35)' : 'rgba(255,255,255,0.10)'}`,
              padding: '10px 12px',
              transition: 'all 0.3s ease',
            }}>
              <span style={{
                color: metrics[f.key] ? '#D4BC8A' : 'rgba(113,113,122,0.6)',
                fontSize: 14, fontFamily: 'JetBrains Mono, monospace', fontWeight: 500,
              }}>
                {metrics[f.key] || f.placeholder}
              </span>
              {autofilling && !metrics[f.key] && (
                <span style={{
                  display: 'inline-block', width: 2, height: 14,
                  background: '#C9A96E', marginLeft: 2,
                  animation: 'blink 0.9s step-end infinite',
                }} />
              )}
            </div>
            <p style={{ color: 'rgba(113,113,122,0.6)', fontSize: 9, marginTop: 3, fontFamily: 'Inter, sans-serif' }}>
              {f.hint}
            </p>
          </motion.div>
        ))}
      </div>

      {autofilling && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, marginTop: 12,
            color: '#C9A96E', fontSize: 10.5, fontFamily: 'Inter, sans-serif',
          }}
        >
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#C9A96E',
            animation: 'drift-pulse 1s ease-in-out infinite',
          }} />
          Preparing analysis…
        </motion.div>
      )}
    </motion.div>
  )
}

// ── Screen: EXECUTE ───────────────────────────────────────────────────────────

function ScreenExecute({ onDone }: { onDone: () => void }) {
  const [text,     setText]     = useState('')
  const [done,     setDone]     = useState(false)
  const [phase,    setPhase]    = useState<'scanning' | 'typing' | 'done'>('scanning')
  const charRef = useRef(0)

  useEffect(() => {
    // Phase 1: scanning animation 1.5s
    const t1 = setTimeout(() => setPhase('typing'), 1500)
    return () => clearTimeout(t1)
  }, [])

  useEffect(() => {
    if (phase !== 'typing') return
    const raw = ANALYSIS_TEXT
    let i = 0
    const interval = setInterval(() => {
      i++
      setText(raw.slice(0, i))
      if (i >= raw.length) {
        clearInterval(interval)
        setDone(true)
        setPhase('done')
        setTimeout(onDone, 2400)
      }
    }, 14)
    return () => clearInterval(interval)
  }, [phase, onDone])

  return (
    <motion.div {...SLIDE_UP}
      className="absolute inset-0 flex flex-col"
      style={{ background: 'linear-gradient(160deg, #0C0A1A 0%, #1A1030 100%)' }}
    >
      {/* Header */}
      <div style={{
        padding: '56px 16px 12px', borderBottom: '1px solid rgba(212,188,138,0.12)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {phase === 'scanning' ? (
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4BC8A' }} />
            <span style={{ color: '#D4BC8A', fontSize: 10.5, fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em' }}>
              KAIROS ANALYZING…
            </span>
          </motion.div>
        ) : (
          <>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: done ? '#4ADE80' : '#D4BC8A' }} />
            <span style={{
              color: done ? '#4ADE80' : '#D4BC8A', fontSize: 10.5,
              fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em',
            }}>
              {done ? 'ANALYSIS COMPLETE' : 'GENERATING STRATEGY…'}
            </span>
          </>
        )}
      </div>

      {/* Scanning bars */}
      {phase === 'scanning' && (
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['Benchmarking against 7,400 businesses…', 'Cross-referencing sector data…', 'Calculating ROI projections…'].map((label, i) => (
            <motion.div key={label}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.3 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'rgba(161,161,170,0.6)', fontSize: 9.5, fontFamily: 'Inter, sans-serif' }}>{label}</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <motion.div
                  initial={{ scaleX: 0, transformOrigin: 'left' }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.3 + 0.2, duration: 0.9, ease: 'easeOut' }}
                  style={{ height: '100%', background: 'linear-gradient(90deg, #D4BC8A, #C9A96E)', borderRadius: 2 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Streaming text */}
      {phase !== 'scanning' && (
        <div style={{
          padding: '14px 16px', overflowY: 'auto', flex: 1,
          fontFamily: 'Inter, sans-serif', fontSize: 11, lineHeight: 1.7,
          color: 'rgba(250,250,248,0.85)',
        }}>
          <MarkdownText text={text} />
          {!done && <span style={{ borderRight: '1.5px solid #D4BC8A', animation: 'blink 0.9s step-end infinite', marginLeft: 1 }}>&nbsp;</span>}
        </div>
      )}
    </motion.div>
  )
}

// Simple bold/plain renderer for the **text** pattern
function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, li) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <span key={li}>
            {parts.map((p, pi) =>
              p.startsWith('**') ? (
                <strong key={pi} style={{ color: '#D4BC8A', fontWeight: 700 }}>
                  {p.slice(2, -2)}
                </strong>
              ) : p
            )}
            {'\n'}
          </span>
        )
      })}
    </>
  )
}

// ── Screen: CONVERT ───────────────────────────────────────────────────────────

function ScreenConvert() {
  return (
    <motion.div {...SLIDE_UP}
      className="absolute inset-0 flex flex-col items-center justify-between px-5 pt-16 pb-8"
      style={{ background: 'linear-gradient(160deg, #08060E 0%, #120F1E 100%)' }}
    >
      {/* Top — result indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center' }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'linear-gradient(135deg, #C9A96E 0%, #A8873E 100%)',
          margin: '0 auto 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 24px rgba(201,169,110,0.4)',
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 12L9 17L18 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <p style={{ color: '#C9A96E', fontSize: 9.5, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
          Strategy Ready
        </p>
        <h2 style={{
          color: '#FAFAF8', fontSize: 19, fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontWeight: 600, fontStyle: 'italic', lineHeight: 1.3,
        }}>
          Your precision growth plan is waiting.
        </h2>
      </motion.div>

      {/* Blurred preview card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        style={{
          width: '100%', borderRadius: 14,
          background: 'rgba(201,169,110,0.06)',
          border: '1px solid rgba(201,169,110,0.20)',
          padding: '14px',
          filter: 'blur(3px)', userSelect: 'none', pointerEvents: 'none',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {['Priority 1: Onboarding Audit', '↑ +18% retention in 30 days', 'Priority 2: Expansion Revenue', '↑ NRR from 98% → 118%', 'Priority 3: Churn Firewall'].map((line, i) => (
          <div key={i} style={{
            height: 8, borderRadius: 4, marginBottom: 10,
            background: i % 2 === 0 ? 'rgba(201,169,110,0.3)' : 'rgba(161,161,170,0.15)',
            width: ['90%', '65%', '80%', '55%', '70%'][i],
          }} />
        ))}
        {/* Lock overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(8,6,14,0.25)',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="8" width="12" height="9" rx="2" stroke="rgba(201,169,110,0.8)" strokeWidth="1.5"/>
              <path d="M6 8V5.5a3 3 0 016 0V8" stroke="rgba(201,169,110,0.8)" strokeWidth="1.5"/>
            </svg>
            <span style={{ color: 'rgba(201,169,110,0.7)', fontSize: 9, fontFamily: 'Inter, sans-serif' }}>
              Sign in to unlock
            </span>
          </div>
        </div>
      </motion.div>

      {/* Impact line */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
        style={{
          textAlign: 'center', padding: '12px', borderRadius: 12,
          background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.18)',
          width: '100%',
        }}
      >
        <p style={{ color: '#4ADE80', fontSize: 11.5, fontFamily: 'Inter, sans-serif', fontWeight: 600, marginBottom: 2 }}>
          Projected uplift: +£124,000 / yr
        </p>
        <p style={{ color: 'rgba(161,161,170,0.6)', fontSize: 9.5, fontFamily: 'Inter, sans-serif' }}>
          Based on sector benchmarks for your profile
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.85 }}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <a
          href="/login"
          style={{
            display: 'block', width: '100%', padding: '14px 0',
            borderRadius: 14, textAlign: 'center', textDecoration: 'none',
            background: 'linear-gradient(135deg, #C9A96E 0%, #A8873E 100%)',
            color: '#fff', fontSize: 13.5, fontWeight: 700, fontFamily: 'Inter, sans-serif',
            boxShadow: '0 8px 24px rgba(201,169,110,0.35)',
          }}
        >
          Save My Strategy →
        </a>
        <p style={{ color: 'rgba(113,113,122,0.6)', fontSize: 9.5, textAlign: 'center', fontFamily: 'Inter, sans-serif' }}>
          Free account · No card · Your data stays yours
        </p>
      </motion.div>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function AppPrototype() {
  const { node, advance } = useNarrative()
  const [sector, setSector] = useState<string>('')

  // Fire video gen API (non-blocking) on each advance
  async function triggerVideoGen(nextNode: NarrativeNode) {
    try {
      const res = await fetch('/api/video-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node: nextNode }),
      })
      if (res.ok) {
        const { generationId } = await res.json()
        if (generationId) pollVideo(generationId, nextNode)
      }
    } catch { /* non-critical — WebGL fallback always active */ }
  }

  async function pollVideo(id: string, targetNode: NarrativeNode) {
    const { setVideoUrl } = useNarrative.getState()
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(r => setTimeout(r, 5000))
      try {
        const res = await fetch(`/api/video-gen?id=${id}`)
        if (!res.ok) break
        const data = await res.json()
        if (data.url) { setVideoUrl(data.url); break }
        if (data.status === 'failed') break
      } catch { break }
    }
  }

  function go(to: NarrativeNode) {
    advance(to)
    triggerVideoGen(to)
  }

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {node === 'INTRO' && (
          <ScreenIntro key="intro" onNext={() => go('DIAGNOSE')} />
        )}
        {node === 'DIAGNOSE' && (
          <ScreenDiagnose key="diagnose" onSelect={(s) => { setSector(s); go('STRATEGIZE') }} />
        )}
        {node === 'STRATEGIZE' && (
          <ScreenStrategize key="strategize" sector={sector} onAnalyze={() => go('EXECUTE')} />
        )}
        {node === 'EXECUTE' && (
          <ScreenExecute key="execute" onDone={() => go('CONVERT')} />
        )}
        {node === 'CONVERT' && (
          <ScreenConvert key="convert" />
        )}
      </AnimatePresence>
    </div>
  )
}
