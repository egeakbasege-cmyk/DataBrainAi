/**
 * /api/data-lab/analyze
 * ─────────────────────
 * Accepts: { query, connectorIds, mode }
 * Flow  : auth check → build mock platform context → Groq 70B synthesis → structured JSON
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth }                      from '@/auth'

// ── Groq config ───────────────────────────────────────────────────────────────

const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

function getGroqKey(): string | undefined {
  return (
    process.env.GROQ_API_KEY     ??
    process.env.GROQ_API_KEY_1   ??
    process.env.GROQ_API_KEY_2   ??
    process.env.GROQ_API_KEY_3
  )
}

// ── Mock platform datasets ────────────────────────────────────────────────────

const PLATFORM_DATA: Record<string, object> = {
  'shopify-store': {
    platform: 'Shopify',
    period: 'Last 30 days',
    revenue_usd: 84250,
    orders: 1240,
    avg_order_value_usd: 67.94,
    conversion_rate_pct: 2.4,
    cart_abandonment_pct: 68.2,
    returns: 87,
    return_rate_pct: 7.0,
    new_customers: 412,
    returning_customers: 828,
    repeat_purchase_rate_pct: 33.5,
    top_products: [
      { name: 'Wireless Earbuds Pro', units: 284, revenue_usd: 28400, return_rate_pct: 4.2 },
      { name: 'Ergonomic Desk Stand', units: 196, revenue_usd: 15680, return_rate_pct: 2.1 },
      { name: 'Smart Water Bottle',   units: 310, revenue_usd: 12400, return_rate_pct: 12.3 },
    ],
    return_reasons: [
      { reason: 'Product not as described', count: 31, share_pct: 35.6 },
      { reason: 'Quality issues',           count: 24, share_pct: 27.6 },
      { reason: 'Wrong size / fit',         count: 18, share_pct: 20.7 },
      { reason: 'Changed mind',             count: 14, share_pct: 16.1 },
    ],
    traffic_sources: [
      { source: 'Organic Search', sessions: 4200, cvr_pct: 3.1 },
      { source: 'Paid Social',    sessions: 2800, cvr_pct: 1.8 },
      { source: 'Email',          sessions: 1600, cvr_pct: 4.2 },
      { source: 'Direct',         sessions: 1200, cvr_pct: 3.8 },
    ],
    industry_benchmarks: {
      avg_conversion_rate_pct: 2.2,
      avg_return_rate_pct:     5.5,
      avg_cart_abandonment_pct: 69.8,
      avg_order_value_usd:     58.20,
    },
  },

  'amazon-product-price': {
    platform: 'Amazon Seller Central',
    period: 'Last 30 days',
    total_revenue_usd: 126400,
    units_sold: 1890,
    active_asins: 42,
    buy_box_win_rate_pct: 71,
    avg_bsr: 8420,
    avg_review_score: 4.3,
    new_reviews: 28,
    return_rate_pct: 6.8,
    ad_spend_usd: 8200,
    acos_pct: 18.4,
    tacos_pct: 6.5,
    top_asins: [
      { name: 'Wireless Earbuds Pro',  bsr: 1240,  buy_box: true,  monthly_rev_usd: 42000 },
      { name: 'Kitchen Smart Scale',    bsr: 3110,  buy_box: true,  monthly_rev_usd: 28400 },
      { name: 'Premium Yoga Mat',       bsr: 5890,  buy_box: false, monthly_rev_usd: 19200 },
    ],
    buy_box_loss_reasons: [
      { reason: 'Price undercut by competitor', share_pct: 42 },
      { reason: 'FBM vs FBA fulfillment gap',   share_pct: 31 },
      { reason: 'Seller rating below threshold', share_pct: 27 },
    ],
    industry_benchmarks: {
      avg_acos_pct:        22.0,
      avg_return_rate_pct:  8.2,
      avg_buy_box_rate_pct: 65.0,
    },
  },

  'tiktok-ads': {
    platform: 'TikTok for Business',
    period: 'Last 30 days',
    total_spend_usd: 4200,
    impressions: 2400000,
    clicks: 43200,
    ctr_pct: 1.8,
    cpm_usd: 1.75,
    cpc_usd: 0.097,
    conversions: 756,
    roas: 3.2,
    revenue_attributed_usd: 13440,
    top_creatives: [
      { name: 'Unboxing Hook v3',   ctr_pct: 3.1, roas: 4.8, spend_usd: 1200 },
      { name: 'UGC Review Cut',     ctr_pct: 2.4, roas: 3.9, spend_usd: 900  },
      { name: 'Product Demo 15s',   ctr_pct: 1.2, roas: 2.1, spend_usd: 600  },
    ],
    top_audiences: [
      { segment: 'F 18-24', ctr_pct: 2.4, roas: 4.1 },
      { segment: 'F 25-34', ctr_pct: 1.9, roas: 3.8 },
      { segment: 'M 18-24', ctr_pct: 1.1, roas: 2.2 },
    ],
    industry_benchmarks: {
      avg_ctr_pct:       1.2,
      avg_roas_ecomm:    2.8,
      avg_cpm_usd:       2.10,
    },
  },

  'meta-ads': {
    platform: 'Meta Ads Manager',
    period: 'Last 30 days',
    total_spend_usd: 6800,
    impressions: 1800000,
    clicks: 19800,
    ctr_pct: 1.1,
    cpm_usd: 14.30,
    cpc_usd: 0.34,
    roas: 4.1,
    revenue_attributed_usd: 27880,
    frequency: 2.8,
    top_campaigns: [
      { name: 'Retargeting — Cart Abandoners', roas: 8.2, spend_usd: 1400 },
      { name: 'Lookalike — Top 1% Customers',  roas: 5.1, spend_usd: 2200 },
      { name: 'Cold — Interest Targeting',     roas: 2.4, spend_usd: 3200 },
    ],
    industry_benchmarks: {
      avg_cpm_usd:    12.40,
      avg_ctr_pct:     0.9,
      avg_roas_ecomm:  3.5,
    },
  },

  'google-trends': {
    platform: 'Google Trends',
    period: 'Last 30 days',
    rising_queries: ['wireless earbuds waterproof', 'best desk accessories 2026', 'AI home office setup'],
    breakout_terms: [
      { term: 'AI desk setup',                   growth_pct: 560 },
      { term: 'noise cancelling earbuds under $100', growth_pct: 380 },
    ],
    category_indices: {
      'Consumer Electronics': { index: 84, trend: 'rising'   },
      'Home Office':          { index: 91, trend: 'rising'   },
      'Fitness Equipment':    { index: 62, trend: 'declining' },
    },
  },

  'ebay-product-price': {
    platform: 'eBay Marketplace',
    period: 'Last 30 days',
    avg_sell_price_usd: 47.20,
    sell_through_rate_pct: 68,
    active_listings: 312,
    avg_time_to_sell_days: 4.2,
    top_categories: [
      { name: 'Electronics',    avg_price_usd: 89.50, yoy_change_pct: 4.2  },
      { name: 'Collectibles',   avg_price_usd: 34.10, yoy_change_pct: 11.8 },
      { name: 'Sporting Goods', avg_price_usd: 55.60, yoy_change_pct: 6.3  },
    ],
  },

  'etsy-marketplace': {
    platform: 'Etsy',
    period: 'Last 30 days',
    avg_order_value_usd: 38.70,
    shop_views_per_day: 1240,
    conversion_rate_pct: 3.1,
    fav_rate_pct: 8.4,
    trending_searches: ['Personalized Gifts', 'Boho Wall Art', 'Vintage Jewelry'],
  },

  'walmart-marketplace': {
    platform: 'Walmart Seller Center',
    period: 'Last 30 days',
    price_competitiveness_pct: 91,
    in_stock_rate_pct: 96.4,
    avg_margin_pct: 18.2,
    fulfillment_score: 4.7,
  },

  'aliexpress-sourcing': {
    platform: 'AliExpress',
    period: 'Last 30 days',
    avg_sourcing_cost_usd: 8.40,
    avg_shipping_days: 9.2,
    supplier_score: 4.6,
    avg_moq_units: 50,
    hot_categories: ['Smart Home Devices', 'Pet Accessories', 'Phone Accessories'],
  },

  'pinterest-shopping': {
    platform: 'Pinterest',
    period: 'Last 30 days',
    monthly_impressions: 8200000,
    save_rate_pct: 4.7,
    outbound_ctr_pct: 0.68,
    avg_cpc_usd: 0.34,
    trending_boards: ['Quiet Luxury', 'Summer Wedding Decor', 'Coastal Grandmother'],
  },

  'youtube-creator': {
    platform: 'YouTube Analytics',
    period: 'Last 30 days',
    avg_cpv_usd: 0.028,
    avg_watch_time_seconds: 402,
    subscribe_rate_pct: 2.1,
    avg_cpm_usd: 4.80,
    top_categories_by_cpm: [
      { category: 'Personal Finance', cpm_usd: 18.40 },
      { category: 'Tech Reviews',     cpm_usd: 12.70 },
    ],
  },

  'spotify-creator': {
    platform: 'Spotify for Artists',
    period: 'Last 30 days',
    avg_stream_rate_usd: 0.004,
    editorial_save_rate_pct: 12.4,
    playlist_add_rate_pct: 6.2,
    listener_retention_pct: 38,
    trending_genres: ['Afrobeats', 'Phonk', 'Indie Pop'],
  },

  'poshmark-resale': {
    platform: 'Poshmark',
    period: 'Last 30 days',
    avg_resale_margin_pct: 62,
    avg_days_to_sell: 11.2,
    avg_sale_price_usd: 38.40,
    offer_accept_rate_pct: 44,
    top_brands: ['Lululemon', 'Nike / Jordan', 'Free People'],
  },

  'real-estate': {
    platform: 'Real Estate Data (Zillow + NAR)',
    period: 'Last 30 days',
    median_home_price_usd: 412000,
    days_on_market: 28.4,
    price_cut_rate_pct: 18.2,
    mortgage_rate_pct: 6.72,
    top_markets: ['Austin TX (+8.4%)', 'Nashville TN (+6.9%)', 'Phoenix AZ (+5.2%)'],
  },
}

// ── System prompts per mode ───────────────────────────────────────────────────

const MODE_PROMPTS: Record<string, string> = {
  upwind: `You are a Senior Partner at a top-tier strategy consultancy (McKinsey / BCG tier).
You are given real platform data from a client's connected business accounts.
Produce a concise, data-driven executive intelligence report.
Every insight must be grounded in the provided data. Every recommendation must be specific, measurable, and time-bound.
Tone: authoritative, precise, zero fluff.`,

  sail: `You are SAIL Intelligence — an adaptive AI market analyst.
Given real platform data, answer the user's business query with sharp, data-grounded analysis.
Balance analytical depth with clarity. Use the data as your evidence base.
Surface non-obvious insights. Prioritise impact over comprehensiveness.`,

  operator: `You are an Operator — a hyper-tactical business execution specialist.
Given platform data, your job is to produce an immediately actionable plan.
Every action step must be executable TODAY or THIS WEEK.
Be surgical: skip theory, go straight to what moves the needle.
Priority: critical actions first. Revenue impact drives order.`,
}

// ── JSON schema instruction ───────────────────────────────────────────────────

const SCHEMA_INSTRUCTION = `
Return ONLY a valid JSON object matching this exact schema (no markdown, no explanation):
{
  "headline": "One powerful sentence — the single most important finding from the data",
  "executiveSummary": "2-3 sentences of data-grounded executive context",
  "keyMetrics": [
    {
      "label": "metric name",
      "value": "current value with unit",
      "change": "+/- vs benchmark or prior period",
      "trend": "up | down | neutral",
      "context": "one sentence explaining why this matters"
    }
  ],
  "actionSteps": [
    {
      "priority": "critical | high | medium",
      "step": "specific action to take",
      "rationale": "data point that justifies this action",
      "timeline": "specific timeframe (e.g. Week 1, Days 1-3)",
      "expectedImpact": "quantified expected outcome"
    }
  ],
  "insights": [
    {
      "category": "category label",
      "finding": "specific finding from the data",
      "dataPoint": "exact number or metric cited",
      "implication": "what this means for the business"
    }
  ],
  "riskFlags": [
    {
      "severity": "high | medium | low",
      "risk": "specific risk identified in the data",
      "mitigation": "concrete mitigation step"
    }
  ],
  "dataSources": ["list of platforms data was drawn from"],
  "confidenceScore": 85
}

Rules:
- keyMetrics: 4-6 items
- actionSteps: 3-5 items, ordered by priority (critical first)
- insights: 3-4 items
- riskFlags: 2-3 items
- All numbers must come from the provided data
- confidenceScore: 0-100 integer reflecting data quality and coverage
`

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Auth guard
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse body
  let query: string, connectorIds: string[], mode: string
  try {
    const body = await req.json()
    query        = String(body.query        ?? '').trim()
    connectorIds = Array.isArray(body.connectorIds) ? body.connectorIds : []
    mode         = String(body.mode ?? 'sail')
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!query) {
    return NextResponse.json({ error: 'Query is required' }, { status: 400 })
  }

  // 3. Build platform data context
  const activePlatforms = connectorIds
    .filter(id => PLATFORM_DATA[id])
    .map(id => ({
      id,
      data: PLATFORM_DATA[id],
    }))

  if (activePlatforms.length === 0) {
    return NextResponse.json({ error: 'No active connectors with available data' }, { status: 400 })
  }

  const dataContext = activePlatforms
    .map(p => `=== ${(p.data as any).platform ?? p.id} ===\n${JSON.stringify(p.data, null, 2)}`)
    .join('\n\n')

  // 4. Check Groq key
  const groqKey = getGroqKey()
  if (!groqKey) {
    return NextResponse.json({ error: 'Groq API key not configured' }, { status: 503 })
  }

  // 5. Build prompt
  const systemPrompt = (MODE_PROMPTS[mode] ?? MODE_PROMPTS.sail) + '\n\n' + SCHEMA_INSTRUCTION
  const userMessage  = `USER QUERY: ${query}\n\nPLATFORM DATA:\n${dataContext}`

  // 6. Call Groq
  let rawText: string
  try {
    const groqRes = await fetch(GROQ_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        temperature: 0.12,
        max_tokens:  3000,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage  },
        ],
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text().catch(() => 'unknown')
      console.error('[data-lab/analyze] Groq error:', err)
      return NextResponse.json({ error: 'AI synthesis failed. Try again.' }, { status: 502 })
    }

    const groqData = await groqRes.json()
    rawText = groqData.choices?.[0]?.message?.content ?? ''
  } catch (e: any) {
    console.error('[data-lab/analyze] Fetch error:', e.message)
    return NextResponse.json({ error: 'Network error reaching AI service' }, { status: 502 })
  }

  // 7. Parse JSON from response (handle code fences)
  let result: object
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/,      '')
      .replace(/```\s*$/,      '')
      .trim()
    result = JSON.parse(cleaned)
  } catch {
    // Fallback: try to extract JSON object with regex
    const match = rawText.match(/\{[\s\S]+\}/)
    if (match) {
      try {
        result = JSON.parse(match[0])
      } catch {
        return NextResponse.json({ error: 'Failed to parse AI response. Please retry.' }, { status: 502 })
      }
    } else {
      return NextResponse.json({ error: 'AI returned unexpected format. Please retry.' }, { status: 502 })
    }
  }

  return NextResponse.json({ success: true, analysis: result })
}
