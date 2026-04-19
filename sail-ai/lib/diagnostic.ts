// ─── Types ────────────────────────────────────────────────────────────────────

export type Industry =
  | 'E-commerce'
  | 'SaaS / Software'
  | 'Agency / Consulting'
  | 'Retail'
  | 'Hospitality'
  | 'Professional Services'
  | 'Healthcare'
  | 'Other'

export type TeamSize   = 'Solo' | '2–5' | '6–20' | '21–50' | '50+'
export type RevenueRange = 'Under £25k' | '£25k – £100k' | '£100k – £500k' | '£500k – £1M' | 'Over £1M'
export type Obstacle  =
  | 'Lead Generation'
  | 'Cash Flow'
  | 'Operational Efficiency'
  | 'Customer Retention'
  | 'Team & Talent'
  | 'Product Quality'

export interface DiagnosticInput {
  industry:       Industry     | ''
  customIndustry: string       // populated when industry === 'Other'
  teamSize:       TeamSize     | ''
  revenue:        RevenueRange | ''
  margin:         number   // 0–50 (50 = 50%+)
  cashReserves:   number   // 0–12 (12 = 12+ months)
  obstacle:       Obstacle     | ''
}

export interface DiagnosticResult {
  score:         number
  grade:         'Critical' | 'At Risk' | 'Stable' | 'Healthy' | 'Thriving'
  gradeColor:    string
  marginInsight: string
  cashInsight:   string
  breakdown: {
    profitability: number  // /30
    liquidity:     number  // /25
    scale:         number  // /25
    resilience:    number  // /20
  }
  systemPrompt:  string
}

// ─── Benchmarks ───────────────────────────────────────────────────────────────

export const INDUSTRY_BENCHMARKS: Record<string, { low: number; high: number; label: string }> = {
  'E-commerce':            { low: 10, high: 15, label: 'global e-commerce standard' },
  'SaaS / Software':       { low: 15, high: 25, label: 'SaaS industry median' },
  'Agency / Consulting':   { low: 15, high: 20, label: 'agency sector benchmark' },
  'Retail':                { low:  3, high:  8, label: 'retail sector average' },
  'Hospitality':           { low:  5, high: 10, label: 'hospitality industry norm' },
  'Professional Services': { low: 20, high: 30, label: 'professional services benchmark' },
  'Healthcare':            { low: 10, high: 15, label: 'healthcare sector standard' },
  'Other':                 { low: 10, high: 15, label: 'cross-sector benchmark' },
}

const REVENUE_SCORES: Record<string, number> = {
  'Under £25k':     7,
  '£25k – £100k':  13,
  '£100k – £500k': 18,
  '£500k – £1M':   22,
  'Over £1M':      25,
}

const TEAM_RESILIENCE: Record<string, number> = {
  'Solo':  10,
  '2–5':   13,
  '6–20':  16,
  '21–50': 18,
  '50+':   20,
}

