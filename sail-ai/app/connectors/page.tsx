'use client'

import { useState, useEffect, useRef } from 'react'
import { useLanguage }                  from '@/lib/i18n/LanguageContext'
import { Nav }                          from '@/components/Nav'
import {
  useConnectorState,
  ALL_CONNECTORS,
  type ConnectorDef,
} from '@/components/ConnectorDock'

// ── Mock data per connector ───────────────────────────────────────────────────

interface ConnectorMetric {
  label: string
  value: string
  change?: string
  up?: boolean
}

interface ConnectorRow {
  name: string
  value: string
  delta?: string
  up?: boolean
}

interface ConnectorData {
  metrics:  ConnectorMetric[]
  rows:     ConnectorRow[]
  rowLabel: string
  note?:    string
}

const MOCK_DATA: Record<string, ConnectorData> = {
  'ebay-product-price': {
    metrics: [
      { label: 'Avg Sell Price',    value: '$47.20',  change: '+3.1%', up: true  },
      { label: 'Sell-Through Rate', value: '68%',     change: '+5pp',  up: true  },
      { label: 'Active Listings',   value: '2.4M',    change: '+12%',  up: true  },
      { label: 'Avg Time to Sell',  value: '4.2 days',change: '-0.8d', up: true  },
    ],
    rowLabel: 'Top Categories',
    rows: [
      { name: 'Electronics',      value: '$89.50',  delta: '+4.2%', up: true  },
      { name: 'Collectibles',     value: '$34.10',  delta: '+11.8%',up: true  },
      { name: 'Fashion',          value: '$28.40',  delta: '-1.2%', up: false },
      { name: 'Home & Garden',    value: '$41.20',  delta: '+2.7%', up: true  },
      { name: 'Sporting Goods',   value: '$55.60',  delta: '+6.3%', up: true  },
    ],
    note: 'Source: eBay Marketplace Pulse — Updated 14 min ago',
  },
  'amazon-product-price': {
    metrics: [
      { label: 'Buy Box Win %',   value: '72%',    change: '+3pp',  up: true  },
      { label: 'Avg BSR Rank',    value: '#8,420',  change: '-1,200',up: true  },
      { label: 'Avg Review Score',value: '4.3★',   change: '+0.1',  up: true  },
      { label: 'Return Rate',     value: '6.8%',   change: '-0.5pp',up: true  },
    ],
    rowLabel: 'Trending ASINs',
    rows: [
      { name: 'Wireless Earbuds (B09XFZ)',  value: '#1,240',  delta: '▲ 340', up: true  },
      { name: 'Kitchen Scale (B08KQH)',      value: '#3,110',  delta: '▲ 890', up: true  },
      { name: 'Yoga Mat Premium (B07NL)',    value: '#5,890',  delta: '▼ 220', up: false },
      { name: 'LED Ring Light (B09TP)',      value: '#2,450',  delta: '▲ 560', up: true  },
    ],
    note: 'Source: Amazon Seller Central API — Updated 8 min ago',
  },
  'etsy-marketplace': {
    metrics: [
      { label: 'Avg Order Value',  value: '$38.70', change: '+7.2%', up: true  },
      { label: 'Shop Views/Day',   value: '1,240',  change: '+15%',  up: true  },
      { label: 'Conversion Rate',  value: '3.1%',   change: '+0.4pp',up: true  },
      { label: 'Fav Rate',         value: '8.4%',   change: '+1.1pp',up: true  },
    ],
    rowLabel: 'Trending Searches',
    rows: [
      { name: 'Personalized Gifts',  value: '94K/mo',  delta: '+22%', up: true  },
      { name: 'Boho Wall Art',       value: '67K/mo',  delta: '+18%', up: true  },
      { name: 'Vintage Jewelry',     value: '52K/mo',  delta: '+9%',  up: true  },
      { name: 'Handmade Candles',    value: '48K/mo',  delta: '-3%',  up: false },
    ],
    note: 'Source: Etsy Trending API — Updated 22 min ago',
  },
  'walmart-marketplace': {
    metrics: [
      { label: 'Price Competitiveness', value: '91%',   change: '+2pp',  up: true  },
      { label: 'In-Stock Rate',         value: '96.4%', change: '+0.8pp',up: true  },
      { label: 'Avg Margin',            value: '18.2%', change: '-1.1pp',up: false },
      { label: 'Fulfillment Score',     value: '4.7/5', change: '+0.2',  up: true  },
    ],
    rowLabel: 'Top Departments',
    rows: [
      { name: 'Grocery & Essentials', value: '$24.10', delta: '+1.2%', up: true  },
      { name: 'Electronics',          value: '$142.50',delta: '+5.8%', up: true  },
      { name: 'Apparel',              value: '$31.20', delta: '-2.4%', up: false },
      { name: 'Toys & Games',         value: '$27.80', delta: '+14%',  up: true  },
    ],
    note: 'Source: Walmart Seller Center — Updated 31 min ago',
  },
  'aliexpress-sourcing': {
    metrics: [
      { label: 'Avg Sourcing Cost', value: '$8.40',  change: '-4.2%', up: true  },
      { label: 'Avg Ship Time',     value: '9.2 days',change: '-1.3d',up: true  },
      { label: 'Supplier Score',    value: '4.6/5',  change: '+0.1',  up: true  },
      { label: 'MOQ (avg)',         value: '50 units',change: '-10',  up: true  },
    ],
    rowLabel: 'Hot Sourcing Categories',
    rows: [
      { name: 'Smart Home Devices', value: '$6.20',  delta: '-8%',  up: true  },
      { name: 'Pet Accessories',    value: '$4.10',  delta: '-3%',  up: true  },
      { name: 'Beauty Tools',       value: '$7.80',  delta: '+2%',  up: false },
      { name: 'Phone Accessories',  value: '$2.40',  delta: '-12%', up: true  },
    ],
    note: 'Source: AliExpress Data Hub — Updated 19 min ago',
  },
  'shopify-store': {
    metrics: [
      { label: 'Avg Store CVR',   value: '2.9%',   change: '+0.4pp', up: true  },
      { label: 'Avg AOV',         value: '$67.30', change: '+8.1%',  up: true  },
      { label: 'Cart Abandon %',  value: '68.2%',  change: '-2.1pp', up: true  },
      { label: 'Repeat Rate',     value: '34%',    change: '+3pp',   up: true  },
    ],
    rowLabel: 'Industry CVR Benchmarks',
    rows: [
      { name: 'Fashion & Apparel',  value: '1.8%',  delta: 'vs 2.2% avg', up: false },
      { name: 'Health & Beauty',    value: '3.4%',  delta: 'vs 2.2% avg', up: true  },
      { name: 'Electronics',        value: '1.2%',  delta: 'vs 2.2% avg', up: false },
      { name: 'Home & Garden',      value: '2.8%',  delta: 'vs 2.2% avg', up: true  },
      { name: 'Sports & Outdoors',  value: '3.1%',  delta: 'vs 2.2% avg', up: true  },
    ],
    note: 'Source: Shopify Annual Benchmark Report 2026',
  },
  'tiktok-ads': {
    metrics: [
      { label: 'Avg CPM',       value: '$9.20',  change: '+$0.80', up: false },
      { label: 'Avg CTR',       value: '1.8%',   change: '+0.3pp', up: true  },
      { label: 'Engagement Rate',value: '5.4%',  change: '+0.7pp', up: true  },
      { label: 'Shop ROAS',     value: '3.2x',   change: '+0.4x',  up: true  },
    ],
    rowLabel: 'TikTok Shop Trending Products',
    rows: [
      { name: 'Viral Skincare Serum',     value: '2.4M views',  delta: '↑ +840%', up: true  },
      { name: 'Mini Projector',           value: '1.8M views',  delta: '↑ +320%', up: true  },
      { name: 'LED Nail Kit',             value: '1.2M views',  delta: '↑ +190%', up: true  },
      { name: 'Portable Blender',         value: '980K views',  delta: '↑ +156%', up: true  },
    ],
    note: 'Source: TikTok for Business Dashboard — Updated 6 min ago',
  },
  'meta-ads': {
    metrics: [
      { label: 'Avg CPM',       value: '$14.30', change: '+$1.20', up: false },
      { label: 'Avg CPC',       value: '$0.82',  change: '-$0.06', up: true  },
      { label: 'Avg ROAS',      value: '4.1x',   change: '+0.3x',  up: true  },
      { label: 'Avg CTR',       value: '1.1%',   change: '+0.2pp', up: true  },
    ],
    rowLabel: 'CPM by Industry (Facebook)',
    rows: [
      { name: 'Retail & E-commerce', value: '$12.40', delta: 'Low competition', up: true  },
      { name: 'Finance & Insurance', value: '$31.20', delta: 'High competition', up: false },
      { name: 'Travel & Hospitality',value: '$18.60', delta: 'Medium',          up: false },
      { name: 'Health & Wellness',   value: '$9.80',  delta: 'Low competition', up: true  },
    ],
    note: 'Source: Meta Ads Manager Benchmarks Q1 2026',
  },
  'pinterest-shopping': {
    metrics: [
      { label: 'Monthly Impressions', value: '8.2M',   change: '+18%',  up: true  },
      { label: 'Save Rate',           value: '4.7%',   change: '+0.9pp',up: true  },
      { label: 'Outbound CTR',        value: '0.68%',  change: '+0.1pp',up: true  },
      { label: 'Avg CPC (Shopping)',  value: '$0.34',  change: '-$0.04',up: true  },
    ],
    rowLabel: 'Trending Boards This Week',
    rows: [
      { name: 'Quiet Luxury Aesthetics', value: '4.2M saves',  delta: '↑ +280%', up: true },
      { name: 'Summer Wedding Decor',    value: '3.1M saves',  delta: '↑ +340%', up: true },
      { name: 'Coastal Grandmother',     value: '2.8M saves',  delta: '↑ +210%', up: true },
      { name: 'Clean Girl Makeup',       value: '2.4M saves',  delta: '↑ +175%', up: true },
    ],
    note: 'Source: Pinterest Trends API — Updated 11 min ago',
  },
  'youtube-creator': {
    metrics: [
      { label: 'Avg CPV',          value: '$0.028', change: '-$0.003',up: true  },
      { label: 'Avg Watch Time',   value: '6m 42s', change: '+0:38',  up: true  },
      { label: 'Subscribe Rate',   value: '2.1%',   change: '+0.3pp', up: true  },
      { label: 'Avg CPM',          value: '$4.80',  change: '+$0.40', up: false },
    ],
    rowLabel: 'Top Content Categories by Revenue',
    rows: [
      { name: 'Personal Finance',  value: '$18.40 CPM', delta: '+12%', up: true  },
      { name: 'Tech Reviews',      value: '$12.70 CPM', delta: '+8%',  up: true  },
      { name: 'Fitness & Health',  value: '$9.30 CPM',  delta: '+5%',  up: true  },
      { name: 'Entertainment',     value: '$5.10 CPM',  delta: '-2%',  up: false },
    ],
    note: 'Source: YouTube Analytics Benchmark — Updated 25 min ago',
  },
  'spotify-creator': {
    metrics: [
      { label: 'Avg Stream Rate', value: '$0.004/str',change: '+$0.0003',up: true  },
      { label: 'Editorial Saves', value: '12.4%',    change: '+1.8pp',  up: true  },
      { label: 'Playlist Add %',  value: '6.2%',     change: '+0.7pp',  up: true  },
      { label: 'Listener Ret.',   value: '38%',       change: '+4pp',    up: true  },
    ],
    rowLabel: 'Trending Genres',
    rows: [
      { name: 'Afrobeats',         value: '+42%',  delta: 'Global surge',    up: true },
      { name: 'Phonk',             value: '+38%',  delta: 'Gen-Z driven',    up: true },
      { name: 'Indie Pop',         value: '+24%',  delta: 'Playlist growth', up: true },
      { name: 'Latin Urban',       value: '+31%',  delta: 'Americas + EU',   up: true },
    ],
    note: 'Source: Spotify for Artists Analytics — Updated 18 min ago',
  },
  'poshmark-resale': {
    metrics: [
      { label: 'Avg Resale Margin', value: '62%',    change: '+4pp',   up: true  },
      { label: 'Avg Days to Sell',  value: '11.2 days',change: '-1.8d',up: true  },
      { label: 'Avg Sale Price',    value: '$38.40', change: '+6.2%',  up: true  },
      { label: 'Offer Accept %',    value: '44%',    change: '+3pp',   up: true  },
    ],
    rowLabel: 'Top Reselling Brands',
    rows: [
      { name: 'Lululemon',   value: '$68 avg',  delta: '82% margin', up: true  },
      { name: 'Free People', value: '$42 avg',  delta: '74% margin', up: true  },
      { name: 'Nike / Jordan',value: '$91 avg', delta: '110% margin',up: true  },
      { name: 'Zara',        value: '$28 avg',  delta: '56% margin', up: true  },
    ],
    note: 'Source: Poshmark Marketplace Data — Updated 33 min ago',
  },
  'google-trends': {
    metrics: [
      { label: 'Rising Queries',   value: '4,820',  change: '+340',   up: true  },
      { label: 'Breakout Terms',   value: '186',    change: '+22',    up: true  },
      { label: 'Top Region',       value: 'US → UK',change: 'Spread', up: true  },
      { label: 'Search Volatility',value: 'Medium', change: 'Stable', up: true  },
    ],
    rowLabel: 'Breakout Search Terms (7-day)',
    rows: [
      { name: 'AI home assistant',   value: '▲ +560%', delta: 'Breakout',      up: true },
      { name: 'Seed cycling benefits',value: '▲ +380%',delta: 'Health trend',  up: true },
      { name: 'Quiet luxury fashion', value: '▲ +240%',delta: 'Fashion trend', up: true },
      { name: 'Budget travel 2026',   value: '▲ +190%',delta: 'Seasonal',      up: true },
    ],
    note: 'Source: Google Trends API — Updated 2 min ago',
  },
  'real-estate': {
    metrics: [
      { label: 'Median Home Price', value: '$412K',  change: '+3.8%',  up: true  },
      { label: 'Days on Market',    value: '28.4 days',change: '-4.1d',up: true  },
      { label: 'Price Cut %',       value: '18.2%',  change: '-2.1pp', up: true  },
      { label: 'Mortgage Rate',     value: '6.72%',  change: '-0.08pp',up: true  },
    ],
    rowLabel: 'Top Markets by Appreciation',
    rows: [
      { name: 'Austin, TX',      value: '+8.4%',  delta: '▲ Accelerating', up: true  },
      { name: 'Nashville, TN',   value: '+6.9%',  delta: '▲ Strong',       up: true  },
      { name: 'Phoenix, AZ',     value: '+5.2%',  delta: '→ Stable',       up: true  },
      { name: 'San Francisco, CA',value: '-1.3%', delta: '▼ Softening',    up: false },
    ],
    note: 'Source: Zillow Research + NAR Data — Updated 1 hr ago',
  },
}

