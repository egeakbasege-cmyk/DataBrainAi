/**
 * app/page.tsx — SAIL AI Portofino Landing Page
 * ─────────────────────────────────────────────────────────────────────────────
 * "A giant iPhone carried on a sailboat through Portofino harbour."
 *
 * Architecture:
 *   Background  — Three.js Portofino scene (Sky + Water + Harbor + Sailboat-with-iPhone-sail)
 *                 The sailboat advances through the harbor as the user interacts with the app.
 *   Foreground  — Centered iPhone 15 Pro frame housing the live, ungated SAIL AI app.
 *   Overlay     — Glassmorphism contextual cards, minimal nav, harbour-progress indicator.
 *
 * Design language: Swiss Precision
 *   Palette: midnight navy #0A1628 · champagne gold #C49A3C · tiffany #14B8A6 · silica white #FAFAF8
 *   Type:    Cormorant Garamond (display) · Inter (body) · JetBrains Mono (data)
 *
 * Engagement model: ZERO gates. The AI's quality IS the acquisition mechanism.
 * No pop-ups. No lead-gen overlays. No mandatory onboarding. Pure product.
 */
'use client'

import Link                                    from 'next/link'
import { motion, AnimatePresence }             from 'framer-motion'
import { PortofinoScene }                      from '@/components/landing/PortofinoScene'
import { IPhoneFrame }                         from '@/components/landing/IPhoneFrame'
import { UngatedApp }                          from '@/components/landing/UngatedApp'
import { useNarrative, SCENES, NODE_ORDER }    from '@/components/landing/narrativeStore'

// ── Colour constants ──────────────────────────────────────────────────────────

const PALETTE = {
  navy:    '#0A1628',
  gold:    '#C49A3C',
  tiffany: '#14B8A6',
  white:   '#FAFAF8',
  silver:  '#A1A1AA',
}

// ── Glassmorphism helper ──────────────────────────────────────────────────────

function Glass({
  children, style = {}, className = '',
}: {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  return (
    <div
      className={className}
      style={{
        background:          'rgba(8, 14, 28, 0.60)',
        backdropFilter:      'blur(22px)',
        WebkitBackdropFilter:'blur(22px)',
        border:              '1px solid rgba(196,154,60,0.18)',
        borderRadius:        16,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ── Navigation ────────────────────────────────────────────────────────────────

function LandingNav() {
  const { node } = useNarrative()
  const accent   = SCENES[node].accentHex

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      height: 58, padding: '0 28px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background:           'rgba(8,14,28,0.70)',
      backdropFilter:       'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom:         '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}99 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 2.5s ease',
          boxShadow: `0 0 14px ${accent}45`,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L2 14H14L8 2Z" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
            <path d="M5 11H11" stroke="rgba(255,255,255,0.45)" strokeWidth="1"/>
          </svg>
        </div>
        <span style={{
          color: PALETTE.white, fontSize: 15,
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontWeight: 600, fontStyle: 'italic', letterSpacing: '0.01em',
        }}>
          SAIL AI
        </span>
        <span style={{
          padding: '2px 8px', borderRadius: 100, marginLeft: 4,
          background: 'rgba(196,154,60,0.12)', border: '1px solid rgba(196,154,60,0.25)',
          color: PALETTE.gold, fontSize: 9, fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.10em', textTransform: 'uppercase',
        }}>
          Portofino Edition
        </span>
      </div>

      {/* Harbour progress (desktop) */}
      <HarbourProgressBar />

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/login" style={{
          color: 'rgba(161,161,170,0.75)', fontSize: 13,
          fontFamily: 'Inter, sans-serif', textDecoration: 'none',
        }}>
          Sign in
        </Link>
        <Link href="/login" style={{
          padding: '7px 18px', borderRadius: 8, textDecoration: 'none',
          background: `linear-gradient(135deg, ${PALETTE.gold} 0%, #D4B060 100%)`,
          color: PALETTE.navy, fontSize: 12.5, fontFamily: 'Inter, sans-serif',
          fontWeight: 700, boxShadow: `0 4px 18px rgba(196,154,60,0.40)`,
        }}>
          Get Started
        </Link>
      </div>
    </nav>
  )
}

// ── Harbour progress bar ──────────────────────────────────────────────────────

function HarbourProgressBar() {
  const { node } = useNarrative()
  const idx       = NODE_ORDER.indexOf(node)

  return (
    <div className="hidden md:flex" style={{ alignItems: 'center', gap: 6 }}>
      {NODE_ORDER.map((n, i) => {
        const isCurrent = i === idx
        const isPast    = i < idx
        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width:        isCurrent ? 28 : 7,
                height:       7,
                borderRadius: 4,
                background:   isPast || isCurrent ? PALETTE.gold : 'rgba(255,255,255,0.12)',
                transition:   'all 0.55s cubic-bezier(0.22,1,0.36,1)',
                boxShadow:    isCurrent ? `0 0 10px ${PALETTE.gold}80` : 'none',
              }} />
            </div>
            {i < NODE_ORDER.length - 1 && (
              <div style={{
                width: 14, height: 1,
                background: isPast ? `${PALETTE.gold}55` : 'rgba(255,255,255,0.07)',
                transition: 'background 0.55s ease',
              }} />
            )}
          </div>
        )
      })}
      <AnimatePresence mode="wait">
        <motion.span
          key={node}
          initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            color: PALETTE.gold, fontSize: 9.5, fontFamily: 'Inter, sans-serif',
            letterSpacing: '0.12em', textTransform: 'uppercase', marginLeft: 8,
          }}
        >
          {SCENES[node].label}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

