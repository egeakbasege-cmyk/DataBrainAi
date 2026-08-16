'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Nav } from '@/components/Nav'
import { ConnectorLogo } from '@/components/ConnectorLogos'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import { DataLabChatPanel } from '@/components/DataLabChatPanel'

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
// Connector definitions (localised — built at runtime using t())
// ─────────────────────────────────────────────────────────────────────────────

function getIndustryGroups(t: (key: string) => string): IndustryGroup[] {
  return [
    {
      id: 'ecommerce', name: 'E-Commerce', icon: '🛍️', color: '#14B8A6',
      description: t('datalab.group.ecommerce.desc'),
      connectors: [
        { id: 'shopify',    name: 'Shopify',          icon: '🟢', description: t('datalab.conn.shopify.desc'),     fieldLabel: 'Store Domain',            placeholder: 'mystore.myshopify.com',                                        field2Label: 'Admin API Access Token', field2Placeholder: 'shpat_xxxxxxxxxxxxxxxxxxxxxxxx' },
        { id: 'amazon',     name: 'Amazon',            icon: '📦', description: t('datalab.conn.amazon.desc'),      fieldLabel: 'SP-API Refresh Token',    placeholder: 'Atzr|xxxxxxxxxxxxxxxxxxxxxxxx' },
        { id: 'woocommerce',name: 'WooCommerce',       icon: '🔵', description: t('datalab.conn.woocommerce.desc'), fieldLabel: 'Site URL',                 placeholder: 'mysite.com',                                                   field2Label: 'Consumer Key:Secret',    field2Placeholder: 'ck_xxx:cs_xxx (colon-separated)' },
        { id: 'ebay',       name: 'eBay',              icon: '🟡', description: t('datalab.conn.ebay.desc'),        fieldLabel: 'Store URL',                placeholder: 'https://www.ebay.com/str/yourstore' },
        { id: 'etsy',       name: 'Etsy',              icon: '🟤', description: t('datalab.conn.etsy.desc'),        fieldLabel: 'Shop URL',                 placeholder: 'https://www.etsy.com/shop/yourshop' },
        { id: 'tiktokshop', name: 'TikTok Shop',       icon: '🎵', description: t('datalab.conn.tiktokshop.desc'), fieldLabel: 'Shop/Profile URL',         placeholder: 'https://www.tiktok.com/@yourstore' },
        { id: 'csv',        name: 'CSV / Spreadsheet', icon: '📄', description: t('datalab.conn.csv.desc'),         fieldLabel: 'Public CSV URL',           placeholder: 'https://docs.google.com/spreadsheets/.../export?format=csv' },
      ],
      queryCategories: [
        { label: t('datalab.cat.skuAnalysis'),   icon: '📦', queries: ['Run ABC analysis — which SKUs drive 80% of revenue?', 'Which products have the highest return rate and why?', 'Identify products I should discontinue or bundle', 'What is my top product revenue concentration risk?'] },
        { label: t('datalab.cat.revenueMargin'), icon: '💰', queries: ['Calculate my real profit margin after all fees and returns', 'Where am I losing the most revenue right now?', 'What is my cart abandonment costing me per month?', 'Analyse my AOV trend and upsell opportunities'] },
        { label: t('datalab.cat.customerSeg'),   icon: '👥', queries: ['Run RFM segmentation — who are my champion customers?', 'Which customers are at risk of churning this month?', 'What is my customer LTV by acquisition channel?', 'Identify my repeat purchase rate and loyalty drivers'] },
        { label: t('datalab.cat.stockOps'),      icon: '📋', queries: ['Which products are at stockout risk in the next 30 days?', 'Calculate my optimal reorder point and safety stock level', 'What is my inventory turnover rate vs category benchmark?', 'Analyse my supplier concentration and single-source risk'] },
        { label: t('datalab.cat.growthOpp'),     icon: '🚀', queries: ['What are my top 3 revenue growth opportunities right now?', 'Which new markets or categories should I expand into?', 'Find cross-sell and bundle opportunities in my catalogue', 'Compare my performance to top 10% sellers in my category'] },
      ],
    },
    {
      id: 'advertising', name: t('datalab.group.advertising.name'), icon: '📢', color: '#8B5CF6',
      description: t('datalab.group.advertising.desc'),
      connectors: [
        { id: 'meta-ads',   name: 'Meta Ads',      icon: '🔵', description: t('datalab.conn.metaads.desc'),   fieldLabel: 'Brand Page or Ad Account URL', placeholder: 'https://facebook.com/yourbrand' },
        { id: 'google-ads', name: 'Google Ads',    icon: '🔴', description: t('datalab.conn.googleads.desc'), fieldLabel: 'Website Domain',               placeholder: 'https://yoursite.com' },
        { id: 'amazon-ppc', name: 'Amazon PPC',    icon: '📦', description: t('datalab.conn.amazonppc.desc'), fieldLabel: 'SP-API Token',                 placeholder: 'Atzr|xxxxxxxxxxxxxxxxxxxxxxxx' },
        { id: 'tiktok-ads', name: 'TikTok Ads',    icon: '🎵', description: t('datalab.conn.tiktokads.desc'), fieldLabel: 'Business URL or Account',      placeholder: 'https://www.tiktok.com/@yourbrand' },
        { id: 'klaviyo',    name: 'Klaviyo',        icon: '📧', description: t('datalab.conn.klaviyo.desc'),   fieldLabel: 'Private API Key',              placeholder: 'pk_xxxxxxxxxxxxxxxxxxxxxxxx' },
        { id: 'api',        name: 'Custom Ad Data', icon: '🔗', description: t('datalab.conn.customad.desc'),  fieldLabel: 'Endpoint URL',                 placeholder: 'https://your-ads-platform.com/api/stats' },
      ],
      queryCategories: [
        { label: t('datalab.cat.roasEfficiency'),   icon: '📈', queries: ['Which ad campaigns have the best ROAS right now?', 'Which campaigns should I scale or kill immediately?', 'Calculate my blended ROAS across all channels', 'Compare Meta vs Google vs TikTok efficiency'] },
        { label: t('datalab.cat.creativeAudience'), icon: '🎨', queries: ['Which ad creatives are driving the most conversions?', 'Which audience segments have the lowest CPA?', 'Analyse my CTR vs industry benchmark by channel', 'Identify audience fatigue signals in my campaigns'] },
        { label: t('datalab.cat.budgetOpt'),        icon: '💸', queries: ['Where should I reallocate budget for maximum return?', 'What is my true CAC by channel?', 'Calculate payback period for new customer acquisition', 'Forecast revenue if I scale ad spend by 30%'] },
        { label: t('datalab.cat.emailRetention'),   icon: '📧', queries: ['What is my email revenue contribution vs paid ads?', 'Which email flows or sequences generate the most revenue?', 'Calculate my email list ROI per subscriber', 'Analyse list health, open rates, and unsubscribe trend'] },
      ],
    },
    {
      id: 'hospitality', name: t('datalab.group.hospitality.name'), icon: '🏨', color: '#F59E0B',
      description: t('datalab.group.hospitality.desc'),
      connectors: [
        { id: 'booking',     name: 'Booking.com',         icon: '💙', description: t('datalab.conn.booking.desc'),     fieldLabel: 'Property URL', placeholder: 'https://www.booking.com/hotel/...' },
        { id: 'airbnb',      name: 'Airbnb',               icon: '🔴', description: t('datalab.conn.airbnb.desc'),      fieldLabel: 'Listing URL',  placeholder: 'https://www.airbnb.com/rooms/...' },
        { id: 'expedia',     name: 'Expedia / Hotels.com', icon: '🟡', description: t('datalab.conn.expedia.desc'),     fieldLabel: 'Property URL', placeholder: 'https://www.expedia.com/...' },
        { id: 'tripadvisor', name: 'TripAdvisor',          icon: '🟢', description: t('datalab.conn.tripadvisor.desc'), fieldLabel: 'Property URL', placeholder: 'https://www.tripadvisor.com/Hotel_Review-...' },
        { id: 'api',         name: 'PMS / Channel Manager',icon: '🔗', description: t('datalab.conn.pms.desc'),         fieldLabel: 'API Endpoint', placeholder: 'https://api.cloudbeds.com/...' },
      ],
      queryCategories: [
        { label: t('datalab.cat.occupancyRevpar'), icon: '🏨', queries: ['Calculate my RevPAR and compare to local comp set', 'What is my optimal occupancy rate for maximum profitability?', 'Analyse my ADR trend vs competitor set this season', 'Identify my highest and lowest performing date ranges'] },
        { label: t('datalab.cat.otaStrategy'),     icon: '💻', queries: ['What OTA commission am I paying and what is the net margin?', 'How does my direct booking rate compare to OTA share?', 'Which OTA drives the most profitable bookings?', 'Should I adjust my rate parity or close-out strategy?'] },
        { label: t('datalab.cat.pricingIntel'),    icon: '💰', queries: ['Find optimal pricing for next peak season dates', 'How do my rates compare to similar properties in my area?', 'What happens to occupancy if I raise rates by 15%?', 'Identify last-minute pricing and yield opportunities'] },
        { label: t('datalab.cat.reviewExp'),       icon: '⭐', queries: ['Analyse my review sentiment and main guest pain points', 'How do my review scores affect my OTA search ranking?', 'Revenue impact of improving my rating by 0.5 stars?', 'Compare my amenities vs top-rated competitors nearby'] },
      ],
    },
    {
      id: 'services', name: t('datalab.group.services.name'), icon: '⚙️', color: '#EC4899',
      description: t('datalab.group.services.desc'),
      connectors: [
        { id: 'stripe',  name: 'Stripe',     icon: '🟣', description: t('datalab.conn.stripe.desc'),    fieldLabel: 'Restricted API Key', placeholder: 'Stripe restricted key (rk_live_…)' },
        { id: 'fiverr',  name: 'Fiverr',     icon: '🟢', description: t('datalab.conn.fiverr.desc'),    fieldLabel: 'Profile URL',        placeholder: 'https://www.fiverr.com/yourprofile' },
        { id: 'upwork',  name: 'Upwork',     icon: '🟢', description: t('datalab.conn.upwork.desc'),    fieldLabel: 'Profile URL',        placeholder: 'https://www.upwork.com/freelancers/...' },
        { id: 'api',     name: 'Custom API', icon: '🔗', description: t('datalab.conn.customapi.desc'), fieldLabel: 'Endpoint URL',        placeholder: 'https://your-app.com/api/analytics' },
      ],
      queryCategories: [
        { label: t('datalab.cat.mrrGrowth'),      icon: '📈', queries: ['What is my MRR trend and growth rate?', 'Calculate my ARR and forecast for next 12 months', 'What is my revenue churn and its LTV impact?', 'Identify my fastest and slowest growing segments'] },
        { label: t('datalab.cat.customerEcon'),   icon: '👥', queries: ['What is my average LTV vs CAC ratio?', 'Which service tier has the best margin?', 'Identify at-risk accounts by payment or usage signals', 'Calculate payback period by customer segment'] },
        { label: t('datalab.cat.projectCapacity'),icon: '⚙️', queries: ['What is my revenue per billable hour?', 'Which project types have the highest margin?', 'Calculate my team utilization rate vs target', 'Identify upsell and expansion opportunities in current accounts'] },
      ],
    },
    {
      id: 'analytics', name: t('datalab.group.analytics.name'), icon: '📊', color: '#6366F1',
      description: t('datalab.group.analytics.desc'),
      connectors: [
        { id: 'ga4',  name: 'Google Analytics 4', icon: '📊', description: t('datalab.conn.ga4.desc'),           fieldLabel: 'Website URL',    placeholder: 'https://yoursite.com' },
        { id: 'csv',  name: 'CSV / Spreadsheet',  icon: '📄', description: t('datalab.conn.analyticscsv.desc'), fieldLabel: 'Public CSV URL', placeholder: 'https://docs.google.com/.../export?format=csv' },
        { id: 'api',  name: 'Analytics API',      icon: '🔗', description: t('datalab.conn.analyticsapi.desc'), fieldLabel: 'Endpoint URL',   placeholder: 'https://api.mixpanel.com/...' },
      ],
      queryCategories: [
        { label: t('datalab.cat.trafficConv'),     icon: '🌐', queries: ['Which traffic sources convert best and at what CPA?', 'Analyse my conversion funnel — where are users dropping off?', 'Compare organic vs paid traffic quality and value', 'What is my mobile vs desktop conversion gap?'] },
        { label: t('datalab.cat.cohortRetention'), icon: '📅', queries: ['Run cohort retention analysis — which month performs best?', 'Identify my stickiest features or content by engagement', 'Calculate 30/60/90 day user retention curves', 'Which acquisition channel produces the best long-term retention?'] },
      ],
    },
  ]
}

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
  const { t } = useLanguage()
  const { data: session, status } = useSession()

  // Build localised industry groups and flat connector list from t()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const INDUSTRY_GROUPS = getIndustryGroups(t as (key: string) => string)
  const ALL_CONNECTORS: ConnectorDef[] = INDUSTRY_GROUPS.flatMap(g => g.connectors)

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

  const [chatOpen, setChatOpen] = useState(false)

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

  // ── Shared design tokens ────────────────────────────────────────────────────

  const BG  = 'linear-gradient(160deg, #E8F5F2 0%, #D4EEE9 30%, #E0F2EE 65%, #EAF6F3 100%)'
  const TEAL = '#14B8A6'
  const GOLD = '#C9A96E'
  const INK  = '#1A2B3C'
  const INK2 = 'rgba(26,43,60,0.60)'
  const INK3 = 'rgba(26,43,60,0.38)'

  const glass: React.CSSProperties = {
    background:           'rgba(255,255,255,0.88)',
    backdropFilter:       'blur(22px) saturate(160%)',
    WebkitBackdropFilter: 'blur(22px) saturate(160%)',
    border:               '1px solid rgba(129,199,185,0.28)',
    borderRadius:          14,
    boxShadow:            '0 8px 40px rgba(20,184,166,0.08), 0 2px 10px rgba(0,0,0,0.04)',
  }

  const labelCaps: React.CSSProperties = {
    fontFamily: 'var(--font-inter), sans-serif',
    fontSize: '0.6rem',
    fontWeight: 700,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  }

  // ── Auth guards ─────────────────────────────────────────────────────────────

  if (status === 'loading') return (
    <div className="sv-grid-bg" style={{ minHeight: '100vh', background: BG }}>
      <Nav />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 72px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${TEAL}`, borderTopColor: 'transparent', animation: 'spin 0.9s linear infinite' }} />
          <p style={{ ...labelCaps, color: INK3 }}>Loading</p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (!session) return (
    <div className="sv-grid-bg" style={{ minHeight: '100vh', background: BG }}>
      <Nav />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 72px)', gap: '1.5rem' }}>
        <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.90)', border: `1px solid rgba(129,199,185,0.30)`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 8px 24px rgba(20,184,166,0.10)' }}>🔒</div>
        <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2rem', fontStyle: 'italic', fontWeight: 600, color: INK, margin: 0 }}>Sign in to access Data Lab</h2>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9rem', color: INK2, margin: 0 }}>Connect your data sources and benchmark your performance.</p>
        <Link href="/api/auth/signin" style={{ background: TEAL, color: '#fff', padding: '0.75rem 2rem', borderRadius: 8, fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: '0.88rem', textDecoration: 'none', letterSpacing: '0.02em' }}>Sign In</Link>
      </div>
    </div>
  )

  // ── Connection modal ────────────────────────────────────────────────────────

  const modal = modalConnector && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,43,60,0.28)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}
      onClick={() => { if (!connecting) { setModalConnector(null); setApiInput(''); setApiInput2(''); setConnectError(null) } }}>
      <div style={{ ...glass, width: '100%', maxWidth: 460, padding: '2rem' }} onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ width: 40, height: 40, background: `${activeIndustry.color}12`, border: `1px solid ${activeIndustry.color}30`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <ConnectorLogo id={modalConnector.id} size={24} />
          </div>
          <div>
            <p style={{ ...labelCaps, color: TEAL, margin: '0 0 0.15rem' }}>Connect Source</p>
            <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.3rem', fontWeight: 600, color: INK, margin: 0 }}>{modalConnector.name}</h3>
          </div>
        </div>

        {/* Field 1 */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ ...labelCaps, color: INK2, display: 'block', marginBottom: '0.4rem' }}>{modalConnector.fieldLabel}</label>
          <input
            value={apiInput}
            onChange={e => setApiInput(e.target.value)}
            placeholder={modalConnector.placeholder}
            disabled={connecting}
            style={{ width: '100%', padding: '0.7rem 0.9rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.85rem', color: INK, background: 'rgba(255,255,255,0.95)', border: connectError ? '1px solid rgba(239,68,68,0.55)' : '1px solid rgba(129,199,185,0.35)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Field 2 (optional) */}
        {modalConnector.field2Label && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ ...labelCaps, color: INK2, display: 'block', marginBottom: '0.4rem' }}>{modalConnector.field2Label}</label>
            <input
              value={apiInput2}
              onChange={e => setApiInput2(e.target.value)}
              placeholder={modalConnector.field2Placeholder ?? ''}
              disabled={connecting}
              style={{ width: '100%', padding: '0.7rem 0.9rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.85rem', color: INK, background: 'rgba(255,255,255,0.95)', border: connectError ? '1px solid rgba(239,68,68,0.55)' : '1px solid rgba(129,199,185,0.35)', borderRadius: 8, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* Error */}
        {connectError && (
          <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.22)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.83rem', fontWeight: 600, color: '#DC2626', margin: '0 0 0.2rem' }}>Connection Failed</p>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', color: '#9B1C1C', margin: 0, lineHeight: 1.5 }}>{connectError.error}{connectError.hint ? ` — ${connectError.hint}` : ''}</p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button onClick={() => { setModalConnector(null); setApiInput(''); setApiInput2(''); setConnectError(null) }}
            style={{ flex: 1, padding: '0.7rem', background: 'transparent', border: '1px solid rgba(129,199,185,0.35)', borderRadius: 8, fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.87rem', color: INK2, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleConnect} disabled={!apiInput.trim() || connecting}
            style={{ flex: 2, padding: '0.7rem', background: connecting ? '#99E6DD' : TEAL, border: 'none', borderRadius: 8, fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.87rem', fontWeight: 600, color: '#fff', cursor: connecting ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
            {connecting ? 'Connecting…' : `Connect ${modalConnector.name}`}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Loading overlay ─────────────────────────────────────────────────────────

  const loadingOverlay = analyzing && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(240,253,251,0.94)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 800, gap: '2.5rem' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ ...labelCaps, color: TEAL, margin: '0 0 0.6rem' }}>Data Intelligence</p>
        <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2.2rem', fontStyle: 'italic', fontWeight: 600, color: INK, margin: 0 }}>Analysing your data…</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', minWidth: 320 }}>
        {LOADING_STAGES.map((stage, i) => (
          <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: i <= loadingStage ? 1 : 0.3, transition: 'opacity 0.4s ease' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: i < loadingStage ? TEAL : i === loadingStage ? '#99E6DD' : 'rgba(129,199,185,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.3s' }}>
              {i < loadingStage && <span style={{ color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>✓</span>}
              {i === loadingStage && <div style={{ width: 8, height: 8, borderRadius: '50%', border: `1.5px solid #0D9488`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />}
            </div>
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9rem', color: i <= loadingStage ? INK : INK3 }}>{stage}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // ── STEP 1 — Source Selection ───────────────────────────────────────────────

  const step1 = (
    <motion.div initial="hidden" animate="show" variants={_stagger} style={{ maxWidth: 1060, margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>

      {/* Page header */}
      <motion.div variants={_fadeUp} style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
          <div style={{ width: 24, height: 1, background: GOLD, opacity: 0.7 }} />
          <span style={{ ...labelCaps, color: GOLD }}>Data Intelligence</span>
          <div style={{ width: 24, height: 1, background: GOLD, opacity: 0.7 }} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 600, color: INK, margin: '0 0 0.75rem', lineHeight: 1.1 }}>
          Connect Your Data Source
        </h1>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.92rem', color: INK2, margin: '0 auto', maxWidth: 480, lineHeight: 1.7 }}>
          Link your platform and get instant AI-powered benchmarking, analysis, and strategic recommendations.
        </p>
      </motion.div>

      {/* Industry tab bar */}
      <motion.div variants={_fadeUp} style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', marginBottom: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {INDUSTRY_GROUPS.map(ind => (
          <button key={ind.id}
            onClick={() => { setSelectedIndustry(ind.id); setActiveQueryCategory(0) }}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.5rem 1.1rem', borderRadius: 999,
              border: selectedIndustry === ind.id ? `1.5px solid ${ind.color}` : '1.5px solid rgba(129,199,185,0.28)',
              background: selectedIndustry === ind.id ? `${ind.color}15` : 'rgba(255,255,255,0.75)',
              color: selectedIndustry === ind.id ? ind.color : INK2,
              fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.82rem', fontWeight: selectedIndustry === ind.id ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap',
            }}>
            <span style={{ fontSize: '0.9rem' }}>{ind.icon}</span> {ind.name}
          </button>
        ))}
      </motion.div>

      {/* Connector grid */}
      <motion.div variants={_stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {activeIndustry.connectors.map(c => (
          <motion.div key={c.id} variants={_fadeUp}
            style={{ ...glass, padding: '1.4rem', cursor: 'pointer', transition: 'box-shadow 0.2s, transform 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px ${activeIndustry.color}18` }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 40px rgba(20,184,166,0.08), 0 2px 10px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.9rem' }}>
              <div style={{ width: 42, height: 42, background: `${activeIndustry.color}10`, border: `1px solid ${activeIndustry.color}25`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                <ConnectorLogo id={c.id} size={26} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.05rem', fontWeight: 600, color: INK, margin: '0 0 0.2rem' }}>{c.name}</h3>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.77rem', color: INK2, margin: '0 0 0.9rem', lineHeight: 1.5 }}>{c.description}</p>
                <button
                  onClick={() => setModalConnector(c)}
                  style={{ background: 'transparent', border: `1.5px solid ${activeIndustry.color}`, color: activeIndustry.color, borderRadius: 6, padding: '0.32rem 0.85rem', fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: '0.77rem', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = activeIndustry.color; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = activeIndustry.color }}>
                  Connect
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Footer note */}
      <motion.div variants={_fadeUp} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
        <button onClick={() => setModalConnector(activeIndustry.connectors[0])}
          style={{ background: 'transparent', border: 'none', color: INK3, fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(26,43,60,0.20)' }}>
          {t('userdata.noSourcesYet')}
        </button>
        <span style={{ color: 'rgba(26,43,60,0.22)', fontSize: '0.7rem' }}>|</span>
        <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', color: INK3 }}>
          {INDUSTRY_GROUPS.reduce((s, g) => s + g.connectors.length, 0)} platforms · {INDUSTRY_GROUPS.length} {t('datalab.sectors')}
        </span>
      </motion.div>
    </motion.div>
  )

  // ── STEP 2 — Analysis Hub ──────────────────────────────────────────────────

  const TABS = [
    { id: 'analysis',    label: 'AI Analysis' },
    { id: 'benchmarks',  label: 'Benchmarks' },
    { id: 'price-scout', label: 'Price Scout' },
  ] as const

  const step2 = connectedSource && (
    <motion.div initial="hidden" animate="show" variants={_stagger} style={{ maxWidth: 960, margin: '0 auto', padding: '2.5rem 1.5rem 6rem' }}>

      {/* Source summary strip */}
      <motion.div variants={_fadeUp} style={{ ...glass, padding: '1.25rem 1.5rem', marginBottom: '1.75rem', borderLeft: `3px solid ${TEAL}`, display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 38, height: 38, background: `${TEAL}12`, border: `1px solid ${TEAL}30`, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
            <ConnectorLogo id={connectedSource.type} size={22} />
          </div>
          <div>
            <p style={{ ...labelCaps, color: TEAL, margin: '0 0 0.1rem' }}>Connected Source</p>
            <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.15rem', fontWeight: 600, color: INK, margin: 0 }}>{connectedSource.name}</h2>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {[
            { l: 'Revenue', v: connectedSource.revenue },
            { l: 'Orders',  v: connectedSource.orders },
            { l: 'AOV',     v: connectedSource.aov },
            { l: 'Top Product', v: connectedSource.topProduct },
          ].map(m => (
            <div key={m.l}>
              <p style={{ ...labelCaps, color: INK3, margin: '0 0 0.1rem' }}>{m.l}</p>
              <p style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.1rem', fontWeight: 600, color: INK, margin: 0 }}>{m.v}</p>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
          <button onClick={() => { setStep(1); setConnectedSource(null); setAnalysisResult(null) }}
            style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', color: INK3, background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.3rem 0.6rem' }}>
            ← Switch
          </button>
          <button onClick={() => setChatOpen(true)}
            style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', fontWeight: 600, color: TEAL, background: `${TEAL}10`, border: `1px solid ${TEAL}30`, borderRadius: 6, cursor: 'pointer', padding: '0.3rem 0.8rem' }}>
            ⚗ AI Chat
          </button>
        </div>
      </motion.div>

      {/* Tab navigation */}
      <motion.div variants={_fadeUp} style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(129,199,185,0.22)', borderRadius: 10, padding: '0.3rem', width: 'fit-content' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)}
            style={{ padding: '0.45rem 1.1rem', borderRadius: 7, border: 'none', background: activeTab === tab.id ? '#fff' : 'transparent', color: activeTab === tab.id ? TEAL : INK2, fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.84rem', fontWeight: activeTab === tab.id ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s', boxShadow: activeTab === tab.id ? '0 1px 6px rgba(20,184,166,0.12)' : 'none' }}>
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* ── ANALYSIS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'analysis' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

          {/* Query form */}
          <div style={{ ...glass, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ ...labelCaps, color: TEAL, margin: '0 0 0.85rem' }}>Ask your data anything</p>
            <form onSubmit={handleQuerySubmit} style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
              <input
                ref={queryRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`e.g. "What's my biggest revenue opportunity this month?"`}
                style={{ flex: 1, padding: '0.75rem 1rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9rem', color: INK, background: 'rgba(255,255,255,0.95)', border: '1.5px solid rgba(20,184,166,0.28)', borderRadius: 9, outline: 'none' }}
              />
              <button type="submit" disabled={!query.trim()}
                style={{ padding: '0.75rem 1.5rem', background: query.trim() ? TEAL : 'rgba(129,199,185,0.18)', border: 'none', borderRadius: 9, fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: '0.87rem', color: query.trim() ? '#fff' : INK3, cursor: query.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}>
                Analyse →
              </button>
            </form>

            {/* Category filters */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              {activeIndustry.queryCategories.map((cat, idx) => (
                <button key={cat.label} onClick={() => setActiveQueryCategory(idx)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.8rem', borderRadius: 999, border: activeQueryCategory === idx ? `1.5px solid ${activeIndustry.color}` : '1.5px solid rgba(129,199,185,0.28)', background: activeQueryCategory === idx ? `${activeIndustry.color}14` : 'rgba(255,255,255,0.72)', color: activeQueryCategory === idx ? activeIndustry.color : INK2, fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.75rem', fontWeight: activeQueryCategory === idx ? 600 : 400, cursor: 'pointer' }}>
                  <span>{cat.icon}</span> {cat.label}
                </button>
              ))}
            </div>

            {/* Suggested queries */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {activeIndustry.queryCategories[activeQueryCategory]?.queries.map(q => (
                <button key={q} onClick={() => handleAnalyze(q)}
                  style={{ background: `${TEAL}08`, border: `1px solid ${TEAL}22`, borderRadius: 20, padding: '0.32rem 0.85rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.77rem', color: '#0D9488', cursor: 'pointer', textAlign: 'left', lineHeight: 1.4, transition: 'background 0.12s' }}
                  onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = `${TEAL}14`)}
                  onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = `${TEAL}08`)}>
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Extra metrics from source */}
          {connectedSource.extra.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {connectedSource.extra.map(e => (
                <div key={e.label} style={{ ...glass, padding: '1.1rem 1.25rem' }}>
                  <p style={{ ...labelCaps, color: INK3, margin: '0 0 0.35rem' }}>{e.label}</p>
                  <p style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.45rem', fontWeight: 700, color: INK, margin: 0 }}>{e.value}</p>
                </div>
              ))}
              <div style={{ ...glass, padding: '1.1rem 1.25rem' }}>
                <p style={{ ...labelCaps, color: INK3, margin: '0 0 0.35rem' }}>Synced</p>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9rem', fontWeight: 500, color: TEAL, margin: 0 }}>✓ {connectedSource.syncedAt}</p>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ── BENCHMARKS TAB ───────────────────────────────────────────────── */}
      {activeTab === 'benchmarks' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div style={{ ...glass, padding: '1.75rem', textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</div>
            <p style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.25rem', fontWeight: 600, fontStyle: 'italic', color: INK, margin: '0 0 0.35rem' }}>Run an analysis first</p>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.84rem', color: INK3, margin: 0 }}>Ask a question in the AI Analysis tab to see your benchmark comparison here.</p>
          </div>
        </motion.div>
      )}

      {/* ── PRICE SCOUT TAB ──────────────────────────────────────────────── */}
      {activeTab === 'price-scout' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {/* Input */}
          <div style={{ ...glass, padding: '1.5rem', marginBottom: '1.25rem' }}>
            <p style={{ ...labelCaps, color: GOLD, margin: '0 0 0.85rem' }}>Price Intelligence</p>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.85rem' }}>
              <input
                ref={priceQueryRef}
                value={priceQuery}
                onChange={e => setPriceQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && priceQuery.trim() && handlePriceSearch(priceQuery)}
                placeholder={t('datalab.priceScoutPlaceholder')}
                style={{ flex: 1, padding: '0.75rem 1rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9rem', color: INK, background: 'rgba(255,255,255,0.95)', border: '1.5px solid rgba(201,169,110,0.38)', borderRadius: 9, outline: 'none' }}
              />
              <button onClick={() => priceQuery.trim() && handlePriceSearch(priceQuery)} disabled={!priceQuery.trim()}
                style={{ padding: '0.75rem 1.4rem', background: priceQuery.trim() ? GOLD : 'rgba(201,169,110,0.15)', border: 'none', borderRadius: 9, fontFamily: 'var(--font-inter), sans-serif', fontWeight: 600, fontSize: '0.87rem', color: priceQuery.trim() ? '#fff' : INK3, cursor: priceQuery.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}>
                {t('datalab.priceSearchButton')}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {['Cheapest Shopify apps 2025', 'WooCommerce vs Shopify pricing', 'Amazon FBA tool software'].map(s => (
                <button key={s} onClick={() => { setPriceQuery(s); handlePriceSearch(s) }}
                  style={{ background: 'rgba(201,169,110,0.07)', border: '1px solid rgba(201,169,110,0.22)', borderRadius: 20, padding: '0.3rem 0.82rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.76rem', color: '#92683A', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {priceSearching && (
            <div style={{ ...glass, textAlign: 'center', padding: '3rem 2rem' }}>
              <p style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.2rem', fontStyle: 'italic', color: INK, margin: '0 0 0.4rem' }}>{t('datalab.priceSearchLoading')}</p>
              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.82rem', color: INK3, margin: 0 }}>{t('datalab.priceSearchSubtext')}</p>
            </div>
          )}

          {priceResults && !priceSearching && (
            <div>
              {priceAiSummary && (
                <div style={{ ...glass, borderLeft: `3px solid ${GOLD}`, marginBottom: '1rem', padding: '1rem 1.25rem' }}>
                  <p style={{ ...labelCaps, color: GOLD, margin: '0 0 0.4rem' }}>AI Summary</p>
                  <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.9rem', color: INK2, lineHeight: 1.65, margin: 0 }}>{priceAiSummary}</p>
                </div>
              )}
              {priceResults.length === 0 ? (
                <div style={{ ...glass, textAlign: 'center', padding: '2.5rem' }}>
                  <p style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.2rem', fontStyle: 'italic', color: INK, margin: 0 }}>{t('datalab.priceNoResults')}</p>
                  <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.84rem', color: INK3, margin: '0.4rem 0 0' }}>{t('datalab.priceNoResultsSub')}</p>
                </div>
              ) : (
                <>
                  {priceResults.filter(r => !r.isAlternative).length > 0 && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <p style={{ ...labelCaps, color: INK3, margin: '0 0 0.65rem' }}>{t('datalab.priceBestPrices')}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
                        {priceResults.filter(r => !r.isAlternative).map((r, i) => (
                          <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <div style={{ ...glass, padding: '1rem', transition: 'all 0.18s', border: i === 0 ? `1.5px solid ${TEAL}40` : '1px solid rgba(129,199,185,0.28)' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 10px 32px rgba(20,184,166,0.12)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 40px rgba(20,184,166,0.08), 0 2px 10px rgba(0,0,0,0.04)' }}>
                              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                {i === 0 && <span style={{ background: TEAL, color: '#fff', borderRadius: 4, padding: '0.1rem 0.45rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.64rem', fontWeight: 700 }}>BEST PRICE</span>}
                                {r.savings && <span style={{ background: 'rgba(239,68,68,0.10)', color: '#DC2626', borderRadius: 4, padding: '0.1rem 0.45rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.64rem', fontWeight: 700 }}>{r.savings}</span>}
                              </div>
                              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.82rem', color: INK2, margin: '0 0 0.3rem', lineHeight: 1.4, fontWeight: 500 }}>{r.title}</p>
                              <p style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.45rem', fontWeight: 700, color: INK, margin: '0 0 0.25rem' }}>{r.price}</p>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.73rem', color: INK3 }}>{r.platform}</span>
                                {r.rating && <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.73rem', color: GOLD, fontWeight: 600 }}>★ {r.rating}</span>}
                              </div>
                              {r.snippet && <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', color: INK3, margin: '0.4rem 0 0', lineHeight: 1.4 }}>{r.snippet}</p>}
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {priceResults.filter(r => r.isAlternative).length > 0 && (
                    <div>
                      <p style={{ ...labelCaps, color: INK3, margin: '0 0 0.65rem' }}>{t('datalab.priceAlternatives')}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.85rem' }}>
                        {priceResults.filter(r => r.isAlternative).map((r, i) => (
                          <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                            <div style={{ ...glass, padding: '1rem', background: 'rgba(248,252,251,0.88)', transition: 'all 0.18s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}>
                              <span style={{ background: `${GOLD}18`, color: '#92683A', borderRadius: 4, padding: '0.1rem 0.45rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.64rem', fontWeight: 700, display: 'inline-block', marginBottom: '0.5rem' }}>{t('datalab.priceAltLabel')}</span>
                              <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.82rem', color: INK2, margin: '0 0 0.3rem', lineHeight: 1.4, fontWeight: 500 }}>{r.title}</p>
                              <p style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.45rem', fontWeight: 700, color: INK, margin: '0 0 0.25rem' }}>{r.price}</p>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.73rem', color: INK3 }}>{r.platform}</span>
                                {r.rating && <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.73rem', color: GOLD, fontWeight: 600 }}>★ {r.rating}</span>}
                              </div>
                              {r.snippet && <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.72rem', color: INK3, margin: '0.4rem 0 0', lineHeight: 1.4 }}>{r.snippet}</p>}
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
        </motion.div>
      )}
    </motion.div>
  )

  // ── STEP 3 — Analysis Results ──────────────────────────────────────────────

  const step3 = analysisResult && connectedSource && (
    <motion.div initial="hidden" animate="show" variants={_stagger} style={{ maxWidth: 960, margin: '0 auto', padding: '2.5rem 1.5rem 6rem' }}>

      {/* Back */}
      <motion.button variants={_fadeUp}
        onClick={() => { setStep(2); setQuery('') }}
        style={{ background: 'transparent', border: 'none', color: INK3, fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.87rem', cursor: 'pointer', marginBottom: '1.75rem', padding: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        ← Back to analysis
      </motion.button>

      {/* Header */}
      <motion.div variants={_fadeUp} style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          <span style={{ background: `${TEAL}12`, color: '#0D9488', borderRadius: 20, padding: '0.2rem 0.75rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', fontWeight: 600 }}>{analysisResult.confidence}% confidence</span>
          <span style={{ background: `${GOLD}12`, color: '#92683A', borderRadius: 20, padding: '0.2rem 0.75rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', fontWeight: 600 }}>{analysisResult.source}</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontStyle: 'italic', fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 700, color: INK, margin: 0, lineHeight: 1.15 }}>{analysisResult.query}</h1>
      </motion.div>

      {/* Executive Summary */}
      <motion.div variants={_fadeUp} style={{ ...glass, padding: '1.75rem', marginBottom: '1.25rem', borderLeft: `3px solid ${TEAL}` }}>
        <p style={{ ...labelCaps, color: TEAL, margin: '0 0 0.65rem' }}>Executive Summary</p>
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.97rem', color: INK2, lineHeight: 1.75, margin: 0 }}>{analysisResult.executiveSummary}</p>
      </motion.div>

      {/* Key Metrics */}
      <motion.div variants={_stagger} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
        {analysisResult.keyMetrics.map(m => (
          <motion.div key={m.label} variants={_fadeUp} style={{ ...glass, padding: '1.25rem' }}>
            <p style={{ ...labelCaps, color: INK3, margin: '0 0 0.4rem' }}>{m.label}</p>
            <p style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.7rem', fontWeight: 700, color: INK, margin: '0 0 0.2rem', lineHeight: 1 }}>{m.value}</p>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', color: m.trend === 'up' ? '#059669' : m.trend === 'down' ? '#DC2626' : INK3, margin: '0 0 0.1rem', fontWeight: 600 }}>
              {m.trend === 'up' ? '▲' : m.trend === 'down' ? '▼' : '—'} {m.delta} vs benchmark
            </p>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.75rem', color: INK3, margin: 0 }}>Avg: {m.benchmark}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Recommendations */}
      <motion.div variants={_fadeUp} style={{ ...glass, padding: '1.75rem', marginBottom: '1.25rem' }}>
        <p style={{ ...labelCaps, color: TEAL, margin: '0 0 1.1rem' }}>Recommendations</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {analysisResult.actionSteps.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem', borderBottom: i < analysisResult.actionSteps.length - 1 ? '1px solid rgba(129,199,185,0.15)' : 'none' }}>
              <span style={{ background: PRIORITY_COLOUR[a.priority] + '16', color: PRIORITY_COLOUR[a.priority], borderRadius: 6, padding: '0.2rem 0.55rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', fontWeight: 700, height: 'fit-content', flexShrink: 0, marginTop: 2, letterSpacing: '0.06em' }}>
                {a.priority}
              </span>
              <div>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.93rem', fontWeight: 600, color: INK, margin: '0 0 0.2rem' }}>{a.title}</p>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.83rem', color: INK2, margin: '0 0 0.2rem', lineHeight: 1.6 }}>{a.rationale}</p>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.77rem', color: INK3, margin: 0 }}>Timeframe: {a.timeframe}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Benchmark Table */}
      <motion.div variants={_fadeUp} style={{ ...glass, padding: '1.75rem', marginBottom: '1.25rem' }}>
        <p style={{ ...labelCaps, color: TEAL, margin: '0 0 1.1rem' }}>Benchmark Comparison</p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Metric', 'Your Value', 'Industry Avg', 'Delta', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', ...labelCaps as object, color: INK3, paddingBottom: '0.65rem', borderBottom: '1px solid rgba(129,199,185,0.20)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {analysisResult.benchmarks.map((row, i) => (
              <tr key={i}>
                {[row.metric, row.yourValue, row.industryAvg, row.delta, null].map((cell, ci) => (
                  <td key={ci} style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.85rem', color: ci === 1 ? INK : INK2, fontWeight: ci === 1 ? 600 : 400, padding: '0.65rem 0', borderBottom: i < analysisResult.benchmarks.length - 1 ? '1px solid rgba(129,199,185,0.12)' : 'none' }}>
                    {ci === 4 ? (
                      <span style={{ background: row.status === 'above' ? 'rgba(16,185,129,0.10)' : row.status === 'below' ? 'rgba(239,68,68,0.10)' : 'rgba(129,199,185,0.15)', color: row.status === 'above' ? '#059669' : row.status === 'below' ? '#DC2626' : INK2, borderRadius: 5, padding: '0.15rem 0.55rem', fontSize: '0.75rem', fontWeight: 600 }}>
                        {row.status === 'above' ? '↑ Above' : row.status === 'below' ? '↓ Below' : '→ On par'}
                      </span>
                    ) : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      {/* Risk Flags */}
      {analysisResult.riskFlags.length > 0 && (
        <motion.div variants={_fadeUp} style={{ ...glass, padding: '1.75rem', marginBottom: '1.25rem' }}>
          <p style={{ ...labelCaps, color: TEAL, margin: '0 0 1rem' }}>Risk Flags</p>
          {analysisResult.riskFlags.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.85rem', background: SEVERITY_COLOUR[r.severity] + '07', borderRadius: 9, border: `1px solid ${SEVERITY_COLOUR[r.severity]}20` }}>
              <span style={{ background: SEVERITY_COLOUR[r.severity] + '18', color: SEVERITY_COLOUR[r.severity], borderRadius: 5, padding: '0.15rem 0.55rem', fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', fontWeight: 700, height: 'fit-content', flexShrink: 0, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.severity}</span>
              <div>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.87rem', color: INK2, margin: '0 0 0.2rem', fontWeight: 500 }}>{r.risk}</p>
                <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8rem', color: INK3, margin: 0 }}>Mitigation: {r.mitigation}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Next Actions */}
      <motion.div variants={_fadeUp} style={{ ...glass, padding: '1.75rem' }}>
        <p style={{ ...labelCaps, color: GOLD, margin: '0 0 1rem' }}>Next Actions</p>
        <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {analysisResult.nextActions.map((action, i) => (
            <li key={i} style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.88rem', color: INK2, lineHeight: 1.6 }}>{action}</li>
          ))}
        </ol>
      </motion.div>
    </motion.div>
  )

  // ── Main render ─────────────────────────────────────────────────────────────

  return (
    <div className="sv-grid-bg" style={{ minHeight: '100vh', background: BG }}>
      <Nav />
      {modal}
      {loadingOverlay}

      <AnimatePresence mode="wait">
        {step === 1 && <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>{step1}</motion.div>}
        {step === 2 && <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>{step2}</motion.div>}
        {step === 3 && <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>{step3}</motion.div>}
      </AnimatePresence>

      {/* AI Chat Button */}
      <button onClick={() => setChatOpen(true)} title="Data Lab AI"
        style={{ position: 'fixed', bottom: '6.5rem', right: '1.25rem', width: 50, height: 50, borderRadius: '50%', background: connectedSource ? `linear-gradient(135deg, ${TEAL}22 0%, rgba(255,255,255,0.92) 100%)` : 'rgba(255,255,255,0.88)', backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)', border: connectedSource ? `1.5px solid ${TEAL}45` : '1.5px solid rgba(129,199,185,0.30)', boxShadow: connectedSource ? `0 0 18px ${TEAL}20, 0 4px 16px rgba(0,0,0,0.08)` : '0 4px 16px rgba(0,0,0,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', zIndex: 48, transition: 'all 0.2s' }}>
        ⚗️
        {connectedSource && <span style={{ position: 'absolute', top: -3, right: -3, width: 11, height: 11, borderRadius: '50%', background: TEAL, border: '2px solid rgba(255,255,255,0.95)', animation: 'pulse 2s infinite' }} />}
      </button>

      <DataLabChatPanel source={connectedSource} open={chatOpen} onClose={() => setChatOpen(false)} />

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.3); } }
        @keyframes spin  { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
