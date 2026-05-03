/**
 * lib/tools/search.ts
 *
 * Edge-ready deep search utility — Groq-optimised real-time research layer.
 *
 * Provider hierarchy (first key that exists wins):
 *   1. Tavily   — TAVILY_API_KEY   (AI-native, structured results, ideal for LLM injection)
 *   2. Serper   — SERPER_API_KEY   (Google-backed, broader coverage)
 *
 * All operations use native fetch() — zero Node.js APIs, safe for Vercel Edge Runtime.
 *
 * Token budget: each result is pruned to ≤ 400 chars of content so that
 * 8 results add ≤ 900 tokens to the Groq context window.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SearchResult {
  url:              string
  title:            string
  content:          string   // pruned to ≤ 400 chars
  publishedDate?:   string   // ISO-8601 or human-readable from source
  domain:           string   // hostname only
  reliabilityScore: number   // 0.0–1.0
}

export interface DeepSearchResponse {
  results:     SearchResult[]
  queriesUsed: string[]      // the vectors sent to the API
  searchedAt:  string        // ISO-8601 timestamp
  provider:    'tavily' | 'serper' | 'none'
}

// ── Domain reliability registry ───────────────────────────────────────────────

const HIGH_RELIABILITY: Array<[string, number]> = [
  // Government & supranational
  ['.gov',              0.95],
  ['.gov.uk',           0.95],
  ['.gov.tr',           0.93],
  ['.europa.eu',        0.93],
  ['imf.org',           0.93],
  ['worldbank.org',     0.93],
  ['oecd.org',          0.92],
  ['un.org',            0.92],
  // Academic
  ['.edu',              0.92],
  ['arxiv.org',         0.91],
  ['nature.com',        0.92],
  ['sciencedirect.com', 0.91],
  ['pubmed.ncbi.nlm.nih.gov', 0.92],
  ['jstor.org',         0.90],
  // Tier-1 financial / news
  ['reuters.com',       0.90],
  ['bloomberg.com',     0.90],
  ['ft.com',            0.89],
  ['wsj.com',           0.88],
  ['apnews.com',        0.88],
  ['economist.com',     0.88],
  // Strategy & market intelligence
  ['mckinsey.com',      0.87],
  ['hbr.org',           0.87],
  ['gartner.com',       0.86],
  ['statista.com',      0.82],
  ['ibisworld.com',     0.82],
  // Tech / dev
  ['github.com',        0.80],
  ['techcrunch.com',    0.78],
  ['wired.com',         0.78],
  // Turkish-market sources
  ['kap.org.tr',        0.91],  // BIST public disclosures
  ['tcmb.gov.tr',       0.95],  // Central Bank of Turkey
  ['tuik.gov.tr',       0.93],  // TÜİK statistics
  ['spk.gov.tr',        0.92],  // Capital Markets Board
]

function domainOf(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function reliabilityOf(url: string): number {
  const lower = url.toLowerCase()
  for (const [pattern, score] of HIGH_RELIABILITY) {
    if (lower.includes(pattern)) return score
  }
  return 0.60   // default for unknown domains
}

// ── Content pruner ────────────────────────────────────────────────────────────

function pruneContent(raw: string, maxChars = 400): string {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (text.length <= maxChars) return text
  // Keep opening context (first 300 chars) + closing signal (last 100 chars)
  return text.slice(0, 300).trimEnd() + ' … ' + text.slice(-97).trimStart()
}

// ── Tavily provider ───────────────────────────────────────────────────────────

interface TavilyResult {
  url:             string
  title:           string
  content:         string
  published_date?: string
  score?:          number
}
interface TavilyResponse {
  results?: TavilyResult[]
}

async function searchTavily(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []

  let res: Response
  try {
    res = await fetch('https://api.tavily.com/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:      apiKey,
        query,
        search_depth: 'basic',
        max_results:  5,
        include_raw_content: false,
        // Boost authority domains
        include_domains: [],
      }),
      signal,
    })
  } catch { return [] }

  if (!res.ok) return []
  const data = await res.json().catch(() => ({})) as TavilyResponse

  return (data.results ?? []).map(r => ({
    url:              r.url,
    title:            r.title,
    content:          pruneContent(r.content ?? ''),
    publishedDate:    r.published_date,
    domain:           domainOf(r.url),
    reliabilityScore: reliabilityOf(r.url),
  }))
}

// ── Serper provider ───────────────────────────────────────────────────────────

interface SerperResult {
  link:     string
  title:    string
  snippet:  string
  date?:    string
}
interface SerperResponse {
  organic?: SerperResult[]
}

async function searchSerper(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) return []

  let res: Response
  try {
    res = await fetch('https://google.serper.dev/search', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY':    apiKey,
      },
      body: JSON.stringify({ q: query, num: 5, gl: 'us', hl: 'en' }),
      signal,
    })
  } catch { return [] }

  if (!res.ok) return []
  const data = await res.json().catch(() => ({})) as SerperResponse

  return (data.organic ?? []).map(r => ({
    url:              r.link,
    title:            r.title,
    content:          pruneContent(r.snippet ?? ''),
    publishedDate:    r.date,
    domain:           domainOf(r.link),
    reliabilityScore: reliabilityOf(r.link),
  }))
}

// ── Query decomposer ──────────────────────────────────────────────────────────

/**
 * Heuristic decomposition — no extra LLM call required.
 * Generates up to 3 focused search vectors from a user query.
 */
