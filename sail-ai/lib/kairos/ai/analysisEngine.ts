import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import type { ShopifyRawData, AmazonRawData, KairosAIAnalysis, KairosPlatform, SupplierEstimate } from '../types'
import { estimateSupplierCosts } from '../workers/shopifyWorker'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

function buildShopifyPrompt(data: ShopifyRawData, supplierMatrix: SupplierEstimate[]): string {
  const topProductsSummary = data.topProducts.slice(0, 5).map(p => ({
    title:    p.title,
    price:    p.variants[0]?.price ?? 'unknown',
    variants: p.variants.length,
    tags:     p.tags?.split(',').slice(0, 5).join(', ') ?? '',
  }))
  const tagList = Object.entries(data.tagFrequency).slice(0, 15).map(([t, c]) => `${t}(${c})`).join(', ')

  return `You are KAIROS — a world-class e-commerce intelligence analyst. Perform a deep competitive analysis of this Shopify store.

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

## INSTRUCTIONS
1. Identify market positioning, target customer, and pricing strategy.
2. Find specific vulnerabilities: pricing gaps, missing variants, stale inventory.
3. Generate a precise 5-step battle plan for a competitor to beat this store.
4. Identify 8-10 SEO keywords this store targets that a competitor could hijack.
5. Write a high-converting TikTok ad script targeting the store's weaknesses.
6. Score this competitor's threat level (0–100).

Return ONLY valid JSON. No markdown, no extra text.`
}

function buildAmazonPrompt(data: AmazonRawData): string {
  const reviewSample = data.reviews.slice(0, 20)
    .map(r => `[${r.rating}★] "${r.title}": ${r.body.slice(0, 200)}`)
    .join('\n')

  return `You are KAIROS — a world-class Amazon marketplace intelligence analyst.

## PRODUCT DATA
- ASIN: ${data.asin}
- Title: ${data.title}
- Brand: ${data.brand}
- Price: ${data.currency} ${data.price ?? 'N/A'}
- Rating: ${data.rating ?? 'N/A'}/5 (${data.reviewCount?.toLocaleString() ?? 'N/A'} reviews)
- Categories: ${data.categories.join(' > ')}

## BULLET POINTS
${data.bulletPoints.slice(0, 6).map((b, i) => `${i + 1}. ${b}`).join('\n')}

## CUSTOMER REVIEWS (sample)
${reviewSample}

## INSTRUCTIONS
1. Identify market positioning and customer persona.
2. Mine reviews for: top 3 product flaws, top 3 feature requests, sentiment gaps.
3. Generate a precise 5-step battle plan to launch a better product.
4. Identify 8-10 Amazon/SEO keywords to target.
5. Write a TikTok ad script exposing the competitor's weaknesses.
6. Score this competitor's threat level (0–100).

For supplierMatrix, estimate manufacturing costs at 12-20% of retail.
Return ONLY valid JSON. No markdown, no extra text.`
}

// ── Main engine ───────────────────────────────────────────────────────────────

export async function runAnalysisEngine(
  platform: KairosPlatform,
  rawData:  ShopifyRawData | AmazonRawData,
): Promise<KairosAIAnalysis> {
  let supplierMatrix: SupplierEstimate[] = []
  let prompt: string

  if (platform === 'SHOPIFY') {
    const shopifyData = rawData as ShopifyRawData
    supplierMatrix    = estimateSupplierCosts(shopifyData.products)
    prompt            = buildShopifyPrompt(shopifyData, supplierMatrix)
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
    prompt = buildAmazonPrompt(amazonData)
  }

  const message = await client.messages.create({
    model:       'claude-opus-4-5',
    max_tokens:  4096,
    temperature: 0.3,
    messages:    [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  let parsed: z.infer<typeof AIAnalysisSchema>
  try {
    const jsonText = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim()
    parsed = AIAnalysisSchema.parse(JSON.parse(jsonText))
  } catch (err: any) {
    throw new Error(`AI returned invalid JSON: ${err.message}. Raw: ${text.slice(0, 500)}`)
  }

  return { ...parsed, supplierMatrix, generatedAt: new Date().toISOString() }
}
