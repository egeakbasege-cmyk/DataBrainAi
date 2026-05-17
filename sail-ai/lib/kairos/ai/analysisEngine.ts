import { z } from 'zod'
import type { ShopifyRawData, AmazonRawData, KairosAIAnalysis, KairosPlatform, SupplierEstimate } from '../types'
import { estimateSupplierCosts } from '../workers/shopifyWorker'

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

// ── Groq fetch with key rotation (mirrors Sail AI pattern) ───────────────────

function getGroqKeys(): string[] {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
  ].filter(Boolean) as string[]
}

async function groqComplete(systemPrompt: string, userPrompt: string): Promise<string> {
  const keys = getGroqKeys()
  if (keys.length === 0) throw new Error('No GROQ_API_KEY configured')

  const body = JSON.stringify({
    model:       GROQ_MODEL,
    temperature: 0.3,
    max_tokens:  4096,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
  })

  let lastError = ''
  for (const key of keys) {
    const res = await fetch(GROQ_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body,
    })
    if (res.status === 429) { lastError = '429'; continue }
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Groq error ${res.status}: ${err.slice(0, 200)}`)
    }
    const data = await res.json() as any
    return data.choices?.[0]?.message?.content ?? ''
  }
  throw new Error(`All Groq keys rate-limited: ${lastError}`)
}

// ── Zod validation schema ─────────────────────────────────────────────────────

const AIAnalysisSchema = z.object({
  summary: z.string(),
  marketPositioning: z.object({
    strengths:      z.array(z.string()),
    weaknesses:     z.array(z.string()),
    pricePosition:  z.enum(['premium', 'mid-market', 'budget', 'unknown']),
    targetAudience: z.string(),
  }),
  vulnerabilities: z.array(z.object({
    category:    z.string(),
    finding:     z.string(),
    severity:    z.enum(['HIGH', 'MEDIUM', 'LOW']),
    opportunity: z.string(),
  })),
  actionableBattlePlan: z.array(z.object({
    step:        z.number(),
    title:       z.string(),
    description: z.string(),
    timeframe:   z.string(),
    effort:      z.enum(['HIGH', 'MEDIUM', 'LOW']),
  })),
  seoKeywordsToTarget: z.array(z.string()),
  adCreativeScript: z.object({
    platform: z.enum(['TikTok', 'Instagram', 'YouTube Shorts']),
    hook:     z.string(),
    script:   z.string(),
    cta:      z.string(),
  }),
  competitorScore: z.number().min(0).max(100),
})

// ── Prompt builders ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are KAIROS — a world-class e-commerce intelligence analyst. You respond ONLY with valid JSON. No markdown fences, no extra text, no explanations — raw JSON only.`

function buildShopifyPrompt(data: ShopifyRawData, supplierMatrix: SupplierEstimate[]): string {
  const topProductsSummary = data.topProducts.slice(0, 5).map(p => ({
    title:    p.title,
    price:    p.variants[0]?.price ?? 'unknown',
    variants: p.variants.length,
    tags:     p.tags?.split(',').slice(0, 5).join(', ') ?? '',
  }))
  const tagList = Object.entries(data.tagFrequency).slice(0, 15).map(([t, c]) => `${t}(${c})`).join(', ')

  return `Perform a deep competitive analysis of this Shopify store and return the result as a single JSON object.

## STORE DATA
- Domain: ${data.storeDomain}
- Store Name: ${data.storeName}
- Total Products: ${data.totalProducts}
- Price Range: $${data.priceRange.min} – $${data.priceRange.max} (avg $${data.priceRange.avg})
- Top Tags: ${tagList}

## TOP PRODUCTS
${JSON.stringify(topProductsSummary, null, 2)}

## SUPPLIER COST MATRIX
${supplierMatrix.map(s => `- ${s.productTitle}: Retail $${s.retailPrice} | Est. Cost $${s.estimatedCost} | Margin ${s.grossMarginPct}%`).join('\n')}

## REQUIRED JSON SCHEMA
{
  "summary": "2-3 sentence executive summary",
  "marketPositioning": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "pricePosition": "premium|mid-market|budget|unknown",
    "targetAudience": "..."
  },
  "vulnerabilities": [
    { "category": "...", "finding": "...", "severity": "HIGH|MEDIUM|LOW", "opportunity": "..." }
  ],
  "actionableBattlePlan": [
    { "step": 1, "title": "...", "description": "...", "timeframe": "Week 1-2", "effort": "HIGH|MEDIUM|LOW" }
  ],
  "seoKeywordsToTarget": ["keyword1", "keyword2"],
  "adCreativeScript": {
    "platform": "TikTok|Instagram|YouTube Shorts",
    "hook": "...",
    "script": "...",
    "cta": "..."
  },
  "competitorScore": 0
}

Instructions:
1. Identify market positioning, target customer, pricing strategy.
2. Find 3-5 specific vulnerabilities: pricing gaps, missing variants, stale inventory.
3. Generate exactly 5 battle plan steps.
4. List 8-10 SEO keywords.
5. Write a high-converting TikTok ad script targeting weaknesses.
6. Score threat level 0-100.`
}

function buildAmazonPrompt(data: AmazonRawData): string {
  const reviewSample = data.reviews.slice(0, 15)
    .map(r => `[${r.rating}★] "${r.title}": ${r.body.slice(0, 150)}`)
    .join('\n')

  return `Analyse this Amazon product and return the result as a single JSON object.

## PRODUCT DATA
- ASIN: ${data.asin}
- Title: ${data.title}
- Brand: ${data.brand}
- Price: ${data.currency} ${data.price ?? 'N/A'}
- Rating: ${data.rating ?? 'N/A'}/5 (${data.reviewCount?.toLocaleString() ?? 'N/A'} reviews)
- Categories: ${data.categories.join(' > ')}

## BULLET POINTS
${data.bulletPoints.slice(0, 6).map((b, i) => `${i + 1}. ${b}`).join('\n')}

## CUSTOMER REVIEWS
${reviewSample}

## REQUIRED JSON SCHEMA
{
  "summary": "2-3 sentence executive summary",
  "marketPositioning": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "pricePosition": "premium|mid-market|budget|unknown",
    "targetAudience": "..."
  },
  "vulnerabilities": [
    { "category": "...", "finding": "...", "severity": "HIGH|MEDIUM|LOW", "opportunity": "..." }
  ],
  "actionableBattlePlan": [
    { "step": 1, "title": "...", "description": "...", "timeframe": "Week 1-2", "effort": "HIGH|MEDIUM|LOW" }
  ],
  "seoKeywordsToTarget": ["keyword1", "keyword2"],
  "adCreativeScript": {
    "platform": "TikTok|Instagram|YouTube Shorts",
    "hook": "...",
    "script": "...",
    "cta": "..."
  },
  "competitorScore": 0
}

Instructions:
1. Identify market positioning and customer persona.
2. Mine reviews for top 3 flaws, top 3 feature requests, sentiment gaps.
3. Generate exactly 5 battle plan steps.
4. List 8-10 Amazon/SEO keywords.
5. Write a TikTok ad script exposing competitor weaknesses.
6. Score threat level 0-100.
7. For supplierMatrix (outside schema, included separately), costs are 12-20% of retail.`
}

// ── Main engine ───────────────────────────────────────────────────────────────

export async function runAnalysisEngine(
  platform: KairosPlatform,
  rawData:  ShopifyRawData | AmazonRawData,
): Promise<KairosAIAnalysis> {
  let supplierMatrix: SupplierEstimate[] = []
  let userPrompt: string

  if (platform === 'SHOPIFY') {
    const shopifyData = rawData as ShopifyRawData
    supplierMatrix    = estimateSupplierCosts(shopifyData.products)
    userPrompt        = buildShopifyPrompt(shopifyData, supplierMatrix)
  } else {
    const amazonData  = rawData as AmazonRawData
    const retailPrice = amazonData.price ?? 0
    supplierMatrix    = [{
      productTitle:   amazonData.title,
      retailPrice,
      estimatedCost:  Math.round(retailPrice * 0.15 * 100) / 100,
      grossMargin:    Math.round(retailPrice * 0.85 * 100) / 100,
      grossMarginPct: 85,
    }]
    userPrompt = buildAmazonPrompt(amazonData)
  }

  const text = await groqComplete(SYSTEM_PROMPT, userPrompt)

  let parsed: z.infer<typeof AIAnalysisSchema>
  try {
    // Strip any accidental markdown fences
    const jsonText = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    parsed = AIAnalysisSchema.parse(JSON.parse(jsonText))
  } catch (err: any) {
    throw new Error(`Groq returned invalid JSON: ${err.message}. Raw: ${text.slice(0, 500)}`)
  }

  return { ...parsed, supplierMatrix, generatedAt: new Date().toISOString() }
}