export function decomposeToSearchQueries(
  message: string,
  context?: string,
): string[] {
  const currentYear = new Date().getFullYear()

  // Strip filler words to get a compact intent string
  const keyTerms = message
    // English filler words
    .replace(/\b(what|how|why|when|where|who|is|are|was|were|will|would|could|should|can|please|help|tell|me|us|the|a|an|of|in|at|to|for|with|from|about|do|does|did|i|we|my|our|give|show|explain|describe)\b/gi, ' ')
    // Turkish filler words
    .replace(/\b(nedir|nasıl|neden|nerede|ne|kim|olan|olan|ile|için|bir|bu|şu|o|ve|da|de|ki|mi|mu|mü|mı|bana|bize|beni|bizi|var|yok|nasıldır|hakkında|anla|anlat|açıkla|göster|ver)\b/gi, ' ')
    .replace(/[?!.,;:]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 120)

  const queries: string[] = []

  // Q1 — Primary: user intent + current year for recency
  queries.push(`${keyTerms} ${currentYear}`.trim())

  // Q2 — Entity/sector enrichment
  const sectorMatch  = context?.match(/(?:sector|industry)[:\s]+([^\n,]{3,40})/i)
  const companyMatch = context?.match(/(?:company|brand|business|firm|startup)[:\s]+([^\n,]{3,30})/i)
  // Capitalised noun phrase from message (potential entity name)
  const entityMatch  = message.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})\b/)

  if (sectorMatch) {
    queries.push(`${sectorMatch[1].trim()} ${keyTerms} statistics benchmark`.trim())
  } else if (companyMatch) {
    queries.push(`${companyMatch[1].trim()} ${currentYear} market analysis data`.trim())
  } else if (entityMatch && entityMatch[1].length > 3) {
    queries.push(`${entityMatch[1]} ${currentYear} statistics data report`.trim())
  } else {
    queries.push(`${keyTerms} industry report statistics`.trim())
  }

  // Q3 — Benchmark/trend anchor
  queries.push(`${keyTerms} market trend benchmark report ${currentYear}`.trim())

  return Array.from(new Set(queries)).slice(0, 3)
}

// ── Time-sensitivity detector ─────────────────────────────────────────────────

const TIME_SENSITIVE_RE = [
  /\b(latest|current|today|right now|live)\b/i,
  /\bthis\s+(week|month|quarter|year)\b/i,
  /\b(price|rate|yield|market cap|valuation)\b/i,
  /\b(news|breaking|update|just\s+announced|recently)\b/i,
  /\b20(2[4-9]|[3-9]\d)\b/,                        // year 2024–2099
  /\b(türkiye|turkey|bist|tcmb|tuik|enflasyon|dolar|faiz)\b/i,
  /\b(nasdaq|s&p\s*500|dow jones|ftse|dax|nikkei)\b/i,
]

/**
 * Returns true when the query likely requires live/recent data.
 * Conservative: avoids triggering on generic business questions.
 */
export function requiresResearch(message: string): boolean {
  return TIME_SENSITIVE_RE.some(re => re.test(message))
}

