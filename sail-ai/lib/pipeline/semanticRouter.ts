/**
 * lib/pipeline/semanticRouter.ts — Layer 1: Semantic Router & Prompt Optimizer
 * ─────────────────────────────────────────────────────────────────────────────
 * Gatekeeper with zero-friction autonomy.
 *
 * Clarity Score = sum of five 0.2-point binary components:
 *   hasBusinessEntity + hasMetrics + hasGoal + hasIndustry + hasTimeframe
 *
 * If score < 0.8: autonomously infer and inject defaults.
 * NEVER ask the user a clarifying question.
 * Injected defaults are surfaced ONLY in the Layer 5 AnalysisScopePanel.
 *
 * No LLM call — pure deterministic heuristics. Latency: ~0ms.
 */

import type { OptimizedIntent, RevenueTier } from './types'

// ── Clarity Score detectors ───────────────────────────────────────────────────

const BUSINESS_ENTITY_RE =
  /\b([A-ZĞŞÇÖÜ][a-zğşçöü]+\s?){1,3}(inc|llc|ltd|a\.ş|şirketi|company|startup|brand|store|app|platform|business|firm|agency|ajans)\b|şirket(im|in|iniz)|işletme(m|n|niz)|marka(m|n|nız)|ürün(üm|ün|ünüz)|hizmet(im|in|iniz)|müşterilerim|ekibim/i

const METRIC_RE =
  /\b\d[\d.,]*\s*(k|m|b|tl|usd|eur|gbp|\$|€|£|%|kullanıcı|müşteri|satış|gelir|revenue|users?|customers?|sales?|conversion|churn|cac|ltv|arr|mrr|roas|cpm|cpc|roi|aov)\b/i

const GOAL_RE =
  /\b(artır(mak)?|azalt(mak)?|büyüt(mek)?|optimize et|iyileştir|geliştir|increase|decrease|grow|reduce|scale|launch|expand|improve|maximize|minimize|boost|cut|accelerate|achieve|reach|hit)\b/i

const INDUSTRY_RE =
  /\b(e-?ticaret|e-?commerce|saas|fintech|health(tech)?|edu(tech)?|retail|fashion|food|tech|software|hardware|real\s*estate|gayrimenkul|turizm|tourism|hospitality|manufacturing|imalat|lojistik|logistics|media|gaming|crypto|b2b|b2c|d2c|marketplace|agency|consulting|danışmanlık|freelance|sipariş|delivery|sigorta|insurance)\b/i

const TIMEFRAME_RE =
  /\b(\d+\s*(gün|ay|yıl|hafta|day|week|month|year|quarter)|(30|60|90|180|365)\s*(gün|day)?|(q[1-4]|first|second|third|fourth)\s*quarter|bu\s*(ay|yıl|çeyrek)|this\s*(month|year|quarter|week))\b/i

// ── Revenue signal → tier map ─────────────────────────────────────────────────

