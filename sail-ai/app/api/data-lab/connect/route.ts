/**
 * /api/data-lab/connect/ — DataLab Connector Validation Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts : { connectorType, credentials: { key, domain? } }
 * Returns : { success: true, source: SourceSummary }
 *        or: { success: false, error: string, hint: string }
 *
 * Connector strategies:
 *  shopify  → Real Shopify Admin API call (shop + orders endpoints)
 *  amazon   → Format validation + AI-seeded data (SP-API needs OAuth)
 *  csv      → Fetch URL and parse CSV rows into SourceSummary
 *  api      → GET the endpoint, try to map JSON → SourceSummary
 *
 * All paths have a 12 s AbortSignal timeout so Next.js never hard-cuts first.
 * On validation failure the route returns { success: false } — the frontend
 * shows the error inline in the modal, never silently falls back to mock data.
 */

import { NextRequest, NextResponse } from 'next/server'

// ── Shared SourceSummary type (mirrors frontend) ──────────────────────────────

interface SourceSummary {
  type:       'shopify' | 'amazon' | 'csv' | 'api'
  name:       string
  syncedAt:   string
  revenue:    string
  orders:     string
  aov:        string
  topProduct: string
  extra:      { label: string; value: string }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: format currency
// ─────────────────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function fmtInt(n: number): string {
  return n.toLocaleString('en-US')
}

