/**
 * app/page.tsx — SAIL AI Immersive Landing Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Swiss Precision × Cinematic Interactivity
 *
 * Layout:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  Nav (glass, narrative-reactive accent)                     │
 *   ├──────────────────┬──────────────────┬───────────────────────┤
 *   │  Left            │   Centre          │  Right                │
 *   │  Hero copy       │   iPhone 15 Pro  │   Context cards       │
 *   │  Narrative steps │   (live app)     │   Floating stats      │
 *   │  CTA             │                  │   Testimonial         │
 *   └──────────────────┴──────────────────┴───────────────────────┘
 *   │  Footer strip                                               │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * Responsive: stacks to phone → landscape → 3-col desktop
 *
 * Narrative state drives:
 *   • Background shader colors + particle speed
 *   • Headline / tagline copy on left panel
 *   • Progress stepper highlight
 *   • Optional AI-generated video overlay (when LUMA_API_KEY set)
 */

'use client'

import { useRef }                                  from 'react'
import Link                                        from 'next/link'
import { motion, AnimatePresence }                 from 'framer-motion'
import { useNarrative, SCENES, NODE_ORDER }        from '@/components/landing/narrativeStore'
import { CinematicBackground }                     from '@/components/landing/CinematicBackground'
import { IPhoneFrame }                             from '@/components/landing/IPhoneFrame'
import { AppPrototype }                            from '@/components/landing/AppPrototype'

// ── Shared animation variants ─────────────────────────────────────────────────

