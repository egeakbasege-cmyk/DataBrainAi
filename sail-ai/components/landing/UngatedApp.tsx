/**
 * components/landing/UngatedApp.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * The fully interactive, zero-gate SAIL AI prototype that runs inside the
 * iPhone frame on the Portofino landing page.
 *
 * Design principles:
 *   • No login wall — first interaction is immediate value delivery
 *   • No pop-ups, no lead-gen forms, no "email us" prompts
 *   • Each user action propels the sailboat forward through Portofino harbor
 *   • The AI's quality IS the retention mechanism
 *
 * Flow: INTRO → SECTOR → METRICS → ANALYSIS (streaming) → STRATEGY
 * Palette: midnight navy, champagne gold (#C49A3C), tiffany mint, silica white
 */
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence }                   from 'framer-motion'
import { useNarrative }                              from './narrativeStore'

// ── Colour tokens (matches page palette exactly) ──────────────────────────────

const C = {
  navy:        '#0A1628',
  navyMid:     '#0F1F38',
  navyLight:   '#162844',
  gold:        '#C49A3C',
  goldBright:  '#D4B060',
  goldDim:     '#A07E28',
  tiffany:     '#14B8A6',
  tiffanyDim:  '#0D9488',
  white:       '#FAFAF8',
  silver:      '#A1A1AA',
  dim:         'rgba(161,161,170,0.5)',
  glass:       'rgba(10,22,40,0.85)',
  glassEdge:   'rgba(196,154,60,0.20)',
  green:       '#4ADE80',
}

// ── Framer Motion presets ─────────────────────────────────────────────────────

const RISE = {
  initial:    { opacity: 0, y: 22 },
  animate:    { opacity: 1, y: 0  },
  exit:       { opacity: 0, y: -14 },
  transition: { duration: 0.44, ease: [0.22, 1, 0.36, 1] },
}

// ── Sectors ───────────────────────────────────────────────────────────────────

const SECTORS = [
  { id: 'ecommerce',   label: 'E-Commerce',   icon: '🛍️' },
  { id: 'saas',        label: 'B2B SaaS',     icon: '⚡' },
  { id: 'retail',      label: 'Retail',       icon: '🏪' },
  { id: 'services',    label: 'Pro Services', icon: '💼' },
  { id: 'hospitality', label: 'Hospitality',  icon: '🍽️' },
  { id: 'realestate',  label: 'Real Estate',  icon: '🏢' },
  { id: 'wellness',    label: 'Wellness',     icon: '🧘' },
  { id: 'agency',      label: 'Agency',       icon: '📊' },
]

// ── Streaming analysis text (sector-personalised, shows real insight quality) ─

const ANALYSIS: Record<string, string> = {
  ecommerce: `Your checkout abandonment rate is your primary lever.

Industry median: **70.2%** abandonment (Baymard 2024). At your scale, recovering 8pp generates £1 in £7 of lost revenue — with zero new traffic spend.

**Three precision moves:**

1. **Single-page checkout audit** — reduce form fields from the industry average of 11 to 6 or fewer. Recovers 12–18% of abandonments alone.

2. **72-hour recovery sequence** — one email at 1h, one SMS at 24h, one retargeting impression at 72h. Average recovery rate: 10–14% of abandoned carts.

3. **Trust signal placement** — SSL badge + returns policy above the fold at checkout. Tested to increase completion by 8–11% in the £30–£150 basket range.

Projected annual impact: **+£68,000** assuming £240k current abandonment value.`,

  saas: `Your churn rate is compounding against you silently.

At Month-1 churn of 8.2%, you refill 100% of your customer base every 13 months — paying acquisition cost twice per customer lifetime. The fix is not a feature; it's a timing intervention.

**Three precision moves:**

1. **Value-moment identification** — find the single product action that correlates with 90-day retention. Drive every new user there within 72 hours of signup. Average retention improvement: +22pp.

2. **Onboarding call trigger** — automatically flag any user who hasn't hit the value-moment by Day 5. One proactive outreach call converts 35–40% of these users to active.

3. **Expansion revenue engine** — at your NRR baseline, adding one upgrade trigger (usage-based or feature-based) within the product adds £18–28k ARR without a single new customer.

Projected net impact: **+£124,000** ARR from retention improvement alone.`,

  default: `Your highest-leverage constraint is hiding in your unit economics.

Most businesses optimise for revenue. The businesses that compound optimise for **margin × retention** — a fundamentally different equation.

**Three precision moves:**

1. **Margin archaeology** — identify your top 20% of customers by gross margin contribution (not revenue). This cohort almost always deserves a different retention and pricing strategy.

2. **Pricing architecture** — adding a premium tier priced 25–30% above your current ceiling captures 10–15% of existing customers willing to pay more. No new acquisition required.

3. **Referral velocity** — structured referral programs in your sector generate 18–22% of new business from existing customers, with a payback period under 45 days.

Projected annual impact: **+£85,000** from pricing + referral combined.`,
}

