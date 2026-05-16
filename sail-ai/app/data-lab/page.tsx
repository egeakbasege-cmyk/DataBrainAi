'use client'

/**
 * /data-lab — Data Ingestion & Synthesis
 * ────────────────────────────────────────
 * Auth-guarded page. Connects platform data sources to a Groq-powered
 * analysis pipeline and renders structured intelligence output.
 */

import { useSession }               from 'next-auth/react'
import { useRouter }                from 'next/navigation'
import { useEffect, useState, useRef, useCallback } from 'react'
import { Nav }                      from '@/components/Nav'
import { ALL_CONNECTORS, useConnectorState, type ConnectorDef } from '@/components/ConnectorDock'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type AnalysisMode = 'upwind' | 'sail' | 'operator'

interface KeyMetric {
  label:   string
  value:   string
  change:  string
  trend:   'up' | 'down' | 'neutral'
  context: string
}

interface ActionStep {
  priority:       'critical' | 'high' | 'medium'
  step:           string
  rationale:      string
  timeline:       string
  expectedImpact: string
}

interface Insight {
  category:    string
  finding:     string
  dataPoint:   string
  implication: string
}

interface RiskFlag {
  severity:   'high' | 'medium' | 'low'
  risk:       string
  mitigation: string
}

interface AnalysisResult {
  headline:         string
  executiveSummary: string
  keyMetrics:       KeyMetric[]
  actionSteps:      ActionStep[]
  insights:         Insight[]
  riskFlags:        RiskFlag[]
  dataSources:      string[]
  confidenceScore:  number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { id: 'connect',    label: 'Connecting to data sources' },
  { id: 'fetch',      label: 'Retrieving platform records' },
  { id: 'benchmark',  label: 'Matching industry benchmarks' },
  { id: 'synthesise', label: 'Synthesising with Groq 70B' },
  { id: 'structure',  label: 'Structuring intelligence report' },
]

const STAGE_DURATION_MS = 900

const MODES: { id: AnalysisMode; label: string; badge: string; desc: string }[] = [
  { id: 'upwind',   label: 'Upwind',   badge: 'EXEC',    desc: 'Structured executive report' },
  { id: 'sail',     label: 'SAIL',     badge: 'ADAPTIVE',desc: 'Adaptive market intelligence' },
  { id: 'operator', label: 'Operator', badge: 'ACTION',  desc: 'Hyper-tactical execution plan' },
]

const EXAMPLE_PROMPTS = [
  "Shopify son 30 günlük iade oranımı analiz et, kök nedenleri belirle ve iade oranını %5 altına çekmek için eylem planı çıkar",
  "Amazon Buy Box kaybettiğim ürünleri tespit et, rakip fiyat boşluklarını ölç ve kazanmak için 3 günlük aksiyon adımlarını ver",
  "TikTok ve Meta reklamlarımı karşılaştır, hangisinde ROAS potansiyeli daha yüksek ve bütçeyi nasıl optimize etmeliyim",
  "Tüm aktif platformlarımı birlikte değerlendir ve öncelikli büyüme kaldıraçlarını haritalandır",
]

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: 'rgba(239,68,68,0.06)',   text: '#DC2626', border: 'rgba(239,68,68,0.2)',   dot: '#DC2626' },
  high:     { bg: 'rgba(245,158,11,0.06)',  text: '#D97706', border: 'rgba(245,158,11,0.2)',  dot: '#D97706' },
  medium:   { bg: 'rgba(201,169,110,0.06)', text: '#C9A96E', border: 'rgba(201,169,110,0.2)', dot: '#C9A96E' },
}

const SEVERITY_STYLES: Record<string, { text: string; bg: string; border: string }> = {
  high:   { text: '#DC2626', bg: 'rgba(239,68,68,0.05)',   border: 'rgba(239,68,68,0.15)'   },
  medium: { text: '#D97706', bg: 'rgba(245,158,11,0.05)',  border: 'rgba(245,158,11,0.15)'  },
  low:    { text: '#71717A', bg: 'rgba(0,0,0,0.03)',       border: 'rgba(0,0,0,0.08)'       },
}

