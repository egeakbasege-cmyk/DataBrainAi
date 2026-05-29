'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Nav } from '@/components/Nav'
import { ConnectorLogo } from '@/components/ConnectorLogos'

const _EASE = [0.22, 1, 0.36, 1] as const
const _fadeUp = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: _EASE } } }
const _stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } } }

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ConnectorType =
  // E-Commerce
  | 'shopify' | 'amazon' | 'woocommerce' | 'ebay' | 'etsy' | 'tiktokshop'
  // Advertising
  | 'meta-ads' | 'google-ads' | 'amazon-ppc' | 'tiktok-ads' | 'klaviyo'
  // Hospitality
  | 'booking' | 'airbnb' | 'expedia' | 'tripadvisor'
  // Services / SaaS
  | 'stripe' | 'fiverr' | 'upwork'
  // Analytics / Custom
  | 'ga4' | 'csv' | 'api'

type IndustryType = 'ecommerce' | 'advertising' | 'hospitality' | 'services' | 'analytics'
type Step = 1 | 2 | 3
type TabType = 'analysis' | 'benchmarks' | 'price-scout'

interface ConnectorDef {
  id: ConnectorType
  name: string
  description: string
  icon: string
  placeholder: string
  fieldLabel: string
  field2Label?:       string
  field2Placeholder?: string
}

interface QueryCategory {
  label:   string
  icon:    string
  queries: string[]
}

interface IndustryGroup {
  id:              IndustryType
  name:            string
  icon:            string
  color:           string   // accent colour for this industry
  description:     string
  connectors:      ConnectorDef[]
  queryCategories: QueryCategory[]
}