// ── Screen 1: Intro ───────────────────────────────────────────────────────────

function ScreenIntro({ onStart }: { onStart: () => void }) {
  return (
    <motion.div {...RISE} key="intro"
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '0 22px',
        background: `linear-gradient(160deg, ${C.navy} 0%, ${C.navyMid} 100%)`,
      }}
    >
      {/* Logo mark */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{
          width: 54, height: 54, borderRadius: 15,
          background: `linear-gradient(135deg, ${C.tiffany} 0%, ${C.tiffanyDim} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 18,
          boxShadow: `0 0 28px ${C.tiffany}55`,
        }}>
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path d="M13 3L3 23H23L13 3Z" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
            <path d="M8 19H18" stroke="rgba(255,255,255,0.45)" strokeWidth="1.1"/>
            <circle cx="13" cy="13" r="2" fill="rgba(255,255,255,0.65)"/>
          </svg>
        </div>
      </motion.div>

      <motion.span
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
        style={{ color: C.tiffany, fontSize: 9.5, letterSpacing: '0.20em', textTransform: 'uppercase',
                 fontFamily: 'var(--font-inter), sans-serif', marginBottom: 12 }}
      >
        SAIL AI · Business Intelligence
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        style={{
          color: C.white, fontSize: 21, fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontWeight: 600, fontStyle: 'italic', textAlign: 'center',
          lineHeight: 1.28, marginBottom: 14,
        }}
      >
        Your strategy, distilled in 60 seconds.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.52 }}
        style={{
          color: C.dim, fontSize: 12, textAlign: 'center', lineHeight: 1.7,
          marginBottom: 30, fontFamily: 'var(--font-inter), sans-serif',
        }}
      >
        No account. No form. Just precision insight, immediately.
      </motion.p>

      {/* Social proof */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }}
        style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap', justifyContent: 'center' }}
      >
        {['7,400+ diagnosed', 'Avg +34% revenue', 'Used in 38 countries'].map(s => (
          <span key={s} style={{
            padding: '3px 9px', borderRadius: 100,
            background: `rgba(20,184,166,0.10)`, border: `1px solid ${C.tiffany}30`,
            color: C.tiffany, fontSize: 9, fontFamily: 'var(--font-inter), sans-serif', letterSpacing: '0.03em',
          }}>
            {s}
          </span>
        ))}
      </motion.div>

      <motion.button
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.78 }}
        whileTap={{ scale: 0.96 }}
        onClick={onStart}
        style={{
          width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-inter), sans-serif', fontSize: 14,
          fontWeight: 700, color: C.navy,
          background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldBright} 100%)`,
          boxShadow: `0 8px 24px ${C.gold}45`,
          letterSpacing: '0.02em',
        }}
      >
        Begin Free Diagnosis →
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
        style={{ color: 'rgba(113,113,122,0.55)', fontSize: 9.5, marginTop: 10,
                 fontFamily: 'var(--font-inter), sans-serif' }}
      >
        Takes 60 seconds · No card · Your data is private
      </motion.p>
    </motion.div>
  )
}

// ── Screen 2: Sector ──────────────────────────────────────────────────────────