// ─────────────────────────────────────────────────────────────────────────────
// ConnectorLogo (inline — reuses same pattern as ConnectorDock)
// ─────────────────────────────────────────────────────────────────────────────

function PlatformLogo({ c, active, size = 18 }: { c: ConnectorDef; active: boolean; size?: number }) {
  const [err, setErr] = useState(false)
  if (c.iconSlug && !err) {
    return (
      <img
        src={`/icons/${c.iconSlug}-${active ? 'active' : 'inactive'}.svg`}
        alt={c.label}
        width={size}
        height={size}
        onError={() => setErr(true)}
        style={{ display: 'block', flexShrink: 0 }}
      />
    )
  }
  const letter = c.letter ?? c.label[0]
  return (
    <span style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      width:          size,
      height:         size,
      borderRadius:   3,
      background:     active ? c.accentColor + '22' : '#F3F4F6',
      color:          active ? c.accentColor : '#9CA3AF',
      fontSize:       size * 0.58,
      fontWeight:     700,
      fontFamily:     'Inter, sans-serif',
      flexShrink:     0,
    }}>
      {letter}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AddDataModal — slide-in panel for connector management
// ─────────────────────────────────────────────────────────────────────────────

function AddDataModal({
  enabledIds,
  analysisActive,
  onToggle,
  onClose,
}: {
  enabledIds:    Set<string>
  analysisActive: boolean
  onToggle:      (id: string) => void
  onClose:       () => void
}) {
  const GROUPS = [
    { label: 'Marketplace',   domain: 'ecommerce'  },
    { label: 'Social & Ads', domain: 'social'     },
    { label: 'Creator',       domain: 'creator'    },
    { label: 'Resale',        domain: 'secondhand' },
    { label: 'Analytics',     domain: 'analytics'  },
    { label: 'Real Estate',   domain: 'local'      },
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(12,12,14,0.4)', backdropFilter: 'blur(4px)' }}
      />
      {/* Panel */}
      <div style={{
        position:    'fixed',
        top:         0,
        right:       0,
        bottom:      0,
        zIndex:      51,
        width:       '100%',
        maxWidth:    380,
        background:  '#FFFFFF',
        borderLeft:  '1px solid rgba(0,0,0,0.1)',
        overflowY:   'auto',
        boxShadow:   '-24px 0 64px rgba(0,0,0,0.12)',
        animation:   'slide-in-right 0.28s cubic-bezier(0.16,1,0.3,1) both',
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.25rem', fontWeight: 600, color: '#0C0C0E', margin: 0 }}>
              Connect Data Sources
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#9CA3AF', margin: '0.25rem 0 0', lineHeight: 1.5 }}>
              Toggle platforms to include in analysis
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.1rem', padding: '0.25rem', lineHeight: 1 }}>
            ✕
          </button>
        </div>

        {/* Groups */}
        <div style={{ padding: '1rem 1.5rem 2rem' }}>
          {GROUPS.map(g => {
            const connectors = ALL_CONNECTORS.filter(c => c.domain === g.domain)
            if (!connectors.length) return null
            return (
              <div key={g.domain} style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4C4CC', margin: '0 0 0.625rem 0' }}>
                  {g.label}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {connectors.map(c => {
                    const isActive = enabledIds.has(c.id) && analysisActive
                    return (
                      <button
                        key={c.id}
                        onClick={() => onToggle(c.id)}
                        style={{
                          display:        'flex',
                          alignItems:     'center',
                          gap:            '0.625rem',
                          padding:        '0.625rem 0.75rem',
                          borderRadius:   '8px',
                          border:         `1.5px solid ${isActive ? c.accentColor + '40' : 'rgba(0,0,0,0.07)'}`,
                          background:     isActive ? c.accentColor + '08' : '#FAFAFA',
                          cursor:         'pointer',
                          textAlign:      'left',
                          transition:     'all 0.15s',
                        }}
                      >
                        <PlatformLogo c={c} active={isActive} size={20} />
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 600, color: isActive ? c.accentColor : '#374151', flex: 1 }}>
                          {c.label}
                        </span>
                        {/* Toggle pill */}
                        <span style={{
                          width:        28,
                          height:       15,
                          borderRadius: 999,
                          background:   isActive ? c.accentColor : '#D1D5DB',
                          position:     'relative',
                          flexShrink:   0,
                          display:      'block',
                          transition:   'background 0.2s',
                        }}>
                          <span style={{
                            position:     'absolute',
                            top:          1.5,
                            left:         isActive ? 14 : 1.5,
                            width:        12,
                            height:       12,
                            borderRadius: '50%',
                            background:   '#FFF',
                            boxShadow:    '0 1px 3px rgba(0,0,0,0.2)',
                            transition:   'left 0.2s',
                            display:      'block',
                          }} />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PipelineLoader — animated multi-stage progress
// ─────────────────────────────────────────────────────────────────────────────

function PipelineLoader({ stage }: { stage: number }) {
  return (
    <div style={{
      padding:      '2.5rem 2rem',
      background:   '#FFFFFF',
      border:       '1.5px solid rgba(0,0,0,0.07)',
      borderRadius: '14px',
      boxShadow:    '0 2px 12px rgba(0,0,0,0.04)',
    }}>
      <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 1.5rem 0' }}>
        Analysing your data…
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {PIPELINE_STAGES.map((s, i) => {
          const done    = i < stage
          const active  = i === stage
          const pending = i > stage
          return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Status dot */}
              <div style={{
                width:        20,
                height:       20,
                borderRadius: '50%',
                flexShrink:   0,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                background:   done    ? '#10B981'
                              : active ? 'rgba(201,169,110,0.15)'
                              : 'rgba(0,0,0,0.05)',
                border:       active  ? '1.5px solid rgba(201,169,110,0.5)' : 'none',
                transition:   'all 0.3s',
              }}>
                {done ? (
                  <span style={{ fontSize: 10, color: '#FFF', lineHeight: 1 }}>✓</span>
                ) : active ? (
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: '#C9A96E',
                    animation: 'drift-pulse 1.2s ease-in-out infinite',
                    display: 'block',
                  }} />
                ) : null}
              </div>
              {/* Label */}
              <span style={{
                fontFamily: 'Inter, sans-serif',
                fontSize:   '0.78rem',
                fontWeight: active ? 600 : 400,
                color:      done    ? '#10B981'
                            : active ? '#C9A96E'
                            : '#C4C4CC',
                transition: 'color 0.3s',
              }}>
                {s.label}
                {active && <span style={{ animation: 'blink 0.9s step-end infinite', marginLeft: 2 }}>…</span>}
              </span>
            </div>
          )
        })}
      </div>
      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(0,0,0,0.06)', borderRadius: 999, marginTop: '1.5rem', overflow: 'hidden' }}>
        <div style={{
          height:     '100%',
          background: 'linear-gradient(90deg, #C9A96E, #D4B980)',
          borderRadius: 999,
          width:      `${((stage + 1) / PIPELINE_STAGES.length) * 100}%`,
          transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MetricCard
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({ m }: { m: KeyMetric }) {
  const trendColor = m.trend === 'up' ? '#10B981' : m.trend === 'down' ? '#EF4444' : '#71717A'
  const trendIcon  = m.trend === 'up' ? '▲' : m.trend === 'down' ? '▼' : '→'

  return (
    <div className="animate-matrix-appear" style={{
      padding:      '1rem',
      background:   '#FAFAF8',
      border:       '1px solid rgba(0,0,0,0.07)',
      borderRadius: '10px',
      display:      'flex',
      flexDirection:'column',
      gap:          '0.375rem',
    }}>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', margin: 0 }}>
        {m.label}
      </p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.35rem', fontWeight: 700, color: '#0C0C0E', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {m.value}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 700, color: trendColor }}>
          {trendIcon} {m.change}
        </span>
      </div>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#9CA3AF', margin: 0, lineHeight: 1.4 }}>
        {m.context}
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ActionCard
// ─────────────────────────────────────────────────────────────────────────────

function ActionCard({ a, index }: { a: ActionStep; index: number }) {
  const s = PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.medium

  return (
    <div className="animate-matrix-appear" style={{
      animationDelay: `${index * 60}ms`,
      padding:        '1rem 1.125rem',
      background:     s.bg,
      border:         `1.5px solid ${s.border}`,
      borderRadius:   '10px',
      display:        'grid',
      gridTemplateColumns: '1fr auto',
      gap:            '0.625rem',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {/* Priority badge + step */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.5rem',
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color:         s.text,
            background:    s.border,
            padding:       '0.15rem 0.45rem',
            borderRadius:  3,
          }}>
            {a.priority}
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: '#0C0C0E' }}>
            {a.step}
          </span>
        </div>
        {/* Rationale */}
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#71717A', margin: 0, lineHeight: 1.5 }}>
          {a.rationale}
        </p>
        {/* Expected impact */}
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#10B981', margin: 0, fontWeight: 600 }}>
          → {a.expectedImpact}
        </p>
      </div>
      {/* Timeline */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start' }}>
        <span style={{
          fontFamily:    'Inter, sans-serif',
          fontSize:      '0.62rem',
          fontWeight:    600,
          color:         s.text,
          background:    '#FFFFFF',
          border:        `1px solid ${s.border}`,
          padding:       '0.2rem 0.5rem',
          borderRadius:  4,
          whiteSpace:    'nowrap',
        }}>
          {a.timeline}
        </span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// AnalysisOutput — full structured result render
// ─────────────────────────────────────────────────────────────────────────────

function AnalysisOutput({ result, mode }: { result: AnalysisResult; mode: AnalysisMode }) {
  const [insightsOpen, setInsightsOpen] = useState(true)
  const [risksOpen,    setRisksOpen]    = useState(true)

  const modeLabel = MODES.find(m => m.id === mode)?.label ?? 'SAIL'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Report header ──────────────────────────────────────────────── */}
      <div className="animate-fade-up" style={{
        padding:      '1.5rem',
        background:   'linear-gradient(135deg, rgba(201,169,110,0.06) 0%, rgba(201,169,110,0.01) 100%)',
        border:       '1.5px solid rgba(201,169,110,0.2)',
        borderRadius: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.75rem' }}>
          <span style={{
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.55rem',
            fontWeight:    700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:         '#C9A96E',
            background:    'rgba(201,169,110,0.12)',
            padding:       '0.18rem 0.55rem',
            borderRadius:  4,
            border:        '1px solid rgba(201,169,110,0.25)',
          }}>
            {modeLabel} Intelligence Report
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: '#C4C4CC' }}>
            Confidence {result.confidenceScore}%
          </span>
          {/* Confidence bar */}
          <div style={{ flex: 1, height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height:     '100%',
              width:      `${result.confidenceScore}%`,
              background: result.confidenceScore >= 80 ? '#10B981'
                          : result.confidenceScore >= 60 ? '#D97706'
                          : '#EF4444',
              borderRadius: 999,
              transition:   'width 1s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
        </div>
        <h2 style={{
          fontFamily:  'Cormorant Garamond, Georgia, serif',
          fontSize:    'clamp(1.1rem, 2.5vw, 1.4rem)',
          fontWeight:  600,
          color:       '#0C0C0E',
          margin:      '0 0 0.75rem 0',
          lineHeight:  1.3,
        }}>
          {result.headline}
        </h2>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#52525B', margin: 0, lineHeight: 1.65 }}>
          {result.executiveSummary}
        </p>
        {/* Sources */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: '1rem' }}>
          {result.dataSources?.map((src, i) => (
            <span key={i} style={{
              fontFamily: 'Inter, sans-serif',
              fontSize:   '0.58rem',
              color:      '#9CA3AF',
              background: 'rgba(0,0,0,0.04)',
              border:     '1px solid rgba(0,0,0,0.07)',
              padding:    '0.18rem 0.55rem',
              borderRadius: 999,
            }}>
              {src}
            </span>
          ))}
        </div>
      </div>

      {/* ── Key Metrics ───────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Key Metrics</SectionLabel>
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap:                 '0.625rem',
        }}>
          {result.keyMetrics?.map((m, i) => <MetricCard key={i} m={m} />)}
        </div>
      </section>

      {/* ── Action Steps ──────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Action Plan</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {result.actionSteps?.map((a, i) => <ActionCard key={i} a={a} index={i} />)}
        </div>
      </section>

      {/* ── Insights ──────────────────────────────────────────────────── */}
      <section>
        <button
          onClick={() => setInsightsOpen(o => !o)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0.5rem 0',
          }}
        >
          <SectionLabel noMargin>Intelligence Insights</SectionLabel>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#9CA3AF', transition: 'transform 0.2s', transform: insightsOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
        </button>
        {insightsOpen && (
          <div style={{ border: '1px solid rgba(0,0,0,0.07)', borderRadius: '10px', overflow: 'hidden' }}>
            {result.insights?.map((ins, i) => (
              <div key={i} className="animate-matrix-appear" style={{
                display:      'grid',
                gridTemplateColumns: '120px 1fr',
                gap:          '1rem',
                padding:      '0.875rem 1rem',
                borderBottom: i < result.insights.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                background:   i % 2 === 0 ? '#FFFFFF' : '#FAFAF8',
              }}>
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C9A96E', margin: '0 0 0.25rem 0' }}>
                    {ins.category}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 700, color: '#0C0C0E', margin: '0 0 0.2rem 0' }}>
                    {ins.dataPoint}
                  </p>
                </div>
                <div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 500, color: '#374151', margin: '0 0 0.25rem 0' }}>
                    {ins.finding}
                  </p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#71717A', margin: 0, lineHeight: 1.5 }}>
                    {ins.implication}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Risk Flags ────────────────────────────────────────────────── */}
      {result.riskFlags?.length > 0 && (
        <section>
          <button
            onClick={() => setRisksOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0.5rem 0',
            }}
          >
            <SectionLabel noMargin>Risk Flags</SectionLabel>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#9CA3AF', transition: 'transform 0.2s', transform: risksOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
          </button>
          {risksOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {result.riskFlags.map((r, i) => {
                const s = SEVERITY_STYLES[r.severity] ?? SEVERITY_STYLES.low
                return (
                  <div key={i} className="animate-matrix-appear" style={{
                    padding:      '0.875rem 1rem',
                    background:   s.bg,
                    border:       `1px solid ${s.border}`,
                    borderRadius: '8px',
                    display:      'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap:          '0.875rem',
                    alignItems:   'flex-start',
                  }}>
                    <span style={{
                      fontFamily:    'Inter, sans-serif',
                      fontSize:      '0.55rem',
                      fontWeight:    700,
                      letterSpacing: '0.09em',
                      textTransform: 'uppercase',
                      color:         s.text,
                      background:    '#FFFFFF',
                      border:        `1px solid ${s.border}`,
                      padding:       '0.2rem 0.45rem',
                      borderRadius:  3,
                      whiteSpace:    'nowrap',
                      flexShrink:    0,
                    }}>
                      {r.severity}
                    </span>
                    <div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.25rem 0' }}>
                        {r.risk}
                      </p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#71717A', margin: 0, lineHeight: 1.45 }}>
                        Mitigation: {r.mitigation}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

    </div>
  )
}

// ── Small helper ──────────────────────────────────────────────────────────────
function SectionLabel({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <p style={{
      fontFamily:    'Inter, sans-serif',
      fontSize:      '0.6rem',
      fontWeight:    700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color:         '#A1A1AA',
      margin:        noMargin ? 0 : '0 0 0.625rem 0',
    }}>
      {children}
    </p>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function DataLabPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login?callbackUrl=/data-lab')
  }, [status, router])

  // Connector state (shared with ConnectorDock via localStorage)
  const { enabledIds, analysisActive, toggle, setActive, enableAll, mounted } = useConnectorState()

  // UI state
  const [showAddData, setShowAddData] = useState(false)
  const [mode,        setMode]        = useState<AnalysisMode>('sail')
  const [query,       setQuery]       = useState('')
  const [pipelineStage, setPipelineStage] = useState<number>(-1)   // -1 = idle
  const [isRunning,   setIsRunning]   = useState(false)
  const [result,      setResult]      = useState<AnalysisResult | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const [isMobile,    setIsMobile]    = useState(false)

  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const outputRef      = useRef<HTMLDivElement>(null)
  const stageTimerRefs = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Auto-resize textarea
  const handleQueryChange = useCallback((v: string) => {
    setQuery(v)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [])

  // Active connectors (those enabled AND analysisActive)
  const activeConnectors = ALL_CONNECTORS.filter(c => analysisActive && enabledIds.has(c.id))

  // ── Run analysis ────────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (!query.trim() || isRunning || activeConnectors.length === 0) return

    setIsRunning(true)
    setResult(null)
    setError(null)
    setPipelineStage(0)

    // Clear old timers
    stageTimerRefs.current.forEach(clearTimeout)
    stageTimerRefs.current = []

    // Advance pipeline stages
    for (let i = 1; i < PIPELINE_STAGES.length; i++) {
      const t = setTimeout(() => setPipelineStage(i), i * STAGE_DURATION_MS)
      stageTimerRefs.current.push(t)
    }

    // Total fake pipeline time before API call
    const pipelineDuration = PIPELINE_STAGES.length * STAGE_DURATION_MS

    try {
      const [res] = await Promise.all([
        fetch('/api/data-lab/analyze', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            connectorIds: activeConnectors.map(c => c.id),
            mode,
          }),
        }),
        // Ensure pipeline animation plays fully
        new Promise(r => setTimeout(r, pipelineDuration)),
      ])

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Analysis failed')
      }

      setResult(data.analysis)
      setPipelineStage(-1)

      // Scroll to output
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong. Please try again.')
      setPipelineStage(-1)
    } finally {
      setIsRunning(false)
    }
  }, [query, isRunning, activeConnectors, mode])

  // Keyboard shortcut: Cmd/Ctrl + Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      runAnalysis()
    }
  }, [runAnalysis])

  // Loading skeleton
  if (status === 'loading') {
    return (
      <>
        <Nav />
        <main style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '2px solid rgba(201,169,110,0.3)', borderTopColor: '#C9A96E', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#9CA3AF', margin: 0 }}>Authenticating…</p>
          </div>
        </main>
      </>
    )
  }

  if (!session) return null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <Nav />

      {showAddData && (
        <AddDataModal
          enabledIds={enabledIds}
          analysisActive={analysisActive}
          onToggle={toggle}
          onClose={() => setShowAddData(false)}
        />
      )}

      <main style={{ minHeight: '100vh', background: '#FAFAF8', paddingTop: '2.5rem', paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 1.25rem' }}>

          {/* ── Page Header ─────────────────────────────────────────── */}
          <div className="animate-fade-up" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <span style={{
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.55rem',
                fontWeight:    700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color:         '#C9A96E',
                background:    'rgba(201,169,110,0.1)',
                padding:       '0.2rem 0.6rem',
                borderRadius:  4,
                border:        '1px solid rgba(201,169,110,0.22)',
              }}>
                Data Lab
              </span>
            </div>
            <h1 style={{
              fontFamily:  'Cormorant Garamond, Georgia, serif',
              fontSize:    isMobile ? '1.75rem' : '2.25rem',
              fontWeight:  600,
              color:       '#0C0C0E',
              margin:      '0 0 0.5rem 0',
              lineHeight:  1.1,
              letterSpacing: '-0.02em',
            }}>
              Data Ingestion &amp; Synthesis
            </h1>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#71717A', margin: 0, lineHeight: 1.6, maxWidth: 520 }}>
              Connect your platform accounts, describe your analysis goal in natural language, and receive a structured intelligence report — synthesised by Groq 70B.
            </p>
          </div>

          {/* ── Connected Sources Strip ──────────────────────────────── */}
          <div className="animate-fade-up" style={{
            background:   '#FFFFFF',
            border:       '1.5px solid rgba(0,0,0,0.08)',
            borderRadius: '12px',
            padding:      '0.75rem 1rem',
            marginBottom: '1.25rem',
            display:      'flex',
            alignItems:   'center',
            gap:          '0.625rem',
            flexWrap:     'wrap',
            boxShadow:    '0 1px 6px rgba(0,0,0,0.04)',
          }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C4C4CC', margin: 0, flexShrink: 0 }}>
              Sources
            </p>

            {mounted && activeConnectors.length > 0 ? (
              activeConnectors.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  title={`Remove ${c.label}`}
                  style={{
                    display:     'inline-flex',
                    alignItems:  'center',
                    gap:         '0.35rem',
                    padding:     '0.3rem 0.6rem',
                    borderRadius: 999,
                    border:      `1.5px solid ${c.accentColor}40`,
                    background:  c.accentColor + '0D',
                    cursor:      'pointer',
                    transition:  'all 0.15s',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.accentColor, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600, color: c.accentColor, whiteSpace: 'nowrap' }}>
                    {c.label}
                  </span>
                </button>
              ))
            ) : (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#C4C4CC', fontStyle: 'italic' }}>
                No sources connected
              </span>
            )}

            <div style={{ flex: 1 }} />

            {/* + Add Data */}
            <button
              onClick={() => setShowAddData(true)}
              style={{
                display:       'inline-flex',
                alignItems:    'center',
                gap:           '0.3rem',
                padding:       '0.35rem 0.875rem',
                borderRadius:  999,
                border:        '1.5px solid rgba(201,169,110,0.35)',
                background:    'rgba(201,169,110,0.06)',
                cursor:        'pointer',
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.65rem',
                fontWeight:    700,
                letterSpacing: '0.06em',
                color:         '#C9A96E',
                transition:    'all 0.15s',
                flexShrink:    0,
              }}
            >
              <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>+</span>
              Veri Ekle
            </button>
          </div>

          {/* ── Command Bar ─────────────────────────────────────────── */}
          <div className="animate-fade-up" style={{
            background:   '#FFFFFF',
            border:       '1.5px solid rgba(0,0,0,0.09)',
            borderRadius: '14px',
            overflow:     'hidden',
            marginBottom: '1.5rem',
            boxShadow:    '0 2px 16px rgba(0,0,0,0.06)',
          }}>
            {/* Mode selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0.5rem 0.75rem', gap: '0.375rem' }}>
              {MODES.map(m => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  title={m.desc}
                  style={{
                    display:       'inline-flex',
                    alignItems:    'center',
                    gap:           '0.3rem',
                    padding:       '0.3rem 0.65rem',
                    borderRadius:  6,
                    border:        mode === m.id ? '1.5px solid rgba(201,169,110,0.4)' : '1.5px solid transparent',
                    background:    mode === m.id ? 'rgba(201,169,110,0.09)' : 'transparent',
                    cursor:        'pointer',
                    transition:    'all 0.15s',
                  }}
                >
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600, color: mode === m.id ? '#C9A96E' : '#A1A1AA' }}>
                    {m.label}
                  </span>
                  <span style={{
                    fontFamily:    'Inter, sans-serif',
                    fontSize:      '0.48rem',
                    fontWeight:    700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color:         mode === m.id ? '#C9A96E' : '#C4C4CC',
                    background:    mode === m.id ? 'rgba(201,169,110,0.12)' : 'rgba(0,0,0,0.04)',
                    padding:       '0.1rem 0.35rem',
                    borderRadius:  3,
                  }}>
                    {m.badge}
                  </span>
                </button>
              ))}
            </div>

            {/* Textarea */}
            <div style={{ padding: '1rem 1rem 0.75rem', position: 'relative' }}>
              <textarea
                ref={textareaRef}
                value={query}
                onChange={e => handleQueryChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hangi verileri analiz etmemi istersin? Doğal dille anlat…"
                rows={2}
                style={{
                  width:       '100%',
                  resize:      'none',
                  border:      'none',
                  outline:     'none',
                  background:  'transparent',
                  fontFamily:  'Inter, sans-serif',
                  fontSize:    '0.88rem',
                  color:       '#0C0C0E',
                  lineHeight:  1.65,
                  boxSizing:   'border-box',
                  minHeight:   64,
                }}
              />
            </div>

            {/* Example prompts */}
            <div style={{ padding: '0 1rem 0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {EXAMPLE_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleQueryChange(p)}
                  style={{
                    fontFamily:  'Inter, sans-serif',
                    fontSize:    '0.62rem',
                    color:       '#71717A',
                    background:  'rgba(0,0,0,0.03)',
                    border:      '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 999,
                    padding:     '0.25rem 0.625rem',
                    cursor:      'pointer',
                    transition:  'all 0.15s',
                    textAlign:   'left',
                    lineHeight:  1.35,
                    maxWidth:    isMobile ? '100%' : 260,
                    whiteSpace:  'nowrap',
                    overflow:    'hidden',
                    textOverflow:'ellipsis',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Submit bar */}
            <div style={{
              display:       'flex',
              alignItems:    'center',
              justifyContent:'space-between',
              padding:       '0.625rem 1rem',
              borderTop:     '1px solid rgba(0,0,0,0.05)',
              background:    '#FAFAF8',
            }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: '#C4C4CC' }}>
                {activeConnectors.length > 0
                  ? `${activeConnectors.length} source${activeConnectors.length > 1 ? 's' : ''} connected · Cmd+Enter to run`
                  : 'Connect at least one source above'}
              </span>
              <button
                onClick={runAnalysis}
                disabled={isRunning || !query.trim() || activeConnectors.length === 0}
                style={{
                  display:       'inline-flex',
                  alignItems:    'center',
                  gap:           '0.5rem',
                  padding:       '0.55rem 1.375rem',
                  background:    isRunning || !query.trim() || activeConnectors.length === 0
                                   ? 'rgba(0,0,0,0.06)'
                                   : 'linear-gradient(135deg, #C9A96E, #B8924F)',
                  color:         isRunning || !query.trim() || activeConnectors.length === 0
                                   ? '#C4C4CC' : '#FFFFFF',
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.72rem',
                  fontWeight:    700,
                  letterSpacing: '0.06em',
                  borderRadius:  '8px',
                  border:        'none',
                  cursor:        isRunning || !query.trim() || activeConnectors.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow:     isRunning || !query.trim() || activeConnectors.length === 0
                                   ? 'none' : '0 2px 12px rgba(201,169,110,0.35)',
                  transition:    'all 0.2s',
                }}
              >
                {isRunning ? (
                  <>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)', borderTopColor: '#FFF', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Analysing
                  </>
                ) : (
                  'Analyse →'
                )}
              </button>
            </div>
          </div>

          {/* ── No connectors warning ────────────────────────────────── */}
          {mounted && activeConnectors.length === 0 && !isRunning && !result && (
            <div className="animate-fade-in" style={{
              padding:      '1rem 1.25rem',
              background:   'rgba(239,68,68,0.04)',
              border:       '1px solid rgba(239,68,68,0.15)',
              borderRadius: '10px',
              display:      'flex',
              alignItems:   'center',
              gap:          '0.75rem',
              marginBottom: '1.25rem',
            }}>
              <span style={{ fontSize: '1rem' }}>⚠</span>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#B91C1C', margin: 0 }}>
                Analiz başlatmak için en az bir veri kaynağı bağlayın.{' '}
                <button onClick={() => setShowAddData(true)} style={{ fontWeight: 700, color: '#B91C1C', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  Şimdi bağla
                </button>
              </p>
            </div>
          )}

          {/* ── Pipeline Loader ──────────────────────────────────────── */}
          {isRunning && pipelineStage >= 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <PipelineLoader stage={pipelineStage} />
            </div>
          )}

          {/* ── Error ───────────────────────────────────────────────── */}
          {error && !isRunning && (
            <div className="animate-fade-in" style={{
              padding:      '1rem 1.25rem',
              background:   'rgba(239,68,68,0.05)',
              border:       '1px solid rgba(239,68,68,0.2)',
              borderRadius: '10px',
              display:      'flex',
              alignItems:   'center',
              gap:          '0.75rem',
              marginBottom: '1.5rem',
            }}>
              <span style={{ fontSize: '1rem' }}>✕</span>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#B91C1C', margin: 0 }}>
                {error}
              </p>
              <button onClick={() => setError(null)} style={{ marginLeft: 'auto', fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Dismiss
              </button>
            </div>
          )}

          {/* ── Analysis Output ──────────────────────────────────────── */}
          {result && !isRunning && (
            <div ref={outputRef}>
              <AnalysisOutput result={result} mode={mode} />
            </div>
          )}

        </div>
      </main>

      {/* ── Spin keyframe (inline for self-containment) ── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
