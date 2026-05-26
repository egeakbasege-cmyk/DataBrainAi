'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Nav } from '@/components/Nav'

const _EASE = [0.22, 1, 0.36, 1] as const
const _fadeUp = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: _EASE } } }
const _stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ConnectorType = 'shopify' | 'amazon' | 'csv' | 'api'
type Step = 1 | 2 | 3
type TabType = 'analysis' | 'benchmarks' | 'comparisons'

interface ConnectorDef {
  id: ConnectorType
  name: string
  description: string
  icon: string
  placeholder: string
  fieldLabel: string
}

interface SourceSummary {
  type: ConnectorType
  name: string
  syncedAt: string
  revenue: string
  orders: string
  aov: string
  topProduct: string
  extra: { label: string; value: string }[]
}

interface KeyMetric {
  label: string
  value: string
  benchmark: string
  delta: string
  trend: 'up' | 'down' | 'neutral'
}

interface ActionStep {
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  rationale: string
  timeframe: string
}

interface Insight {
  category: string
  finding: string
}

interface RiskFlag {
  severity: 'high' | 'medium' | 'low'
  risk: string
  mitigation: string
}

interface BenchmarkRow {
  metric: string
  yourValue: string
  industryAvg: string
  delta: string
  status: 'above' | 'below' | 'on-par'
}

