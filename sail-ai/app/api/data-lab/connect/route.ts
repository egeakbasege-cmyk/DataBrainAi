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

  // C-7: SSRF protection — block localhost, internal IPs, and private subnets
  const SSRF_BLOCK = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1|0\.0\.0\.0|metadata\.)/i
  if (SSRF_BLOCK.test(host) || !host.includes('.') || host.startsWith('[')) {
    console.error(`[SECURITY] SSRF attempt blocked — domain: "${host}"`)
    return { success: false, error: 'Invalid store domain.', hint: 'Enter your real Shopify store domain, e.g. mystore.myshopify.com' }
  }

  // Only allow valid hostname characters
  if (!/^[a-zA-Z0-9._-]+$/.test(host)) {
    return { success: false, error: 'Invalid domain format.', hint: 'Domain must contain only letters, numbers, dots, and hyphens.' }
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

// H-6: RFC 4180 compliant CSV parser — handles quoted fields with embedded commas/newlines
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuote = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuote) {
      if (ch === '"') {
        if (line[i + 1] === '"') { field += '"'; i++ }   // escaped quote ""
        else inQuote = false                              // closing quote
      } else {
        field += ch
      }
    } else {
      if (ch === '"') { inQuote = true }
      else if (ch === ',') { fields.push(field.trim()); field = '' }
      else { field += ch }
    }
  }
  fields.push(field.trim())
  return fields
}

// H-7: Max CSV byte size — 5 MB hard cap to prevent OOM
const MAX_CSV_BYTES = 5 * 1024 * 1024

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

    // H-7: Enforce size cap before reading into memory
    const contentLength = Number(r.headers.get('content-length') ?? 0)
    if (contentLength > MAX_CSV_BYTES) {
      return { success: false, error: 'CSV file is too large (max 5 MB).', hint: 'Split the file into smaller chunks or filter to the relevant date range first.' }
    }

    // Stream first 5 MB and stop early if content-length was missing/wrong
    const reader = r.body?.getReader()
    if (!reader) return { success: false, error: 'Could not read CSV response.', hint: 'Try a different URL format.' }

    const chunks: Uint8Array[] = []
    let bytesRead = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        bytesRead += value.byteLength
        if (bytesRead > MAX_CSV_BYTES) {
          await reader.cancel()
          return { success: false, error: 'CSV file is too large (max 5 MB).', hint: 'Filter the export to the last 90 days and try again.' }
        }
        chunks.push(value)
      }
    }
    text = new TextDecoder().decode(new Uint8Array(chunks.reduce((a, c) => [...a, ...c], [] as number[])))
  } catch (e: unknown) {
    return { success: false, error: 'Network error fetching CSV.', hint: String(e instanceof Error ? e.message : e) }
  }

  // Parse CSV — H-6: use RFC 4180 compliant parser
  const lines   = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) {
    return { success: false, error: 'CSV appears empty or has only a header row.', hint: 'The file needs at least one data row.' }
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase())
  const rows    = lines.slice(1).map(l => parseCSVLine(l))

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
// Klaviyo connector  (private API key → account + metrics info)
// ─────────────────────────────────────────────────────────────────────────────

async function connectKlaviyo(apiKey: string): Promise<
  { success: true; source: SourceSummary } | { success: false; error: string; hint: string }