function ScreenSector({ onSelect }: { onSelect: (s: string) => void }) {
  const [chosen, setChosen] = useState<string | null>(null)

  function pick(id: string) {
    setChosen(id)
    setTimeout(() => onSelect(id), 380)
  }

  return (
    <motion.div {...RISE} key="sector"
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        padding: '64px 16px 16px',
        background: `linear-gradient(160deg, ${C.navyMid} 0%, ${C.navyLight} 100%)`,
      }}
    >
      <span style={{ color: C.gold, fontSize: 9.5, letterSpacing: '0.18em',
                     textTransform: 'uppercase', fontFamily: 'var(--font-inter), sans-serif', marginBottom: 6 }}>
        Step 1 of 3
      </span>
      <h2 style={{
        color: C.white, fontSize: 17, fontFamily: 'var(--font-cormorant), Georgia, serif',
        fontWeight: 600, fontStyle: 'italic', marginBottom: 18, lineHeight: 1.3,
      }}>
        What kind of business?
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1 }}>
        {SECTORS.map((s, i) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.055 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => pick(s.id)}
            style={{
              borderRadius: 12, border: 'none', cursor: 'pointer', padding: '12px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              background: chosen === s.id
                ? `rgba(196,154,60,0.16)`
                : `rgba(255,255,255,0.04)`,
              borderColor: chosen === s.id ? C.gold : `rgba(255,255,255,0.08)`,
              borderStyle: 'solid', borderWidth: 1,
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <span style={{
              color: chosen === s.id ? C.goldBright : 'rgba(250,250,248,0.65)',
              fontSize: 10, fontFamily: 'var(--font-inter), sans-serif', fontWeight: 500,
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

// ── Screen 3: Metrics ─────────────────────────────────────────────────────────

const DEMO_METRICS = { revenue: '£42,000', churn: '8.2%', growth: '+12%' }

function ScreenMetrics({ sector, onAnalyze }: { sector: string; onAnalyze: () => void }) {
  const [vals,  setVals]  = useState({ revenue: '', churn: '', growth: '' })
  const [phase, setPhase] = useState<'idle' | 'filling' | 'ready'>('idle')

  const sLabel = SECTORS.find(s => s.id === sector)?.label ?? sector

  // Demo autofill — shows capability without requiring user input
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('filling'), 800)
    const t2 = setTimeout(() => {
      setVals(DEMO_METRICS)
      setPhase('ready')
    }, 1800)
    const t3 = setTimeout(onAnalyze, 2800)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onAnalyze])

  const FIELDS = [
    { key: 'revenue' as const, label: 'Monthly Revenue',  ph: 'e.g. £42,000', hint: 'MRR or monthly avg' },
    { key: 'churn'   as const, label: 'Churn Rate',       ph: 'e.g. 8.2%',    hint: 'Monthly customer loss %' },
    { key: 'growth'  as const, label: 'MoM Growth Rate',  ph: 'e.g. +12%',    hint: '3-month average' },
  ]

  return (
    <motion.div {...RISE} key="metrics"
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        padding: '64px 18px 18px',
        background: `linear-gradient(160deg, ${C.navyLight} 0%, #1C1A2E 100%)`,
      }}
    >
      <span style={{ color: C.gold, fontSize: 9.5, letterSpacing: '0.18em',
                     textTransform: 'uppercase', fontFamily: 'var(--font-inter), sans-serif', marginBottom: 6 }}>
        Step 2 of 3
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <h2 style={{
          color: C.white, fontSize: 16, fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontWeight: 600, fontStyle: 'italic', lineHeight: 1.3, flex: 1,
        }}>
          Three numbers reveal everything.
        </h2>
        <span style={{
          padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap',
          background: `rgba(196,154,60,0.12)`, border: `1px solid ${C.gold}30`,
          color: C.gold, fontSize: 9, fontFamily: 'var(--font-inter), sans-serif',
        }}>
          {sLabel}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {FIELDS.map((f, i) => (
          <motion.div key={f.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.10 }}>
            <label style={{
              color: C.dim, fontSize: 9.5, display: 'block', marginBottom: 4,
              fontFamily: 'var(--font-inter), sans-serif', letterSpacing: '0.05em',
            }}>
              {f.label}
            </label>
            <div style={{
              position: 'relative', borderRadius: 10, padding: '10px 12px',
              background: vals[f.key] ? `rgba(196,154,60,0.07)` : `rgba(255,255,255,0.04)`,
              border: `1px solid ${vals[f.key] ? C.gold + '38' : 'rgba(255,255,255,0.08)'}`,
              transition: 'all 0.3s ease',
            }}>
              <span style={{
                color: vals[f.key] ? C.goldBright : 'rgba(113,113,122,0.5)',
                fontSize: 14, fontFamily: 'var(--font-mono), Menlo, monospace',
              }}>
                {vals[f.key] || f.ph}
              </span>
              {phase === 'filling' && !vals[f.key] && (
                <span style={{
                  display: 'inline-block', width: 2, height: 13, background: C.gold,
                  marginLeft: 2, animation: 'blink 0.9s step-end infinite',
                  verticalAlign: 'middle',
                }} />
              )}
            </div>
            <p style={{ color: 'rgba(113,113,122,0.45)', fontSize: 9, marginTop: 3,
                        fontFamily: 'var(--font-inter), sans-serif' }}>
              {f.hint}
            </p>
          </motion.div>
        ))}
      </div>

      {phase === 'filling' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 18,
                   color: C.gold, fontSize: 10.5, fontFamily: 'var(--font-inter), sans-serif' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold,
                        animation: 'drift-pulse 1s ease-in-out infinite' }} />
          Preparing KAIROS analysis…
        </motion.div>
      )}
    </motion.div>
  )
}

