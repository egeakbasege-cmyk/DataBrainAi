/**
 * /api/data-lab/price-scout/  — Price & Alternative Finder
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts : { query: string, category?: string }
 * Returns : { results: PriceResult[], aiSummary: string, cheapest: PriceResult }
 *
 * Pipeline:
 *   1. Tavily search → "{query} buy price cheapest online"
 *   2. Tavily search → "{query} alternatives similar products best"
 *   3. Groq extraction → parse prices, platforms, ratings from raw results
 *   4. Return structured comparison table
 */

import { NextRequest, NextResponse } from 'next/server'

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const TAVILY_URL = 'https://api.tavily.com/search'

function getGroqKey()   { return process.env.GROQ_API_KEY ?? process.env.GROQ_API_KEY_2 }
function getTavilyKey() { return process.env.TAVILY_API_KEY ?? process.env.TAVILY_API_KEY_2 }

export interface PriceResult {
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

// ── Tavily search helper ──────────────────────────────────────────────────────

async function tavilySearch(query: string, apiKey: string): Promise<
  Array<{ title: string; url: string; content: string; score: number }>
> {
  try {
    const r = await fetch(TAVILY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:        apiKey,
        query,
        search_depth:   'basic',
        max_results:    8,
        include_answer: false,
      }),
      signal: AbortSignal.timeout(12_000),
    })
    if (!r.ok) return []
    const data = await r.json()
    return data.results ?? []
  } catch {
    return []
  }
}

// ── Groq extraction ───────────────────────────────────────────────────────────

async function extractPricesWithGroq(
  query: string,
  rawResults: Array<{ title: string; url: string; content: string }>,
  groqKey: string,
): Promise<PriceResult[]> {
  if (rawResults.length === 0) return []

  const resultsText = rawResults
    .slice(0, 10)
    .map((r, i) => `[${i + 1}] Title: ${r.title}\nURL: ${r.url}\nContent: ${r.content.slice(0, 400)}`)
    .join('\n\n---\n\n')

  const prompt = `You are a price comparison engine. The user searched for: "${query}"

Below are web search results. Extract price information from these results and identify:
1. Direct matches (same product, best prices)
2. Alternatives (similar/competing products)

Search results:
${resultsText}

Return ONLY a valid JSON array (no markdown, no explanation) with this structure:
[
  {
    "title": "exact product/service name from the result",
    "price": "price as shown (e.g. $29.99 or ₺450 or €24 or Free or Contact for pricing)",
    "currency": "USD | EUR | GBP | TRY | etc.",
    "platform": "store/platform name (e.g. Amazon, eBay, official website, Booking.com)",
    "url": "the actual URL",
    "rating": "rating if visible (e.g. 4.5/5 or 4.2★) or null",
    "reviewCount": "number of reviews if visible or null",
    "savings": "discount amount or percentage if visible (e.g. Save $10 or -20%) or null",
    "isAlternative": false for direct matches, true for alternatives/similar products,
    "snippet": "1 sentence describing what makes this option notable"
  }
]

Rules:
- Include 3-6 direct matches and 2-4 alternatives
- Only include results that have a discernible price or clear product offering
- If a result has no price info, skip it
- Sort direct matches by price ascending (cheapest first)
- isAlternative = true means "similar product, different brand or version"
- Return an empty array [] if no useful price data found`

  try {
    const r = await fetch(GROQ_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL, temperature: 0.05, max_tokens: 1600,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!r.ok) return []
    const data    = await r.json()
    const rawText = data.choices?.[0]?.message?.content ?? '[]'
    const cleaned = rawText.replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'').trim()
    const parsed  = JSON.parse(cleaned)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ── AI summary ────────────────────────────────────────────────────────────────

async function generateAiSummary(
  query: string,
  results: PriceResult[],
  groqKey: string,
): Promise<string> {
  if (results.length === 0) return 'No price data found for this query.'

  const directMatches  = results.filter(r => !r.isAlternative)
  const alternatives   = results.filter(r => r.isAlternative)
  const cheapest       = directMatches[0]

  const resultsSummary = results.slice(0, 6)
    .map(r => `${r.platform}: ${r.price}${r.rating ? ` (${r.rating})` : ''}${r.isAlternative ? ' [alternative]' : ''}`)
    .join(', ')

  const prompt = `User searched for: "${query}"
Results found: ${resultsSummary}
Cheapest direct match: ${cheapest ? `${cheapest.platform} at ${cheapest.price}` : 'N/A'}
Alternatives count: ${alternatives.length}

Write a 2-sentence buying intelligence summary that:
1. States the best price found and where
2. Mentions the best alternative worth considering (if any)
Be specific, concise, and actionable. No fluff.`

  try {
    const r = await fetch(GROQ_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: GROQ_MODEL, temperature: 0.2, max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!r.ok) return ''
    const data = await r.json()
    return data.choices?.[0]?.message?.content?.trim() ?? ''
  } catch {
    return ''
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let query: string
  let category: string

  try {
    const body = await req.json()
    query    = String(body.query    ?? '').trim()
    category = String(body.category ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 })
  }

  const groqKey   = getGroqKey()
  const tavilyKey = getTavilyKey()

  if (!groqKey || !tavilyKey) {
    return NextResponse.json({ error: 'Search service not configured' }, { status: 503 })
  }

  // Build search queries based on category context
  const categoryHint = category ? ` ${category}` : ''
  const priceQuery   = `${query}${categoryHint} price buy cheapest online 2024`
  const altQuery     = `${query}${categoryHint} alternatives similar products best value`

  // Run both searches in parallel
  const [priceRaw, altRaw] = await Promise.all([
    tavilySearch(priceQuery, tavilyKey),
    tavilySearch(altQuery, tavilyKey),
  ])

  // Merge and deduplicate by URL
  const seen    = new Set<string>()
  const allRaw: Array<{ title: string; url: string; content: string; score: number }> = []
  for (const r of [...priceRaw, ...altRaw]) {
    if (!seen.has(r.url)) { seen.add(r.url); allRaw.push(r) }
  }

  if (allRaw.length === 0) {
    return NextResponse.json({
      results: [],
      aiSummary: 'No results found. Try a more specific product name.',
      cheapest: null,
    })
  }

  // Extract structured prices with Groq
  const results = await extractPricesWithGroq(query, allRaw, groqKey)

  const directMatches = results.filter(r => !r.isAlternative)
  const cheapest      = directMatches.length > 0 ? directMatches[0] : null

  const aiSummary = await generateAiSummary(query, results, groqKey)

  return NextResponse.json({ results, aiSummary, cheapest })
}
