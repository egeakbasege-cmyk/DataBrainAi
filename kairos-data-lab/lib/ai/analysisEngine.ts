import Anthropic from '@anthropic-ai/sdk'
import type {
  ShopifyRawData, AmazonRawData, AIAnalysis,
  Platform, SupplierEstimate,
} from '@/types'
import { estimateSupplierCosts } from '@/lib/workers/shopifyWorker'
import { z } from 'zod'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// ── Response schema (Zod) ─────────────────────────────────────────────────────

const VulnerabilitySchema = z.object({
  category:    z.string(),
  finding:     z.string(),
  severity:    z.enum(['HIGH', 'MEDIUM', 'LOW']),
  opportunity: z.string(),
})

const BattlePlanStepSchema = z.object({
  step:        z.number(),
  title:       z.string(),
  description: z.string(),
  timeframe:   z.string(),
  effort:      z.enum(['HIGH', 'MEDIUM', 'LOW']),
})

const AIAnalysisSchema = z.object({
  summary: z.string(),
  marketPositioning: z.object({
    strengths:      z.array(z.string()),
    weaknesses:     z.array(z.string()),
    pricePosition:  z.enum(['premium', 'mid-market', 'budget', 'unknown']),
    targetAudience: z.string(),
  }),
  vulnerabilities:     z.array(VulnerabilitySchema),
  actionableBattlePlan: z.array(BattlePlanStepSchema),
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

function buildShopifyPrompt(data: ShopifyRawData, supplierMatrix: SupplierEstimate[]): string {
  const topProductsSummary = data.topProducts.slice(0, 5).map(p => ({
    title:    p.title,
    price:    p.variants[0]?.price ?? 'unknown',
    variants: p.variants.length,
    tags:     p.tags?.split(',').slice(0, 5).join(', ') ?? '',
    updated:  p.updated_at,
  }))

  const tagList = Object.entries(data.tagFrequency).slice(0, 15).map(([t, c]) => `${t}(${c})`).join(', ')

  return `You are KAIROS — a world-class e-commerce intelligence analyst. Your task is to perform a deep competitive analysis of a Shopify store and produce a structured strategic intelligence report.

## STORE DATA
- Domain: ${data.storeDomain}
- Store Name: ${data.storeName}
- Total Products: ${data.totalProducts}
- Price Range: $${data.priceRange.min} – $${data.priceRange.max} (avg $${data.priceRange.avg})
- Top Tags: ${tagList}
- Scraped At: ${data.scrapedAt}

## TOP PRODUCTS (by variant depth & activity)
${JSON.stringify(topProductsSummary, null, 2)}

## SUPPLIER COST MATRIX (estimated)
${supplierMatrix.map(s => `- ${s.productTitle}: Retail $${s.retailPrice} | Est. Cost $${s.estimatedCost} | Margin ${s.grossMarginPct}%`).join('\n')}

## ANALYSIS INSTRUCTIONS
1. Identify the store's market positioning, target customer, and pricing strategy.
2. Find specific vulnerabilities: pricing gaps, product quality signals from tags, missing variants, stale inventory.
3. Generate a precise 5-step battle plan for a competitor wanting to enter this space and beat this store.
4. Identify 8-10 specific SEO keywords this store targets (infer from product names, tags, and store name) that a competitor could hijack.
5. Write a high-converting TikTok ad script that directly targets the store's weaknesses.
6. Score this competitor's overall threat level (0=no threat, 100=dominant market leader).

Return ONLY valid JSON matching the exact schema. No markdown, no extra text.`
}

function buildAmazonPrompt(data: AmazonRawData): string {
  const reviewSample = data.reviews.slice(0, 20).map(r =>
    `[${r.rating}★] "${r.title}": ${r.body.slice(0, 200)}`,
  ).join('\n')

  return `You are KAIROS — a world-class Amazon marketplace intelligence analyst. Analyse this Amazon product and produce a structured strategic report for a competitor wanting to build a better product.

## PRODUCT DATA
- ASIN: ${data.asin}
- Title: ${data.title}
- Brand: ${data.brand}
- Price: ${data.currency} ${data.price ?? 'N/A'}
- Rating: ${data.rating ?? 'N/A'}/5 (${data.reviewCount?.toLocaleString() ?? 'N/A'} reviews)
- Categories: ${data.categories.join(' > ')}

## BULLET POINTS (seller's claimed strengths)
${data.bulletPoints.slice(0, 6).map((b, i) => `${i + 1}. ${b}`).join('\n')}

## CUSTOMER REVIEWS (sample)
${reviewSample}

## ANALYSIS INSTRUCTIONS
1. Identify the product's market positioning and the customer persona buying it.
2. Mine the reviews to find: top 3 product flaws, top 3 feature requests, overall sentiment gaps. Be specific with quotes.
3. Generate a precise 5-step battle plan to launch a better product and capture this market.
4. Identify 8-10 specific Amazon/SEO keywords this product ranks for that a competitor should target.
5. Write a high-converting TikTok ad script that exposes the competitor's exact weaknesses as your product's advantages.
6. Score this competitor's overall threat level (0=no threat, 100=dominant market leader).

For supplierMatrix, estimate manufacturing costs at 12-20% of retail price for the main product.
Return ONLY valid JSON matching the exact schema. No markdown, no extra text.`
}

// ── Main engine ───────────────────────────────────────────────────────────────

export async function runAnalysisEngine(
  platform: Platform,
  rawData:  ShopifyRawData | AmazonRawData,
): Promise<AIAnalysis> {
  let supplierMatrix: SupplierEstimate[] = []
  let prompt: string

  if (platform === 'SHOPIFY') {
    const shopifyData  = rawData as ShopifyRawData
    supplierMatrix     = estimateSupplierCosts(shopifyData.products)
    prompt             = buildShopifyPrompt(shopifyData, supplierMatrix)
  } else {
    const amazonData = rawData as AmazonRawData
    const retailPrice = amazonData.price ?? 0
    supplierMatrix = [{
      productTitle:   amazonData.title,
      retailPrice,
      estimatedCost:  Math.round(retailPrice * 0.15 * 100) / 100,
      grossMargin:    Math.round(retailPrice * 0.85 * 100) / 100,
      grossMarginPct: 85,
    }]
    prompt = buildAmazonPrompt(amazonData)
  }

  const message = await client.messages.create({
    model:       'claude-opus-4-5',
    max_tokens:  4096,
    temperature: 0.3,
    messages: [
      { role: 'user', content: prompt },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // Parse and validate JSON
  let parsed: z.infer<typeof AIAnalysisSchema>
  try {
    // Strip markdown code blocks if present
    const jsonText = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    const raw = JSON.parse(jsonText)
    parsed = AIAnalysisSchema.parse(raw)
  } catch (err: any) {
    throw new Error(`AI returned invalid JSON: ${err.message}. Raw: ${text.slice(0, 500)}`)
  }

  return {
    ...parsed,
    supplierMatrix,
    generatedAt: new Date().toISOString(),
  }
}