// ── Screen 4: Analysis (streaming) ───────────────────────────────────────────

function ScreenAnalysis({ sector, onDone }: { sector: string; onDone: () => void }) {
  const [text,    setText]    = useState('')
  const [phase,   setPhase]   = useState<'scanning' | 'streaming' | 'done'>('scanning')
  const rawText = ANALYSIS[sector] ?? ANALYSIS.default

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('streaming'), 1600)
    return () => clearTimeout(t1)
  }, [])

  useEffect(() => {
    if (phase !== 'streaming') return
    let i = 0
    const iv = setInterval(() => {
      i += 2
      setText(rawText.slice(0, i))
      if (i >= rawText.length) {
        clearInterval(iv)
        setPhase('done')
        setTimeout(onDone, 2200)
      }
    }, 11)
    return () => clearInterval(iv)
  }, [phase, rawText, onDone])

  return (
    <motion.div {...RISE} key="analysis"
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        background: `linear-gradient(160deg, #0C0A1E 0%, #1A1030 100%)`,
      }}
    >
      {/* Status bar */}
      <div style={{
        padding: '52px 16px 12px', borderBottom: `1px solid rgba(196,154,60,0.12)`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <motion.div
          animate={{ opacity: phase === 'scanning' ? [1, 0.3, 1] : 1 }}
          transition={{ duration: 0.8, repeat: phase === 'scanning' ? Infinity : 0 }}
          style={{ width: 6, height: 6, borderRadius: '50%',
                   background: phase === 'done' ? C.green : C.gold }}
        />
        <span style={{
          color: phase === 'done' ? C.green : C.gold, fontSize: 10,
          fontFamily: 'var(--font-inter), sans-serif', letterSpacing: '0.10em', textTransform: 'uppercase',
        }}>
          {phase === 'scanning' ? 'KAIROS ANALYZING…' : phase === 'streaming' ? 'GENERATING STRATEGY…' : 'COMPLETE'}
        </span>
      </div>

      {/* Scanning state */}
      {phase === 'scanning' && (
        <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            'Benchmarking across 7,400 profiles…',
            'Cross-referencing sector data…',
            'Calculating ROI projections…',
          ].map((label, i) => (
            <motion.div key={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              transition={{ delay: i * 0.35 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: C.dim, fontSize: 9.5, fontFamily: 'var(--font-inter), sans-serif' }}>{label}</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: `rgba(255,255,255,0.06)`, overflow: 'hidden' }}>
                <motion.div
                  initial={{ scaleX: 0, transformOrigin: 'left' }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: i * 0.35 + 0.15, duration: 0.85, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 2,
                           background: `linear-gradient(90deg, ${C.gold}, ${C.goldBright})` }}
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
          fontSize: 11, lineHeight: 1.75, color: 'rgba(250,250,248,0.82)',
          fontFamily: 'var(--font-inter), sans-serif',
        }}>
          <BoldRenderer text={text} goldColor={C.goldBright} />
          {phase === 'streaming' && (
            <span style={{ borderRight: `1.5px solid ${C.gold}`,
                           animation: 'blink 0.9s step-end infinite', marginLeft: 1 }}>&nbsp;</span>
          )}
        </div>
      )}
    </motion.div>
  )
}

// Minimal **bold** renderer
function BoldRenderer({ text, goldColor }: { text: string; goldColor: string }) {
  return (
    <>
      {text.split('\n').map((line, li) => (
        <span key={li}>
          {line.split(/(\*\*[^*]+\*\*)/).map((p, pi) =>
            p.startsWith('**') ? (
              <strong key={pi} style={{ color: goldColor, fontWeight: 700 }}>
                {p.slice(2, -2)}
              </strong>
            ) : p
          )}
          {'\n'}
        </span>
      ))}
    </>
  )
}

// ── Screen 5: Strategy / Convert ─────────────────────────────────────────────