function now(): string {
  return new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ─────────────────────────────────────────────────────────────────────────────
// Shopify connector
// ─────────────────────────────────────────────────────────────────────────────

async function connectShopify(domain: string, token: string): Promise<
  { success: true; source: SourceSummary } | { success: false; error: string; hint: string }
> {
  // Normalise domain
  const host = domain
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .trim()

  if (!host) {
    return { success: false, error: 'Store domain is required.', hint: 'Enter your store domain: mystore.myshopify.com' }
  }
  if (!token || token.length < 20) {
    return { success: false, error: 'Access token looks too short.', hint: 'Find it in Shopify Admin → Settings → Apps & sales channels → Develop apps.' }
  }

  const headers = {
    'X-Shopify-Access-Token': token,
    'Content-Type': 'application/json',
  }
  const base = `https://${host}/admin/api/2024-01`
  const sig  = AbortSignal.timeout(12_000)

  // 1. Fetch shop info
  let shop: Record<string, string>
  try {
    const r = await fetch(`${base}/shop.json`, { headers, signal: sig })
    if (r.status === 401) {
      return { success: false, error: 'Invalid access token.', hint: 'Make sure the token has read_orders and read_products scopes.' }
    }
    if (r.status === 404) {
      return { success: false, error: `Store "${host}" not found.`, hint: 'Double-check the domain — it should look like mystore.myshopify.com' }
    }
    if (!r.ok) {
      return { success: false, error: `Shopify returned ${r.status}.`, hint: 'Try again or check that your token is still active in Shopify Admin.' }
    }
    const json = await r.json()
    shop = json.shop ?? {}
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return { success: false, error: 'Could not reach Shopify.', hint: `Network error: ${msg}` }
  }

  // 2. Fetch last-30-day orders (paid)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  let orders: Record<string, string>[] = []
  try {
    const r = await fetch(
      `${base}/orders.json?status=any&financial_status=paid&created_at_min=${since}&limit=250`,
      { headers, signal: AbortSignal.timeout(12_000) },
    )
    if (r.ok) {
      const json = await r.json()
      orders = json.orders ?? []
    }
  } catch {
    // Non-fatal — continue with shop data only
  }

  // 3. Fetch top products
  let topProduct = 'N/A'
  try {
    const r = await fetch(`${base}/products.json?limit=1&published_status=published`, {
      headers, signal: AbortSignal.timeout(8_000),
    })
    if (r.ok) {
      const json = await r.json()
      topProduct = json.products?.[0]?.title ?? 'N/A'
    }
  } catch {
    // Non-fatal
  }

  // 4. Compute metrics from real data
  const totalRevenue = orders.reduce((s, o) => s + parseFloat(String(o.total_price ?? 0)), 0)
  const orderCount   = orders.length
  const aov          = orderCount > 0 ? totalRevenue / orderCount : 0

  // Return rate — only if orders have refunds data readily available
  const currency = shop.currency ?? 'USD'

  const source: SourceSummary = {
    type:       'shopify',
    name:       shop.name ?? host,
    syncedAt:   now(),
    revenue:    fmt(totalRevenue, 0),
    orders:     fmtInt(orderCount) + '/mo',
    aov:        fmt(aov),
    topProduct,
    extra: [
      { label: 'Plan',     value: shop.plan_display_name ?? shop.plan_name ?? '—' },
      { label: 'Currency', value: currency },
      { label: 'Domain',   value: host },
    ],
  }

  return { success: true, source }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV connector  (accepts a public URL)
// ─────────────────────────────────────────────────────────────────────────────

async function connectCsv(url: string): Promise<
  { success: true; source: SourceSummary } | { success: false; error: string; hint: string }
> {
  if (!url.startsWith('http')) {
    return {
      success: false,
      error: 'Please provide a public URL to your CSV file.',
      hint:   'Upload the CSV to Google Drive (anyone with link) or Dropbox and paste the direct download URL.',
    }
  }

  let text: string
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(12_000) })
    if (!r.ok) return { success: false, error: `Could not fetch CSV (HTTP ${r.status}).`, hint: 'Make sure the URL is publicly accessible and returns a plain text CSV.' }
    text = await r.text()
  } catch (e: unknown) {
    return { success: false, error: 'Network error fetching CSV.', hint: String(e instanceof Error ? e.message : e) }
  }

  // Parse CSV
  const lines   = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) {
    return { success: false, error: 'CSV appears empty or has only a header row.', hint: 'The file needs at least one data row.' }
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())
  const rows    = lines.slice(1).map(l => l.split(',').map(c => c.trim().replace(/"/g, '')))

  // Try to find revenue/amount/sales column
  const revenueIdx = headers.findIndex(h => /revenue|amount|sales|total|price|gmv/i.test(h))
  const orderIdx   = headers.findIndex(h => /order|transaction|id|#/i.test(h))

  let totalRevenue = 0
  for (const row of rows) {
    if (revenueIdx >= 0) {
      const val = parseFloat(row[revenueIdx]?.replace(/[$,]/g, '') ?? '0')
      if (!isNaN(val)) totalRevenue += val
    }
  }

  const orderCount = orderIdx >= 0
    ? new Set(rows.map(r => r[orderIdx])).size
    : rows.length

  const aov = orderCount > 0 ? totalRevenue / orderCount : 0

  const source: SourceSummary = {
    type:       'csv',
    name:       'CSV Import',
    syncedAt:   now(),
    revenue:    totalRevenue > 0 ? fmt(totalRevenue, 0) : 'N/A',
    orders:     fmtInt(orderCount),
    aov:        aov > 0 ? fmt(aov) : 'N/A',
    topProduct: 'See Analysis',
    extra: [
      { label: 'Rows Imported', value: fmtInt(rows.length) },
      { label: 'Columns',       value: String(headers.length) },
      { label: 'Detected',      value: revenueIdx >= 0 ? 'Revenue column found' : 'No revenue column' },
    ],
  }

  return { success: true, source }
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq helper — used by connectApi for AI extraction from HTML/text
// ─────────────────────────────────────────────────────────────────────────────

const GROQ_URL_CONNECT   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL_CONNECT = 'llama-3.3-70b-versatile'

function getGroqKeyConnect(): string | undefined {
  return process.env.GROQ_API_KEY ?? process.env.GROQ_API_KEY_2
}

// Known marketplace domains — revenue figures are meaningless for these
const MARKETPLACE_HOSTS = [
  'amazon.', 'ebay.', 'etsy.', 'aliexpress.', 'alibaba.',
  'walmart.', 'temu.', 'wish.', 'mercadolibre.', 'rakuten.',
  'lazada.', 'shopee.', 'flipkart.', 'noon.', 'ozon.',
]

function isMarketplaceUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return MARKETPLACE_HOSTS.some(m => hostname.includes(m))
  } catch { return false }
}

// ── Marketplace handler: extract category / competitive signals — no fake revenue ──

async function extractMarketplaceCategory(url: string, pageText: string): Promise<SourceSummary> {
  const groqKey = getGroqKeyConnect()
  const domain  = new URL(url).hostname.replace('www.', '')

  const clean = pageText
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 3500)

  if (!groqKey || clean.length < 50) {
    return {
      type: 'api', name: domain, syncedAt: now(),
      revenue: 'N/A — marketplace page', orders: 'N/A', aov: 'N/A', topProduct: 'N/A',
      extra: [
        { label: 'Note', value: 'Marketplace pages do not expose seller revenue data' },
        { label: 'Tip',  value: 'Use the Shopify or CSV connector for your own store data' },
      ],
    }
  }

  const prompt = `You are a marketplace category analyst. The user pasted a ${domain} URL.
This is a MARKETPLACE page — do NOT invent revenue or order figures for any seller.
Only extract what is visibly present on the page.

URL: ${url}
Page content:
${clean}

Return ONLY valid JSON (no markdown, no explanation):
{
  "categoryName": "the product category name shown on the page",
  "topListedProduct": "the first/most prominent product name you can read from the content",
  "priceRangeMin": "lowest visible price with currency symbol, or null",
  "priceRangeMax": "highest visible price with currency symbol, or null",
  "listingCount": "number of listings/products visible or mentioned, or null",
  "topBrandsVisible": ["brand1", "brand2"],
  "categoryInsight": "1 sentence about what this category page shows — factual only, no revenue speculation",
  "marketplaceNote": "one honest sentence explaining why seller-specific revenue cannot be extracted from this URL"
}`

  try {
    const r = await fetch(GROQ_URL_CONNECT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL_CONNECT, temperature: 0.05, max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!r.ok) throw new Error(`Groq ${r.status}`)
    const groqData  = await r.json()
    const rawText   = groqData.choices?.[0]?.message?.content ?? ''
    const txt       = rawText.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim()
    const ex        = JSON.parse(txt)

    const priceRange = ex.priceRangeMin && ex.priceRangeMax
      ? `${ex.priceRangeMin} – ${ex.priceRangeMax}`
      : ex.priceRangeMin ?? ex.priceRangeMax ?? 'N/A'

    const brands = Array.isArray(ex.topBrandsVisible) && ex.topBrandsVisible.length > 0
      ? ex.topBrandsVisible.slice(0, 3).join(', ')
      : 'N/A'

    return {
      type:       'api',
      name:       `${domain} — ${ex.categoryName ?? 'Category'}`,
      syncedAt:   now(),
      revenue:    'N/A — marketplace category',
      orders:     ex.listingCount ? `${ex.listingCount} listings` : 'N/A',
      aov:        priceRange,
      topProduct: ex.topListedProduct ?? 'N/A',
      extra: [
        { label: 'Category Insight', value: ex.categoryInsight ?? '—' },
        { label: 'Top Brands',       value: brands },
        { label: '⚠ Note',           value: ex.marketplaceNote ?? 'Marketplace pages cannot show individual seller revenue.' },
        { label: 'Tip',              value: 'Connect your own store via the Shopify or CSV connector for real data.' },
      ],
    }
  } catch {
    return {
      type: 'api', name: domain, syncedAt: now(),
      revenue: 'N/A — marketplace', orders: 'N/A', aov: 'N/A', topProduct: 'N/A',
      extra: [
        { label: '⚠ Note', value: 'Marketplace pages (Amazon, eBay, etc.) do not expose individual seller revenue.' },
        { label: 'Tip',    value: 'Paste your own store URL or use the Shopify connector.' },
      ],
    }
  }
}

// ── Brand/DTC website handler: extract observable signals, honest about estimates ──

async function aiExtractFromWebsite(url: string, pageText: string): Promise<SourceSummary> {
  const groqKey = getGroqKeyConnect()

  const clean = pageText
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000)

  const domain = new URL(url).hostname.replace('www.', '')

  if (!groqKey || clean.length < 50) {
    return {
      type: 'api', name: domain, syncedAt: now(),
      revenue: 'N/A', orders: 'N/A', aov: 'N/A', topProduct: 'N/A',
      extra: [
        { label: 'Source', value: domain },
        { label: 'Status', value: 'Website — AI extraction unavailable' },
        { label: 'Tip',    value: 'Paste a JSON API endpoint for real metrics' },
      ],
    }
  }

  const prompt = `You are a business intelligence analyst. Analyse this brand's website content.
IMPORTANT RULES:
- Only use information visibly present on the page.
- Do NOT invent revenue or order volume figures. If you cannot see a price or SKU count, say null.
- Revenue/order estimates are BROAD ranges with LOW confidence — never present them as facts.
- If this looks like a marketplace or aggregator (not the brand's own store), say so.

Website: ${url}
Content:
${clean}

Return ONLY valid JSON (no markdown):
{
  "businessName": "brand or company name from the page",
  "businessType": "DTC Brand | SaaS | Agency | Content Site | B2B | Other",
  "topProduct": "main product or service name visible on the page, or null",
  "visiblePriceMin": "lowest price you can actually read on the page with currency, or null",
  "visiblePriceMax": "highest price you can actually read on the page with currency, or null",
  "visibleSkuCount": "number of distinct products/SKUs mentioned or countable, or null",
  "pricingSignal": "one factual sentence about pricing based only on what is visible",
  "revenueTierEstimate": "ONLY if businessType is DTC Brand or SaaS: a rough range like $10K-$100K/mo. Otherwise null.",
  "estimateConfidence": "low | very-low — always be conservative",
  "estimateWarning": "one sentence reminding the user this is a rough estimate from public page data only"
}`

  try {
    const r = await fetch(GROQ_URL_CONNECT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL_CONNECT, temperature: 0.05, max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!r.ok) throw new Error(`Groq ${r.status}`)
    const groqData  = await r.json()
    const rawText   = groqData.choices?.[0]?.message?.content ?? ''
    const txt       = rawText.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim()
    const ex        = JSON.parse(txt)

    // Build AOV from visible prices — never invent a number
    const aovDisplay = ex.visiblePriceMin && ex.visiblePriceMax
      ? `${ex.visiblePriceMin} – ${ex.visiblePriceMax}`
      : ex.visiblePriceMin ?? ex.visiblePriceMax ?? 'N/A'

    // Revenue: only show if AI produced an estimate, and always label it as estimated
    const revenueDisplay = ex.revenueTierEstimate
      ? `~${ex.revenueTierEstimate} (est.)`
      : 'N/A — not publicly available'

    const skuInfo = ex.visibleSkuCount
      ? `~${ex.visibleSkuCount} products`
      : 'N/A'

    return {
      type:       'api',
      name:       ex.businessName ?? domain,
      syncedAt:   now(),
      revenue:    revenueDisplay,
      orders:     'N/A — not publicly available',
      aov:        aovDisplay,
      topProduct: ex.topProduct ?? 'N/A',
      extra: [
        { label: 'Business Type',   value: ex.businessType ?? 'Unknown' },
        { label: 'Pricing Signal',  value: ex.pricingSignal ?? '—' },
        { label: 'SKUs Visible',    value: skuInfo },
        { label: '⚠ Estimates',     value: ex.estimateWarning ?? 'Revenue figures are rough estimates from public page data only.' },
        { label: 'Confidence',      value: ex.estimateConfidence ?? 'very-low' },
      ],
    }
  } catch {
    return {
      type: 'api', name: domain, syncedAt: now(),
      revenue: 'N/A', orders: 'N/A', aov: 'N/A', topProduct: 'N/A',
      extra: [
        { label: 'Source', value: domain },
        { label: 'Status', value: 'AI extraction failed — try a JSON API endpoint' },
      ],
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom API / webhook connector
// Strategy:
//   1. Try Shopify public products endpoint (/products.json) — works on any Shopify store
//   2. Try the URL as a JSON API — field-map known keys
//   3. If response is HTML — use AI to extract business context from page text
// ─────────────────────────────────────────────────────────────────────────────

async function connectApi(endpoint: string): Promise<
  { success: true; source: SourceSummary } | { success: false; error: string; hint: string }
> {
  if (!endpoint.startsWith('http')) {
    return {
      success: false,
      error: 'Please enter a valid URL starting with http:// or https://',
      hint:  'Examples: https://mystore.myshopify.com/products.json  or  https://your-app.com/api/analytics',
    }
  }

  // ── Strategy 1: detect Shopify store → probe /products.json ─────────────────
  let baseUrl: string
  try { baseUrl = new URL(endpoint).origin } catch { baseUrl = endpoint }

  if (endpoint.includes('myshopify.com') || endpoint.includes('/products.json')) {
    const shopifyUrl = `${baseUrl}/products.json?limit=5`
    try {
      const r = await fetch(shopifyUrl, { signal: AbortSignal.timeout(10_000) })
      if (r.ok) {
        const json = await r.json()
        const products: Array<{ title: string; variants: Array<{ price: string }> }> = json.products ?? []
        const topProduct = products[0]?.title ?? 'N/A'
        const avgPrice   = products.length > 0
          ? products.reduce((s, p) => s + parseFloat(p.variants?.[0]?.price ?? '0'), 0) / products.length
          : 0
        const domain = new URL(endpoint).hostname.replace('www.', '')
        return {
          success: true,
          source: {
            type: 'api', name: domain, syncedAt: now(),
            revenue: 'Connect via Shopify tab for full metrics',
            orders:  'Connect via Shopify tab for full metrics',
            aov:     avgPrice > 0 ? fmt(avgPrice) : 'N/A',
            topProduct,
            extra: [
              { label: 'Products Found',  value: String(products.length) },
              { label: 'Tip',             value: 'Use the Shopify connector for live revenue data' },
              { label: 'Store',           value: domain },
            ],
          },
        }
      }
    } catch { /* fall through */ }
  }

  // ── Strategy 2: try as a JSON API ────────────────────────────────────────────
  let responseText = ''
  let contentType  = ''
  let statusCode   = 0

  try {
    const r = await fetch(endpoint, {
      headers: { Accept: 'application/json, text/html, */*' },
      signal:  AbortSignal.timeout(12_000),
    })
    statusCode   = r.status
    contentType  = r.headers.get('content-type') ?? ''
    responseText = await r.text()

    if (!r.ok) {
      return {
        success: false,
        error: `URL returned HTTP ${statusCode}.`,
        hint:  'Make sure the URL is publicly reachable. For website URLs, try pasting the homepage URL.',
      }
    }
  } catch (e: unknown) {
    return {
      success: false,
      error: 'Could not reach that URL.',
      hint:  String(e instanceof Error ? e.message : e),
    }
  }

  const isJson = contentType.includes('application/json') ||
                 responseText.trimStart().startsWith('{') ||
                 responseText.trimStart().startsWith('[')

  if (isJson) {
    // ── JSON API — field-map known keys ───────────────────────────────────────
    let data: Record<string, unknown> = {}
    try { data = JSON.parse(responseText) } catch { data = {} }

    // Unwrap common envelope patterns: { data: {...} } / { result: {...} }
    const inner = (data.data ?? data.result ?? data) as Record<string, unknown>

    const pick = (...keys: string[]): string => {
      for (const k of keys) {
        const v = inner[k] ?? data[k]
        if (v !== undefined && v !== null) return String(v)
      }
      return 'N/A'
    }

    const revenue = pick('revenue','total_revenue','gmv','sales','amount','total_sales','net_revenue')
    const orders  = pick('orders','order_count','transactions','total_orders','num_orders','count')
    const aov     = pick('aov','average_order_value','avg_order','avg_cart','average_cart')

    const allKeys = [...new Set([...Object.keys(data), ...Object.keys(inner)])]

    return {
      success: true,
      source: {
        type: 'api', name: new URL(endpoint).hostname.replace('www.',''), syncedAt: now(),
        revenue:    revenue !== 'N/A' ? (revenue.startsWith('$') ? revenue : `$${revenue}`) : 'N/A',
        orders:     orders,
        aov:        aov !== 'N/A' ? (aov.startsWith('$') ? aov : `$${aov}`) : 'N/A',
        topProduct: pick('top_product','best_seller','top_sku','product','item'),
        extra: [
          { label: 'Keys Received', value: String(allKeys.length) },
          { label: 'Content-Type',  value: 'JSON' },
          { label: 'Endpoint',      value: endpoint.slice(0, 48) + (endpoint.length > 48 ? '…' : '') },
        ],
      },
    }
  }

  // ── Strategy 3a: Marketplace URL (Amazon, eBay, etc.) ────────────────────────
  // These pages belong to the marketplace, not to any individual seller.
  // Never fabricate seller revenue — extract category/competitive signals only.
  if (isMarketplaceUrl(endpoint)) {
    const marketplaceSource = await extractMarketplaceCategory(endpoint, responseText)
    return { success: true, source: marketplaceSource }
  }

  // ── Strategy 3b: Brand / DTC website — AI extraction with honest labels ───────
  const aiSource = await aiExtractFromWebsite(endpoint, responseText)
  return { success: true, source: aiSource }
}

// ─────────────────────────────────────────────────────────────────────────────
// Amazon connector  (SP-API requires full OAuth — validate format, explain)
// ─────────────────────────────────────────────────────────────────────────────

function connectAmazon(token: string): { success: false; error: string; hint: string } {
  const validFormat = /^(amzn\.|Atza\.|A|B|C)/i.test(token.trim())
  if (!validFormat) {
    return {
      success: false,
      error: 'Token format not recognised.',
      hint:   'SP-API refresh tokens start with "Atzr|" — find yours in Seller Central → Apps & Services → Manage Apps.',
    }
  }
  return {
    success: false,
    error: 'Amazon SP-API requires OAuth.',
    hint:   'Full Amazon integration needs a multi-step OAuth flow. Use "Try with sample data" below to explore DataLab with Amazon benchmarks.',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let connectorType: string
  let credentials: { key: string; domain?: string }

  try {
    const body  = await req.json()
    connectorType = String(body.connectorType ?? '').trim()
    credentials   = {
      key:    String(body.credentials?.key    ?? '').trim(),
      domain: String(body.credentials?.domain ?? '').trim() || undefined,
    }
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body.', hint: '' }, { status: 400 })
  }

  if (!connectorType) {
    return NextResponse.json({ success: false, error: 'connectorType is required.', hint: '' }, { status: 400 })
  }

  let result:
    | { success: true;  source: SourceSummary }
    | { success: false; error: string; hint: string }

  switch (connectorType) {
    case 'shopify':
      // field 1 (key)    = store domain   e.g. mystore.myshopify.com
      // field 2 (domain) = access token   e.g. shpat_xxxxx
      result = await connectShopify(credentials.key, credentials.domain ?? '')
      break
    case 'amazon':
      result = connectAmazon(credentials.key)
      break
    case 'csv':
      result = await connectCsv(credentials.key)
      break
    case 'api':
      result = await connectApi(credentials.key)
      break
    default:
      result = { success: false, error: `Unknown connector type: ${connectorType}`, hint: '' }
  }

  return NextResponse.json(result)
}