// ── Main export ───────────────────────────────────────────────────────────────

/** Timeout for the entire parallel search operation (ms). */
const SEARCH_TIMEOUT_MS = 4_500

/**
 * executeDeepSearch
 *
 * Runs all queries in parallel (Tavily preferred, Serper fallback per query).
 * Deduplicates by URL and sorts by reliability score.
 * Hard-capped at 8 results to control token spend.
 */
export async function executeDeepSearch(
  queries: string[],
): Promise<DeepSearchResponse> {
  const searchedAt = new Date().toISOString()

  // Shared abort controller — kills all in-flight fetches if timeout fires
  const abort  = new AbortController()
  const timer  = setTimeout(() => abort.abort(), SEARCH_TIMEOUT_MS)

  const hasTavily = Boolean(process.env.TAVILY_API_KEY)
  const hasSerper = Boolean(process.env.SERPER_API_KEY)

  if (!hasTavily && !hasSerper) {
    clearTimeout(timer)
    return { results: [], queriesUsed: queries, searchedAt, provider: 'none' }
  }

  try {
    const batches = await Promise.all(
      queries.map(async (q) => {
        // Try Tavily first; fall back to Serper if Tavily returns nothing
        if (hasTavily) {
          const tv = await searchTavily(q, abort.signal)
          if (tv.length > 0) return tv
        }
        if (hasSerper) {
          return searchSerper(q, abort.signal)
        }
        return []
      }),
    )

    clearTimeout(timer)

    // Flatten + deduplicate by URL
    const seen    = new Set<string>()
    const results: SearchResult[] = []
    for (const batch of batches) {
      for (const r of batch) {
        if (!seen.has(r.url)) {
          seen.add(r.url)
          results.push(r)
        }
      }
    }

    // Sort: highest reliability first
    results.sort((a, b) => b.reliabilityScore - a.reliabilityScore)

    return {
      results:    results.slice(0, 8),
      queriesUsed: queries,
      searchedAt,
      provider:   hasTavily ? 'tavily' : 'serper',
    }
  } catch {
    clearTimeout(timer)
    return { results: [], queriesUsed: queries, searchedAt, provider: 'none' }
  }
}

// ── Groq-compatible context encoder ──────────────────────────────────────────

/**
 * encodeResearchContext
 *
 * Formats search results into XML-style tags that Groq/Llama 3 handles cleanly.
 * Called by route.ts; the output is injected into body.ragContext before
 * buildUserMessage() renders it into the prompt.
 *
 * Token estimate: ~900 tokens for 8 results at 400 chars each.
 */
export function encodeResearchContext(res: DeepSearchResponse): string {
  if (res.results.length === 0) return ''

  const blocks = res.results
    .map(
      r =>
        `Source: ${r.url} | Date: ${r.publishedDate ?? 'unknown'} | Reliability: ${Math.round(r.reliabilityScore * 100)}%\nContent: ${r.content}`,
    )
    .join('\n\n')

  return `<research_context>\n${blocks}\n</research_context>`
}

// ── Triangulation scorer ──────────────────────────────────────────────────────

/**
 * computeTriangulationLevel
 *
 * Scores cross-source agreement on a 1–10 scale.
 * Uses lexical overlap of key noun phrases across result snippets as a proxy.
 */
export function computeTriangulationLevel(results: SearchResult[]): number {
  if (results.length === 0) return 0
  if (results.length === 1) return 3

  // Extract significant words (>4 chars) from each result
  const wordSets = results.map(r =>
    new Set(
      r.content
        .toLowerCase()
        .match(/\b[a-zçğıöşü]{5,}\b/g) ?? [],
    ),
  )

  // Count how many results share at least 3 common terms with the first result
  const baseline  = wordSets[0]
  let   agreements = 0

  for (let i = 1; i < wordSets.length; i++) {
    let shared = 0
    wordSets[i].forEach(word => {
      if (baseline.has(word)) shared++
    })
    if (shared >= 3) agreements++
  }

  // Scale: 0 agreements → 3, all agree → 9
  const maxAgreements = wordSets.length - 1
  const ratio         = maxAgreements > 0 ? agreements / maxAgreements : 0
  return Math.round(3 + ratio * 6)   // 3–9
}
