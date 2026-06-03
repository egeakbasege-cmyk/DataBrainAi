/**
 * components/dashboard/SwissPrecisionDashboard.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * SAIL AI — Premium Investor-Presentable Dashboard
 *
 * Architecture: 4-tab mobile-first layout (iOS bottom nav pattern)
 *   Overview   → Portofino hero + metric cards + AI insight banner
 *   Analytics  → Sector performance bars + momentum signals
 *   Strategy   → Central Operations Module (AI mode selector + query stream)
 *   Settings   → BYOK Groq key + preferences
 *
 * Design system:
 *   #0a1128  Midnight Navy   (primary background)
 *   #c49a3c  Champagne Gold  (borders, type, hover — never fill)
 *   #81d8d0  Tiffany Mint    (data labels, highlights)
 *   #f9fafb  Silica White    (body text)
 *   Swiss Precision grid + Glassmorphism surfaces
 *   Cormorant Garamond (display) + Archivo (UI)
 *
 * Hero: pure CSS/SVG/Framer Motion — no canvas, 60 fps on iPhone 13+
 */

'use client'

import {
  useState, useEffect, useRef, useCallback, useMemo,
}                                 from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  LayoutGrid, BarChart2, Compass, Settings2,
  TrendingUp, TrendingDown, Zap, Send, Lock,
  ChevronRight, Eye, EyeOff, AlertCircle, CheckCircle2,
  Sparkles, Anchor, type LucideIcon,
}                                 from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tab    = 'overview' | 'analytics' | 'strategy' | 'settings'
type AIMode = 'explore'  | 'diagnose'  | 'strategize'

// ─────────────────────────────────────────────────────────────────────────────
// Static data
// ─────────────────────────────────────────────────────────────────────────────

interface Metric {
  label:    string
  value:    string
  delta:    string
  positive: boolean
  detail:   string
}

const METRICS: Metric[] = [
  { label: 'MRR',         value: '$48.2K', delta: '+12.4%', positive: true,  detail: 'vs. last month'    },
  { label: 'Growth',      value: '3.8×',   delta: '+0.6×',  positive: true,  detail: 'YoY expansion'     },
  { label: 'CAC',         value: '$124',   delta: '−8.2%',  positive: true,  detail: 'Cost per customer' },
  { label: 'Churn',       value: '1.9%',   delta: '−0.4pp', positive: true,  detail: 'Monthly churn'     },
]

interface Sector {
  name:    string
  score:   number
  delta:   number
  color:   string
  bracket: string
}

const SECTORS: Sector[] = [
  { name: 'SaaS B2B',     score: 91, delta:  4, color: '#81d8d0', bracket: '10-50k' },
  { name: 'PLG SaaS',     score: 85, delta:  6, color: '#81d8d0', bracket: '10-50k' },
  { name: 'E-Commerce',   score: 73, delta:  2, color: '#c49a3c', bracket: '0-10k'  },
  { name: 'Marketplace',  score: 78, delta: -1, color: '#c49a3c', bracket: '10-50k' },
  { name: 'FinTech',      score: 68, delta: -3, color: '#c49a3c', bracket: '0-10k'  },
]

interface ModeConfig {
  id:      AIMode
  label:   string
  icon:    string
  tagline: string
  accent:  string
}

const AI_MODES: ModeConfig[] = [
  {
    id:      'explore',
    label:   'Explore',
    icon:    '◎',
    tagline: 'Discover market signals and competitive shifts',
    accent:  '#81d8d0',
  },
  {
    id:      'diagnose',
    label:   'Diagnose',
    icon:    '⟁',
    tagline: 'Identify friction in your revenue engine',
    accent:  '#c49a3c',
  },
  {
    id:      'strategize',
    label:   'Strategize',
    icon:    '◈',
    tagline: 'Build a precision 90-day growth plan',
    accent:  '#f9fafb',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// KAIROS types (mirror of deep-explore route response)
// ─────────────────────────────────────────────────────────────────────────────

interface KairosAction {
  label:    string
  impact:   'HIGH' | 'MED' | 'LOW'
  effort:   'HIGH' | 'MED' | 'LOW'
  timeline: string
}

interface KairosBenchmark {
  metric: string
  value:  string
  source: string
}

interface KairosInsight {
  summary:    string
  signals:    string[]
  actions:    KairosAction[]
  benchmarks: KairosBenchmark[]
  risks:      string[]
  confidence: number
}

interface KairosMeta {
  sector:       string
  queriesRun:   number
  sourcesFound: number
  model:        string
}

// Build Tavily search queries from mode + sector + optional user input
function buildQueries(mode: AIMode, sector: string, userInput: string): string[] {
  const topic = userInput.trim() || sector
  switch (mode) {
    case 'explore':
      return [
        `${topic} competitive landscape market trends 2025`,
        `${sector} growth opportunities emerging players consolidation`,
        `${sector} market signals investor activity 2024 2025`,
      ]
    case 'diagnose':
      return [
        `${topic} benchmarks failure patterns common causes`,
        `${sector} CAC LTV churn activation conversion benchmarks`,
        `${sector} product-market fit retention signals`,
      ]
    case 'strategize':
      return [
        `${topic} growth strategy playbook execution`,
        `${sector} revenue expansion NRR optimization tactics`,
        `${sector} 90-day sprint go-to-market best practices`,
      ]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Animation variants
// ─────────────────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.44, ease: [0.22, 1, 0.36, 1] },
  },
}

const stagger = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
}

const slideRight = {
  hidden: { opacity: 0, x: 20 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] } },
  exit:   { opacity: 0, x: -16, transition: { duration: 0.22 } },
}