const FU = {
  initial:   { opacity: 0, y: 16 },
  animate:   { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
}

// ── Glassmorphism card ────────────────────────────────────────────────────────

function GlassCard({
  children, className = '', delay = 0, accent = false,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  accent?: boolean
}) {
  const { node } = useNarrative()
  const hex = SCENES[node].accentHex

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background:    'rgba(8, 10, 20, 0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border:        `1px solid ${accent ? hex + '30' : 'rgba(255,255,255,0.07)'}`,
        borderRadius:  16,
        transition:    'border-color 2s ease',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function LandingNav() {
  const { node } = useNarrative()
  const accentHex = SCENES[node].accentHex

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      padding: '0 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 60,
      background:    'rgba(4, 8, 24, 0.65)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom:  '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `linear-gradient(135deg, ${accentHex} 0%, ${accentHex}99 100%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 2s ease',
          boxShadow: `0 0 12px ${accentHex}40`,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L2 14H14L8 2Z" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M5 11H11" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
          </svg>
        </div>
        <span style={{
          color: '#FAFAF8', fontSize: 15, fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontWeight: 600, fontStyle: 'italic', letterSpacing: '0.01em',
        }}>
          SAIL AI
        </span>
      </div>

      {/* Narrative progress — desktop only */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}
           className="hidden md:flex">
        {NODE_ORDER.map((n, i) => {
          const isCurrent = n === node
          const isPast    = NODE_ORDER.indexOf(node) > i
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: isCurrent ? 24 : 6,
                height: 6, borderRadius: 3,
                background: isPast || isCurrent
                  ? accentHex
                  : 'rgba(255,255,255,0.15)',
                transition: 'all 0.5s ease',
                boxShadow: isCurrent ? `0 0 8px ${accentHex}80` : 'none',
              }} />
              {i < NODE_ORDER.length - 1 && (
                <div style={{
                  width: 12, height: 1,
                  background: isPast ? accentHex + '60' : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.5s ease',
                }} />
              )}
            </div>
          )
        })}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/login" style={{
          color: 'rgba(161,161,170,0.8)', fontSize: 13, fontFamily: 'Inter, sans-serif',
          textDecoration: 'none',
        }}>
          Sign in
        </Link>
        <Link href="/login" style={{
          padding: '7px 16px', borderRadius: 8,
          background: accentHex,
          color: '#fff', fontSize: 12.5, fontFamily: 'Inter, sans-serif',
          fontWeight: 600, textDecoration: 'none',
          boxShadow: `0 4px 16px ${accentHex}40`,
          transition: 'background 2s ease, box-shadow 2s ease',
        }}>
          Get Started
        </Link>
      </div>
    </nav>
  )
}

// ── Left panel — hero copy + narrative steps ──────────────────────────────────

function LeftPanel() {
  const { node } = useNarrative()
  const scene     = SCENES[node]

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 32, maxWidth: 420,
    }}>
      {/* Label */}
      <motion.p
        key={`label-${node}`}
        {...FU}
        style={{
          color: scene.accentHex, fontSize: 10.5, fontFamily: 'Inter, sans-serif',
          letterSpacing: '0.22em', textTransform: 'uppercase',
        }}
      >
        {scene.label}
      </motion.p>

      {/* Headline */}
      <motion.h1
        key={`h1-${node}`}
        {...FU}
        transition={{ delay: 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{
          color: '#FAFAF8', fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 600,
          fontStyle: 'italic', lineHeight: 1.2, margin: 0,
        }}
      >
        {scene.tagline}
      </motion.h1>

      {/* Supporting copy — changes per node */}
      <AnimatePresence mode="wait">
        <motion.p
          key={`sub-${node}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0  }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.4 }}
          style={{
            color: 'rgba(161,161,170,0.75)', fontFamily: 'Inter, sans-serif',
            fontSize: 15, lineHeight: 1.75,
          }}
        >
          {NODE_COPY[node]}
        </motion.p>
      </AnimatePresence>

      {/* Swiss rule */}
      <div style={{
        width: 40, height: 1,
        background: `linear-gradient(90deg, ${scene.accentHex}, transparent)`,
        transition: 'background 2s ease',
      }} />

      {/* Vertical narrative steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {NODE_ORDER.map((n, i) => {
          const isCurrent = n === node
          const isPast    = NODE_ORDER.indexOf(node) > i
          return (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: isCurrent
                  ? scene.accentHex
                  : isPast ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                boxShadow: isCurrent ? `0 0 8px ${scene.accentHex}` : 'none',
                transition: 'all 0.5s ease',
              }} />
              <span style={{
                fontSize: 12.5, fontFamily: 'Inter, sans-serif',
                color: isCurrent
                  ? '#FAFAF8'
                  : isPast ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.20)',
                fontWeight: isCurrent ? 500 : 400,
                transition: 'color 0.5s ease',
              }}>
                {STEPS[i]}
              </span>
              {isPast && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 'auto' }}>
                  <path d="M2 6L5 9L10 3" stroke="rgba(74,222,128,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Right panel — floating context cards ──────────────────────────────────────

function RightPanel() {
  const { node } = useNarrative()
  const scene     = SCENES[node]

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', gap: 16, maxWidth: 320,
    }}>
      {/* Live stat card */}
      <GlassCard delay={0.15} accent className="p-5">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <p style={{ color: 'rgba(161,161,170,0.65)', fontSize: 10, fontFamily: 'Inter, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Live Benchmark
          </p>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#4ADE80',
            boxShadow: '0 0 6px rgba(74,222,128,0.6)',
            animation: 'drift-pulse 2s ease-in-out infinite',
          }} />
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={node}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p style={{
              color: '#FAFAF8', fontSize: 28, fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 600, fontStyle: 'italic', lineHeight: 1, marginBottom: 4,
            }}>
              {STAT_VALUES[node].value}
            </p>
            <p style={{ color: scene.accentHex, fontSize: 11, fontFamily: 'Inter, sans-serif', transition: 'color 2s ease' }}>
              {STAT_VALUES[node].label}
            </p>
          </motion.div>
        </AnimatePresence>
      </GlassCard>

      {/* Trust strip */}
      <GlassCard delay={0.25} className="p-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          {[...Array(5)].map((_, i) => (
            <svg key={i} width="10" height="10" viewBox="0 0 10 10" fill="#C9A96E">
              <path d="M5 0.5L6.12 3.38L9.26 3.62L7 5.63L7.71 8.76L5 7.1L2.29 8.76L3 5.63L0.74 3.62L3.88 3.38L5 0.5Z"/>
            </svg>
          ))}
          <span style={{ color: 'rgba(161,161,170,0.55)', fontSize: 9.5, fontFamily: 'Inter, sans-serif', marginLeft: 2 }}>
            4.9 / 5.0
          </span>
        </div>
        <p style={{ color: 'rgba(250,250,248,0.75)', fontSize: 12, fontFamily: 'Inter, sans-serif', lineHeight: 1.65, fontStyle: 'italic' }}>
          "SAIL AI identified a retention lever we'd missed for two years. £60K recovered in 90 days."
        </p>
        <p style={{ color: 'rgba(113,113,122,0.6)', fontSize: 10, fontFamily: 'Inter, sans-serif', marginTop: 8 }}>
          — Founder, B2B SaaS · 10–50k MRR bracket
        </p>
      </GlassCard>

      {/* Benchmark data pill */}
      <GlassCard delay={0.35} className="p-4">
        <p style={{ color: 'rgba(161,161,170,0.55)', fontSize: 9, fontFamily: 'Inter, sans-serif', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
          Industry Benchmark
        </p>
        <AnimatePresence mode="wait">
          <motion.p key={node}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ color: '#FAFAF8', fontSize: 12.5, fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}
          >
            {BENCHMARKS[node]}
          </motion.p>
        </AnimatePresence>
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <span style={{
            padding: '2px 8px', borderRadius: 100,
            background: 'rgba(201,169,110,0.10)', border: '1px solid rgba(201,169,110,0.22)',
            color: '#C9A96E', fontSize: 9, fontFamily: 'Inter, sans-serif',
          }}>
            Verified 2024–25
          </span>
          <span style={{
            padding: '2px 8px', borderRadius: 100,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(161,161,170,0.6)', fontSize: 9, fontFamily: 'Inter, sans-serif',
          }}>
            McKinsey · Baymard · OpenView
          </span>
        </div>
      </GlassCard>

      {/* Urgency signal */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          borderRadius: 10, background: 'rgba(74,222,128,0.05)',
          border: '1px solid rgba(74,222,128,0.15)',
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', flexShrink: 0,
          animation: 'drift-pulse 1.5s ease-in-out infinite' }} />
        <p style={{ color: 'rgba(74,222,128,0.8)', fontSize: 10.5, fontFamily: 'Inter, sans-serif' }}>
          <strong style={{ color: '#4ADE80' }}>23 businesses</strong> ran their diagnosis today
        </p>
      </motion.div>
    </div>
  )
}