interface AnalysisResult {
  query: string
  confidence: number
  source: string
  executiveSummary: string
  keyMetrics: KeyMetric[]
  actionSteps: ActionStep[]
  insights: Insight[]
  riskFlags: RiskFlag[]
  benchmarks: BenchmarkRow[]
  nextActions: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Connector definitions
// ─────────────────────────────────────────────────────────────────────────────

const CONNECTORS: ConnectorDef[] = [
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Connect via API key to pull real store data: orders, products, customers, returns',
    icon: '🛍️',
    placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxx',
    fieldLabel: 'Shopify Admin API Key',
  },
  {
    id: 'amazon',
    name: 'Amazon Seller Central',
    description: 'Connect MWS/SP-API for sales velocity, BSR, inventory health, returns',
    icon: '📦',
    placeholder: 'amzn.mws.xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    fieldLabel: 'SP-API / MWS Token',
  },
  {
    id: 'csv',
    name: 'CSV / Spreadsheet Upload',
    description: 'Upload your export files: sales history, product catalog, ad spend',
    icon: '📊',
    placeholder: 'Drop a .csv or .xlsx file here, or click to browse',
    fieldLabel: 'File path or paste CSV URL',
  },
  {
    id: 'api',
    name: 'Custom API / Webhook',
    description: 'Point any data source to our endpoint for real-time ingestion',
    icon: '🔗',
    placeholder: 'https://your-app.com/api/data-export',
    fieldLabel: 'Endpoint URL',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Mock data per connector
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_SOURCES: Record<ConnectorType, SourceSummary> = {
  shopify: {
    type: 'shopify',
    name: 'Shopify Store',
    syncedAt: 'Just now',
    revenue: '$84,200',
    orders: '1,240',
    aov: '$67.90',
    topProduct: 'Signature Tote Bag',
    extra: [
      { label: 'Return Rate', value: '4.2%' },
      { label: 'Repeat Purchase', value: '38%' },
    ],
  },
  amazon: {
    type: 'amazon',
    name: 'Amazon Seller Central',
    syncedAt: 'Just now',
    revenue: '$127,400',
    orders: '3,810',
    aov: '$33.44',
    topProduct: 'Premium Wireless Earbuds',
    extra: [
      { label: 'Buy Box Win', value: '71%' },
      { label: 'FBA Health', value: '92/100' },
    ],
  },
  csv: {
    type: 'csv',
    name: 'Spreadsheet Import',
    syncedAt: 'Just now',
    revenue: '$42,100',
    orders: '890',
    aov: '$47.30',
    topProduct: 'Accessories (Category)',
    extra: [
      { label: 'Top Category', value: 'Accessories' },
      { label: 'Rows Imported', value: '4,210' },
    ],
  },
  api: {
    type: 'api',
    name: 'Custom API Source',
    syncedAt: 'Just now',
    revenue: '$215,000',
    orders: '4,200',
    aov: '$51.19',
    topProduct: 'Enterprise SaaS Plan',
    extra: [
      { label: 'Active Integrations', value: '3' },
      { label: 'Webhooks Live', value: '7' },
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock analysis result builder
// ─────────────────────────────────────────────────────────────────────────────

function buildAnalysis(query: string, source: SourceSummary): AnalysisResult {
  const isShopify = source.type === 'shopify'
  const isAmazon = source.type === 'amazon'

  return {
    query,
    confidence: 91,
    source: source.name,
    executiveSummary: isShopify
      ? `Your store generated ${source.revenue}/mo across ${source.orders} orders, giving an AOV of ${source.aov} — 12% above the Shopify fashion benchmark of $60.60. Repeat purchase rate of 38% is well ahead of the 28% industry average, signalling strong brand loyalty. Your primary revenue risk lies in cart abandonment, currently estimated at 71%, which represents roughly $37K in monthly recoverable revenue.`
      : isAmazon
      ? `Your Amazon operation generated ${source.revenue}/mo across ${source.orders} orders at ${source.aov} AOV. Buy Box win rate of 71% outperforms the category median of 58%, contributing to above-average sales velocity. FBA Health Score of 92/100 indicates strong inventory management. BSR average of #4,200 positions you in the top 5% of your primary category.`
      : `Your connected data source shows ${source.revenue}/mo in revenue across ${source.orders} orders at ${source.aov} AOV. Performance is broadly healthy, with clear opportunities in pricing optimisation and customer retention. Benchmarks indicate room to improve conversion rate by an estimated 0.8–1.2 percentage points through checkout flow improvements.`,
    keyMetrics: [
      {
        label: 'Monthly Revenue',
        value: source.revenue,
        benchmark: isShopify ? '$61,400' : isAmazon ? '$98,200' : '$39,000',
        delta: isShopify ? '+37%' : isAmazon ? '+30%' : '+8%',
        trend: 'up',
      },
      {
        label: 'Avg Order Value',
        value: source.aov,
        benchmark: isShopify ? '$60.60' : isAmazon ? '$29.80' : '$44.00',
        delta: isShopify ? '+12%' : isAmazon ? '+12%' : '+7%',
        trend: 'up',
      },
      {
        label: 'Order Volume',
        value: source.orders + '/mo',
        benchmark: isShopify ? '980/mo' : isAmazon ? '3,200/mo' : '750/mo',
        delta: isShopify ? '+27%' : isAmazon ? '+19%' : '+19%',
        trend: 'up',
      },
      {
        label: isShopify ? 'Return Rate' : isAmazon ? 'Buy Box Win' : 'Repeat Rate',
        value: source.extra[0].value,
        benchmark: isShopify ? '6.5%' : isAmazon ? '58%' : '24%',
        delta: isShopify ? '-35% vs avg' : isAmazon ? '+22%' : '+17%',
        trend: isShopify ? 'up' : 'up',
      },
    ],
    actionSteps: [
      {
        priority: 'HIGH',
        title: isShopify
          ? 'Launch abandoned cart recovery sequence'
          : isAmazon
          ? 'Expand Buy Box pricing to 3 additional ASINs'
          : 'Implement post-purchase upsell flow',
        rationale: isShopify
          ? 'Cart abandonment at ~71% represents $37K/mo in recoverable revenue. A 3-email sequence typically recovers 8–12% of abandoned carts.'
          : isAmazon
          ? 'Your repricing model performs above average — extending it to underperforming ASINs could yield $8–14K additional monthly revenue.'
          : 'Post-purchase flows average 15–22% conversion on complementary products, with near-zero acquisition cost.',
        timeframe: '1–2 weeks',
      },
      {
        priority: 'MEDIUM',
        title: isShopify
          ? 'A/B test product page pricing ($69.90 vs $74.90)'
          : isAmazon
          ? 'Request 30-day FBA restock forecast review'
          : 'Segment customers by LTV and personalise email cadence',
        rationale: isShopify
          ? 'AOV is strong but price elasticity testing on your top SKU could lift revenue 4–7% with minimal volume impact.'
          : isAmazon
          ? 'FBA Health at 92/100 leaves room to optimise restock timing, reducing storage fees by an estimated $1,800/mo.'
          : 'Top 20% of customers typically drive 60–70% of revenue. Personalised cadence improves LTV by 18–25% on average.',
        timeframe: '2–4 weeks',
      },
      {
        priority: 'LOW',
        title: isShopify
          ? 'Add "Frequently Bought Together" widget to product pages'
          : isAmazon
          ? 'Enrich 5 low-review ASINs with A+ Content'
          : 'Connect a second data source for cross-channel comparison',
        rationale: isShopify
          ? 'Cross-sell widgets lift average basket size by 6–10% when placed on high-traffic product pages.'
          : isAmazon
          ? 'A+ Content pages convert 3–10% higher than standard listings and improve brand perception in competitive categories.'
          : 'Multi-source analysis surfaces attribution gaps and channel cannibalisation that single-source data misses.',
        timeframe: '4–8 weeks',
      },
    ],
    insights: [
      {
        category: 'Revenue Concentration',
        finding: `Top product (${source.topProduct}) likely accounts for 30–40% of total revenue — healthy but worth diversifying to reduce single-SKU dependency.`,
      },
      {
        category: 'Benchmark Position',
        finding: `You outperform the median seller in your category on AOV and order volume. Your primary lagging metric is conversion rate, estimated 0.9pp below category best-in-class.`,
      },
    ],
    riskFlags: [
      {
        severity: 'medium',
        risk: isShopify
          ? 'Single top product drives disproportionate revenue — stockout or competitor entry could significantly impact monthly revenue'
          : isAmazon
          ? 'Buy Box dependency on repricing algorithm — sudden category price war could compress margins within 48–72h'
          : 'Data freshness risk — manual export cadence creates blind spots in real-time decision making',
        mitigation: isShopify
          ? 'Develop 2–3 complementary hero products over the next quarter to diversify revenue base'
          : isAmazon
          ? 'Set floor pricing rules and monitor margin per ASIN weekly to catch compression early'
          : 'Switch to API-based integration or scheduled auto-export for near-real-time data ingestion',
      },
    ],
    benchmarks: [
      {
        metric: 'Monthly Revenue',
        yourValue: source.revenue,
        industryAvg: isShopify ? '$61,400' : isAmazon ? '$98,200' : '$39,000',
        delta: isShopify ? '+$22,800' : isAmazon ? '+$29,200' : '+$3,100',
        status: 'above',
      },
      {
        metric: 'Avg Order Value',
        yourValue: source.aov,
        industryAvg: isShopify ? '$60.60' : isAmazon ? '$29.80' : '$44.00',
        delta: isShopify ? '+$7.30' : isAmazon ? '+$3.64' : '+$3.30',
        status: 'above',
      },
      {
        metric: isShopify ? 'Return Rate' : isAmazon ? 'Buy Box Win %' : 'Repeat Customer %',
        yourValue: source.extra[0].value,
        industryAvg: isShopify ? '6.5%' : isAmazon ? '58%' : '24%',
        delta: isShopify ? '-2.3pp' : isAmazon ? '+13pp' : '+14pp',
        status: 'above',
      },
      {
        metric: 'Conversion Rate (est.)',
        yourValue: isShopify ? '2.1%' : isAmazon ? '9.4%' : '2.8%',
        industryAvg: isShopify ? '2.9%' : isAmazon ? '8.8%' : '3.1%',
        delta: isShopify ? '-0.8pp' : isAmazon ? '+0.6pp' : '-0.3pp',
        status: isShopify ? 'below' : 'above',
      },
    ],
    nextActions: [
      `Review the HIGH priority action (${isShopify ? 'cart recovery' : isAmazon ? 'Buy Box expansion' : 'upsell flow'}) and assign an owner by end of week`,
      'Export this analysis as a PDF for your weekly ops review',
      'Connect a second data source to enable cross-channel benchmarking',
    ],
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pill query examples
// ─────────────────────────────────────────────────────────────────────────────

const QUERY_EXAMPLES = [
  'What are my top-performing products?',
  'Where am I losing revenue?',
  'Compare my AOV to industry',
  'Find my biggest growth opportunities',
]

// ─────────────────────────────────────────────────────────────────────────────
// Colour helpers
// ─────────────────────────────────────────────────────────────────────────────

const PRIORITY_COLOUR: Record<string, string> = {
  HIGH: '#DC2626',
  MEDIUM: '#D97706',
  LOW: '#059669',
}

const SEVERITY_COLOUR: Record<string, string> = {
  high: '#DC2626',
  medium: '#D97706',
  low: '#059669',
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page component
// ─────────────────────────────────────────────────────────────────────────────

export default function DataLabPage() {
  const { data: session, status } = useSession()

  const [step, setStep] = useState<Step>(1)
  const [activeTab, setActiveTab] = useState<TabType>('analysis')
  const [modalConnector, setModalConnector] = useState<ConnectorDef | null>(null)
  const [apiInput, setApiInput] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectedSource, setConnectedSource] = useState<SourceSummary | null>(null)
  const [query, setQuery] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [loadingStage, setLoadingStage] = useState(0)

  const queryRef = useRef<HTMLInputElement>(null)

  const LOADING_STAGES = [
    'Parsing your data source…',
    'Running benchmark queries…',
    'Scoring against industry medians…',
    'Generating recommendations…',
    'Finalising analysis…',
  ]

  // Simulate connecting
  const handleConnect = useCallback(() => {
    if (!modalConnector) return
    setConnecting(true)
    setTimeout(() => {
      setConnectedSource(MOCK_SOURCES[modalConnector.id])
      setConnecting(false)
      setModalConnector(null)
      setApiInput('')
      setStep(2)
    }, 2000)
  }, [modalConnector])

  // Real AI analysis — calls /api/data-lab/analyze, falls back to buildAnalysis()
  const handleAnalyze = useCallback(
    (q: string) => {
      if (!connectedSource || !q.trim()) return
      setQuery(q)
      setAnalyzing(true)
      setLoadingStage(0)

      // Keep LOADING_STAGES animation running while the API call is in-flight.
      // The interval advances through stages at 600 ms, capping at the last stage.
      const interval = setInterval(() => {
        setLoadingStage((s) => {
          if (s >= LOADING_STAGES.length - 1) {
            clearInterval(interval)
            return s
          }
          return s + 1
        })
      }, 600)

      // Real fetch — resolved or rejected, we always clear the interval and
      // leave the UI in a valid state.
      ;(async () => {
        try {
          const res = await fetch('/api/data-lab/analyze/', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ query: q, source: connectedSource }),
          })

          if (!res.ok) {
            // Server returned an error — log it and fall back to mock
            const errBody = await res.json().catch(() => ({ error: 'unknown' }))
            console.warn('[DataLab] API error, using mock fallback:', errBody.error)
            clearInterval(interval)
            setAnalysisResult(buildAnalysis(q, connectedSource))
            setAnalyzing(false)
            setStep(3)
            return
          }

          const data = await res.json()

          if (!data?.result) {
            console.warn('[DataLab] Unexpected API shape, using mock fallback:', data)
            clearInterval(interval)
            setAnalysisResult(buildAnalysis(q, connectedSource))
            setAnalyzing(false)
            setStep(3)
            return
          }

          // Success — advance to the final loading stage briefly before showing results
          clearInterval(interval)
          setLoadingStage(LOADING_STAGES.length - 1)
          // Small delay so the user sees the last stage tick ✓ before transition
          await new Promise<void>((r) => setTimeout(r, 400))

          setAnalysisResult(data.result as AnalysisResult)
          setAnalyzing(false)
          setStep(3)

        } catch (err) {
          // Network error / timeout — fall back to mock so the UI never breaks
          console.error('[DataLab] fetch threw, using mock fallback:', err)
          clearInterval(interval)
          setAnalysisResult(buildAnalysis(q, connectedSource))
          setAnalyzing(false)
          setStep(3)
        }
      })()
    },
    [connectedSource]
  )

  const handleQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleAnalyze(query)
  }

  // ── Auth guard ──────────────────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="sv-grid-bg" style={{ minHeight: '100vh', background: 'var(--sv-mint-bg)' }}>
        <Nav />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100vh - 72px)',
          }}
        >
          <p style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif' }}>Loading…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="sv-grid-bg" style={{ minHeight: '100vh', background: 'var(--sv-mint-bg)' }}>
        <Nav />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100vh - 72px)',
            gap: '1.5rem',
          }}
        >
          <div style={{ fontSize: '2.5rem' }}>🔒</div>
          <h2
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '2rem',
              fontWeight: 600,
              color: '#111827',
              margin: 0,
            }}
          >
            Sign in to access DataLab
          </h2>
          <p style={{ color: '#6B7280', fontFamily: 'Inter, sans-serif', margin: 0 }}>
            Connect your data sources and benchmark your performance.
          </p>
          <Link
            href="/api/auth/signin"
            style={{
              background: '#14B8A6',
              color: '#fff',
              padding: '0.75rem 2rem',
              borderRadius: 8,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  // ── Shared card style ───────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.92)',
    border: '1px solid rgba(20,184,166,0.10)',
    borderRadius: 12,
    boxShadow: '0 2px 20px rgba(0,0,0,0.04)',
    padding: '1.75rem',
  }

  // ── Modal ───────────────────────────────────────────────────────────────────

  const modal = modalConnector && (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        padding: '1rem',
      }}
      onClick={() => { if (!connecting) setModalConnector(null) }}
    >
      <div
        style={{ ...cardStyle, width: '100%', maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '1.75rem' }}>{modalConnector.icon}</span>
          <div>
            <h3
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '1.4rem',
                fontWeight: 600,
                margin: 0,
                color: '#111827',
              }}
            >
              Connect {modalConnector.name}
            </h3>
            <p style={{ color: '#6B7280', fontSize: '0.82rem', margin: 0, fontFamily: 'Inter, sans-serif' }}>
              {modalConnector.description}
            </p>
          </div>
        </div>

        <label
          style={{
            display: 'block',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: '0.4rem',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {modalConnector.fieldLabel}
        </label>
        <input
          type="text"
          value={apiInput}
          onChange={(e) => setApiInput(e.target.value)}
          placeholder={modalConnector.placeholder}
          disabled={connecting}
          style={{
            width: '100%',
            padding: '0.65rem 0.9rem',
            border: '1px solid rgba(20,184,166,0.25)',
            borderRadius: 8,
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.87rem',
            color: '#374151',
            background: '#fff',
            boxSizing: 'border-box',
            marginBottom: '1.25rem',
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{
              flex: 1,
              background: connecting ? '#99E6DD' : '#14B8A6',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '0.7rem 1.25rem',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: connecting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {connecting ? (
              <>
                <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>•</span>
                Authorising…
              </>
            ) : (
              'Authorize & Pull Data'
            )}
          </button>
          {!connecting && (
            <button
              onClick={() => setModalConnector(null)}
              style={{
                background: 'transparent',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                padding: '0.7rem 1rem',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.9rem',
                color: '#6B7280',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ── Step 1: Connect Your Data ───────────────────────────────────────────────

  const step1 = (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '4rem 2rem' }}>
      {/* Hero */}
      <motion.div
        variants={_stagger}
        initial="hidden"
        animate="show"
        style={{ textAlign: 'center', marginBottom: '3.5rem' }}
      >
        <motion.div variants={_fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
          <div style={{ width: 28, height: 1, background: '#C9A96E', opacity: 0.6 }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A96E' }}>
            Data Intelligence
          </span>
          <div style={{ width: 28, height: 1, background: '#C9A96E', opacity: 0.6 }} />
        </motion.div>
        <motion.h1
          variants={_fadeUp}
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontStyle: 'italic',
            fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
            fontWeight: 600,
            color: '#0C0C0E',
            margin: '0 0 1rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.08,
          }}
        >
          DataLab
        </motion.h1>
        <motion.p
          variants={_fadeUp}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.9375rem',
            color: '#71717A',
            maxWidth: 480,
            margin: '0 auto',
            lineHeight: 1.78,
            fontWeight: 300,
          }}
        >
          Connect your application data. Analyse your seller context.{' '}
          <span style={{ color: '#14B8A6', fontWeight: 500 }}>Benchmark against the market.</span>
        </motion.p>
      </motion.div>

      {/* Connector grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem',
        }}
      >
        {CONNECTORS.map((c) => (
          <div
            key={c.id}
            style={{
              ...cardStyle,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '1rem',
              transition: 'box-shadow 0.18s ease',
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 28px rgba(20,184,166,0.10)')
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 20px rgba(0,0,0,0.04)')
            }
          >
            <div
              style={{
                fontSize: '2rem',
                width: 52,
                height: 52,
                background: 'rgba(20,184,166,0.07)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {c.icon}
            </div>
            <div style={{ flex: 1 }}>
              <h3
                style={{
                  fontFamily: 'Cormorant Garamond, serif',
                  fontSize: '1.2rem',
                  fontWeight: 600,
                  color: '#111827',
                  margin: '0 0 0.3rem',
                }}
              >
                {c.name}
              </h3>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.84rem',
                  color: '#6B7280',
                  margin: '0 0 1rem',
                  lineHeight: 1.55,
                }}
              >
                {c.description}
              </p>
              <button
                onClick={() => setModalConnector(c)}
                style={{
                  background: 'transparent',
                  border: '1.5px solid #14B8A6',
                  color: '#14B8A6',
                  borderRadius: 7,
                  padding: '0.45rem 1.1rem',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = '#14B8A6'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
                }}
                onMouseLeave={(e) => {
                  ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLButtonElement).style.color = '#14B8A6'
                }}
              >
                Connect
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sample data link */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={() => {
            setConnectedSource(MOCK_SOURCES.shopify)
            setStep(2)
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9CA3AF',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.84rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            textDecorationColor: 'rgba(156,163,175,0.5)',
          }}
        >
          Or try with sample data
        </button>
      </div>
    </div>
  )

  // ── Step 2: Data Overview ──────────────────────────────────────────────────

  const step2 = connectedSource && (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '3rem 2rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Left panel */}
        <div style={{ width: '30%', minWidth: 260, flexShrink: 0 }}>
          <div style={{ ...cardStyle, marginBottom: '1rem' }}>
            {/* Source header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>
                {CONNECTORS.find((c) => c.id === connectedSource.type)?.icon}
              </span>
              <div>
                <p
                  style={{
                    fontFamily: 'Cormorant Garamond, serif',
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    color: '#111827',
                    margin: 0,
                  }}
                >
                  {connectedSource.name}
                </p>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.75rem',
                    color: '#10B981',
                    margin: 0,
                    fontWeight: 500,
                  }}
                >
                  ● Data synced — {connectedSource.syncedAt}
                </p>
              </div>
            </div>

            {/* Stats */}
            {[
              { label: 'Total Revenue', value: connectedSource.revenue + '/mo' },
              { label: 'Total Orders', value: connectedSource.orders + '/mo' },
              { label: 'Avg Order Value', value: connectedSource.aov },
              { label: 'Top Product', value: connectedSource.topProduct },
              ...connectedSource.extra,
            ].map((s) => (
              <div
                key={s.label}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.55rem 0',
                  borderBottom: '1px solid rgba(20,184,166,0.07)',
                }}
              >
                <span
                  style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#6B7280' }}
                >
                  {s.label}
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#111827',
                  }}
                >
                  {s.value}
                </span>
              </div>
            ))}

            {/* Switch source */}
            <button
              onClick={() => { setStep(1); setConnectedSource(null) }}
              style={{
                marginTop: '1rem',
                width: '100%',
                background: 'transparent',
                border: '1px solid #E5E7EB',
                borderRadius: 7,
                padding: '0.5rem',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.82rem',
                color: '#6B7280',
                cursor: 'pointer',
              }}
            >
              Switch Source
            </button>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem' }}>
            {(['analysis', 'benchmarks', 'comparisons'] as TabType[]).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: 7,
                  border: 'none',
                  background: activeTab === t ? '#14B8A6' : 'rgba(255,255,255,0.7)',
                  color: activeTab === t ? '#fff' : '#6B7280',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.87rem',
                  fontWeight: activeTab === t ? 600 : 400,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Query bar */}
          <form onSubmit={handleQuerySubmit} style={{ marginBottom: '1.25rem' }}>
            <div
              style={{
                display: 'flex',
                gap: '0.75rem',
                background: 'rgba(255,255,255,0.92)',
                border: '1.5px solid rgba(20,184,166,0.18)',
                borderRadius: 10,
                padding: '0.5rem 0.5rem 0.5rem 1rem',
                alignItems: 'center',
              }}
            >
              <input
                ref={queryRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything about your data…"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.95rem',
                  color: '#374151',
                  background: 'transparent',
                }}
              />
              <button
                type="submit"
                disabled={!query.trim() || analyzing}
                style={{
                  background: query.trim() ? '#14B8A6' : '#E5E7EB',
                  color: query.trim() ? '#fff' : '#9CA3AF',
                  border: 'none',
                  borderRadius: 7,
                  padding: '0.6rem 1.1rem',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.87rem',
                  cursor: query.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s ease',
                }}
              >
                Analyse →
              </button>
            </div>
          </form>

          {/* Query example pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem' }}>
            {QUERY_EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  setQuery(ex)
                  handleAnalyze(ex)
                }}
                style={{
                  background: 'rgba(20,184,166,0.06)',
                  border: '1px solid rgba(20,184,166,0.15)',
                  borderRadius: 20,
                  padding: '0.38rem 0.9rem',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.8rem',
                  color: '#0D9488',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.12)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.06)')
                }
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Tab content placeholder */}
          <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>
              {activeTab === 'analysis' ? '🔍' : activeTab === 'benchmarks' ? '📈' : '⚖️'}
            </div>
            <p
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '1.3rem',
                fontWeight: 600,
                color: '#111827',
                margin: '0 0 0.4rem',
              }}
            >
              {activeTab === 'analysis'
                ? 'Ask a question to run analysis'
                : activeTab === 'benchmarks'
                ? 'Run a query to see benchmark comparisons'
                : 'Run a query to compare your metrics'}
            </p>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.87rem',
                color: '#9CA3AF',
                margin: 0,
              }}
            >
              Type a question above or select an example prompt.
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Step 2 loading overlay ─────────────────────────────────────────────────

  const loadingOverlay = analyzing && (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(240,253,251,0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 800,
        gap: '2rem',
      }}
    >
      <h2
        style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: '2rem',
          fontWeight: 600,
          color: '#111827',
          margin: 0,
        }}
      >
        Analysing your data…
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 340 }}>
        {LOADING_STAGES.map((stage, i) => (
          <div
            key={stage}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              opacity: i <= loadingStage ? 1 : 0.35,
              transition: 'opacity 0.3s ease',
            }}
          >
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: i < loadingStage ? '#14B8A6' : i === loadingStage ? '#99E6DD' : '#E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                color: i < loadingStage ? '#fff' : 'transparent',
                transition: 'background 0.3s ease',
                flexShrink: 0,
              }}
            >
              ✓
            </span>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.9rem',
                color: i <= loadingStage ? '#374151' : '#9CA3AF',
              }}
            >
              {stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Step 3: Analysis Results ───────────────────────────────────────────────

  const step3 = analysisResult && connectedSource && (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '3rem 2rem' }}>
      {/* Back */}
      <button
        onClick={() => { setStep(2); setQuery('') }}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#6B7280',
          fontFamily: 'Inter, sans-serif',
          fontSize: '0.87rem',
          cursor: 'pointer',
          marginBottom: '1.75rem',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        ← Back to data overview
      </button>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <h1
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '2rem',
              fontWeight: 700,
              color: '#111827',
              margin: 0,
            }}
          >
            {analysisResult.query}
          </h1>
          <span
            style={{
              background: 'rgba(20,184,166,0.10)',
              color: '#0D9488',
              borderRadius: 20,
              padding: '0.2rem 0.75rem',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            {analysisResult.confidence}% confidence
          </span>
          <span
            style={{
              background: 'rgba(201,169,110,0.10)',
              color: '#92683A',
              borderRadius: 20,
              padding: '0.2rem 0.75rem',
              fontFamily: 'Inter, sans-serif',
              fontSize: '0.78rem',
              fontWeight: 600,
            }}
          >
            {analysisResult.source}
          </span>
        </div>
      </div>

      {/* Executive Summary */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem', borderLeft: '3px solid #14B8A6' }}>
        <p
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#14B8A6',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 0.6rem',
          }}
        >
          Executive Summary
        </p>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.97rem',
            color: '#374151',
            lineHeight: 1.7,
            margin: 0,
          }}
        >
          {analysisResult.executiveSummary}
        </p>
      </div>

      {/* Key Metrics grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {analysisResult.keyMetrics.map((m) => (
          <div key={m.label} style={{ ...cardStyle, padding: '1.25rem' }}>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.78rem',
                color: '#6B7280',
                margin: '0 0 0.3rem',
                fontWeight: 500,
              }}
            >
              {m.label}
            </p>
            <p
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: '1.6rem',
                fontWeight: 700,
                color: '#111827',
                margin: '0 0 0.2rem',
              }}
            >
              {m.value}
            </p>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.78rem',
                color: m.trend === 'up' ? '#10B981' : m.trend === 'down' ? '#EF4444' : '#6B7280',
                margin: '0 0 0.15rem',
                fontWeight: 600,
              }}
            >
              {m.trend === 'up' ? '▲' : m.trend === 'down' ? '▼' : '—'} {m.delta} vs benchmark
            </p>
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.75rem',
                color: '#9CA3AF',
                margin: 0,
              }}
            >
              Industry avg: {m.benchmark}
            </p>
          </div>
        ))}
      </div>

      {/* Recommendations */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <p
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#14B8A6',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 1rem',
          }}
        >
          Recommendations
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {analysisResult.actionSteps.map((a, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '1rem',
                paddingBottom: '0.85rem',
                borderBottom:
                  i < analysisResult.actionSteps.length - 1 ? '1px solid rgba(20,184,166,0.07)' : 'none',
              }}
            >
              <span
                style={{
                  background: PRIORITY_COLOUR[a.priority] + '18',
                  color: PRIORITY_COLOUR[a.priority],
                  borderRadius: 6,
                  padding: '0.2rem 0.55rem',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  height: 'fit-content',
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                {a.priority}
              </span>
              <div>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: '#111827',
                    margin: '0 0 0.2rem',
                  }}
                >
                  {a.title}
                </p>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.83rem',
                    color: '#6B7280',
                    margin: '0 0 0.2rem',
                    lineHeight: 1.5,
                  }}
                >
                  {a.rationale}
                </p>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.78rem',
                    color: '#9CA3AF',
                    margin: 0,
                  }}
                >
                  Timeframe: {a.timeframe}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Benchmark comparison table */}
      <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
        <p
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#14B8A6',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 1rem',
          }}
        >
          Benchmark Comparison
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Metric', 'Your Value', 'Industry Avg', 'Delta', 'Status'].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: 'left',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#9CA3AF',
                    paddingBottom: '0.6rem',
                    borderBottom: '1px solid rgba(20,184,166,0.10)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {analysisResult.benchmarks.map((row, i) => (
              <tr key={i}>
                {[
                  row.metric,
                  row.yourValue,
                  row.industryAvg,
                  row.delta,
                  null,
                ].map((cell, ci) => (
                  <td
                    key={ci}
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '0.85rem',
                      color: ci === 1 ? '#111827' : '#6B7280',
                      fontWeight: ci === 1 ? 600 : 400,
                      padding: '0.65rem 0',
                      borderBottom: i < analysisResult.benchmarks.length - 1 ? '1px solid rgba(20,184,166,0.06)' : 'none',
                    }}
                  >
                    {ci === 4 ? (
                      <span
                        style={{
                          background:
                            row.status === 'above'
                              ? 'rgba(16,185,129,0.10)'
                              : row.status === 'below'
                              ? 'rgba(239,68,68,0.10)'
                              : 'rgba(156,163,175,0.15)',
                          color:
                            row.status === 'above'
                              ? '#059669'
                              : row.status === 'below'
                              ? '#DC2626'
                              : '#6B7280',
                          borderRadius: 5,
                          padding: '0.15rem 0.55rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {row.status === 'above' ? '↑ Above' : row.status === 'below' ? '↓ Below' : '→ On par'}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Risk Flags */}
      {analysisResult.riskFlags.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
          <p
            style={{
              fontFamily: 'Cormorant Garamond, serif',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#14B8A6',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: '0 0 1rem',
            }}
          >
            Risk Flags
          </p>
          {analysisResult.riskFlags.map((r, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.75rem',
                background: SEVERITY_COLOUR[r.severity] + '08',
                borderRadius: 8,
                border: `1px solid ${SEVERITY_COLOUR[r.severity]}22`,
              }}
            >
              <span
                style={{
                  background: SEVERITY_COLOUR[r.severity] + '20',
                  color: SEVERITY_COLOUR[r.severity],
                  borderRadius: 5,
                  padding: '0.15rem 0.55rem',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  height: 'fit-content',
                  flexShrink: 0,
                  marginTop: 2,
                  textTransform: 'uppercase',
                }}
              >
                {r.severity}
              </span>
              <div>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.87rem',
                    color: '#374151',
                    margin: '0 0 0.2rem',
                    fontWeight: 500,
                  }}
                >
                  {r.risk}
                </p>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '0.8rem',
                    color: '#6B7280',
                    margin: 0,
                  }}
                >
                  Mitigation: {r.mitigation}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next Actions */}
      <div style={{ ...cardStyle }}>
        <p
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: '#14B8A6',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            margin: '0 0 0.85rem',
          }}
        >
          Next Actions
        </p>
        <ol style={{ margin: 0, paddingLeft: '1.25rem' }}>
          {analysisResult.nextActions.map((action, i) => (
            <li
              key={i}
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.87rem',
                color: '#374151',
                lineHeight: 1.6,
                marginBottom: i < analysisResult.nextActions.length - 1 ? '0.5rem' : 0,
              }}
            >
              {action}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="sv-grid-bg"
      style={{ minHeight: '100vh', background: 'var(--sv-mint-bg)' }}
    >
      <Nav />
      {modal}
      {loadingOverlay}
      {step === 1 && step1}
      {step === 2 && step2}
      {step === 3 && step3}
    </div>
  )
}
