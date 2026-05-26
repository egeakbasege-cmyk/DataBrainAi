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

async function aiExtractFromWebsite(url: string, pageText: string): Promise<SourceSummary> {
  const groqKey = getGroqKeyConnect()
  // Strip HTML tags and collapse whitespace — keep first 4000 chars
  const clean = pageText
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4000)

  const domain = new URL(url).hostname.replace('www.', '')

  if (!groqKey || clean.length < 50) {
    // No Groq key or no readable content — return minimal stub
    return {
      type: 'api', name: domain, syncedAt: now(),
      revenue: 'N/A', orders: 'N/A', aov: 'N/A', topProduct: 'N/A',
      extra: [
        { label: 'Source',  value: domain },
        { label: 'Type',    value: 'Website — AI extraction unavailable' },
        { label: 'Action',  value: 'Paste a JSON API endpoint for better results' },
      ],
    }
  }

  const prompt = `You are a business intelligence extractor. Read the following website content and extract what you can infer about this business.

Website: ${url}
Content:
${clean}

Return ONLY a valid JSON object with this exact shape (no markdown, no explanation):
{
  "businessName": "the brand/company name",
  "estimatedRevenueTier": "e.g. $10K-$50K/mo, $50K-$200K/mo, $200K-$1M/mo — infer from pricing, product count, brand presence",
  "estimatedOrdersPerMonth": "e.g. 100-500/mo — infer from category, price point, brand scale",
  "avgOrderValue": "e.g. $45-$80 — infer from visible prices",
  "topProduct": "name of the main product or category you can identify",
  "businessType": "e.g. DTC Fashion, SaaS, Marketplace, Agency",
  "pricingSignal": "one sentence about their pricing strategy from the page",
  "confidence": "low | medium | high — how confident you are in these estimates"
}`

  try {
    const r = await fetch(GROQ_URL_CONNECT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL_CONNECT, temperature: 0.1, max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(15_000),
    })

    if (!r.ok) throw new Error(`Groq ${r.status}`)
    const groqData  = await r.json()
    const rawText   = groqData.choices?.[0]?.message?.content ?? ''
    const cleaned   = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/,'').trim()
    const extracted = JSON.parse(cleaned)

    return {
      type:       'api',
      name:       extracted.businessName ?? domain,
      syncedAt:   now(),
      revenue:    extracted.estimatedRevenueTier ?? 'Estimated by AI',
      orders:     extracted.estimatedOrdersPerMonth ?? 'Estimated by AI',
      aov:        extracted.avgOrderValue ?? 'Estimated by AI',
      topProduct: extracted.topProduct ?? 'N/A',
      extra: [
        { label: 'Business Type',   value: extracted.businessType ?? 'Unknown' },
        { label: 'Pricing Signal',  value: extracted.pricingSignal ?? '—' },
        { label: 'AI Confidence',   value: extracted.confidence ?? 'low' },
        { label: 'Source',          value: domain },
      ],
    }
  } catch {
    return {
      type: 'api', name: domain, syncedAt: now(),
      revenue: 'N/A', orders: 'N/A', aov: 'N/A', topProduct: 'N/A',
      extra: [
        { label: 'Source',  value: domain },
        { label: 'Status',  value: 'AI extraction failed — try a JSON API endpoint' },
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

  // ── Strategy 3: HTML website — AI extracts business context ─────────────────
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