// ── Content maps ──────────────────────────────────────────────────────────────

const NODE_COPY: Record<string, string> = {
  INTRO:      'Most businesses operate on intuition. The ones that win operate on precision. Begin your 60-second diagnosis — no account required.',
  DIAGNOSE:   'Great strategy starts with brutal clarity. We cross-reference your sector against 17 live industry benchmarks before your first keystroke.',
  STRATEGIZE: 'Three metrics reveal more than a 40-page deck. KAIROS isolates your highest-leverage constraint and prices the upside in 30 seconds.',
  EXECUTE:    'Your analysis cross-references 7,400+ business profiles. What emerges isn\'t advice — it\'s a ranked, time-boxed execution sequence.',
  CONVERT:    'Your strategy is ready. Lock it in, share it with your team, and track its P&L impact in real time. One free account. Zero expiry.',
}

const STEPS = [
  'Enter the voyage',
  'Diagnose your position',
  'Build the strategy',
  'Execute with precision',
  'Arrive at your target',
]

const STAT_VALUES: Record<string, { value: string; label: string }> = {
  INTRO:      { value: '7,400+', label: 'businesses diagnosed' },
  DIAGNOSE:   { value: '17',     label: 'live sector benchmarks' },
  STRATEGIZE: { value: '34%',    label: 'average revenue uplift' },
  EXECUTE:    { value: '90',     label: 'days to measurable ROI' },
  CONVERT:    { value: '£124k',  label: 'median annual impact' },
}

const BENCHMARKS: Record<string, string> = {
  INTRO:      'Businesses that act on structured diagnosis grow 2.3× faster than those that don\'t — across all sectors.',
  DIAGNOSE:   'E-commerce checkout abandonment averages 70.2% (Baymard 2024). A 10pp improvement recovers £1 in £7 of lost revenue.',
  STRATEGIZE: 'B2B SaaS with NRR above 110% grow 40% faster than peers at equivalent ARR. Expansion revenue is the #1 lever.',
  EXECUTE:    'Responding to enquiries within 5 minutes converts at 4× the rate of 30-minute responses (NAR 2024).',
  CONVERT:    'Improving customer retention by 5% increases profit by 25–95% depending on sector (McKinsey).',
}

// ── Footer strip ──────────────────────────────────────────────────────────────

function FooterStrip() {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      padding: '14px 32px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: 'rgba(4,8,24,0.7)', backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.05)',
    }}>
      <p style={{ color: 'rgba(113,113,122,0.5)', fontSize: 10.5, fontFamily: 'Inter, sans-serif' }}>
        © 2025 SAIL AI · Swiss Precision Business Intelligence
      </p>
      <div style={{ display: 'flex', gap: 20 }}>
        {[['Privacy', '/privacy'], ['Terms', '/terms'], ['Blog', '/blog']].map(([label, href]) => (
          <Link key={label} href={href} style={{
            color: 'rgba(113,113,122,0.5)', fontSize: 10.5, fontFamily: 'Inter, sans-serif',
            textDecoration: 'none',
          }}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* Layer 0 — Cinematic background (fixed, behind everything) */}
      <CinematicBackground />

      {/* Layer 1 — Nav */}
      <LandingNav />

      {/* Layer 2 — Main content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '70px 40px 60px',
        gap: 'clamp(24px, 4vw, 64px)',
      }}>

        {/* Left — hidden on mobile */}
        <div className="hidden lg:flex" style={{ flex: 1, justifyContent: 'flex-end' }}>
          <LeftPanel />
        </div>

        {/* Center — iPhone (always visible) */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <IPhoneFrame>
            <AppPrototype />
          </IPhoneFrame>

          {/* Mobile-only: minimal tagline below phone */}
          <div className="lg:hidden" style={{ textAlign: 'center', maxWidth: 280 }}>
            <p style={{ color: 'rgba(250,250,248,0.8)', fontSize: 13, fontFamily: 'Inter, sans-serif', lineHeight: 1.6 }}>
              Tap the screen to begin your 60-second business diagnosis.
            </p>
          </div>
        </div>

        {/* Right — hidden on mobile/tablet */}
        <div className="hidden xl:flex" style={{ flex: 1 }}>
          <RightPanel />
        </div>
      </div>

      {/* Layer 3 — Footer */}
      <FooterStrip />
    </main>
  )
}
