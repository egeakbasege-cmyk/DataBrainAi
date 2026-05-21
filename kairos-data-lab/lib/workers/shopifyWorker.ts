import axios from 'axios'
import * as cheerio from 'cheerio'
import type { ShopifyProduct, ShopifyRawData, SupplierEstimate } from '@/types'

const REQUEST_TIMEOUT = 20_000   // 20s per fetch
const MAX_PRODUCTS    = 250       // Shopify API max per page
const MAX_PAGES       = 4         // 1000 products max

// ── Axios instance with browser-like headers ──────────────────────────────────
const http = axios.create({
  timeout: REQUEST_TIMEOUT,
  headers: {
    'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept':          'application/json, text/html, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control':   'no-cache',
  },
})

// ── Product fetch via /products.json ─────────────────────────────────────────

async function fetchProductsJson(domain: string): Promise<ShopifyProduct[]> {
  const allProducts: ShopifyProduct[] = []
  let   page = 1

  while (page <= MAX_PAGES) {
    const url = `https://${domain}/products.json?limit=${MAX_PRODUCTS}&page=${page}`
    try {
      const res  = await http.get<{ products: ShopifyProduct[] }>(url)
      const data = res.data

      if (!data?.products?.length) break
      allProducts.push(...data.products)

      if (data.products.length < MAX_PRODUCTS) break
      page++
    } catch (err: any) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        throw new Error(`Shopify store at "${domain}" has a password protected storefront or has disabled /products.json access.`)
      }
      if (page === 1) throw new Error(`Failed to fetch products from "${domain}": ${err.message}`)
      break   // partial data is OK after page 1
    }
  }

  return allProducts
}

// ── Store name extraction via HTML ────────────────────────────────────────────

async function fetchStoreName(domain: string): Promise<string> {
  try {
    const res = await http.get<string>(`https://${domain}`, {
      headers: { Accept: 'text/html' },
      responseType: 'text',
    })
    const $ = cheerio.load(res.data as string)
    return (
      $('title').first().text().trim() ||
      $('meta[property="og:site_name"]').attr('content') ||
      domain
    )
  } catch {
    return domain
  }
}

// ── Tag frequency analysis ────────────────────────────────────────────────────

function buildTagFrequency(products: ShopifyProduct[]): Record<string, number> {
  const freq: Record<string, number> = {}
  for (const p of products) {
    const tags = p.tags ? p.tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : []
    for (const tag of tags) {
      freq[tag] = (freq[tag] ?? 0) + 1
    }
  }
  return Object.fromEntries(
    Object.entries(freq).sort(([, a], [, b]) => b - a).slice(0, 30),
  )
}

// ── Price range calculation ───────────────────────────────────────────────────

function calcPriceRange(products: ShopifyProduct[]): { min: number; max: number; avg: number } {
  const prices: number[] = products.flatMap(p =>
    p.variants.map(v => parseFloat(v.price)).filter(n => !isNaN(n) && n > 0),
  )
  if (prices.length === 0) return { min: 0, max: 0, avg: 0 }
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const avg = prices.reduce((s, n) => s + n, 0) / prices.length
  return { min, max, avg: Math.round(avg * 100) / 100 }
}

// ── Top product selection ─────────────────────────────────────────────────────
// "Best sellers" heuristic: products with the most variant options
// (more size/colour options = higher investment = proven sellers)
// + recently updated (active inventory management)

function selectTopProducts(products: ShopifyProduct[], count = 10): ShopifyProduct[] {
  return [...products]
    .sort((a, b) => {
      // Composite score: variant count + recency weight
      const aVariants = a.variants.length
      const bVariants = b.variants.length
      const aUpdated  = new Date(a.updated_at).getTime()
      const bUpdated  = new Date(b.updated_at).getTime()
      // Normalise: favour recent updates within the last 30 days
      const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000
      const aRecent = aUpdated > thirtyDaysAgo ? 5 : 0
      const bRecent = bUpdated > thirtyDaysAgo ? 5 : 0
      return (bVariants + bRecent) - (aVariants + aRecent)
    })
    .slice(0, count)
}

// ── Supplier cost estimation ──────────────────────────────────────────────────
// Typical manufacturing cost for goods sold on DTC/Shopify: 10-20% of retail.
// This is a standard industry estimate (not a real Alibaba API call).

export function estimateSupplierCosts(products: ShopifyProduct[]): SupplierEstimate[] {
  return selectTopProducts(products, 8).map(p => {
    const retailPrice   = parseFloat(p.variants[0]?.price ?? '0') || 0
    // Randomise within the 12-22% band to simulate real-world variation
    const costRatio     = 0.12 + Math.random() * 0.10
    const estimatedCost = Math.round(retailPrice * costRatio * 100) / 100
    const grossMargin   = Math.round((retailPrice - estimatedCost) * 100) / 100
    const grossMarginPct = retailPrice > 0
      ? Math.round((grossMargin / retailPrice) * 100 * 10) / 10
      : 0

    return {
      productTitle:   p.title,
      retailPrice,
      estimatedCost,
      grossMargin,
      grossMarginPct,
    }
  })
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function runShopifyWorker(url: string): Promise<ShopifyRawData> {
  const domain = new URL(url).hostname.replace(/^www\./, '')

  const [products, storeName] = await Promise.all([
    fetchProductsJson(domain),
    fetchStoreName(domain),
  ])

  if (products.length === 0) {
    throw new Error(`No products found at "${domain}". The store may be password-protected or empty.`)
  }

  return {
    storeDomain:   domain,
    storeName,
    totalProducts: products.length,
    products,
    topProducts:   selectTopProducts(products),
    tagFrequency:  buildTagFrequency(products),
    priceRange:    calcPriceRange(products),
    scrapedAt:     new Date().toISOString(),
  }
}