// ── Metric pill ───────────────────────────────────────────────────────────────

function MetricPill({ m }: { m: ConnectorMetric }) {
  return (
    <div style={{
      padding:      '0.625rem 0.75rem',
      background:   '#F9F9F8',
      border:       '1px solid rgba(0,0,0,0.06)',
      borderRadius: '8px',
      minWidth:     0,
    }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.3rem' }}>
        {m.label}
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '1rem', fontWeight: 700, color: '#0C0C0E', lineHeight: 1.1 }}>
        {m.value}
      </div>
      {m.change && (
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', fontWeight: 600, color: m.up ? '#10B981' : '#EF4444', marginTop: '0.2rem' }}>
          {m.up ? '▲' : '▼'} {m.change}
        </div>
      )}
    </div>
  )
}

// ── Data row ──────────────────────────────────────────────────────────────────

function DataRow({ r, accent }: { r: ConnectorRow; accent: string }) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'space-between',
      padding:        '0.45rem 0.625rem',
      borderRadius:   6,
      transition:     'background 0.1s',
    }}>
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#374151', fontWeight: 500 }}>{r.name}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
        {r.delta && (
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.66rem', color: r.up ? '#10B981' : '#EF4444', fontWeight: 600 }}>
            {r.delta}
          </span>
        )}
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', fontWeight: 700, color: accent }}>{r.value}</span>
      </div>
    </div>
  )
}