// ─────────────────────────────────────────────────────────────────────────────
// Portofino hero — CSS / SVG / Framer Motion only, no canvas
// ─────────────────────────────────────────────────────────────────────────────

function Bird({ delay, startX, endX, yPath }: {
  delay:  number
  startX: number
  endX:   number
  yPath:  number[]
}) {
  const reduced = useReducedMotion()

  return (
    <motion.g
      initial={{ x: startX, y: yPath[0], opacity: 0 }}
      animate={
        reduced
          ? { opacity: 0.4 }
          : {
              x:       [startX, (startX + endX) / 2, endX],
              y:       yPath,
              opacity: [0, 0.65, 0.65, 0],
            }
      }
      transition={{ duration: 9 + delay * 1.2, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
      {/* M-silhouette seagull */}
      <path
        d="M-9,-2 Q-5,-6 0,-3 Q5,-6 9,-2"
        stroke="#f9fafb"
        strokeWidth="1.4"
        strokeLinecap="round"
        fill="none"
        opacity="0.75"
      />
    </motion.g>
  )
}

function PortofinoHero() {
  const reduced = useReducedMotion()

  // Wave path pairs — oscillate between two states
  const wave1a = 'M0,24 C55,14 110,34 165,24 C220,14 275,34 330,24 C352,19 364,28 375,24 L375,60 L0,60 Z'
  const wave1b = 'M0,30 C55,40 110,20 165,30 C220,40 275,20 330,30 C352,35 364,26 375,30 L375,60 L0,60 Z'
  const wave2a = 'M0,38 C62,30 124,46 186,38 C248,30 310,46 375,38 L375,60 L0,60 Z'
  const wave2b = 'M0,44 C62,50 124,36 186,44 C248,50 310,36 375,44 L375,60 L0,60 Z'

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        height: 220,
        background:
          'linear-gradient(175deg, #0a1128 0%, #0c1e45 38%, #0d2b60 58%, #081a38 78%, #061428 100%)',
      }}
    >
      {/* ── Stars ─────────────────────────────────────────────────────────── */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.55 }}>
        {[
          [30, 22], [68, 14], [112, 30], [155, 10], [198, 26], [242, 8],
          [285, 20], [318, 15], [48, 38], [135, 42], [210, 36], [290, 40],
          [340, 28], [88, 18], [170, 44], [255, 12],
        ].map(([x, y], i) => (
          <motion.circle
            key={i}
            cx={x} cy={y} r={i % 5 === 0 ? 1.2 : 0.7}
            fill="#f9fafb"
            animate={reduced ? {} : { opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 2.5 + (i % 7) * 0.6, repeat: Infinity, delay: i * 0.18 }}
          />
        ))}
      </svg>

      {/* ── Portofino building silhouettes ─────────────────────────────────── */}
      <svg
        viewBox="0 0 375 120"
        className="absolute bottom-14 left-0 w-full"
        style={{ height: 120 }}
        preserveAspectRatio="xMidYMax meet"
      >
        {/* Left headland / Castello Brown */}
        <rect x="0"   y="52" width="28"  height="70" rx="1" fill="#1a2a4a" />
        <polygon points="0,52 14,38 28,52"             fill="#1a2a4a" />

        {/* Main harbour buildings — Portofino palette */}
        <rect x="30"  y="62" width="16"  height="58" rx="1" fill="#7d2416" opacity="0.9" />
        <rect x="48"  y="50" width="20"  height="70" rx="1" fill="#C8903A" opacity="0.85" />
        <rect x="70"  y="56" width="14"  height="64" rx="1" fill="#E8845C" opacity="0.9" />
        <polygon points="70,56 77,46 84,56"                  fill="#C86040" opacity="0.9" />
        <rect x="86"  y="44" width="22"  height="76" rx="1" fill="#E6B870" opacity="0.9" />
        <polygon points="86,44 97,32 108,44"                 fill="#C8963A" opacity="0.9" />
        <rect x="110" y="58" width="18"  height="62" rx="1" fill="#FAFAF8" opacity="0.85" />
        <rect x="130" y="50" width="20"  height="70" rx="1" fill="#C84B31" opacity="0.9" />
        <polygon points="130,50 140,40 150,50"               fill="#A83828" opacity="0.9" />
        <rect x="152" y="55" width="16"  height="65" rx="1" fill="#F0D090" opacity="0.85" />
        <rect x="170" y="60" width="22"  height="60" rx="1" fill="#E8845C" opacity="0.9" />
        <rect x="194" y="48" width="18"  height="72" rx="1" fill="#C84B31" opacity="0.9" />
        <polygon points="194,48 203,36 212,48"               fill="#A83828" opacity="0.9" />
        {/* Campanile */}
        <rect x="214" y="30" width="10"  height="90" rx="1" fill="#FAFAF8" opacity="0.9" />
        <polygon points="214,30 219,20 224,30"               fill="#C84B31" opacity="0.9" />
        <rect x="226" y="55" width="16"  height="65" rx="1" fill="#E6B870" opacity="0.9" />
        <rect x="244" y="62" width="18"  height="58" rx="1" fill="#D4956A" opacity="0.85" />
        <rect x="264" y="58" width="14"  height="62" rx="1" fill="#F0D090" opacity="0.85" />

        {/* Right headland */}
        <rect x="280" y="50" width="95"  height="70" rx="1" fill="#1a2a4a" />
        <polygon points="280,50 320,30 375,50"               fill="#1a2a4a" />

        {/* Hillside greenery (behind buildings) */}
        <ellipse cx="120" cy="45" rx="80" ry="30"    fill="#1a3a22" opacity="0.65" />
        <ellipse cx="240" cy="50" rx="60" ry="24"    fill="#1a3a22" opacity="0.55" />
      </svg>

      {/* ── Birds ─────────────────────────────────────────────────────────── */}
      <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        <Bird delay={0.0} startX={-20}  endX={210} yPath={[55, 48, 60, 52, 55]} />
        <Bird delay={1.8} startX={-40}  endX={190} yPath={[42, 36, 46, 40, 42]} />
        <Bird delay={3.5} startX={400}  endX={160} yPath={[65, 58, 68, 62, 65]} />
        <Bird delay={5.2} startX={-30}  endX={230} yPath={[35, 28, 38, 32, 35]} />
        <Bird delay={7.0} startX={380}  endX={140} yPath={[50, 44, 54, 48, 50]} />
      </svg>

      {/* ── Sailboat ──────────────────────────────────────────────────────── */}
      <motion.div
        className="absolute"
        style={{ bottom: 54, left: '50%', translateX: '-50%', originY: 1 }}
        animate={reduced ? {} : { y: [0, -5, 0], rotate: [-0.8, 0.8, -0.8] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <svg viewBox="0 0 64 88" width={52} height={72} fill="none">
          {/* Hull */}
          <path d="M8,72 Q32,80 56,72 L52,78 Q32,86 12,78 Z" fill="#1E3A5F" />
          <rect x="10" y="70" width="44" height="6" rx="3" fill="#1E3A5F" />
          {/* Waterline */}
          <rect x="10" y="75" width="44" height="1.5" fill="#c49a3c" opacity="0.9" />
          {/* Mast */}
          <line x1="30" y1="8" x2="30" y2="70" stroke="#8B7355" strokeWidth="1.8" />
          {/* Main sail */}
          <path d="M30,10 L56,65 L30,65 Z" fill="#F5F0E8" opacity="0.93" />
          {/* Jib */}
          <path d="M30,22 L12,62 L30,62 Z" fill="#EDE8DC" opacity="0.82" />
          {/* Boom */}
          <line x1="30" y1="68" x2="52" y2="68" stroke="#8B7355" strokeWidth="1.2" />
          {/* Rigging */}
          <line x1="30" y1="10" x2="56" y2="70" stroke="#c49a3c" strokeWidth="0.6" opacity="0.5" />
          <line x1="30" y1="10" x2="12" y2="70" stroke="#c49a3c" strokeWidth="0.6" opacity="0.5" />
          {/* iPhone screen glow on mainsail */}
          <rect x="34" y="16" width="18" height="38" rx="2"  fill="#0A1628"  opacity="0.9" />
          <rect x="35" y="17" width="16" height="36" rx="1.5" fill="#14B8A6" opacity="0.22" />
          <line x1="36" y1="25" x2="50" y2="25" stroke="#c49a3c" strokeWidth="0.7" opacity="0.7" />
          <line x1="36" y1="30" x2="48" y2="30" stroke="#c49a3c" strokeWidth="0.7" opacity="0.5" />
          <line x1="36" y1="35" x2="44" y2="35" stroke="#c49a3c" strokeWidth="0.7" opacity="0.4" />
        </svg>
      </motion.div>

      {/* ── Wave layers ────────────────────────────────────────────────────── */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 375 60"
        style={{ height: 60 }}
        preserveAspectRatio="none"
      >
        {/* Deep layer */}
        <motion.path
          d={wave2a}
          fill="#061428"
          opacity={0.7}
          animate={reduced ? {} : { d: [wave2a, wave2b, wave2a] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Surface layer with teal shimmer */}
        <motion.path
          d={wave1a}
          fill="#081E38"
          animate={reduced ? {} : { d: [wave1a, wave1b, wave1a] }}
          transition={{ duration: 4.0, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Tiffany shimmer line */}
        <motion.path
          d="M0,36 C90,28 180,44 270,36 C315,32 350,40 375,36"
          fill="none"
          stroke="#81d8d0"
          strokeWidth="0.6"
          opacity={0.35}
          animate={reduced ? {} : { d: [
            'M0,36 C90,28 180,44 270,36 C315,32 350,40 375,36',
            'M0,40 C90,48 180,32 270,40 C315,44 350,36 375,40',
            'M0,36 C90,28 180,44 270,36 C315,32 350,40 375,36',
          ] }}
          transition={{ duration: 4.0, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>

      {/* ── Overlay gradient (bottom-to-transparent) ────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 w-full h-8 pointer-events-none"
        style={{ background: 'linear-gradient(to top, #0a1128, transparent)' }}
      />

      {/* ── SAIL logotype overlay ──────────────────────────────────────────── */}
      <div className="absolute top-4 left-4">
        <span
          className="text-xs tracking-[0.22em] uppercase font-medium"
          style={{ color: '#c49a3c', fontFamily: "'Archivo', sans-serif", letterSpacing: '0.22em' }}
        >
          Sail AI
        </span>
        <div
          className="text-[10px] tracking-widest opacity-55"
          style={{ color: '#81d8d0', fontFamily: "'Archivo', sans-serif" }}
        >
          Portofino · Intelligence
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric card — glassmorphism tile
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({ metric, index }: { metric: Metric; index: number }) {
  return (
    <motion.div
      variants={fadeUp}
      className="relative rounded-xl p-4 overflow-hidden"
      style={{
        background: 'rgba(10, 17, 40, 0.72)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid rgba(196, 154, 60, 0.22)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      }}
    >
      {/* Gold accent line at top */}
      <div
        className="absolute top-0 left-4 right-4 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #c49a3c 40%, transparent)' }}
      />

      <div
        className="text-[10px] tracking-[0.18em] uppercase mb-2 opacity-60"
        style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}
      >
        {metric.label}
      </div>

      <div
        className="text-2xl font-semibold mb-1 leading-none"
        style={{ color: '#f9fafb', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
      >
        {metric.value}
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="text-[11px] font-medium"
          style={{ color: metric.positive ? '#81d8d0' : '#f87171' }}
        >
          {metric.positive ? (
            <TrendingUp size={10} className="inline mr-0.5" />
          ) : (
            <TrendingDown size={10} className="inline mr-0.5" />
          )}
          {metric.delta}
        </span>
        <span className="text-[10px] opacity-40" style={{ color: '#f9fafb' }}>
          {metric.detail}
        </span>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Insight banner
// ─────────────────────────────────────────────────────────────────────────────

function InsightBanner() {
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-xl p-4 flex gap-3"
      style={{
        background: 'rgba(129, 216, 208, 0.07)',
        border: '1px solid rgba(129, 216, 208, 0.20)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="shrink-0 mt-0.5">
        <Zap size={14} style={{ color: '#81d8d0' }} />
      </div>
      <div>
        <div
          className="text-[11px] font-medium mb-1"
          style={{ color: '#81d8d0', fontFamily: "'Archivo', sans-serif", letterSpacing: '0.06em' }}
        >
          KAIROS Signal
        </div>
        <p className="text-[12px] leading-5 opacity-80" style={{ color: '#f9fafb' }}>
          ICP shift detected — decision authority migrating from IT Directors to Revenue Ops.
          Recommend updating outbound sequences before Q4 budget lock.
        </p>
      </div>
      <ChevronRight size={14} className="shrink-0 self-center opacity-30" style={{ color: '#f9fafb' }} />
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview tab
// ─────────────────────────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4"
    >
      {/* Hero */}
      <motion.div variants={fadeUp}>
        <PortofinoHero />
      </motion.div>

      {/* Section label */}
      <motion.div variants={fadeUp}>
        <div
          className="text-[10px] tracking-[0.22em] uppercase opacity-45 mb-3"
          style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}
        >
          Portfolio Metrics
        </div>
        <div className="grid grid-cols-2 gap-3">
          {METRICS.map((m, i) => (
            <MetricCard key={m.label} metric={m} index={i} />
          ))}
        </div>
      </motion.div>

      {/* Insight */}
      <InsightBanner />

      {/* Benchmark bar */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl p-4"
        style={{
          background: 'rgba(10, 17, 40, 0.72)',
          border: '1px solid rgba(196, 154, 60, 0.18)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div
          className="text-[10px] tracking-[0.18em] uppercase opacity-50 mb-3"
          style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}
        >
          Sector Position
        </div>
        {SECTORS.slice(0, 3).map(s => (
          <div key={s.name} className="flex items-center gap-3 mb-2.5 last:mb-0">
            <div className="w-24 shrink-0 text-[11px] opacity-65" style={{ color: '#f9fafb' }}>
              {s.name}
            </div>
            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: s.color, width: `${s.score}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${s.score}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div
              className="w-6 text-right text-[11px] font-medium shrink-0"
              style={{ color: s.color }}
            >
              {s.score}
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics tab
// ─────────────────────────────────────────────────────────────────────────────

const MOMENTUM = [
  { label: 'G2 Review Velocity',  val: '+14 reviews/wk',  trend: 'up',   color: '#81d8d0' },
  { label: 'Trial Activation',    val: '62% week-2',      trend: 'down', color: '#c49a3c' },
  { label: 'Competitive Wins',    val: '6 of 10',         trend: 'down', color: '#c49a3c' },
  { label: 'NRR Trajectory',      val: '112% → 118%',     trend: 'up',   color: '#81d8d0' },
  { label: 'Outbound Reply Rate', val: '8.4%',            trend: 'up',   color: '#81d8d0' },
]

function AnalyticsTab() {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4"
    >
      {/* Section header */}
      <motion.div variants={fadeUp}>
        <h2
          className="text-xl font-normal leading-tight mb-0.5"
          style={{ color: '#f9fafb', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          Sector Intelligence
        </h2>
        <p className="text-[12px] opacity-45" style={{ color: '#f9fafb' }}>
          MRR bracket performance — updated 2h ago
        </p>
      </motion.div>

      {/* Sector bars */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl p-4"
        style={{
          background: 'rgba(10, 17, 40, 0.72)',
          border: '1px solid rgba(196, 154, 60, 0.22)',
          backdropFilter: 'blur(18px)',
        }}
      >
        {SECTORS.map((s, i) => (
          <div key={s.name} className="mb-4 last:mb-0">
            <div className="flex justify-between items-end mb-1.5">
              <div>
                <span className="text-[12px]" style={{ color: '#f9fafb' }}>{s.name}</span>
                <span
                  className="ml-2 text-[10px] tracking-wider px-1.5 py-0.5 rounded"
                  style={{
                    color: '#81d8d0',
                    background: 'rgba(129, 216, 208, 0.10)',
                    fontFamily: "'Archivo', sans-serif",
                  }}
                >
                  {s.bracket}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-[11px]"
                  style={{ color: s.delta > 0 ? '#81d8d0' : '#f87171' }}
                >
                  {s.delta > 0 ? '+' : ''}{s.delta}
                </span>
                <span className="text-[13px] font-medium" style={{ color: s.color }}>
                  {s.score}
                </span>
              </div>
            </div>
            {/* Bar track */}
            <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <motion.div
                className="h-full rounded-full relative overflow-hidden"
                style={{ background: s.color, width: `${s.score}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${s.score}%` }}
                transition={{ duration: 0.9, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-y-0 w-8"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
                  animate={{ x: ['-100%', '400%'] }}
                  transition={{ duration: 1.8, delay: 0.8 + i * 0.1, ease: 'easeIn' }}
                />
              </motion.div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Momentum signals */}
      <motion.div variants={fadeUp}>
        <div
          className="text-[10px] tracking-[0.18em] uppercase opacity-45 mb-3"
          style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}
        >
          Momentum Signals
        </div>
        <div className="flex flex-col gap-2.5">
          {MOMENTUM.map(m => (
            <div
              key={m.label}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{
                background: 'rgba(10, 17, 40, 0.55)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div className="flex items-center gap-2.5">
                {m.trend === 'up' ? (
                  <TrendingUp size={12} style={{ color: '#81d8d0' }} />
                ) : (
                  <TrendingDown size={12} style={{ color: '#f87171' }} />
                )}
                <span className="text-[12px] opacity-75" style={{ color: '#f9fafb' }}>
                  {m.label}
                </span>
              </div>
              <span className="text-[12px] font-medium" style={{ color: m.color }}>
                {m.val}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// KAIROS Insight display components
// ─────────────────────────────────────────────────────────────────────────────

const IMPACT_COLOR: Record<string, string> = {
  HIGH: '#f87171',
  MED:  '#c49a3c',
  LOW:  '#81d8d0',
}

function ImpactBadge({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded font-medium tracking-wide"
      style={{
        color:      IMPACT_COLOR[value] ?? '#81d8d0',
        background: `${IMPACT_COLOR[value] ?? '#81d8d0'}14`,
        fontFamily: "'Archivo', sans-serif",
      }}
    >
      {label} {value}
    </span>
  )
}

function InsightPanel({ insight, meta, onReset }: {
  insight: KairosInsight
  meta:    KairosMeta
  onReset: () => void
}) {
  const pct = Math.round(insight.confidence * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-xl p-4 flex flex-col gap-4"
      style={{
        background:    'rgba(10, 17, 40, 0.80)',
        border:        '1px solid rgba(129, 216, 208, 0.22)',
        backdropFilter:'blur(18px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles size={12} style={{ color: '#81d8d0' }} />
        <span
          className="text-[10px] tracking-[0.18em] uppercase"
          style={{ color: '#81d8d0', fontFamily: "'Archivo', sans-serif" }}
        >
          KAIROS Analysis
        </span>
        <CheckCircle2 size={11} style={{ color: '#81d8d0', marginLeft: 'auto' }} />
      </div>

      {/* Summary */}
      <p className="text-[13px] leading-6" style={{ color: '#f9fafb' }}>
        {insight.summary}
      </p>

      {/* Signals */}
      {insight.signals.length > 0 && (
        <div>
          <div
            className="text-[9px] tracking-[0.18em] uppercase mb-2 opacity-40"
            style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}
          >
            Market Signals
          </div>
          <div className="flex flex-col gap-1.5">
            {insight.signals.map((s, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="mt-0.5 shrink-0 text-[11px]" style={{ color: '#81d8d0' }}>→</span>
                <p className="text-[12px] leading-5 opacity-80" style={{ color: '#f9fafb' }}>{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority actions */}
      {insight.actions.length > 0 && (
        <div>
          <div
            className="text-[9px] tracking-[0.18em] uppercase mb-2 opacity-40"
            style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}
          >
            Priority Actions
          </div>
          <div className="flex flex-col gap-2">
            {insight.actions.map((a, i) => (
              <div
                key={i}
                className="rounded-lg px-3 py-2.5"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border:     '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <p className="text-[12px] mb-1.5" style={{ color: '#f9fafb' }}>{a.label}</p>
                <div className="flex gap-1.5 flex-wrap">
                  <ImpactBadge label="Impact" value={a.impact} />
                  <ImpactBadge label="Effort" value={a.effort} />
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded tracking-wide"
                    style={{
                      color:      'rgba(249,250,251,0.45)',
                      background: 'rgba(255,255,255,0.05)',
                      fontFamily: "'Archivo', sans-serif",
                    }}
                  >
                    {a.timeline}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Benchmarks */}
      {insight.benchmarks.length > 0 && (
        <div>
          <div
            className="text-[9px] tracking-[0.18em] uppercase mb-2 opacity-40"
            style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}
          >
            Benchmarks
          </div>
          <div className="flex flex-col gap-1">
            {insight.benchmarks.map((b, i) => (
              <div key={i} className="flex justify-between items-baseline gap-2">
                <span className="text-[11px] opacity-60 truncate" style={{ color: '#f9fafb' }}>
                  {b.metric}
                </span>
                <span className="text-[12px] font-medium shrink-0" style={{ color: '#c49a3c' }}>
                  {b.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {insight.risks.length > 0 && (
        <div>
          <div
            className="text-[9px] tracking-[0.18em] uppercase mb-2 opacity-40"
            style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}
          >
            Counter-Signals
          </div>
          <div className="flex flex-col gap-1.5">
            {insight.risks.map((r, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="mt-0.5 shrink-0 text-[10px]" style={{ color: '#f87171' }}>⚠</span>
                <p className="text-[12px] leading-5 opacity-75" style={{ color: '#f9fafb' }}>{r}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confidence bar */}
      <div>
        <div className="flex justify-between mb-1">
          <span
            className="text-[9px] tracking-[0.14em] uppercase opacity-35"
            style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}
          >
            Confidence
          </span>
          <span className="text-[10px]" style={{ color: '#81d8d0' }}>{pct}%</span>
        </div>
        <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #81d8d0, #c49a3c)' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div
          className="text-[10px] opacity-25 mt-1"
          style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}
        >
          {meta.sourcesFound} sources · {meta.model}
        </div>
      </div>

      {/* Action row */}
      <div
        className="flex gap-2 pt-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {['Save', 'Export'].map(action => (
          <button
            key={action}
            className="flex-1 py-2 rounded-lg text-[11px] font-medium min-h-[36px]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border:     '1px solid rgba(255,255,255,0.08)',
              color:      'rgba(249,250,251,0.55)',
              fontFamily: "'Archivo', sans-serif",
            }}
          >
            {action}
          </button>
        ))}
        <button
          onClick={onReset}
          className="flex-1 py-2 rounded-lg text-[11px] font-medium min-h-[36px]"
          style={{
            background: 'rgba(196,154,60,0.08)',
            border:     '1px solid rgba(196,154,60,0.28)',
            color:      '#c49a3c',
            fontFamily: "'Archivo', sans-serif",
          }}
        >
          New Query
        </button>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategy tab — Central Operations Module (wired to KAIROS deep-explore)
// ─────────────────────────────────────────────────────────────────────────────

const SECTOR_NAMES = ['SaaS B2B', 'PLG SaaS', 'E-Commerce', 'Marketplace', 'FinTech']

function StrategyTab() {
  const [mode,    setMode]    = useState<AIMode>('explore')
  const [sector,  setSector]  = useState('SaaS B2B')
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [insight, setInsight] = useState<KairosInsight | null>(null)
  const [meta,    setMeta]    = useState<KairosMeta | null>(null)

  const activeModeConfig = useMemo(() => AI_MODES.find(m => m.id === mode)!, [mode])

  const reset = useCallback(() => {
    setInsight(null)
    setError(null)
    setQuery('')
  }, [])

  const handleModeChange = useCallback((m: AIMode) => {
    setMode(m)
    setInsight(null)
    setError(null)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (insight || loading) return
    setLoading(true)
    setError(null)

    const apiKey =
      typeof window !== 'undefined'
        ? localStorage.getItem('sail_groq_key') ?? undefined
        : undefined

    const queries = buildQueries(mode, sector, query)

    try {
      const res = await fetch('/api/edge-agents/deep-explore', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sector, queries, apiKey }),
      })

      if (res.status === 401) {
        setError('Sign in to unlock KAIROS analysis — intelligence runs on your account.')
        return
      }
      if (res.status === 503) {
        setError('Search service not configured on this deployment — contact your admin.')
        return
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' })) as { error?: string }
        setError(body.error ?? `Request failed (${res.status})`)
        return
      }

      const data = await res.json() as { insight: KairosInsight; meta: KairosMeta }
      setInsight(data.insight)
      setMeta(data.meta)
    } catch {
      setError('Network error — check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [insight, loading, mode, sector, query])

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h2
          className="text-xl font-normal leading-tight mb-0.5"
          style={{ color: '#f9fafb', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          Central Operations
        </h2>
        <p className="text-[12px] opacity-45" style={{ color: '#f9fafb' }}>
          KAIROS — autonomous intelligence engine
        </p>
      </motion.div>

      {/* Mode selector */}
      <motion.div variants={fadeUp} className="flex gap-2.5">
        {AI_MODES.map(m => {
          const active = m.id === mode
          return (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              className="flex-1 rounded-xl py-3 px-2 text-center transition-all duration-200 min-h-[44px]"
              style={{
                background: active ? 'rgba(10, 17, 40, 0.90)' : 'rgba(10, 17, 40, 0.45)',
                border:     active
                  ? `1px solid ${m.accent}`
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow:  active ? `0 0 18px ${m.accent}22` : 'none',
              }}
            >
              <div className="text-base mb-0.5" style={{ color: active ? m.accent : 'rgba(249,250,251,0.4)' }}>
                {m.icon}
              </div>
              <div
                className="text-[10px] tracking-wide font-medium"
                style={{ color: active ? m.accent : 'rgba(249,250,251,0.4)', fontFamily: "'Archivo', sans-serif" }}
              >
                {m.label}
              </div>
            </button>
          )
        })}
      </motion.div>

      {/* Mode tagline */}
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-[12px] leading-5 opacity-55 px-1"
        style={{ color: '#f9fafb' }}
      >
        {activeModeConfig.tagline}
      </motion.div>

      {/* Sector chips */}
      <motion.div variants={fadeUp} className="flex gap-1.5 flex-wrap">
        {SECTOR_NAMES.map(s => (
          <button
            key={s}
            onClick={() => setSector(s)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-150 min-h-[28px]"
            style={{
              background: s === sector ? 'rgba(129,216,208,0.14)' : 'rgba(255,255,255,0.04)',
              border:     `1px solid ${s === sector ? '#81d8d0' : 'rgba(255,255,255,0.08)'}`,
              color:      s === sector ? '#81d8d0' : 'rgba(249,250,251,0.45)',
              fontFamily: "'Archivo', sans-serif",
            }}
          >
            {s}
          </button>
        ))}
      </motion.div>

      {/* Query input */}
      <motion.div variants={fadeUp}>
        <div
          className="rounded-xl overflow-hidden"
          style={{
            background:    'rgba(10, 17, 40, 0.72)',
            border:        `1px solid ${loading ? 'rgba(129,216,208,0.35)' : 'rgba(196,154,60,0.18)'}`,
            backdropFilter:'blur(18px)',
            transition:    'border-color 0.25s',
          }}
        >
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={loading}
            placeholder={
              mode === 'explore'
                ? `e.g. "Analyse competitive dynamics in ${sector}"`
                : mode === 'diagnose'
                ? `e.g. "Why is our ${sector} activation rate declining?"`
                : `e.g. "Build a 90-day plan to grow ${sector} NRR to 118%"`
            }
            rows={3}
            className="w-full px-4 pt-4 pb-2 bg-transparent text-[13px] leading-5 resize-none outline-none"
            style={{
              color:      loading ? 'rgba(249,250,251,0.45)' : '#f9fafb',
              fontFamily: "'Archivo', sans-serif",
              caretColor: '#81d8d0',
            }}
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <span className="text-[10px] opacity-25" style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}>
              Powered by Groq · 70B · {sector}
            </span>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-medium transition-all duration-200 min-h-[36px]"
              style={{
                background: loading ? 'rgba(129,216,208,0.10)' : 'rgba(196,154,60,0.20)',
                border:     `1px solid ${loading ? 'rgba(129,216,208,0.40)' : 'rgba(196,154,60,0.40)'}`,
                color:      loading ? '#81d8d0' : '#c49a3c',
                fontFamily: "'Archivo', sans-serif",
                opacity:    loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <motion.span
                    className="inline-block w-2.5 h-2.5 rounded-full border border-current border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  Thinking…
                </>
              ) : (
                <><Send size={11} />Analyse</>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Error state */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-4 flex gap-3"
            style={{
              background: 'rgba(248,113,113,0.07)',
              border:     '1px solid rgba(248,113,113,0.22)',
            }}
          >
            <AlertCircle size={14} className="shrink-0" style={{ color: '#f87171' }} />
            <p className="text-[12px] leading-5" style={{ color: '#f9fafb' }}>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Insight panel — real KAIROS structured response */}
      <AnimatePresence>
        {insight && meta && (
          <InsightPanel insight={insight} meta={meta} onReset={reset} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings tab
// ─────────────────────────────────────────────────────────────────────────────

function SettingsTab() {
  const [groqKey,   setGroqKey]   = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('sail_groq_key') ?? '' : ''
  )
  const [showKey,   setShowKey]   = useState(false)
  const [saved,     setSaved]     = useState(false)

  const saveKey = useCallback(() => {
    localStorage.setItem('sail_groq_key', groqKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [groqKey])

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <motion.div variants={fadeUp}>
        <h2
          className="text-xl font-normal leading-tight mb-0.5"
          style={{ color: '#f9fafb', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          Configuration
        </h2>
        <p className="text-[12px] opacity-45" style={{ color: '#f9fafb' }}>
          Workspace settings and API credentials
        </p>
      </motion.div>

      {/* Groq API Key */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl p-4"
        style={{
          background: 'rgba(10, 17, 40, 0.72)',
          border: '1px solid rgba(196, 154, 60, 0.22)',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Lock size={12} style={{ color: '#c49a3c' }} />
          <span
            className="text-[10px] tracking-[0.18em] uppercase"
            style={{ color: '#c49a3c', fontFamily: "'Archivo', sans-serif" }}
          >
            Groq API Key (BYOK)
          </span>
        </div>
        <p className="text-[11px] opacity-45 mb-3 leading-4" style={{ color: '#f9fafb' }}>
          Stored locally only — never sent to our servers. Used directly in your browser for AI analysis.
        </p>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={groqKey}
            onChange={e => setGroqKey(e.target.value)}
            placeholder="gsk_..."
            className="w-full px-3 py-2.5 rounded-lg text-[12px] bg-transparent outline-none pr-10"
            style={{
              color: '#f9fafb',
              border: '1px solid rgba(255,255,255,0.12)',
              fontFamily: "'Archivo', sans-serif",
              caretColor: '#81d8d0',
            }}
          />
          <button
            onClick={() => setShowKey(v => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {showKey ? <EyeOff size={13} style={{ color: '#f9fafb' }} /> : <Eye size={13} style={{ color: '#f9fafb' }} />}
          </button>
        </div>
        <button
          onClick={saveKey}
          className="mt-3 w-full py-2.5 rounded-lg text-[12px] font-medium transition-all duration-200 min-h-[44px]"
          style={{
            background: saved ? 'rgba(129, 216, 208, 0.15)' : 'rgba(196, 154, 60, 0.14)',
            border: `1px solid ${saved ? '#81d8d0' : '#c49a3c'}`,
            color: saved ? '#81d8d0' : '#c49a3c',
            fontFamily: "'Archivo', sans-serif",
          }}
        >
          {saved ? '✓ Saved locally' : 'Save Key'}
        </button>
      </motion.div>

      {/* Preferences */}
      <motion.div
        variants={fadeUp}
        className="rounded-xl overflow-hidden"
        style={{
          background: 'rgba(10, 17, 40, 0.72)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(18px)',
        }}
      >
        {[
          { label: 'MRR Bracket',          value: '10-50k'        },
          { label: 'Primary Sector',        value: 'SaaS B2B'      },
          { label: 'Analysis Depth',        value: 'Deep (70B)'    },
          { label: 'Memory Sync',           value: 'Enabled'       },
          { label: 'Language',              value: 'English'       },
        ].map((pref, i, arr) => (
          <div
            key={pref.label}
            className="flex items-center justify-between px-4 py-3.5 min-h-[52px]"
            style={{
              borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}
          >
            <span className="text-[13px] opacity-65" style={{ color: '#f9fafb' }}>
              {pref.label}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[12px]" style={{ color: '#81d8d0' }}>
                {pref.value}
              </span>
              <ChevronRight size={12} className="opacity-30" style={{ color: '#f9fafb' }} />
            </div>
          </div>
        ))}
      </motion.div>

      {/* Version */}
      <motion.div
        variants={fadeUp}
        className="text-center pt-2 pb-4"
      >
        <div className="text-[10px] opacity-25" style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}>
          Sail AI · Version 0.9.2 · Build 2026.06
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom navigation — iOS native pattern
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  id:    Tab
  label: string
  Icon:  LucideIcon
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview',  label: 'Overview',  Icon: LayoutGrid },
  { id: 'analytics', label: 'Analytics', Icon: BarChart2  },
  { id: 'strategy',  label: 'Strategy',  Icon: Compass    },
  { id: 'settings',  label: 'Settings',  Icon: Settings2  },
]

function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
      style={{
        background: 'rgba(8, 12, 28, 0.88)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(196, 154, 60, 0.15)',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      }}
    >
      {NAV_ITEMS.map(item => {
        const isActive = item.id === active
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 pt-2.5 pb-1 min-h-[52px] relative"
          >
            {/* Active indicator dot */}
            {isActive && (
              <motion.div
                layoutId="nav-dot"
                className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full"
                style={{ background: '#c49a3c' }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <item.Icon
              size={20}
              color={isActive ? '#c49a3c' : 'rgba(249,250,251,0.32)'}
            />
            <span
              className="text-[9px] tracking-wide"
              style={{
                color: isActive ? '#c49a3c' : 'rgba(249,250,251,0.32)',
                fontFamily: "'Archivo', sans-serif",
                letterSpacing: '0.04em',
              }}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticky header
// ─────────────────────────────────────────────────────────────────────────────

function StickyHeader({ tab }: { tab: Tab }) {
  const TITLES: Record<Tab, string> = {
    overview:  'Sail AI',
    analytics: 'Analytics',
    strategy:  'Strategy',
    settings:  'Settings',
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3.5"
      style={{
        background: 'rgba(8, 12, 28, 0.82)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        borderBottom: '1px solid rgba(196, 154, 60, 0.12)',
        paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
      }}
    >
      <div className="flex items-center gap-2.5">
        <Anchor size={14} style={{ color: '#c49a3c' }} />
        <AnimatePresence mode="wait">
          <motion.span
            key={tab}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.22 }}
            className="text-[13px] font-medium tracking-wide"
            style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}
          >
            {TITLES[tab]}
          </motion.span>
        </AnimatePresence>
      </div>

      {/* Signal indicator */}
      <div className="flex items-center gap-1.5">
        <motion.div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: '#81d8d0' }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />
        <span className="text-[10px] opacity-45" style={{ color: '#f9fafb', fontFamily: "'Archivo', sans-serif" }}>
          Live
        </span>
      </div>
    </header>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Google Fonts injector
// ─────────────────────────────────────────────────────────────────────────────

function FontProvider() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300&family=Archivo:wght@400;500;600&display=swap');
    `}</style>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Root dashboard component
// ─────────────────────────────────────────────────────────────────────────────

export default function SwissPrecisionDashboard() {
  const [tab, setTab] = useState<Tab>('overview')

  return (
    <>
      <FontProvider />

      {/* Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{ background: '#0a1128' }}
      >
        {/* Subtle radial glow — top-left gold, bottom-right tiffany */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 15% 20%, rgba(196,154,60,0.06) 0%, transparent 60%), ' +
              'radial-gradient(ellipse 50% 35% at 85% 80%, rgba(129,216,208,0.05) 0%, transparent 60%)',
          }}
        />
      </div>

      <StickyHeader tab={tab} />

      {/* Scrollable content */}
      <main
        className="min-h-screen px-4 pb-24"
        style={{
          paddingTop: 'calc(max(56px, env(safe-area-inset-top, 56px)) + 56px)',
          maxWidth: 500,
          margin: '0 auto',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            variants={slideRight}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {tab === 'overview'  && <OverviewTab  />}
            {tab === 'analytics' && <AnalyticsTab />}
            {tab === 'strategy'  && <StrategyTab  />}
            {tab === 'settings'  && <SettingsTab  />}
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </>
  )
}
