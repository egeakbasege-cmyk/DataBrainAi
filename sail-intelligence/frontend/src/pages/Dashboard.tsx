/**
 * src/pages/Dashboard.tsx
 *
 * Main dashboard layout.
 *
 * Layout (3-column on large screens):
 *   ┌────────────────────────────────────────────┬────────────────┐
 *   │  MetricsPanel (6 KPI cards)                │                │
 *   ├──────────────────────────┬─────────────────┤  LiveAction    │
 *   │  StrategicRadar          │  Analysis Panel  │  Feed          │
 *   │  (5-axis)                │  (agent results) │  (SSE + HITL)  │
 *   └──────────────────────────┴─────────────────┴────────────────┘
 *
 * State:
 *   - Domain selector drives MetricsPanel + StrategicRadar label swap.
 *   - Agent run triggered via "Run Analysis" — polls until complete.
 *   - SSE hook mounted here so it lives for the full session.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { useAuthStore }  from '@/stores/authStore'
import { useSSE }        from '@/hooks/useSSE'
import { api }           from '@/api/client'
import type { AgentResult } from '@/api/client'

import { MetricsPanel }   from '@/components/MetricsPanel/MetricsPanel'
import { StrategicRadar } from '@/components/StrategicRadar/StrategicRadar'
import { LiveActionFeed } from '@/components/LiveActionFeed/LiveActionFeed'
import { Button }         from '@/components/ui/Button'
import { Badge }          from '@/components/ui/Badge'
import { Spinner }        from '@/components/ui/Spinner'
import { type Domain, KPI_CONFIGS } from '@/components/MetricsPanel/kpi-configs'

const DOMAINS: Domain[] = ['ecommerce', 'real_estate', 'automotive', 'social', 'creator']

const DOMAIN_LABELS: Record<Domain, string> = {
  ecommerce:   'E-Commerce',
  real_estate: 'Real Estate',
  automotive:  'Automotive',
  social:      'Social Ads',
  creator:     'Creator',
  default:     'Default',
}

// ── Derive radar values from agent result ─────────────────────────────────────
function deriveRadarValues(
  result: AgentResult | null,
): [number, number, number, number, number] {
  if (!result) return [0, 0, 0, 0, 0]

  const total  = Math.max(1,
    result.pl_simulations.length + result.entity_links.length +
    result.forecasts.length + result.archetypes.length + result.copy_angles.length
  )

  // Score each axis 0–1 based on coverage of that area
  const price       = Math.min(1, result.pl_simulations.length / 5)
  const adStrength  = Math.min(1, result.archetypes.length / 10)
  const logistics   = Math.min(1, (result.pl_simulations.filter(p => p.margin_tier === 'high').length) / 3)
  const reputation  = Math.min(1, result.entity_links.length / 8)
  const trend       = Math.min(1, result.forecasts.length / 5)

  return [price, adStrength, logistics, reputation, trend]
}

// ── KPI data from agent result ────────────────────────────────────────────────
function deriveKPIData(result: AgentResult | null): Record<string, number> {
  if (!result) return {}
  return {
    opportunity_score: result.arbitrage_ops[0]?.opportunity_score ?? 0,
    anomaly_count:     result.anomalies.length,
    entity_links:      result.entity_links.length,
    forecasts:         result.forecasts.length,
    pl_simulations:    result.pl_simulations.length,
    copy_angles:       result.copy_angles.length,
  }
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar({ onLogout, email }: { onLogout: () => void; email: string | null }) {
  return (
    <header className="flex items-center justify-between px-6 py-3
                        border-b border-sail-700 bg-sail-800/60 backdrop-blur-sm
                        sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-sail-accent/20 border border-sail-accent/40
                        flex items-center justify-center">
          <svg className="w-4 h-4 text-sail-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <span className="font-semibold text-white tracking-tight">Sail Intelligence</span>
        <Badge variant="muted">v1.0</Badge>
      </div>

      <div className="flex items-center gap-3">
        {email && (
          <span className="text-xs text-sail-muted hidden sm:block">{email}</span>
        )}
        <Button size="sm" variant="ghost" onClick={onLogout}>Sign out</Button>
      </div>
    </header>
  )
}

// ── Domain selector ───────────────────────────────────────────────────────────
function DomainSelector({
  active,
  onChange,
}: {
  active:   Domain
  onChange: (d: Domain) => void
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {DOMAINS.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={[
            'px-3 py-1 rounded-full text-xs font-medium transition-all duration-150',
            active === d
              ? 'bg-sail-accent text-sail-900 shadow-glow-cyan'
              : 'bg-sail-700/50 text-sail-muted hover:bg-sail-700 hover:text-white',
          ].join(' ')}
        >
          {DOMAIN_LABELS[d]}
        </button>
      ))}
    </div>
  )
}

// ── Analysis Panel (agent result viewer) ──────────────────────────────────────
function AnalysisPanel({ result, loading }: { result: AgentResult | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="card flex flex-col items-center justify-center py-12 gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-sail-muted">Cognitive engine running…</p>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="card flex flex-col items-center justify-center py-12 gap-3 text-center">
        <div className="w-10 h-10 rounded-full border border-sail-700 flex items-center justify-center">
          <svg className="w-5 h-5 text-sail-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white">No analysis yet</p>
          <p className="text-xs text-sail-muted mt-0.5">Run Analysis to invoke the cognitive engine</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card space-y-4 overflow-y-auto max-h-[480px]">
      <div className="flex items-center justify-between">
        <p className="section-label">Agent Results</p>
        <Badge variant={result.error_count > 0 ? 'gold' : 'green'}>
          {result.error_count > 0 ? `${result.error_count} errors` : 'Complete'}
        </Badge>
      </div>

      {/* Arbitrage ops */}
      {result.arbitrage_ops.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white mb-2">Arbitrage Opportunities</p>
          <div className="space-y-2">
            {result.arbitrage_ops.slice(0, 5).map((op, i) => (
              <div key={i} className="bg-sail-900 rounded-lg p-3 text-xs border border-sail-700">
                <div className="flex justify-between mb-1">
                  <span className="text-white font-medium truncate">{op.product_name}</span>
                  <Badge variant={op.risk_level === 'low' ? 'green' : op.risk_level === 'medium' ? 'gold' : 'red'}>
                    {op.risk_level} risk
                  </Badge>
                </div>
                <div className="flex gap-3 text-sail-muted">
                  <span>Score: <span className="text-sail-accent">{op.opportunity_score.toFixed(2)}</span></span>
                  <span>Profit est: <span className="text-sail-success">${op.estimated_profit_usd.toFixed(0)}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unmet needs */}
      {result.unmet_needs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white mb-2">Unmet Market Needs</p>
          <ul className="space-y-1">
            {result.unmet_needs.slice(0, 5).map((need, i) => (
              <li key={i} className="text-xs text-sail-muted flex gap-2">
                <span className="text-sail-accent shrink-0">›</span>
                {need}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Copy angles */}
      {result.copy_angles.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white mb-2">Recommended Copy Angles</p>
          <div className="space-y-2">
            {result.copy_angles.slice(0, 3).map((ca, i) => (
              <div key={i} className="bg-sail-900 rounded-lg p-3 text-xs border border-sail-700">
                <p className="text-white font-medium">"{ca.sample_headline}"</p>
                <p className="text-sail-muted mt-1">{ca.rationale}</p>
                <Badge variant="cyan" className="mt-1.5">{ca.archetype_target}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {result.anomalies.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-white mb-2">Active Anomalies</p>
          {result.anomalies.slice(0, 4).map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-sail-700/50">
              <Badge variant={a.severity === 'critical' ? 'red' : 'gold'}>
                {a.sigma > 0 ? '▲' : '▼'} {Math.abs(a.sigma).toFixed(1)}σ
              </Badge>
              <span className="text-sail-muted truncate">{a.entity_id} · {a.metric}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  // Mount SSE stream for the full session
  useSSE()

  const logout    = useAuthStore((s) => s.logout)
  const email     = useAuthStore((s) => s.userEmail)

  const [domain,         setDomain]        = useState<Domain>('ecommerce')
  const [query,          setQuery]         = useState('')
  const [jobId,          setJobId]         = useState<string | null>(null)
  const [agentResult,    setAgentResult]   = useState<AgentResult | null>(null)
  const [agentRunning,   setAgentRunning]  = useState(false)
  const [pollTimer,      setPollTimer]     = useState<ReturnType<typeof setInterval> | null>(null)
  const [runError,       setRunError]      = useState('')

  // ── Poll until job completes ──────────────────────────────────────────────
  const startPolling = useCallback((jid: string) => {
    const timer = setInterval(async () => {
      try {
        const { data } = await api.agents.results(jid)
        if (data.status === 'complete' || data.status === 'failed') {
          clearInterval(timer)
          setPollTimer(null)
          setAgentRunning(false)
          setAgentResult(data)
          if (data.status === 'failed') setRunError('Agent run failed. Check server logs.')
        }
      } catch {
        clearInterval(timer)
        setPollTimer(null)
        setAgentRunning(false)
        setRunError('Lost connection while polling results.')
      }
    }, 2_000)
    setPollTimer(timer)
  }, [])

  useEffect(() => () => { if (pollTimer) clearInterval(pollTimer) }, [pollTimer])

  // ── Run analysis ──────────────────────────────────────────────────────────
  async function handleRun() {
    if (!query.trim()) return
    setRunError('')
    setAgentRunning(true)
    setAgentResult(null)

    try {
      const { data } = await api.agents.run({ query: query.trim() })
      setJobId(data.job_id)
      startPolling(data.job_id)
    } catch {
      setAgentRunning(false)
      setRunError('Failed to start agent run. Is the backend running?')
    }
  }

  const radarValues  = deriveRadarValues(agentResult)
  const kpiData      = deriveKPIData(agentResult)
  const radarLabels  = KPI_CONFIGS[domain].radarLabels

  return (
    <div className="min-h-screen flex flex-col bg-sail-900">
      <Navbar onLogout={logout} email={email} />

      <main className="flex-1 p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto w-full">

        {/* Control bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <DomainSelector active={domain} onChange={setDomain} />

          <div className="flex gap-2 flex-1 sm:justify-end min-w-0">
            <input
              className="input-field flex-1 min-w-0 text-sm"
              placeholder="e.g. ergonomic chair market analysis"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRun() }}
            />
            <Button
              onClick={handleRun}
              loading={agentRunning}
              disabled={!query.trim()}
              size="md"
            >
              Run Analysis
            </Button>
          </div>
        </div>

        {/* Error banner */}
        <AnimatePresence>
          {runError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-950/30 border border-sail-danger/40 rounded-lg px-4 py-2
                         text-sm text-sail-danger"
            >
              ⚠ {runError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI Panel */}
        <MetricsPanel domain={domain} data={kpiData} loading={agentRunning} />

        {/* Lower grid: Radar | Analysis | Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Radar — col 1 */}
          <StrategicRadar
            labels={radarLabels}
            values={radarValues}
          />

          {/* Analysis results — col 2 */}
          <AnalysisPanel result={agentResult} loading={agentRunning} />

          {/* Live Action Feed — col 3 */}
          <div className="card flex flex-col min-h-[420px]">
            <LiveActionFeed />
          </div>
        </div>

        {/* Job ID indicator */}
        {jobId && (
          <p className="text-xs text-sail-muted font-mono text-right">
            Job: <span className="text-sail-accent">{jobId}</span>
            {agentRunning && <span className="ml-2 animate-pulse">· polling…</span>}
          </p>
        )}
      </main>
    </div>
  )
}