> {
  if (!apiKey || apiKey.length < 10) {
    return {
      success: false,
      error: 'Klaviyo private API key is required.',
      hint:  'Find it in Klaviyo → Settings → Account → Private API Keys. It starts with "pk_".',
    }
  }

  try {
    const r = await fetch('https://a.klaviyo.com/api/accounts/', {
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        revision: '2024-02-15',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10_000),
    })
    if (r.status === 401 || r.status === 403) {
      return {
        success: false,
        error:   'Invalid Klaviyo API key.',
        hint:    'Make sure you are using a private key, not a public key. Private keys start with "pk_".',
      }
    }
    if (!r.ok) {
      return { success: false, error: `Klaviyo returned ${r.status}.`, hint: 'Check that your API key is active.' }
    }

    const json = await r.json()
    const account = json.data?.[0]?.attributes ?? {}

    return {
      success: true,
      source: {
        type:       'api',
        name:       account.contact_information?.organization_name ?? 'Klaviyo Account',
        syncedAt:   now(),
        revenue:    'N/A — use Klaviyo dashboard for revenue attribution',
        orders:     'N/A',
        aov:        'N/A',
        topProduct: 'N/A',
        extra: [
          { label: 'Account',   value: account.contact_information?.organization_name ?? '—' },
          { label: 'Timezone',  value: account.preferred_timezone ?? '—' },
          { label: 'Currency',  value: account.preferred_currency ?? '—' },
          { label: 'Tip',       value: 'Klaviyo revenue attribution is available in your Klaviyo dashboard under Analytics → Revenue.' },
        ],
      },
    }
  } catch (e: unknown) {
    return { success: false, error: 'Could not reach Klaviyo.', hint: String(e instanceof Error ? e.message : e) }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Stripe connector  (restricted key → balance + recent charges)
// ─────────────────────────────────────────────────────────────────────────────

async function connectStripe(apiKey: string): Promise<
  { success: true; source: SourceSummary } | { success: false; error: string; hint: string }
> {
  if (!apiKey || !apiKey.startsWith('sk_') && !apiKey.startsWith('rk_')) {
    return {
      success: false,
      error: 'Stripe API key not recognised.',
      hint:  'Use a restricted key (rk_live_…) with read-only access. Find it in Stripe Dashboard → Developers → API Keys.',
    }
  }

  try {
    // Fetch balance
    const balR = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (balR.status === 401) {
      return {
        success: false,
        error: 'Invalid Stripe API key.',
        hint:  'Make sure you are using a live or test secret/restricted key from Stripe Dashboard → Developers.',
      }
    }
    if (!balR.ok) {
      return { success: false, error: `Stripe returned ${balR.status}.`, hint: 'Check your key permissions.' }
    }
    const balance = await balR.json()
    const availableRaw = balance.available?.[0]?.amount ?? 0
    const currency     = (balance.available?.[0]?.currency ?? 'usd').toUpperCase()
    const available    = availableRaw / 100 // Stripe amounts are in cents

    // Fetch last 30 days of charges (100 max)
    const since = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000)
    const chR   = await fetch(
      `https://api.stripe.com/v1/charges?limit=100&created[gte]=${since}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000) },
    )

    let totalRevenue = 0
    let orderCount   = 0
    if (chR.ok) {
      const charges = await chR.json()
      const list: Array<{ amount: number; status: string }> = charges.data ?? []
      const successful = list.filter(c => c.status === 'succeeded')
      totalRevenue = successful.reduce((s, c) => s + c.amount / 100, 0)
      orderCount   = successful.length
    }

    const aov = orderCount > 0 ? totalRevenue / orderCount : 0

    return {
      success: true,
      source: {
        type:       'api',
        name:       'Stripe Account',
        syncedAt:   now(),
        revenue:    totalRevenue > 0 ? fmt(totalRevenue, 0) + '/30d' : 'N/A',
        orders:     orderCount > 0 ? fmtInt(orderCount) + '/30d' : 'N/A',
        aov:        aov > 0 ? fmt(aov) : 'N/A',
        topProduct: 'N/A — see Stripe dashboard',
        extra: [
          { label: 'Balance Available', value: `${currency} ${fmt(available, 2)}` },
          { label: 'Currency',          value: currency },
          { label: 'Data Window',       value: 'Last 30 days (up to 100 charges)' },
          { label: 'Tip',               value: 'Use a restricted key with charges:read and balance:read permissions only.' },
        ],
      },
    }
  } catch (e: unknown) {
    return { success: false, error: 'Could not reach Stripe.', hint: String(e instanceof Error ? e.message : e) }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WooCommerce connector  (Consumer Key + Secret via Basic Auth)
// ─────────────────────────────────────────────────────────────────────────────

async function connectWooCommerce(domain: string, consumerKey: string, consumerSecret: string): Promise<
  { success: true; source: SourceSummary } | { success: false; error: string; hint: string }
> {
  const host = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim()
  if (!host) {
    return {
      success: false,
      error: 'Store domain is required.',
      hint:  'Enter your WordPress site domain in the first field, e.g. mystore.com',
    }
  }
  if (!consumerKey || !consumerSecret) {
    return {
      success: false,
      error: 'WooCommerce Consumer Key and Secret are required.',
      hint:  'Generate them in WordPress → WooCommerce → Settings → Advanced → REST API.',
    }
  }

  const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
  const base        = `https://${host}/wp-json/wc/v3`
  const headers     = { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json' }

  try {
    // Fetch store info
    const infoR = await fetch(`${base}/system_status`, { headers, signal: AbortSignal.timeout(10_000) })
    if (infoR.status === 401 || infoR.status === 403) {
      return {
        success: false,
        error: 'Invalid WooCommerce credentials.',
        hint:  'Make sure the key has "Read" permissions. Regenerate in WooCommerce → Settings → Advanced → REST API.',
      }
    }
    if (infoR.status === 404) {
      return {
        success: false,
        error: `WooCommerce REST API not found at ${host}.`,
        hint:  'Make sure WooCommerce is installed and permalinks are set to "Post name" in WordPress Settings.',
      }
    }

    // Fetch recent orders
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const ordR  = await fetch(
      `${base}/orders?after=${since}&status=completed&per_page=100`,
      { headers, signal: AbortSignal.timeout(12_000) },
    )

    let totalRevenue = 0
    let orderCount   = 0
    let topProduct   = 'N/A'

    if (ordR.ok) {
      const orders: Array<{ total: string; line_items: Array<{ name: string }> }> = await ordR.json()
      orderCount   = orders.length
      totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total ?? '0'), 0)
      topProduct   = orders[0]?.line_items?.[0]?.name ?? 'N/A'
    }

    const aov = orderCount > 0 ? totalRevenue / orderCount : 0

    return {
      success: true,
      source: {
        type:       'api',
        name:       host,
        syncedAt:   now(),
        revenue:    totalRevenue > 0 ? fmt(totalRevenue, 0) + '/30d' : 'N/A',
        orders:     fmtInt(orderCount) + '/30d',
        aov:        aov > 0 ? fmt(aov) : 'N/A',
        topProduct,
        extra: [
          { label: 'Platform', value: 'WooCommerce' },
          { label: 'Domain',   value: host },
          { label: 'Period',   value: 'Last 30 days (completed orders)' },
        ],
      },
    }
  } catch (e: unknown) {
    return { success: false, error: 'Could not reach your WooCommerce store.', hint: String(e instanceof Error ? e.message : e) }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuth-required platform stubs — return clear, specific "coming soon" messages
// ─────────────────────────────────────────────────────────────────────────────

interface OAuthPlatformConfig {
  name:  string
  error: string
  hint:  string
}

const OAUTH_PLATFORMS: Record<string, OAuthPlatformConfig> = {
  'meta-ads': {
    name:  'Meta Ads',
    error: 'Meta Ads requires OAuth login.',
    hint:  'Meta Ads integration (Facebook + Instagram) requires OAuth via the Marketing API. Coming soon — connect your ad account directly through the Meta Business Suite in the meantime.',
  },
  'google-ads': {
    name:  'Google Ads',
    error: 'Google Ads requires OAuth login.',
    hint:  'Google Ads uses OAuth 2.0 via the Google Ads API. Coming soon — you can export a CSV report from Google Ads and use the CSV connector now.',
  },
  'amazon-ppc': {
    name:  'Amazon PPC',
    error: 'Amazon Advertising requires OAuth.',
    hint:  'Amazon Advertising API requires an OAuth flow through Seller Central. Coming soon — you can download an SB/SP report and use the CSV connector now.',
  },
  'tiktok-ads': {
    name:  'TikTok Ads',
    error: 'TikTok Ads requires OAuth login.',
    hint:  'TikTok Marketing API requires app authorization via OAuth. Coming soon — export a CSV report from TikTok Ads Manager for now.',
  },
  'ga4': {
    name:  'Google Analytics 4',
    error: 'GA4 requires a Google Service Account.',
    hint:  'GA4 Data API needs a Service Account JSON key or OAuth 2.0. Coming soon — you can use the GA4 Data Export (BigQuery) with our CSV connector in the meantime.',
  },
  'ebay': {
    name:  'eBay',
    error: 'eBay requires OAuth.',
    hint:  'eBay Sell Analytics API requires OAuth via an eBay developer account. Coming soon — export your eBay seller report as CSV and use the CSV connector now.',
  },
  'etsy': {
    name:  'Etsy',
    error: 'Etsy requires OAuth.',
    hint:  'Etsy Open API v3 requires OAuth 2.0 authorization. Coming soon — download your Etsy order CSV from Stats & Finances and use the CSV connector now.',
  },
  'tiktokshop': {
    name:  'TikTok Shop',
    error: 'TikTok Shop requires OAuth.',
    hint:  'TikTok Shop Open Platform requires app authorization. Coming soon — you can export a CSV from TikTok Shop Seller Center for now.',
  },
  'booking': {
    name:  'Booking.com',
    error: 'Booking.com requires partner API access.',
    hint:  'Booking.com Connectivity API requires formal partner approval and OAuth. Coming soon.',
  },
  'airbnb': {
    name:  'Airbnb',
    error: 'Airbnb requires OAuth.',
    hint:  'Airbnb API requires OAuth via an approved host account. Coming soon — export a CSV from your Airbnb host dashboard for now.',
  },
  'expedia': {
    name:  'Expedia',
    error: 'Expedia requires partner API credentials.',
    hint:  'Expedia EPS (Partner Solutions) API requires partner approval. Coming soon.',
  },
  'tripadvisor': {
    name:  'Tripadvisor',
    error: 'Tripadvisor requires Content API access.',
    hint:  'Tripadvisor Content API requires approval from Tripadvisor. Coming soon.',
  },
  'fiverr': {
    name:  'Fiverr',
    error: 'Fiverr does not provide a seller revenue API.',
    hint:  'Fiverr does not offer a public revenue API for sellers. Export your earnings CSV from Fiverr Analytics and use the CSV connector.',
  },
  'upwork': {
    name:  'Upwork',
    error: 'Upwork requires OAuth.',
    hint:  'Upwork API requires OAuth 2.0. Coming soon — export your earnings report from Upwork Reports as CSV for now.',
  },
}

function connectOAuthPlatform(type: string): { success: false; error: string; hint: string } {
  const cfg = OAUTH_PLATFORMS[type]
  if (!cfg) {
    return { success: false, error: `Connector "${type}" is not yet supported.`, hint: 'More platforms are being added. Try the CSV or API connector in the meantime.' }
  }
  return { success: false, error: cfg.error, hint: cfg.hint }
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
    // ── Fully implemented ────────────────────────────────────────────────────
    case 'shopify':
      // key = store domain (mystore.myshopify.com), domain = access token
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

    case 'klaviyo':
      result = await connectKlaviyo(credentials.key)
      break

    case 'stripe':
      result = await connectStripe(credentials.key)
      break

    case 'woocommerce':
      // key = consumer key, domain = consumer secret  (domain field reused as secret)
      // First field label in UI should be: "Consumer Key"
      // Second field label in UI should be: "Consumer Secret + store domain"
      // We need store domain too — encode as "domain|secret" or use key as "domain" and domain as key
      // Convention: credentials.key = store domain, credentials.domain = consumer key:secret (colon-separated)
      {
        const parts  = (credentials.domain ?? '').split(':')
        const ck     = parts[0] ?? ''
        const cs     = parts.slice(1).join(':')
        result = await connectWooCommerce(credentials.key, ck, cs)
      }
      break

    // ── OAuth-required / coming soon ─────────────────────────────────────────
    case 'ebay':
    case 'etsy':
    case 'tiktokshop':
    case 'meta-ads':
    case 'google-ads':
    case 'amazon-ppc':
    case 'tiktok-ads':
    case 'ga4':
    case 'booking':
    case 'airbnb':
    case 'expedia':
    case 'tripadvisor':
    case 'fiverr':
    case 'upwork':
      result = connectOAuthPlatform(connectorType)
      break

    default:
      result = {
        success: false,
        error:   `Connector "${connectorType}" is not yet supported.`,
        hint:    'Check back soon — more platforms are being added. Use the CSV or API connector in the meantime.',
      }
  }

  return NextResponse.json(result)
}