interface PriceResult {
  title:        string
  price:        string
  currency:     string
  platform:     string
  url:          string
  rating?:      string
  reviewCount?: string
  savings?:     string
  isAlternative: boolean
  snippet?:     string
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

const INDUSTRY_GROUPS: IndustryGroup[] = [
  {
    id: 'ecommerce', name: 'E-Commerce', icon: '🛍️', color: '#14B8A6',
    description: 'Satış kanalları, mağaza verisi ve ürün analizi',
    connectors: [
      { id: 'shopify',    name: 'Shopify',       icon: '🟢', description: 'Admin API ile gerçek sipariş, gelir ve ürün verisi', fieldLabel: 'Store Domain', placeholder: 'mystore.myshopify.com', field2Label: 'Admin API Access Token', field2Placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxx' },
      { id: 'amazon',     name: 'Amazon',         icon: '📦', description: 'SP-API ile satış hızı, BSR, stok sağlığı ve iadeler', fieldLabel: 'SP-API Refresh Token', placeholder: 'Atzr|xxxxxxxxxxxxxxxxxxxxxxxx' },
      { id: 'woocommerce',name: 'WooCommerce',    icon: '🔵', description: 'REST API ile WordPress mağaza verisi', fieldLabel: 'Site URL', placeholder: 'mysite.com', field2Label: 'Consumer Key:Secret', field2Placeholder: 'ck_xxx:cs_xxx (colon-separated)' },
      { id: 'ebay',       name: 'eBay',           icon: '🟡', description: 'Satıcı merkezi URL veya mağaza sayfası analizi', fieldLabel: 'Store URL', placeholder: 'https://www.ebay.com/str/yourstore' },
      { id: 'etsy',       name: 'Etsy',           icon: '🟤', description: 'Mağaza URL ile ürün ve satış analizi', fieldLabel: 'Shop URL', placeholder: 'https://www.etsy.com/shop/yourshop' },
      { id: 'tiktokshop', name: 'TikTok Shop',    icon: '🎵', description: 'TikTok mağaza ve içerik performansı', fieldLabel: 'Shop/Profile URL', placeholder: 'https://www.tiktok.com/@yourstore' },
      { id: 'csv',        name: 'CSV / Spreadsheet', icon: '📄', description: 'Dışa aktarılan CSV URL — satış geçmişi, siparişler', fieldLabel: 'Public CSV URL', placeholder: 'https://docs.google.com/spreadsheets/.../export?format=csv' },
    ],
    queryCategories: [
      { label: 'Ürün & SKU Analizi',    icon: '📦', queries: ['Run ABC analysis — which SKUs drive 80% of revenue?', 'Which products have the highest return rate and why?', 'Identify products I should discontinue or bundle', 'What is my top product revenue concentration risk?'] },
      { label: 'Gelir & Kar Marjı',      icon: '💰', queries: ['Calculate my real profit margin after all fees and returns', 'Where am I losing the most revenue right now?', 'What is my cart abandonment costing me per month?', 'Analyse my AOV trend and upsell opportunities'] },
      { label: 'Müşteri Segmentasyonu',  icon: '👥', queries: ['Run RFM segmentation — who are my champion customers?', 'Which customers are at risk of churning this month?', 'What is my customer LTV by acquisition channel?', 'Identify my repeat purchase rate and loyalty drivers'] },
      { label: 'Stok & Operasyon',       icon: '📋', queries: ['Which products are at stockout risk in the next 30 days?', 'Calculate my optimal reorder point and safety stock level', 'What is my inventory turnover rate vs category benchmark?', 'Analyse my supplier concentration and single-source risk'] },
      { label: 'Büyüme Fırsatları',      icon: '🚀', queries: ['What are my top 3 revenue growth opportunities right now?', 'Which new markets or categories should I expand into?', 'Find cross-sell and bundle opportunities in my catalogue', 'Compare my performance to top 10% sellers in my category'] },
    ],
  },
  {
    id: 'advertising', name: 'Reklam & Büyüme', icon: '📢', color: '#8B5CF6',
    description: 'Reklam performansı, ROAS analizi ve büyüme optimizasyonu',
    connectors: [
      { id: 'meta-ads',    name: 'Meta Ads',       icon: '🔵', description: 'Facebook & Instagram reklam performansı', fieldLabel: 'Brand Page or Ad Account URL', placeholder: 'https://facebook.com/yourbrand' },
      { id: 'google-ads',  name: 'Google Ads',     icon: '🔴', description: 'Search, Display, Shopping kampanya verisi', fieldLabel: 'Website Domain', placeholder: 'https://yoursite.com' },
      { id: 'amazon-ppc',  name: 'Amazon PPC',     icon: '📦', description: 'Sponsored Products, Brands, Display ACOS analizi', fieldLabel: 'SP-API Token', placeholder: 'Atzr|xxxxxxxxxxxxxxxxxxxxxxxx' },
      { id: 'tiktok-ads',  name: 'TikTok Ads',     icon: '🎵', description: 'TikTok for Business kampanya ve creative analizi', fieldLabel: 'Business URL or Account', placeholder: 'https://www.tiktok.com/@yourbrand' },
      { id: 'klaviyo',     name: 'Klaviyo',         icon: '📧', description: 'Email & SMS pazarlama gelir analizi', fieldLabel: 'Private API Key', placeholder: 'pk_xxxxxxxxxxxxxxxxxxxxxxxx' },
      { id: 'api',         name: 'Custom Ad Data',  icon: '🔗', description: 'Herhangi bir reklam platformu API\'si', fieldLabel: 'Endpoint URL', placeholder: 'https://your-ads-platform.com/api/stats' },
    ],
    queryCategories: [
      { label: 'ROAS & Verimlilik',      icon: '📈', queries: ['Which ad campaigns have the best ROAS right now?', 'Which campaigns should I scale or kill immediately?', 'Calculate my blended ROAS across all channels', 'Compare Meta vs Google vs TikTok efficiency'] },
      { label: 'Creative & Audience',    icon: '🎨', queries: ['Which ad creatives are driving the most conversions?', 'Which audience segments have the lowest CPA?', 'Analyse my CTR vs industry benchmark by channel', 'Identify audience fatigue signals in my campaigns'] },
      { label: 'Budget Optimizasyonu',   icon: '💸', queries: ['Where should I reallocate budget for maximum return?', 'What is my true CAC by channel?', 'Calculate payback period for new customer acquisition', 'Forecast revenue if I scale ad spend by 30%'] },
      { label: 'Email & Retention ROI',  icon: '📧', queries: ['What is my email revenue contribution vs paid ads?', 'Which email flows or sequences generate the most revenue?', 'Calculate my email list ROI per subscriber', 'Analyse list health, open rates, and unsubscribe trend'] },
    ],
  },
  {
    id: 'hospitality', name: 'Konaklama & Seyahat', icon: '🏨', color: '#F59E0B',
    description: 'Otel, kiralık mülk, tatil evi ve seyahat acentaları',
    connectors: [
      { id: 'booking',     name: 'Booking.com',    icon: '💙', description: 'Mülk sayfası veya URL ile doluluk ve fiyat analizi', fieldLabel: 'Property URL', placeholder: 'https://www.booking.com/hotel/...' },
      { id: 'airbnb',      name: 'Airbnb',          icon: '🔴', description: 'İlan URL ile fiyat, doluluk ve review analizi', fieldLabel: 'Listing URL', placeholder: 'https://www.airbnb.com/rooms/...' },
      { id: 'expedia',     name: 'Expedia / Hotels.com', icon: '🟡', description: 'Expedia grup platformu fiyat ve rekabet analizi', fieldLabel: 'Property URL', placeholder: 'https://www.expedia.com/...' },
      { id: 'tripadvisor', name: 'TripAdvisor',    icon: '🟢', description: 'Review sentiment, sıralama ve rekabet analizi', fieldLabel: 'Property URL', placeholder: 'https://www.tripadvisor.com/Hotel_Review-...' },
      { id: 'api',         name: 'PMS / Channel Manager', icon: '🔗', description: 'Opera, Cloudbeds, Guesty, vb. API entegrasyonu', fieldLabel: 'API Endpoint', placeholder: 'https://api.cloudbeds.com/...' },
    ],
    queryCategories: [
      { label: 'Doluluk & RevPAR',       icon: '🏨', queries: ['Calculate my RevPAR and compare to local comp set', 'What is my optimal occupancy rate for maximum profitability?', 'Analyse my ADR trend vs competitor set this season', 'Identify my highest and lowest performing date ranges'] },
      { label: 'OTA & Kanal Stratejisi', icon: '💻', queries: ['What OTA commission am I paying and what is the net margin?', 'How does my direct booking rate compare to OTA share?', 'Which OTA drives the most profitable bookings?', 'Should I adjust my rate parity or close-out strategy?'] },
      { label: 'Fiyatlandırma Zekası',   icon: '💰', queries: ['Find optimal pricing for next peak season dates', 'How do my rates compare to similar properties in my area?', 'What happens to occupancy if I raise rates by 15%?', 'Identify last-minute pricing and yield opportunities'] },
      { label: 'Review & Deneyim',       icon: '⭐', queries: ['Analyse my review sentiment and main guest pain points', 'How do my review scores affect my OTA search ranking?', 'Revenue impact of improving my rating by 0.5 stars?', 'Compare my amenities vs top-rated competitors nearby'] },
    ],
  },
  {
    id: 'services', name: 'Hizmet & SaaS', icon: '⚙️', color: '#EC4899',
    description: 'Freelance, ajans, SaaS ve abonelik işletmeleri',
    connectors: [
      { id: 'stripe',  name: 'Stripe',   icon: '🟣', description: 'Ödeme ve abonelik gelir analizi', fieldLabel: 'Restricted API Key', placeholder: 'Stripe restricted key (rk_live_…)' },
      { id: 'fiverr',  name: 'Fiverr',   icon: '🟢', description: 'Freelancer profil ve gig performans analizi', fieldLabel: 'Profile URL', placeholder: 'https://www.fiverr.com/yourprofile' },
      { id: 'upwork',  name: 'Upwork',   icon: '🟢', description: 'Freelancer profil, proje ve kazanç analizi', fieldLabel: 'Profile URL', placeholder: 'https://www.upwork.com/freelancers/...' },
      { id: 'api',     name: 'Custom API', icon: '🔗', description: 'Kendi sisteminizdeki herhangi bir veri kaynağı', fieldLabel: 'Endpoint URL', placeholder: 'https://your-app.com/api/analytics' },
    ],
    queryCategories: [
      { label: 'MRR & Büyüme',           icon: '📈', queries: ['What is my MRR trend and growth rate?', 'Calculate my ARR and forecast for next 12 months', 'What is my revenue churn and its LTV impact?', 'Identify my fastest and slowest growing segments'] },
      { label: 'Müşteri Ekonomisi',       icon: '👥', queries: ['What is my average LTV vs CAC ratio?', 'Which service tier has the best margin?', 'Identify at-risk accounts by payment or usage signals', 'Calculate payback period by customer segment'] },
      { label: 'Proje & Kapasite',        icon: '⚙️', queries: ['What is my revenue per billable hour?', 'Which project types have the highest margin?', 'Calculate my team utilization rate vs target', 'Identify upsell and expansion opportunities in current accounts'] },
    ],
  },
  {
    id: 'analytics', name: 'Veri & Analitik', icon: '📊', color: '#6366F1',
    description: 'Web analitik, trafik, dönüşüm ve kohort analizi',
    connectors: [
      { id: 'ga4',  name: 'Google Analytics 4', icon: '📊', description: 'Trafik, dönüşüm ve kullanıcı davranışı analizi', fieldLabel: 'Website URL', placeholder: 'https://yoursite.com' },
      { id: 'csv',  name: 'CSV / Spreadsheet',  icon: '📄', description: 'GA4, Mixpanel veya özel export CSV verisi', fieldLabel: 'Public CSV URL', placeholder: 'https://docs.google.com/.../export?format=csv' },
      { id: 'api',  name: 'Analytics API',      icon: '🔗', description: 'Mixpanel, Amplitude, Segment veya özel API', fieldLabel: 'Endpoint URL', placeholder: 'https://api.mixpanel.com/...' },
    ],
    queryCategories: [
      { label: 'Trafik & Dönüşüm',       icon: '🌐', queries: ['Which traffic sources convert best and at what CPA?', 'Analyse my conversion funnel — where are users dropping off?', 'Compare organic vs paid traffic quality and value', 'What is my mobile vs desktop conversion gap?'] },
      { label: 'Kohort & Retention',      icon: '📅', queries: ['Run cohort retention analysis — which month performs best?', 'Identify my stickiest features or content by engagement', 'Calculate 30/60/90 day user retention curves', 'Which acquisition channel produces the best long-term retention?'] },
    ],
  },
]

// Flat list of all connectors (used for modal lookup)
const ALL_CONNECTORS: ConnectorDef[] = INDUSTRY_GROUPS.flatMap(g => g.connectors)

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
  woocommerce: {
    type: 'woocommerce',
    name: 'WooCommerce Store',
    syncedAt: 'Just now',
    revenue: '$56,300',
    orders: '1,050',
    aov: '$53.62',
    topProduct: 'Premium Plugin Bundle',
    extra: [{ label: 'Active Products', value: '148' }, { label: 'Conversion Rate', value: '2.8%' }],
  },
  ebay: {
    type: 'ebay',
    name: 'eBay Seller Account',
    syncedAt: 'Just now',
    revenue: '$38,900',
    orders: '2,140',
    aov: '$18.18',
    topProduct: 'Vintage Electronics',
    extra: [{ label: 'Feedback Score', value: '99.2%' }, { label: 'Active Listings', value: '312' }],
  },
  etsy: {
    type: 'etsy',
    name: 'Etsy Shop',
    syncedAt: 'Just now',
    revenue: '$22,400',
    orders: '740',
    aov: '$30.27',
    topProduct: 'Handmade Ceramic Mugs',
    extra: [{ label: 'Shop Stars', value: '4.9 ★' }, { label: 'Total Sales', value: '5,200' }],
  },
  tiktokshop: {
    type: 'tiktokshop',
    name: 'TikTok Shop',
    syncedAt: 'Just now',
    revenue: '$91,000',
    orders: '5,600',
    aov: '$16.25',
    topProduct: 'Trending Beauty Bundle',
    extra: [{ label: 'Video Views', value: '2.3M' }, { label: 'Live GMV', value: '$34,500' }],
  },
  'meta-ads': {
    type: 'meta-ads',
    name: 'Meta Ads Manager',
    syncedAt: 'Just now',
    revenue: '$480,000',
    orders: '12,000',
    aov: '$40.00',
    topProduct: 'DTC Apparel Campaign',
    extra: [{ label: 'ROAS', value: '3.8x' }, { label: 'CPM', value: '$12.40' }],
  },
  'google-ads': {
    type: 'google-ads',
    name: 'Google Ads',
    syncedAt: 'Just now',
    revenue: '$320,000',
    orders: '8,900',
    aov: '$35.96',
    topProduct: 'Search — Brand Keywords',
    extra: [{ label: 'Quality Score', value: '8.2/10' }, { label: 'CPC', value: '$1.84' }],
  },
  'amazon-ppc': {
    type: 'amazon-ppc',
    name: 'Amazon PPC',
    syncedAt: 'Just now',
    revenue: '$145,000',
    orders: '4,300',
    aov: '$33.72',
    topProduct: 'Sponsored Products',
    extra: [{ label: 'ACoS', value: '22%' }, { label: 'CTR', value: '0.48%' }],
  },
  'tiktok-ads': {
    type: 'tiktok-ads',
    name: 'TikTok Ads',
    syncedAt: 'Just now',
    revenue: '$67,000',
    orders: '3,100',
    aov: '$21.61',
    topProduct: 'In-Feed Video Campaign',
    extra: [{ label: 'CPM', value: '$7.20' }, { label: 'VTR', value: '62%' }],
  },
  klaviyo: {
    type: 'klaviyo',
    name: 'Klaviyo Email',
    syncedAt: 'Just now',
    revenue: '$58,000',
    orders: '1,820',
    aov: '$31.87',
    topProduct: 'Abandoned Cart Flow',
    extra: [{ label: 'Open Rate', value: '28.4%' }, { label: 'Click Rate', value: '4.1%' }],
  },
  booking: {
    type: 'booking',
    name: 'Booking.com Property',
    syncedAt: 'Just now',
    revenue: '$112,000',
    orders: '480',
    aov: '$233.33',
    topProduct: 'Deluxe Sea View Room',
    extra: [{ label: 'Occupancy Rate', value: '78%' }, { label: 'Review Score', value: '8.7/10' }],
  },
  airbnb: {
    type: 'airbnb',
    name: 'Airbnb Host Account',
    syncedAt: 'Just now',
    revenue: '$48,600',
    orders: '210',
    aov: '$231.43',
    topProduct: 'Beachfront Studio',
    extra: [{ label: 'Superhost', value: 'Yes' }, { label: 'Avg Rating', value: '4.87 ★' }],
  },
  expedia: {
    type: 'expedia',
    name: 'Expedia Property',
    syncedAt: 'Just now',
    revenue: '$89,000',
    orders: '390',
    aov: '$228.21',
    topProduct: 'Standard Double Room',
    extra: [{ label: 'Traveler Rating', value: '8.4/10' }, { label: 'RevPAR', value: '$142' }],
  },
  tripadvisor: {
    type: 'tripadvisor',
    name: 'TripAdvisor Listing',
    syncedAt: 'Just now',
    revenue: '$74,000',
    orders: '320',
    aov: '$231.25',
    topProduct: 'Boutique Hotel Package',
    extra: [{ label: 'Ranking', value: '#3 in City' }, { label: 'Reviews', value: '1,240' }],
  },
  stripe: {
    type: 'stripe',
    name: 'Stripe Payments',
    syncedAt: 'Just now',
    revenue: '$198,000',
    orders: '3,600',
    aov: '$55.00',
    topProduct: 'SaaS Monthly Plan',
    extra: [{ label: 'MRR', value: '$16,500' }, { label: 'Churn Rate', value: '2.1%' }],
  },
  fiverr: {
    type: 'fiverr',
    name: 'Fiverr Pro Account',
    syncedAt: 'Just now',
    revenue: '$18,400',
    orders: '310',
    aov: '$59.35',
    topProduct: 'Logo Design Gig',
    extra: [{ label: 'Level', value: 'Top Rated' }, { label: 'Repeat Buyers', value: '41%' }],
  },
  upwork: {
    type: 'upwork',
    name: 'Upwork Agency',
    syncedAt: 'Just now',
    revenue: '$62,000',
    orders: '88',
    aov: '$704.55',
    topProduct: 'Full-Stack Development',
    extra: [{ label: 'JSS', value: '98%' }, { label: 'Top Rated Plus', value: 'Yes' }],
  },
  ga4: {
    type: 'ga4',
    name: 'Google Analytics 4',
    syncedAt: 'Just now',
    revenue: '$N/A — analytics only',
    orders: 'N/A',
    aov: 'N/A',
    topProduct: 'N/A',
    extra: [{ label: 'Monthly Sessions', value: '142,000' }, { label: 'Bounce Rate', value: '38%' }],
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
  const [selectedIndustry, setSelectedIndustry] = useState<IndustryType>('ecommerce')
  const [activeQueryCategory, setActiveQueryCategory] = useState(0)
  const [modalConnector, setModalConnector] = useState<ConnectorDef | null>(null)
  const [apiInput, setApiInput] = useState('')
  const [apiInput2, setApiInput2] = useState('')
  const [connectError, setConnectError] = useState<{ error: string; hint: string } | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectedSource, setConnectedSource] = useState<SourceSummary | null>(null)
  const [query, setQuery] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [loadingStage, setLoadingStage] = useState(0)
  // Price Scout
  const [priceQuery, setPriceQuery] = useState('')
  const [priceSearching, setPriceSearching] = useState(false)
  const [priceResults, setPriceResults] = useState<PriceResult[] | null>(null)
  const [priceAiSummary, setPriceAiSummary] = useState('')

  const queryRef      = useRef<HTMLInputElement>(null)
  const priceQueryRef = useRef<HTMLInputElement>(null)

  const activeIndustry = INDUSTRY_GROUPS.find(g => g.id === selectedIndustry) ?? INDUSTRY_GROUPS[0]

  const LOADING_STAGES = [
    'Parsing your data source…',
    'Running benchmark queries…',
    'Scoring against industry medians…',
    'Generating recommendations…',
    'Finalising analysis…',
  ]

  // Real connector — calls /api/data-lab/connect/, shows inline error on failure
  const handleConnect = useCallback(() => {
    if (!modalConnector) return
    setConnecting(true)
    setConnectError(null)

    ;(async () => {
      try {
        const res = await fetch('/api/data-lab/connect/', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectorType: modalConnector.id,
            credentials: {
              // field 1 is always the primary key / URL
              key:    apiInput.trim(),
              // field 2 is the secondary credential (domain for Shopify)
              domain: apiInput2.trim() || undefined,
            },
          }),
        })

        const data = await res.json()

        if (!data.success) {
          // Show the error inline — do NOT fall back to mock silently
          setConnectError({ error: data.error ?? 'Connection failed.', hint: data.hint ?? '' })
          setConnecting(false)
          return
        }

        // Success — real SourceSummary from the API
        setConnectedSource(data.source as SourceSummary)
        setConnecting(false)
        setModalConnector(null)
        setApiInput('')
        setApiInput2('')
        setConnectError(null)
        setStep(2)

      } catch (err) {
        console.error('[DataLab] connect error:', err)
        setConnectError({
          error: 'Network error — could not reach the connect service.',
          hint:  'Check your internet connection and try again.',
        })
        setConnecting(false)
      }
    })()
  }, [modalConnector, apiInput, apiInput2])

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

  // Price Scout — search cheapest price + alternatives for any product/service
  const handlePriceSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    setPriceSearching(true)
    setPriceResults(null)
    setPriceAiSummary('')
    try {
      const res  = await fetch('/api/data-lab/price-scout/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: q, category: activeIndustry.name }),
      })
      const data = await res.json()
      if (data.results) {
        setPriceResults(data.results as PriceResult[])
        setPriceAiSummary(data.aiSummary ?? '')
      }
    } catch (err) {
      console.error('[PriceScout] error:', err)
      setPriceResults([])
    } finally {
      setPriceSearching(false)
    }
  }, [activeIndustry.name])

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
      onClick={() => { if (!connecting) { setModalConnector(null); setApiInput(''); setApiInput2(''); setConnectError(null) } }}
    >
      <div
        style={{ ...cardStyle, width: '100%', maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <ConnectorLogo id={modalConnector.id} size={36} />
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

        {/* ── Field 1: primary key / URL ── */}
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem', fontFamily: 'Inter, sans-serif' }}>
          {modalConnector.fieldLabel}
        </label>
        <input
          type="text"
          value={apiInput}
          onChange={(e) => { setApiInput(e.target.value); setConnectError(null) }}
          placeholder={modalConnector.placeholder}
          disabled={connecting}
          style={{
            width: '100%', padding: '0.65rem 0.9rem',
            border: connectError ? '1px solid rgba(239,68,68,0.55)' : '1px solid rgba(20,184,166,0.25)',
            borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: '0.87rem',
            color: '#374151', background: '#fff', boxSizing: 'border-box',
            marginBottom: modalConnector.field2Label ? '0.85rem' : '1.25rem', outline: 'none',
          }}
        />

        {/* ── Field 2: optional secondary credential (Shopify token) ── */}
        {modalConnector.field2Label && (
          <>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem', fontFamily: 'Inter, sans-serif' }}>
              {modalConnector.field2Label}
            </label>
            <input
              type="text"
              value={apiInput2}
              onChange={(e) => { setApiInput2(e.target.value); setConnectError(null) }}
              placeholder={modalConnector.field2Placeholder ?? ''}
              disabled={connecting}
              style={{
                width: '100%', padding: '0.65rem 0.9rem',
                border: connectError ? '1px solid rgba(239,68,68,0.55)' : '1px solid rgba(20,184,166,0.25)',
                borderRadius: 8, fontFamily: 'Inter, sans-serif', fontSize: '0.87rem',
                color: '#374151', background: '#fff', boxSizing: 'border-box',
                marginBottom: '1.25rem', outline: 'none',
              }}
            />
          </>
        )}

        {/* ── Inline error ── */}
        {connectError && (
          <div style={{
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 8, padding: '0.7rem 0.9rem', marginBottom: '1rem',
          }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.83rem', fontWeight: 600, color: '#DC2626', margin: '0 0 0.25rem' }}>
              {connectError.error}
            </p>
            {connectError.hint && (
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#9B1C1C', margin: 0, lineHeight: 1.5 }}>
                {connectError.hint}
              </p>
            )}
          </div>
        )}

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
              onClick={() => { setModalConnector(null); setApiInput(''); setApiInput2(''); setConnectError(null) }}
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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '3.5rem 2rem' }}>
      {/* Hero */}
      <motion.div variants={_stagger} initial="hidden" animate="show" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <motion.div variants={_fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
          <div style={{ width: 24, height: 1, background: '#C9A96E', opacity: 0.6 }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#C9A96E' }}>Data Intelligence</span>
          <div style={{ width: 24, height: 1, background: '#C9A96E', opacity: 0.6 }} />
        </motion.div>
        <motion.h1 variants={_fadeUp} style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.75rem', letterSpacing: '-0.02em', lineHeight: 1.08 }}>
          DataLab
        </motion.h1>
        <motion.p variants={_fadeUp} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#71717A', maxWidth: 520, margin: '0 auto', lineHeight: 1.75, fontWeight: 300 }}>
          Sektörünüzü seçin, veri kaynağınızı bağlayın.{' '}
          <span style={{ color: '#14B8A6', fontWeight: 500 }}>Gerçek zamanlı AI analizi başlasın.</span>
        </motion.p>
      </motion.div>

      {/* Industry selector */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
        {INDUSTRY_GROUPS.map((ind) => (
          <button
            key={ind.id}
            onClick={() => { setSelectedIndustry(ind.id); setActiveQueryCategory(0) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.45rem',
              padding: '0.5rem 1.1rem',
              borderRadius: 999,
              border: selectedIndustry === ind.id ? `1.5px solid ${ind.color}` : '1.5px solid #E5E7EB',
              background: selectedIndustry === ind.id ? `${ind.color}15` : '#fff',
              color: selectedIndustry === ind.id ? ind.color : '#6B7280',
              fontFamily: 'Inter, sans-serif', fontSize: '0.83rem', fontWeight: selectedIndustry === ind.id ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            <span>{ind.icon}</span> {ind.name}
          </button>
        ))}
      </div>

      {/* Connector grid for selected industry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
        {activeIndustry.connectors.map((c) => (
          <div
            key={c.id}
            style={{ ...cardStyle, display: 'flex', alignItems: 'flex-start', gap: '0.9rem', cursor: 'pointer', transition: 'box-shadow 0.18s, transform 0.18s' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 28px ${activeIndustry.color}20`; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 20px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
          >
            <div style={{ width: 44, height: 44, background: `${activeIndustry.color}10`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              <ConnectorLogo id={c.id} size={32} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', fontWeight: 600, color: '#111827', margin: '0 0 0.2rem' }}>{c.name}</h3>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#6B7280', margin: '0 0 0.75rem', lineHeight: 1.5 }}>{c.description}</p>
              <button
                onClick={() => setModalConnector(c)}
                style={{ background: 'transparent', border: `1.5px solid ${activeIndustry.color}`, color: activeIndustry.color, borderRadius: 6, padding: '0.35rem 0.9rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = activeIndustry.color; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = activeIndustry.color }}
              >
                Bağlan
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sample data + industry count */}
      <div style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
        <button
          onClick={() => { setConnectedSource(MOCK_SOURCES.shopify); setStep(2) }}
          style={{ background: 'transparent', border: 'none', color: '#9CA3AF', fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(156,163,175,0.4)' }}
        >
          Örnek veri ile dene
        </button>
        <span style={{ color: '#D1D5DB', fontSize: '0.7rem' }}>|</span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: '#9CA3AF' }}>
          {INDUSTRY_GROUPS.reduce((s, g) => s + g.connectors.length, 0)} platform · 5 sektör
        </span>
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
              <ConnectorLogo id={connectedSource.type} size={32} />
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
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {([
              { id: 'analysis',    label: '🔍 Analiz' },
              { id: 'benchmarks',  label: '📈 Benchmark' },
              { id: 'price-scout', label: '🛒 Fiyat Karşılaştır' },
            ] as { id: TabType; label: string }[]).map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding: '0.5rem 1.1rem', borderRadius: 7, border: 'none', background: activeTab === t.id ? '#14B8A6' : 'rgba(255,255,255,0.7)', color: activeTab === t.id ? '#fff' : '#6B7280', fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', fontWeight: activeTab === t.id ? 600 : 400, cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── ANALYSIS & BENCHMARKS tab ── */}
          {activeTab !== 'price-scout' && (
            <>
              {/* Query bar */}
              <form onSubmit={handleQuerySubmit} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.92)', border: '1.5px solid rgba(20,184,166,0.18)', borderRadius: 10, padding: '0.5rem 0.5rem 0.5rem 1rem', alignItems: 'center' }}>
                  <input
                    ref={queryRef} type="text" value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Veriniz hakkında herhangi bir soru sorun…"
                    style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.92rem', color: '#374151', background: 'transparent' }}
                  />
                  <button type="submit" disabled={!query.trim() || analyzing}
                    style={{ background: query.trim() ? '#14B8A6' : '#E5E7EB', color: query.trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 7, padding: '0.6rem 1.1rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.87rem', cursor: query.trim() ? 'pointer' : 'not-allowed' }}>
                    Analiz Et →
                  </button>
                </div>
              </form>

              {/* Category tabs + query pills */}
              {activeIndustry.queryCategories.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  {/* Category pills */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {activeIndustry.queryCategories.map((cat, idx) => (
                      <button key={cat.label} onClick={() => setActiveQueryCategory(idx)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.85rem', borderRadius: 999, border: activeQueryCategory === idx ? `1.5px solid ${activeIndustry.color}` : '1.5px solid #E5E7EB', background: activeQueryCategory === idx ? `${activeIndustry.color}12` : 'transparent', color: activeQueryCategory === idx ? activeIndustry.color : '#6B7280', fontFamily: 'Inter, sans-serif', fontSize: '0.76rem', fontWeight: activeQueryCategory === idx ? 600 : 400, cursor: 'pointer' }}>
                        <span>{cat.icon}</span> {cat.label}
                      </button>
                    ))}
                  </div>
                  {/* Query pills for active category */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                    {activeIndustry.queryCategories[activeQueryCategory]?.queries.map((ex) => (
                      <button key={ex} onClick={() => { setQuery(ex); handleAnalyze(ex) }}
                        style={{ background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.14)', borderRadius: 20, padding: '0.35rem 0.85rem', fontFamily: 'Inter, sans-serif', fontSize: '0.77rem', color: '#0D9488', cursor: 'pointer', textAlign: 'left', lineHeight: 1.4, transition: 'background 0.12s' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.11)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.05)')}>
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Placeholder */}
              <div style={{ ...cardStyle, textAlign: 'center', padding: '2.5rem 2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>{activeTab === 'analysis' ? '🔍' : '📈'}</div>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: '0 0 0.35rem' }}>
                  {activeTab === 'analysis' ? 'Soru sorun, analiz başlasın' : 'Benchmark karşılaştırması için soru sorun'}
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', color: '#9CA3AF', margin: 0 }}>
                  Yukarıya yazın veya hazır sorulardan birini seçin.
                </p>
              </div>
            </>
          )}

          {/* ── PRICE SCOUT tab ── */}
          {activeTab === 'price-scout' && (
            <div>
              <form onSubmit={(e) => { e.preventDefault(); handlePriceSearch(priceQuery) }} style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.92)', border: '1.5px solid rgba(201,169,110,0.25)', borderRadius: 10, padding: '0.5rem 0.5rem 0.5rem 1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔎</span>
                  <input
                    ref={priceQueryRef} type="text" value={priceQuery}
                    onChange={(e) => setPriceQuery(e.target.value)}
                    placeholder="Ürün veya hizmet adı girin… (e.g. iPhone 15 Pro, Airbnb Istanbul 2 bedroom)"
                    style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'Inter, sans-serif', fontSize: '0.92rem', color: '#374151', background: 'transparent' }}
                  />
                  <button type="submit" disabled={!priceQuery.trim() || priceSearching}
                    style={{ background: priceQuery.trim() ? '#C9A96E' : '#E5E7EB', color: priceQuery.trim() ? '#fff' : '#9CA3AF', border: 'none', borderRadius: 7, padding: '0.6rem 1.1rem', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '0.87rem', cursor: priceQuery.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}>
                    {priceSearching ? '🔍 Taranıyor…' : 'Fiyat Bul →'}
                  </button>
                </div>
              </form>

              {/* Quick search suggestions */}
              {!priceResults && !priceSearching && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.76rem', color: '#9CA3AF', margin: '0 0 0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hızlı Örnekler</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {[
                      'Sony WH-1000XM5 kulaklık', 'Shopify Plus plan price', 'Istanbul Airbnb 2 bedroom',
                      'Klaviyo email marketing pricing', 'Booking.com hotel management software',
                      'WooCommerce vs Shopify pricing', 'Amazon FBA tool software',
                    ].map((s) => (
                      <button key={s} onClick={() => { setPriceQuery(s); handlePriceSearch(s) }}
                        style={{ background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.2)', borderRadius: 20, padding: '0.33rem 0.85rem', fontFamily: 'Inter, sans-serif', fontSize: '0.77rem', color: '#92683A', cursor: 'pointer' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Loading state */}
              {priceSearching && (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '3rem 2rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem', animation: 'pulse 1s infinite' }}>🔍</div>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', color: '#111827', margin: 0 }}>İnternette en iyi fiyat aranıyor…</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#9CA3AF', margin: '0.5rem 0 0' }}>Fiyat karşılaştırma, alternatifler, değerlendirmeler…</p>
                </div>
              )}

              {/* Results */}
              {priceResults && !priceSearching && (
                <div>
                  {/* AI Summary */}
                  {priceAiSummary && (
                    <div style={{ ...cardStyle, borderLeft: '3px solid #C9A96E', marginBottom: '1rem', padding: '1rem 1.25rem' }}>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#C9A96E', margin: '0 0 0.4rem' }}>AI Özeti</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', color: '#374151', lineHeight: 1.65, margin: 0 }}>{priceAiSummary}</p>
                    </div>
                  )}

                  {priceResults.length === 0 ? (
                    <div style={{ ...cardStyle, textAlign: 'center', padding: '2.5rem' }}>
                      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.2rem', color: '#111827', margin: 0 }}>Sonuç bulunamadı</p>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.84rem', color: '#9CA3AF', margin: '0.4rem 0 0' }}>Farklı bir ürün adı veya daha genel bir arama deneyin.</p>
                    </div>
                  ) : (
                    <>
                      {/* Direct matches */}
                      {priceResults.filter(r => !r.isAlternative).length > 0 && (
                        <div style={{ marginBottom: '1.25rem' }}>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#374151', margin: '0 0 0.6rem' }}>En İyi Fiyatlar</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                            {priceResults.filter(r => !r.isAlternative).map((r, i) => (
                              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                <div style={{ ...cardStyle, padding: '1rem', cursor: 'pointer', transition: 'all 0.15s', border: i === 0 ? '1.5px solid rgba(20,184,166,0.4)' : '1px solid rgba(20,184,166,0.10)' }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)' }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 20px rgba(0,0,0,0.04)' }}>
                                  {i === 0 && <div style={{ display: 'inline-block', background: '#14B8A6', color: '#fff', borderRadius: 4, padding: '0.1rem 0.45rem', fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 700, marginBottom: '0.5rem' }}>EN UCUZ</div>}
                                  {r.savings && <div style={{ display: 'inline-block', background: 'rgba(239,68,68,0.1)', color: '#DC2626', borderRadius: 4, padding: '0.1rem 0.45rem', fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 700, marginBottom: '0.5rem', marginLeft: i === 0 ? '0.35rem' : 0 }}>{r.savings}</div>}
                                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#374151', margin: '0 0 0.35rem', lineHeight: 1.35, fontWeight: 500 }}>{r.title}</p>
                                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, color: '#0C0C0E', margin: '0 0 0.25rem' }}>{r.price}</p>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.73rem', color: '#6B7280' }}>{r.platform}</span>
                                    {r.rating && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.73rem', color: '#C9A96E', fontWeight: 600 }}>★ {r.rating}</span>}
                                  </div>
                                  {r.snippet && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#9CA3AF', margin: '0.4rem 0 0', lineHeight: 1.4 }}>{r.snippet}</p>}
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Alternatives */}
                      {priceResults.filter(r => r.isAlternative).length > 0 && (
                        <div>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#374151', margin: '0 0 0.6rem' }}>Alternatifler & Benzer Ürünler</p>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
                            {priceResults.filter(r => r.isAlternative).map((r, i) => (
                              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                <div style={{ ...cardStyle, padding: '1rem', cursor: 'pointer', transition: 'all 0.15s', background: 'rgba(248,250,252,0.9)' }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)' }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 20px rgba(0,0,0,0.04)' }}>
                                  <div style={{ display: 'inline-block', background: 'rgba(201,169,110,0.12)', color: '#92683A', borderRadius: 4, padding: '0.1rem 0.45rem', fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 700, marginBottom: '0.5rem' }}>ALTERNATİF</div>
                                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#374151', margin: '0 0 0.35rem', lineHeight: 1.35, fontWeight: 500 }}>{r.title}</p>
                                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem', fontWeight: 700, color: '#0C0C0E', margin: '0 0 0.25rem' }}>{r.price}</p>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.73rem', color: '#6B7280' }}>{r.platform}</span>
                                    {r.rating && <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.73rem', color: '#C9A96E', fontWeight: 600 }}>★ {r.rating}</span>}
                                  </div>
                                  {r.snippet && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#9CA3AF', margin: '0.4rem 0 0', lineHeight: 1.4 }}>{r.snippet}</p>}
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
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