const OBSTACLE_PENALTIES: Record<string, number> = {
  'Cash Flow':              -10,
  'Lead Generation':         -6,
  'Customer Retention':      -6,
  'Operational Efficiency':  -4,
  'Team & Talent':           -4,
  'Product Quality':         -2,
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function calculateDiagnostic(data: DiagnosticInput): DiagnosticResult {
  const bench    = INDUSTRY_BENCHMARKS[data.industry || 'Other']
  const benchMid = (bench.low + bench.high) / 2

  // Profitability (0–30): margin relative to industry midpoint
  const profitability = Math.round(Math.min((data.margin / Math.max(benchMid, 1)) * 15, 30))

  // Liquidity (0–25): months of cash reserves, capped at 12
  const reserves  = Math.min(data.cashReserves, 12)
  const liquidity = Math.round((reserves / 12) * 25)

  // Scale (0–25): revenue tier
  const scale = REVENUE_SCORES[data.revenue] ?? 14

  // Resilience (0–20): team depth
  const resilience = TEAM_RESILIENCE[data.teamSize] ?? 13

  const raw     = profitability + liquidity + scale + resilience
  const penalty = OBSTACLE_PENALTIES[data.obstacle] ?? -4
  const score   = Math.max(1, Math.min(100, raw + penalty))

  const grade =
    score >= 80 ? 'Thriving' :
    score >= 65 ? 'Healthy'  :
    score >= 50 ? 'Stable'   :
    score >= 35 ? 'At Risk'  : 'Critical'

  const gradeColor =
    grade === 'Thriving' ? '#C9A96E' :
    grade === 'Healthy'  ? '#1A5276' :
    grade === 'Stable'   ? '#0C0C0E' :
    grade === 'At Risk'  ? '#B45309' : '#991B1B'

  const marginInsight =
    data.margin < bench.low
      ? `Your ${data.margin}% margin sits below the ${bench.label} of ${bench.low}–${bench.high}%. Closing this gap is typically the highest-leverage move available to you.`
      : data.margin <= bench.high
      ? `Your ${data.margin}% margin aligns with the ${bench.label} (${bench.low}–${bench.high}%). You're tracking with healthy sector peers.`
      : `Your ${data.margin}% margin exceeds the ${bench.label} (${bench.low}–${bench.high}%). This is a meaningful competitive advantage.`

  const cashInsight =
    data.cashReserves < 1
      ? 'Under one month of runway is a critical vulnerability. Any disruption threatens immediate continuity.'
      : data.cashReserves < 3
      ? `${data.cashReserves} months of reserves is dangerously thin. The globally recommended floor is 6 months minimum.`
      : data.cashReserves < 6
      ? `${data.cashReserves} months of reserves is workable, but below the recommended 6-month threshold.`
      : `${data.cashReserves >= 12 ? '12+' : data.cashReserves} months of reserves exceeds the 6-month benchmark — a strong liquidity signal.`

  return {
    score,
    grade,
    gradeColor,
    marginInsight,
    cashInsight,
    breakdown: { profitability, liquidity, scale, resilience },
    systemPrompt: buildSystemPrompt(data, score, grade, bench),
  }
}

function buildSystemPrompt(
  data: DiagnosticInput,
  score: number,
  grade: string,
  bench: { low: number; high: number; label: string },
): string {
  const reservesLabel = data.cashReserves >= 12 ? '12+ months' : `${data.cashReserves} month${data.cashReserves !== 1 ? 's' : ''}`
  const liquidityNote =
    data.cashReserves < 3
      ? 'Liquidity is a critical constraint — factor this into all recommendations and avoid capital-intensive strategies.'
      : data.cashReserves < 6
      ? 'Cash runway is moderate — note this when advising on investment or expansion decisions.'
      : 'The business has solid liquidity headroom.'

  const industryDisplay = data.industry === 'Other' && data.customIndustry?.trim()
    ? data.customIndustry.trim()
    : data.industry

  const constraintBlock = `PRIORITY CONSTRAINT: The user has identified "${data.obstacle}" as their primary business bottleneck.\nEvery strategy recommendation must address or account for this constraint first.\n\n`

  return `${constraintBlock}[DIAGNOSTIC PROFILE — Business Health Assessment]
Industry: ${industryDisplay}
Team size: ${data.teamSize}
Annual revenue: ${data.revenue}
Net profit margin: ${data.margin}%
Cash reserves: ${reservesLabel} of operating expenses
Primary bottleneck: ${data.obstacle}
Business Health Score: ${score}/100 (${grade})

Context: You are advising a ${data.teamSize}-person ${industryDisplay} business. Their net margin of ${data.margin}% should be benchmarked against the ${bench.label} of ${bench.low}–${bench.high}% when relevant. ${liquidityNote} Their declared primary bottleneck is "${data.obstacle}" — prioritise this in all strategy recommendations.

Instructions: Be specific and benchmark-referenced. Cite their actual metrics when making comparisons. Frame all tactics in the context of their stated bottleneck and industry norms. Avoid generic advice.
[END DIAGNOSTIC PROFILE]`
}

export const EMPTY_DIAGNOSTIC: DiagnosticInput = {
  industry:       '',
  customIndustry: '',
  teamSize:       '',
  revenue:        '',
  margin:         10,
  cashReserves:   3,
  obstacle:       '',
}