const REVENUE_SIGNALS: Array<[RegExp, RevenueTier]> = [
  [/\b(bootstrap|sıfırdan|ilk\s*ürün|pre.?revenue|0'dan|\$0|henüz\s*gelir\s*yok)\b/i, '$0–$10k'],
  [/\b(\$10k|\$15k|\$20k|\$25k|\$30k|\$40k|erken\s*aşama|early\s*stage|just\s*started)\b/i, '$10k–$50k'],
  [/\b(\$50k|\$60k|\$70k|\$80k|\$90k|küçük\s*işletme|small\s*business|smb)\b/i, '$50k–$100k'],
  [/\b(\$100k|\$150k|\$200k|orta\s*ölçekli|mid.?market|midsize|büyüyen|growing)\b/i, '$100k–$250k'],
  [/\b(\$250k|\$300k|\$400k|scaled|growth\s*stage|büyümüş|olgunlaşmış)\b/i, '$250k–$500k'],
  [/\b(\$500k|\$1m|\$2m|\$5m|enterprise|kurumsal|büyük\s*ölçekli|million|milyon)\b/i, '$500k+'],
]

// ── Industry inference map ────────────────────────────────────────────────────

const INDUSTRY_MAP: Array<[RegExp, string]> = [
  [/e-?ticaret|e-?commerce|online\s*(mağaza|satış|alışveriş)/i, 'E-Commerce & Retail'],
  [/\bsaas\b|yazılım\s*hizmet|software\s*as\s*a\s*service/i,    'B2B SaaS'],
  [/fintech|ödeme\s*sistem|payment|banking|finans\s*teknoloji/i, 'FinTech'],
  [/health(tech)?|sağlık|klinik|hastane|medikal|medical/i,       'HealthTech'],
  [/edtech|eğitim\s*teknoloji|education|öğrenme|kurs\s*platform/i,'EdTech'],
  [/lojistik|logistics|kargo|shipping|nakliye|teslimat/i,         'Logistics & Supply Chain'],
  [/turizm|tourism|otel|hotel|tatil\s*rezerv|travel/i,           'Travel & Hospitality'],
  [/gıda|food\s*delivery|restaurant|yemek\s*sipariş|catering/i,  'Food & Beverage'],
  [/gayrimenkul|real\s*estate|konut|kiralık\s*daire|emlak/i,     'Real Estate'],
  [/media|content\s*creat|içerik\s*üretim|yayıncılık/i,         'Media & Content'],
  [/\bgaming\b|oyun\s*geliştir|game\s*studio|mobile\s*game/i,   'Gaming'],
  [/danışmanlık|consulting|agency|ajans|freelance/i,              'Professional Services'],
  [/marketplace|pazar\s*yeri|çok\s*taraflı\s*platform/i,        'Marketplace Platform'],
  [/sigorta|insurance|finans\s*hizmet|wealth/i,                  'Financial Services'],
]

// ── Goal inference map ────────────────────────────────────────────────────────

const GOAL_MAP: Array<[RegExp, string]> = [
  [/müşteri\s*(kazan|edinim|bul)|customer\s*acqui|cac\s*düşür|lead\s*gen/i, 'Customer Acquisition'],
  [/retention|churn|kayıp\s*müşteri|müşteri\s*tut|sadakat|loyalty/i,        'Retention & Churn Reduction'],
  [/gelir\s*artır|revenue\s*grow|satış\s*artır|ciro|upsell|cross.?sell/i,  'Revenue Growth'],
  [/maliyet\s*azalt|cost\s*reduc|gider\s*düşür|verimlilik\s*artır/i,       'Cost Optimisation'],
  [/marka\s*bilinirlik|brand\s*awareness|tanınırlık|pazar\s*algı/i,        'Brand Building'],
  [/ürün\s*geliştir|product\s*dev|feature|roadmap|mvp|beta/i,              'Product Development'],
  [/pazar\s*pay|market\s*share|rekabet|genişleme|yeni\s*pazar/i,           'Market Expansion'],
  [/operasyon|süreç\s*iyileştir|process|verimlilik|automation|otomasyon/i,  'Operational Efficiency'],
  [/fon|funding|yatırım|investment|seri\s*[a-c]|series\s*[a-c]|angel/i,   'Fundraising & Investment'],
  [/ölçeklen|scale.?up|büyüme\s*stratej|growth\s*hack|viral/i,             'Scalable Growth'],
  [/konversiyon|conversion\s*rate|cvr|dönüşüm|checkout|funnel/i,           'Conversion Optimisation'],
]

// ── Audience inference ────────────────────────────────────────────────────────

const AUDIENCE_MAP: Array<[RegExp, string]> = [
  [/\bb2b\b|business.to.business|şirkete\s*satış|kurumsal\s*satış/i, 'B2B'],
  [/\bb2c\b|business.to.consumer|tüketici|bireysel\s*müşteri/i,     'B2C'],
  [/\bd2c\b|direct.to.consumer|kendi\s*kanalım/i,                    'D2C'],
  [/marketplace|çift\s*taraflı|two.sided|platform|pazar\s*yeri/i,   'Marketplace'],
]

// ── Timeframe inference ───────────────────────────────────────────────────────

function inferTimeframe(msg: string): string {
  if (/\b(1\s*hafta|1\s*week|7\s*gün|7\s*day)\b/i.test(msg))    return '1 week'
  if (/\b(30\s*(gün|day)|1\s*(ay|month)|bu\s*ay|this\s*month)\b/i.test(msg)) return '30 days'
  if (/\b(60\s*(gün|day)|2\s*(ay|month))\b/i.test(msg))         return '60 days'
  if (/\b(90\s*(gün|day)|3\s*(ay|month)|quarter|çeyrek)\b/i.test(msg)) return '90 days'
  if (/\b(180\s*(gün|day)|6\s*(ay|month)|yarı\s*yıl)\b/i.test(msg)) return '6 months'
  if (/\b(1\s*(yıl|year)|365\s*(gün|day)|bu\s*yıl)\b/i.test(msg)) return '1 year'
  return '90 days'  // sovereign planning-horizon default
}

// ── Generic pattern-map lookup ────────────────────────────────────────────────

function matchFirst<T>(
  msg: string,
  map: Array<[RegExp, T]>,
  fallback: T,
): T {
  for (const [re, val] of map) if (re.test(msg)) return val
  return fallback
}

// ── Clarity Score calculator ──────────────────────────────────────────────────

interface ClarityComponents {
  score:             number
  hasBusinessEntity: boolean
  hasMetrics:        boolean
  hasGoal:           boolean
  hasIndustry:       boolean
  hasTimeframe:      boolean
}

function calculateClarityScore(message: string): ClarityComponents {
  const hasBusinessEntity = BUSINESS_ENTITY_RE.test(message)
  const hasMetrics        = METRIC_RE.test(message)
  const hasGoal           = GOAL_RE.test(message)
  const hasIndustry       = INDUSTRY_RE.test(message)
  const hasTimeframe      = TIMEFRAME_RE.test(message)

  const score = (
    (hasBusinessEntity ? 0.2 : 0) +
    (hasMetrics        ? 0.2 : 0) +
    (hasGoal           ? 0.2 : 0) +
    (hasIndustry       ? 0.2 : 0) +
    (hasTimeframe      ? 0.2 : 0)
  )

  return { score, hasBusinessEntity, hasMetrics, hasGoal, hasIndustry, hasTimeframe }
}

// ── Prompt reconstructor ──────────────────────────────────────────────────────
// Silently appends context parameters to the prompt.
// User sees zero friction — parameters are only visible in AnalysisScopePanel.

function reconstructPrompt(
  original: string,
  defaults: Record<string, string>,
  c:        ClarityComponents,
): string {
  const ctx: string[] = []
  if (!c.hasIndustry)       ctx.push(`sector:${defaults.industry}`)
  if (!c.hasMetrics)        ctx.push(`revenue_tier:${defaults.revenueTier}`)
  if (!c.hasGoal)           ctx.push(`goal:${defaults.goal}`)
  if (!c.hasTimeframe)      ctx.push(`horizon:${defaults.timeframe}`)
  if (!c.hasBusinessEntity) ctx.push(`profile:${defaults.audience}_growth_stage`)

  if (ctx.length === 0) return original
  return `${original.trim()} [ctx: ${ctx.join(' | ')}]`
}

// ── Main export ───────────────────────────────────────────────────────────────

export function routeAndOptimize(
  message:      string,
  analysisMode: string,
): OptimizedIntent {
  const c = calculateClarityScore(message)

  const revenueTier       = matchFirst(message, REVENUE_SIGNALS, '$50k–$100k' as RevenueTier)
  const inferredIndustry  = matchFirst(message, INDUSTRY_MAP,    'B2B Technology')
  const inferredGoal      = matchFirst(message, GOAL_MAP,        'Revenue Growth')
  const inferredTimeframe = inferTimeframe(message)
  const inferredAudience  = matchFirst(message, AUDIENCE_MAP,    'B2B')

  // Build injected defaults — only for the missing components.
  // These are surfaced in AnalysisScopePanel so the user can see what was assumed.
  const injectedDefaults: Record<string, string> = {}
  if (!c.hasIndustry)       injectedDefaults['Industry']        = inferredIndustry
  if (!c.hasMetrics)        injectedDefaults['Revenue Tier']    = revenueTier
  if (!c.hasGoal)           injectedDefaults['Primary Goal']    = inferredGoal
  if (!c.hasTimeframe)      injectedDefaults['Time Horizon']    = inferredTimeframe
  if (!c.hasBusinessEntity) injectedDefaults['Business Profile']= `${inferredAudience} — growth stage`

  const optimizedPrompt = c.score < 0.8
    ? reconstructPrompt(message, injectedDefaults, c)
    : message.trim()

  return {
    originalMessage:   message,
    optimizedPrompt,
    clarityScore:      Math.round(c.score * 100) / 100,
    injectedDefaults,
    detectedDomain:    'Business & Market Intelligence',
    revenueTier,
    inferredIndustry,
    inferredGoal,
    inferredTimeframe,
    inferredAudience,
  }
}