// ── Connector data card ───────────────────────────────────────────────────────

function ConnectorDataCard({ c, data, isMobile }: { c: ConnectorDef; data: ConnectorData; isMobile: boolean }) {
  const [imgError, setImgError] = useState(false)
  const [expanded, setExpanded]  = useState(true)

  const logo = c.iconSlug && !imgError ? (
    <img src={`/icons/${c.iconSlug}-active.svg`} alt={c.label} width={20} height={20}
      onError={() => setImgError(true)} style={{ display: 'block' }} />
  ) : (
    <span style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 20, height: 20, borderRadius: 4, background: c.accentColor + '22',
      color: c.accentColor, fontSize: 11, fontWeight: 700, fontFamily: 'Inter, sans-serif',
    }}>{c.letter ?? c.label[0]}</span>
  )

  return (
    <div style={{
      background:   '#FFFFFF',
      border:       `1.5px solid ${c.accentColor}22`,
      borderRadius: '14px',
      overflow:     'hidden',
      marginBottom: '1rem',
      boxShadow:    '0 2px 10px rgba(0,0,0,0.04)',
    }}>
      {/* Card header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '0.75rem 1rem',
          borderBottom:   expanded ? `1px solid ${c.accentColor}18` : 'none',
          cursor:         'pointer',
          background:     c.accentColor + '05',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {logo}
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 700, color: '#0C0C0E' }}>
            {c.label}
          </span>
          {/* Live pulse */}
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%', background: '#10B981',
              display: 'inline-block', boxShadow: '0 0 0 2px rgba(16,185,129,0.25)',
            }} />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 600, color: '#10B981', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Live
            </span>
          </span>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#9CA3AF', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>
          ▼
        </span>
      </div>

      {expanded && (
        <div style={{ padding: '0.875rem 1rem 0.75rem' }}>
          {/* Metrics grid */}
          <div style={{
            display:             'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap:                 '0.5rem',
            marginBottom:        '0.875rem',
          }}>
            {data.metrics.map((m, i) => <MetricPill key={i} m={m} />)}
          </div>

          {/* Row table */}
          <div style={{
            background:   '#FAFAF8',
            border:       '1px solid rgba(0,0,0,0.05)',
            borderRadius: '8px',
            overflow:     'hidden',
          }}>
            <div style={{ padding: '0.4rem 0.625rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#9CA3AF' }}>{data.rowLabel}</span>
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: '#C4C4CC' }}>Value</span>
            </div>
            {data.rows.map((r, i) => (
              <div key={i} style={{ borderBottom: i < data.rows.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
                <DataRow r={r} accent={c.accentColor} />
              </div>
            ))}
          </div>

          {/* Note */}
          {data.note && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: '#C4C4CC', margin: '0.5rem 0 0', textAlign: 'right' }}>
              {data.note}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Connector selector card ───────────────────────────────────────────────────

function ConnectorToggleCard({ c, active, onToggle }: { c: ConnectorDef; active: boolean; onToggle: () => void }) {
  const [imgError, setImgError] = useState(false)

  const logo = c.iconSlug && !imgError ? (
    <img src={`/icons/${c.iconSlug}-${active ? 'active' : 'inactive'}.svg`} alt={c.label} width={28} height={28}
      onError={() => setImgError(true)} style={{ display: 'block' }} />
  ) : (
    <span style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 28, height: 28, borderRadius: 5,
      background: active ? c.accentColor + '22' : '#F3F4F6',
      color: active ? c.accentColor : '#9CA3AF',
      fontSize: (c.letter?.length ?? 1) === 1 ? 16 : 20,
      fontWeight: 700, fontFamily: 'Inter, sans-serif',
    }}>{c.letter ?? c.label[0]}</span>
  )

  return (
    <button onClick={onToggle} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: '0.4rem', padding: '0.75rem 0.5rem 0.625rem',
      borderRadius: '10px',
      border: `1.5px solid ${active ? c.accentColor + '44' : 'rgba(0,0,0,0.07)'}`,
      background: active ? c.accentColor + '08' : '#FAFAFA',
      cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
      position: 'relative', minWidth: 0,
    }}>
      {active && <span style={{ position: 'absolute', top: 6, right: 6, width: 5, height: 5, borderRadius: '50%', background: c.accentColor }} />}
      {logo}
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 600, color: active ? c.accentColor : '#9CA3AF', lineHeight: 1.2, whiteSpace: 'nowrap' }}>
        {c.label}
      </span>
    </button>
  )
}