// ── Left panel: narrative copy ────────────────────────────────────────────────

function LeftNarrativePanel() {
  const { node } = useNarrative()
  const scene     = SCENES[node]

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 28, maxWidth: 400,
    }}>
      {/* Portofino location badge */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80',
                      boxShadow: '0 0 8px rgba(74,222,128,0.7)',
                      animation: 'drift-pulse 2s ease-in-out infinite' }} />
        <span style={{ color: 'rgba(74,222,128,0.85)', fontSize: 10.5,
                       fontFamily: 'Inter, sans-serif', letterSpacing: '0.08em' }}>
          Live · Portofino Harbour, Liguria
        </span>
      </motion.div>

      {/* Narrative label */}
      <AnimatePresence mode="wait">
        <motion.p key={`label-${node}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ color: scene.accentHex, fontSize: 10.5, fontFamily: 'Inter, sans-serif',
                   letterSpacing: '0.20em', textTransform: 'uppercase', transition: 'color 2s ease' }}
        >
          {scene.label}
        </motion.p>
      </AnimatePresence>

      {/* Headline */}
      <AnimatePresence mode="wait">
        <motion.h1 key={`h1-${node}`}
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.50, ease: [0.22, 1, 0.36, 1] }}
          style={{
            color: PALETTE.white, margin: 0,
            fontFamily: 'Cormorant Garamond, Georgia, serif',
            fontSize: 'clamp(26px, 3.2vw, 44px)',
            fontWeight: 600, fontStyle: 'italic', lineHeight: 1.22,
          }}
        >
          {scene.tagline}
        </motion.h1>
      </AnimatePresence>

      {/* Swiss rule */}
      <div style={{
        width: 44, height: 1,
        background: `linear-gradient(90deg, ${scene.accentHex}, transparent)`,
        transition: 'background 2.5s ease',
      }} />

      {/* Supporting copy */}
      <AnimatePresence mode="wait">
        <motion.p key={`copy-${node}`}
          initial={{ opacity: 0 }} animate={{ opacity: 0.75 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          style={{
            color: PALETTE.white, fontSize: 14, lineHeight: 1.75,
            fontFamily: 'Inter, sans-serif', fontWeight: 300,
          }}
        >
          {SUPPORTING_COPY[node]}
        </motion.p>
      </AnimatePresence>

      {/* Journey steps (vertical) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {NODE_ORDER.map((n, i) => {
          const idx       = NODE_ORDER.indexOf(node)
          const isCurrent = i === idx
          const isPast    = i < idx
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: isCurrent ? scene.accentHex
                          : isPast    ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.09)',
                boxShadow: isCurrent ? `0 0 10px ${scene.accentHex}` : 'none',
                transition: 'all 0.5s ease',
              }} />
              <span style={{
                fontSize: 12.5, fontFamily: 'Inter, sans-serif',
                color: isCurrent ? PALETTE.white : isPast ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.18)',
                fontWeight: isCurrent ? 500 : 400, transition: 'color 0.5s ease',
              }}>
                {STEP_LABELS[i]}
              </span>
              {isPast && (
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ marginLeft: 'auto' }}>
                  <path d="M2 5.5L4.5 8L9 3" stroke="rgba(74,222,128,0.65)" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Right panel: floating context cards ──────────────────────────────────────

function RightContextPanel() {
  const { node } = useNarrative()
  const scene     = SCENES[node]

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 14, maxWidth: 300,
    }}>
      {/* Benchmark stat card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}>
        <Glass style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'rgba(161,161,170,0.55)', fontSize: 9.5,
                           fontFamily: 'Inter, sans-serif', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
              Live Benchmark
            </span>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80',
                          animation: 'drift-pulse 2s ease-in-out infinite',
                          boxShadow: '0 0 6px rgba(74,222,128,0.6)' }} />
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={node}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p style={{
                color: PALETTE.white, fontSize: 26,
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontWeight: 600, fontStyle: 'italic', lineHeight: 1, marginBottom: 4,
              }}>
                {STATS[node].value}
              </p>
              <p style={{ color: scene.accentHex, fontSize: 11,
                           fontFamily: 'Inter, sans-serif', transition: 'color 2s ease' }}>
                {STATS[node].label}
              </p>
            </motion.div>
          </AnimatePresence>
        </Glass>
      </motion.div>

      {/* Testimonial */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}>
        <Glass style={{ padding: '16px' }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
            {[...Array(5)].map((_, i) => (
              <svg key={i} width="10" height="10" viewBox="0 0 10 10" fill={PALETTE.gold}>
                <path d="M5 0.5L6.12 3.38L9.26 3.62L7 5.63L7.71 8.76L5 7.1L2.29 8.76L3 5.63L0.74 3.62L3.88 3.38Z"/>
              </svg>
            ))}
            <span style={{ color: 'rgba(161,161,170,0.45)', fontSize: 9,
                           fontFamily: 'Inter, sans-serif', marginLeft: 4 }}>
              4.9 · 7,400+ businesses
            </span>
          </div>
          <p style={{
            color: 'rgba(250,250,248,0.72)', fontSize: 11.5,
            fontFamily: 'Inter, sans-serif', lineHeight: 1.65, fontStyle: 'italic',
          }}>
            "SAIL AI found a £60K retention lever we'd missed for two years. ROI in the first 90 days."
          </p>
          <p style={{ color: 'rgba(113,113,122,0.55)', fontSize: 9.5,
                      fontFamily: 'Inter, sans-serif', marginTop: 8 }}>
            — Founder, B2B SaaS · £10–50k MRR
          </p>
        </Glass>
      </motion.div>

      {/* Industry benchmark pill */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.40 }}>
        <Glass style={{ padding: '14px' }}>
          <span style={{ color: 'rgba(161,161,170,0.45)', fontSize: 9,
                         fontFamily: 'Inter, sans-serif', letterSpacing: '0.10em',
                         textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
            Industry Benchmark
          </span>
          <AnimatePresence mode="wait">
            <motion.p key={node}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ color: 'rgba(250,250,248,0.78)', fontSize: 11.5,
                       fontFamily: 'Inter, sans-serif', lineHeight: 1.65 }}
            >
              {BENCHMARKS[node]}
            </motion.p>
          </AnimatePresence>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['McKinsey', 'Baymard', 'OpenView', 'ChartMogul'].map(s => (
              <span key={s} style={{
                padding: '2px 7px', borderRadius: 100, fontSize: 8.5,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(161,161,170,0.5)', fontFamily: 'Inter, sans-serif',
              }}>
                {s}
              </span>
            ))}
          </div>
        </Glass>
      </motion.div>

      {/* Social proof pulse */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.14)',
        }}
      >
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ADE80',
                      flexShrink: 0, animation: 'drift-pulse 1.5s ease-in-out infinite' }} />
        <p style={{ color: 'rgba(74,222,128,0.75)', fontSize: 10.5, fontFamily: 'Inter, sans-serif' }}>
          <strong style={{ color: '#4ADE80' }}>31 businesses</strong> running their diagnosis right now
        </p>
      </motion.div>
    </div>
  )
}

// ── Footer anchor ─────────────────────────────────────────────────────────────

function FooterAnchor() {
  return (
    <footer style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      padding: '12px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background:           'rgba(8,14,28,0.72)',
      backdropFilter:       'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop:            '1px solid rgba(255,255,255,0.05)',
    }}>
      <p style={{ color: 'rgba(113,113,122,0.45)', fontSize: 10.5,
                  fontFamily: 'Inter, sans-serif' }}>
        © 2025 SAIL AI · Swiss Precision Business Intelligence · Portofino, Liguria
      </p>
      <div style={{ display: 'flex', gap: 20 }}>
        {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Dashboard', '/dashboard']].map(([l, h]) => (
          <Link key={l} href={h} style={{
            color: 'rgba(113,113,122,0.45)', fontSize: 10.5,
            fontFamily: 'Inter, sans-serif', textDecoration: 'none',
          }}>
            {l}
          </Link>
        ))}
      </div>
    </footer>
  )
}

// ── Content maps ──────────────────────────────────────────────────────────────

const SUPPORTING_COPY: Record<string, string> = {
  INTRO:      'Most businesses navigate by intuition. The ones that compound, navigate by precision. Tap the screen — no account, no form, no friction.',
  DIAGNOSE:   'Great strategy starts with brutal clarity. We cross-reference your sector against 17 live industry benchmarks before your first metric is entered.',
  STRATEGIZE: 'Three numbers reveal more than a 40-page deck. KAIROS isolates your highest-leverage constraint and prices the upside in seconds.',
  EXECUTE:    'Your analysis is cross-referenced against 7,400 business profiles. What emerges isn\'t generic advice — it\'s a ranked, time-boxed execution sequence.',
  CONVERT:    'Your strategy is ready. Save it, share it with your team, and track its P&L impact in real time. One free account. Zero expiry.',
}

const STEP_LABELS = [
  'Cast off — enter the voyage',
  'Chart the position (sector)',
  'Read the instruments (metrics)',
  'KAIROS analysis streams live',
  'Harbour arrival — strategy saved',
]

const STATS: Record<string, { value: string; label: string }> = {
  INTRO:      { value: '7,400+', label: 'businesses diagnosed' },
  DIAGNOSE:   { value: '17',     label: 'live benchmarks cross-referenced' },
  STRATEGIZE: { value: '34%',    label: 'average revenue uplift' },
  EXECUTE:    { value: '90',     label: 'days to measurable ROI' },
  CONVERT:    { value: '£124k',  label: 'median annual impact' },
}

const BENCHMARKS: Record<string, string> = {
  INTRO:      "Businesses that act on structured diagnosis grow 2.3× faster. The boat doesn’t sail itself.",
  DIAGNOSE:   'E-commerce checkout abandonment averages 70.2% (Baymard 2024). A 10pp improvement recovers £1 in £7 of lost revenue.',
  STRATEGIZE: 'B2B SaaS with NRR above 110% grow 40% faster than peers at equivalent ARR. Expansion revenue is the #1 lever.',
  EXECUTE:    'Responding to enquiries within 5 minutes converts at 4× the rate of 30-minute responses (NAR 2024).',
  CONVERT:    'Improving customer retention by 5% increases profit by 25–95% depending on sector (McKinsey).',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PortofinoLandingPage() {
  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* ── Layer 0: Portofino Three.js scene (fills screen, behind everything) */}
      <PortofinoScene />

      {/* ── Layer 1: Navigation */}
      <LandingNav />

      {/* ── Layer 2: Main content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '68px 36px 56px',
        gap: 'clamp(20px, 3.5vw, 60px)',
      }}>

        {/* Left panel — desktop only */}
        <div className="hidden lg:flex" style={{ flex: 1, justifyContent: 'flex-end' }}>
          <LeftNarrativePanel />
        </div>

        {/* Centre — iPhone always visible */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 18 }}>
          <IPhoneFrame>
            <UngatedApp />
          </IPhoneFrame>

          {/* Mobile hint */}
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
            className="lg:hidden"
            style={{
              color: 'rgba(250,250,248,0.60)', fontSize: 12,
              fontFamily: 'Inter, sans-serif', textAlign: 'center', maxWidth: 260,
            }}
          >
            Tap the screen — the sailboat moves as you progress.
          </motion.p>
        </div>

        {/* Right panel — large desktop only */}
        <div className="hidden xl:flex" style={{ flex: 1 }}>
          <RightContextPanel />
        </div>
      </div>

      {/* ── Layer 3: Footer */}
      <FooterAnchor />
    </main>
  )
}
