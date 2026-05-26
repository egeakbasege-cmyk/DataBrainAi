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
// Custom API / webhook connector
// ─────────────────────────────────────────────────────────────────────────────

async function connectApi(endpoint: string): Promise<
  { success: true; source: SourceSummary } | { success: false; error: string; hint: string }
> {
  if (!endpoint.startsWith('http')) {
    return { success: false, error: 'Please enter a valid URL starting with http:// or https://', hint: 'Example: https://your-app.com/api/analytics' }
  }

  let data: Record<string, unknown>
  try {
    const r = await fetch(endpoint, {
      headers: { Accept: 'application/json' },
      signal:  AbortSignal.timeout(12_000),
    })
    if (!r.ok) {
      return { success: false, error: `Endpoint returned HTTP ${r.status}.`, hint: 'Make sure the endpoint is publicly reachable and returns JSON.' }
    }
    data = await r.json().catch(() => ({}))
  } catch (e: unknown) {
    return { success: false, error: 'Could not reach that endpoint.', hint: String(e instanceof Error ? e.message : e) }
  }

  // Best-effort field mapping — look for common key names
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = data[k] ?? (data.data as Record<string, unknown>)?.[k]
      if (v !== undefined) return String(v)
    }
    return 'N/A'
  }

  const revenue = pick('revenue', 'total_revenue', 'gmv', 'sales', 'amount')
  const orders  = pick('orders', 'order_count', 'transactions', 'total_orders')
  const aov     = pick('aov', 'average_order_value', 'avg_order', 'avg_cart')

  const source: SourceSummary = {
    type:       'api',
    name:       'Custom API Source',
    syncedAt:   now(),
    revenue:    revenue !== 'N/A' ? (revenue.startsWith('$') ? revenue : `$${revenue}`) : 'N/A',
    orders:     orders,
    aov:        aov !== 'N/A' ? (aov.startsWith('$') ? aov : `$${aov}`) : 'N/A',
    topProduct: pick('top_product', 'best_seller', 'top_sku', 'product'),
    extra: [
      { label: 'Endpoint',       value: endpoint.slice(0, 50) + (endpoint.length > 50 ? '…' : '') },
      { label: 'Keys Received',  value: String(Object.keys(data).length) },
      { label: 'Response',       value: 'JSON — connected ✓' },
    ],
  }

  return { success: true, source }
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