// ── Domain group keys ─────────────────────────────────────────────────────────

const DOMAIN_LABEL_KEYS: Record<string, string> = {
  ecommerce:  'conn.groupEcommerce',
  social:     'conn.groupSocial',
  creator:    'conn.groupCreator',
  secondhand: 'conn.groupResale',
  analytics:  'conn.groupAnalytics',
  local:      'conn.groupLocal',
}
const DOMAIN_ORDER = ['ecommerce', 'social', 'creator', 'secondhand', 'analytics', 'local']

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConnectorsPage() {
  const { t } = useLanguage()
  const { enabledIds, analysisActive, toggle, setActive, enableAll, disableAll, mounted } = useConnectorState()

  const [isMobile, setIsMobile] = useState(false)
  const dataRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const activeConnectors = ALL_CONNECTORS.filter(c => analysisActive && enabledIds.has(c.id))
  const grouped = DOMAIN_ORDER.map(domain => ({
    domain,
    label:      t(DOMAIN_LABEL_KEYS[domain] as any),
    connectors: ALL_CONNECTORS.filter(c => c.domain === domain),
  })).filter(g => g.connectors.length > 0)

  return (
    <>
      <Nav />

      <main style={{ minHeight: '100vh', background: '#FAFAF8', paddingTop: '2.5rem', paddingBottom: '6rem' }}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '0 1.25rem' }}>

          {/* ── Header ───────────────────────────────────────────────── */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h1 style={{
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize:   isMobile ? '1.6rem' : '2rem',
                fontWeight: 600, color: '#0C0C0E', margin: 0, lineHeight: 1.15,
              }}>
                {t('conn.pageTitle')}
              </h1>
              <span style={{
                fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase', color: '#C9A96E',
                background: 'rgba(201,169,110,0.1)', padding: '0.2rem 0.6rem',
                borderRadius: 4, border: '1px solid rgba(201,169,110,0.25)',
              }}>
                {t('conn.demoMode')}
              </span>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#71717A', margin: 0, lineHeight: 1.6, maxWidth: 540 }}>
              {t('conn.pageSubtitle')}
            </p>
          </div>

          {/* ── Connector selector ───────────────────────────────────── */}
          <div style={{
            background: '#FFFFFF', border: '1.5px solid rgba(0,0,0,0.08)',
            borderRadius: '14px', overflow: 'hidden', marginBottom: '1.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.875rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Master toggle */}
                <button onClick={() => setActive(!analysisActive)} style={{
                  position: 'relative', width: 28, height: 15, borderRadius: 999,
                  background: analysisActive ? '#C9A96E' : '#D1D5DB',
                  border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s', padding: 0,
                }}>
                  <span style={{
                    position: 'absolute', top: 1.5, left: analysisActive ? 14 : 1.5,
                    width: 12, height: 12, borderRadius: '50%', background: '#FFF',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s', display: 'block',
                  }} />
                </button>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600, color: '#0C0C0E' }}>{t('conn.analysis')}</span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: '#9CA3AF' }}>{t('conn.whichPlatforms')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <button onClick={enableAll}  style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{t('conn.enableAll')}</button>
                <span style={{ color: '#E5E7EB' }}>·</span>
                <button onClick={disableAll} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{t('conn.disableAll')}</button>
              </div>
            </div>

            {/* Connector grid by group */}
            <div style={{ padding: '0.75rem 0.875rem 0.875rem' }}>
              {grouped.map(group => (
                <div key={group.domain} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.52rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#C4C4CC', marginBottom: '0.4rem' }}>
                    {group.label}
                  </div>
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {group.connectors.map(c => (
                      <ConnectorToggleCard
                        key={c.id}
                        c={c}
                        active={analysisActive && enabledIds.has(c.id)}
                        onToggle={() => toggle(c.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Status bar ───────────────────────────────────────────── */}
          {mounted && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              {activeConnectors.length === 0 ? (
                <p style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#EF4444',
                  background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
                  borderRadius: 8, padding: '0.5rem 0.875rem', margin: 0, width: '100%',
                }}>
                  ⚠ {t('conn.noneActive')}
                </p>
              ) : (
                <>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#10B981', fontWeight: 600 }}>
                    ● {t('conn.activeCount').replace('{n}', String(activeConnectors.length))}
                  </span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#C4C4CC' }}>
                    {t('conn.statusNote')}
                  </span>
                </>
              )}
            </div>
          )}

          {/* ── Live data feed ───────────────────────────────────────── */}
          {mounted && activeConnectors.length > 0 && (
            <div ref={dataRef}>
              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.25rem' }}>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF' }}>
                  Platform Data
                </span>
                <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.06)' }} />
                {/* Animated live dot */}
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 0 3px rgba(16,185,129,0.2)' }} />
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 700, color: '#10B981', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Demo Live
                  </span>
                </span>
              </div>

              {/* Data cards for each active connector */}
              {activeConnectors.map(c => {
                const data = MOCK_DATA[c.id]
                if (!data) return null
                return (
                  <ConnectorDataCard key={c.id} c={c} data={data} isMobile={isMobile} />
                )
              })}
            </div>
          )}

          {/* ── Empty state ───────────────────────────────────────────── */}
          {mounted && activeConnectors.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '3rem 2rem',
              background: '#FFFFFF', border: '1.5px dashed rgba(0,0,0,0.1)',
              borderRadius: '14px',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔌</div>
              <p style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.25rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.5rem 0' }}>
                No connectors active
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.8rem', color: '#9CA3AF', margin: '0 0 1.25rem 0', lineHeight: 1.6 }}>
                Enable connectors above to see live platform data here
              </p>
              <button onClick={enableAll} style={{
                padding: '0.6rem 1.5rem',
                background: 'linear-gradient(135deg, #C9A96E, #B8924F)',
                color: '#FFF', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem',
                fontWeight: 600, borderRadius: '8px', border: 'none', cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(201,169,110,0.3)',
              }}>
                {t('conn.enableAll')}
              </button>
            </div>
          )}

        </div>
      </main>
    </>
  )
}
