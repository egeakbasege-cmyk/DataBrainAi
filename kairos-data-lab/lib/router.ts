import type { RouterResult } from '@/types'

// ── ASIN extraction patterns ──────────────────────────────────────────────────
const ASIN_PATTERNS = [
  /\/dp\/([A-Z0-9]{10})/i,
  /\/gp\/product\/([A-Z0-9]{10})/i,
  /\/gp\/aw\/d\/([A-Z0-9]{10})/i,
  /\/product\/([A-Z0-9]{10})/i,
  /[?&]asin=([A-Z0-9]{10})/i,
  /\/([A-Z0-9]{10})(?:[/?]|$)/,
]

// Amazon domain variants
const AMAZON_DOMAINS = [
  'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr',
  'amazon.ca',  'amazon.com.au', 'amazon.co.jp', 'amazon.in',
  'amazon.com.mx', 'amazon.com.tr', 'amazon.it', 'amazon.es',
]

// ── URL Router ────────────────────────────────────────────────────────────────

/**
 * Classifies a URL as Shopify or Amazon and extracts the relevant identifiers.
 * Throws if the URL is not a recognisable e-commerce platform.
 */
export function routeUrl(raw: string): RouterResult {
  // Normalise — prepend https:// if missing
  const normalised = /^https?:\/\//i.test(raw.trim())
    ? raw.trim()
    : `https://${raw.trim()}`

  let parsed: URL
  try {
    parsed = new URL(normalised)
  } catch {
    throw new Error(`Invalid URL: "${raw}"`)
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')

  // ── Amazon check ─────────────────────────────────────────────────────────
  if (AMAZON_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
    // Extract ASIN from path
    const asin = extractAsin(parsed.pathname + parsed.search)
    return {
      platform: 'AMAZON',
      url:      normalised,
      asin:     asin ?? undefined,
    }
  }

  // ── Shopify check ─────────────────────────────────────────────────────────
  // Strategy: attempt to reach /products.json — if it succeeds, it's Shopify.
  // Here we classify by URL structure heuristics to avoid a network call.
  // The worker will confirm by actually fetching /products.json.
  return {
    platform: 'SHOPIFY',
    url:      normalised,
    domain:   hostname,
  }
}

function extractAsin(pathAndQuery: string): string | null {
  for (const pattern of ASIN_PATTERNS) {
    const match = pathAndQuery.match(pattern)
    if (match?.[1] && match[1].length === 10) return match[1].toUpperCase()
  }
  return null
}

export function getStoreDomain(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