function ScreenStrategy() {
  return (
    <motion.div {...RISE} key="strategy"
      style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'space-between',
        padding: '52px 18px 20px',
        background: `linear-gradient(160deg, #08060E 0%, #12101E 100%)`,
      }}
    >
      {/* Arrival indicator */}
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        style={{ textAlign: 'center' }}
      >
        <div style={{
          width: 48, height: 48, borderRadius: '50%', margin: '0 auto 14px',
          background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDim} 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 28px ${C.gold}44`,
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 12L9 17L18 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={{ color: C.gold, fontSize: 9.5, letterSpacing: '0.18em',
                       textTransform: 'uppercase', fontFamily: 'var(--font-inter), sans-serif', display: 'block', marginBottom: 8 }}>
          Harbour Reached
        </span>
        <h2 style={{
          color: C.white, fontSize: 18, fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontWeight: 600, fontStyle: 'italic', lineHeight: 1.3,
        }}>
          Your precision strategy is ready to save.
        </h2>
      </motion.div>

      {/* Blurred locked preview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.42 }}
        style={{
          width: '100%', borderRadius: 14, padding: '14px',
          background: `rgba(196,154,60,0.06)`, border: `1px solid ${C.gold}22`,
          filter: 'blur(3px)', userSelect: 'none', position: 'relative', overflow: 'hidden',
        }}
      >
        {['Priority 1: Retention Audit', '↑ +18% MRR in 30 days',
          'Priority 2: Expansion Revenue', '↑ NRR 98% → 118%',
          'Priority 3: Churn Firewall'].map((l, i) => (
          <div key={i} style={{
            height: 7, borderRadius: 4, marginBottom: 9,
            background: i % 2 === 0 ? `rgba(196,154,60,0.32)` : `rgba(161,161,170,0.14)`,
            width: ['88%', '62%', '78%', '54%', '68%'][i],
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 5,
          background: 'rgba(8,6,14,0.20)',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="7" width="12" height="8" rx="2" stroke={`${C.gold}99`} strokeWidth="1.4"/>
            <path d="M5 7V5a3 3 0 016 0v2" stroke={`${C.gold}99`} strokeWidth="1.4"/>
          </svg>
          <span style={{ color: `${C.gold}80`, fontSize: 9, fontFamily: 'var(--font-inter), sans-serif' }}>
            Create free account to unlock
          </span>
        </div>
      </motion.div>

      {/* Impact callout */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.62 }}
        style={{
          width: '100%', padding: '11px', borderRadius: 12, textAlign: 'center',
          background: `rgba(74,222,128,0.06)`, border: `1px solid rgba(74,222,128,0.18)`,
        }}
      >
        <p style={{ color: C.green, fontSize: 11.5, fontFamily: 'var(--font-inter), sans-serif',
                    fontWeight: 600, marginBottom: 2 }}>
          Projected impact: +£124,000 / year
        </p>
        <p style={{ color: 'rgba(161,161,170,0.5)', fontSize: 9.5, fontFamily: 'var(--font-inter), sans-serif' }}>
          Cross-referenced with 7,400 sector benchmarks
        </p>
      </motion.div>

      {/* Primary CTA */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.82 }}
        style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <a href="/login" style={{
          display: 'block', textAlign: 'center', padding: '14px 0',
          borderRadius: 14, textDecoration: 'none',
          background: `linear-gradient(135deg, ${C.gold} 0%, ${C.goldBright} 100%)`,
          color: C.navy, fontSize: 13.5, fontWeight: 700, fontFamily: 'var(--font-inter), sans-serif',
          boxShadow: `0 8px 24px ${C.gold}40`,
        }}>
          Save My Strategy →
        </a>
        <p style={{ color: 'rgba(113,113,122,0.5)', fontSize: 9.5, textAlign: 'center',
                    fontFamily: 'var(--font-inter), sans-serif' }}>
          Free account · No card · Takes 30 seconds
        </p>
      </motion.div>
    </motion.div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

type Screen = 'intro' | 'sector' | 'metrics' | 'analysis' | 'strategy'

export function UngatedApp() {
  const [screen, setScreen] = useState<Screen>('intro')
  const [sector, setSector] = useState('default')
  const { advance }         = useNarrative()

  const go = useCallback((to: Screen, narrativeTarget?: Parameters<typeof advance>[0]) => {
    setScreen(to)
    if (narrativeTarget) advance(narrativeTarget)
  }, [advance])

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <AnimatePresence mode="wait">
        {screen === 'intro' && (
          <ScreenIntro key="intro" onStart={() => go('sector', 'DIAGNOSE')} />
        )}
        {screen === 'sector' && (
          <ScreenSector key="sector" onSelect={(s) => { setSector(s); go('metrics', 'STRATEGIZE') }} />
        )}
        {screen === 'metrics' && (
          <ScreenMetrics key="metrics" sector={sector} onAnalyze={() => go('analysis', 'EXECUTE')} />
        )}
        {screen === 'analysis' && (
          <ScreenAnalysis key="analysis" sector={sector} onDone={() => go('strategy', 'CONVERT')} />
        )}
        {screen === 'strategy' && (
          <ScreenStrategy key="strategy" />
        )}
      </AnimatePresence>
    </div>
  )
}
