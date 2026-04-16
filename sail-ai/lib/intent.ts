/**
 * SAIL AI v2.1 — Intent Classifier
 *
 * Bilingual (TR/EN) fuzzy-match classifier that routes queries to one of
 * three cognitive intents:
 *   - creative   → expansive, narrative, visionary output
 *   - technical  → precise, code-heavy, structured output
 *   - analytic   → benchmark-driven, data-dense, charted output
 *
 * Used exclusively by the SAIL (auto-intent) analysis mode.
 */

export type SailIntent = 'creative' | 'technical' | 'analytic'

export interface IntentResult {
  intent:     SailIntent
  confidence: number  // 0–1
  signals:    string[]
}

// ── Weighted pattern catalogue ─────────────────────────────────────────────────

interface Pattern {
  re:     RegExp
  weight: number
  signal: string
}

const CREATIVE_PATTERNS: Pattern[] = [
  // English
  { re: /\bvision\b/i,          weight: 3, signal: 'vision' },
  { re: /\bbrand(ing)?\b/i,     weight: 3, signal: 'branding' },
  { re: /\bstorytell/i,         weight: 3, signal: 'storytelling' },
  { re: /\bnarrati/i,           weight: 2, signal: 'narrative' },
  { re: /\bpositionin/i,        weight: 3, signal: 'positioning' },
  { re: /\bcreat(ive|ivity)\b/i,weight: 2, signal: 'creativity' },
  { re: /\binspir/i,            weight: 2, signal: 'inspiration' },
  { re: /\bmission\b/i,         weight: 2, signal: 'mission' },
  { re: /\bpurpose\b/i,         weight: 2, signal: 'purpose' },
  { re: /\bcultur/i,            weight: 2, signal: 'culture' },
  { re: /\bidentit/i,           weight: 2, signal: 'identity' },
  { re: /\bdifferentiat/i,      weight: 3, signal: 'differentiation' },
  { re: /\bpitch\b/i,           weight: 2, signal: 'pitch' },
  { re: /\bstory\b/i,           weight: 2, signal: 'story' },
  { re: /\bdesign\b/i,          weight: 1, signal: 'design' },
  { re: /\bideate|ideation/i,   weight: 3, signal: 'ideation' },
  { re: /\binnovat/i,           weight: 2, signal: 'innovation' },
  // Turkish equivalents
  { re: /\bvizy[oi]n/i,         weight: 3, signal: 'vizyon' },
  { re: /\bmarka\b/i,           weight: 3, signal: 'marka' },
  { re: /\bhikayelend/i,        weight: 3, signal: 'hikaye' },
  { re: /\bkonumland/i,         weight: 3, signal: 'konumlandırma' },
  { re: /\byaratıcı/i,          weight: 2, signal: 'yaratıcılık' },
  { re: /\bilham/i,             weight: 2, signal: 'ilham' },
  { re: /\bkültür\b/i,          weight: 2, signal: 'kültür' },
  { re: /\bamaç\b/i,            weight: 2, signal: 'amaç' },
  { re: /\bkimlik\b/i,          weight: 2, signal: 'kimlik' },
  { re: /\bfark/i,              weight: 2, signal: 'farklılaştırma' },
]

const TECHNICAL_PATTERNS: Pattern[] = [
  // English
  { re: /\bapi\b/i,             weight: 3, signal: 'api' },
  { re: /\bcode\b/i,            weight: 2, signal: 'code' },
  { re: /\barchitect/i,         weight: 3, signal: 'architecture' },
  { re: /\bsql\b/i,             weight: 3, signal: 'sql' },
  { re: /\bdeploy/i,            weight: 3, signal: 'deployment' },
  { re: /\binfrastructure\b/i,  weight: 3, signal: 'infrastructure' },
  { re: /\bautomati/i,          weight: 2, signal: 'automation' },
  { re: /\bintegrat/i,          weight: 2, signal: 'integration' },
  { re: /\bstack\b/i,           weight: 2, signal: 'stack' },
  { re: /\bdevops\b/i,          weight: 3, signal: 'devops' },
  { re: /\bsecurit/i,           weight: 2, signal: 'security' },
  { re: /\bperformanc/i,        weight: 2, signal: 'performance' },
  { re: /\bscalab/i,            weight: 2, signal: 'scalability' },
  { re: /\bdatabas/i,           weight: 2, signal: 'database' },
  { re: /\bwebhook\b/i,         weight: 3, signal: 'webhook' },
  { re: /\bscript\b/i,          weight: 2, signal: 'script' },
  { re: /\bsaas\s+architect/i,  weight: 4, signal: 'saas-architecture' },
  { re: /\btech\s+stack\b/i,    weight: 4, signal: 'tech-stack' },
  // Turkish
  { re: /\baltyapı\b/i,         weight: 3, signal: 'altyapı' },
  { re: /\botomasyond/i,        weight: 2, signal: 'otomasyon' },
  { re: /\bentegrasyon/i,       weight: 2, signal: 'entegrasyon' },
  { re: /\bgüvenlik\b/i,        weight: 2, signal: 'güvenlik' },
  { re: /\bperformans\b/i,      weight: 2, signal: 'performans' },
  { re: /\bölçeklen/i,          weight: 2, signal: 'ölçeklenebilirlik' },
  { re: /\bveritaban/i,         weight: 2, signal: 'veritabanı' },
]

const ANALYTIC_PATTERNS: Pattern[] = [
  // English
  { re: /\bmetric\b/i,          weight: 3, signal: 'metrics' },
  { re: /\bkpi\b/i,             weight: 4, signal: 'kpi' },
  { re: /\bchurn\b/i,           weight: 4, signal: 'churn' },
  { re: /\bconversion\b/i,      weight: 3, signal: 'conversion' },
  { re: /\bltv\b/i,             weight: 4, signal: 'ltv' },
  { re: /\bcac\b/i,             weight: 4, signal: 'cac' },
  { re: /\bmrr\b/i,             weight: 4, signal: 'mrr' },
  { re: /\barr\b/i,             weight: 3, signal: 'arr' },
  { re: /\brevenue\b/i,         weight: 2, signal: 'revenue' },
  { re: /\bmargin\b/i,          weight: 3, signal: 'margin' },
  { re: /\bbenchmark\b/i,       weight: 3, signal: 'benchmark' },
  { re: /\bforecast\b/i,        weight: 3, signal: 'forecast' },
  { re: /\bgrowth\s+rate\b/i,   weight: 4, signal: 'growth-rate' },
  { re: /\bretention\b/i,       weight: 3, signal: 'retention' },
  { re: /\bprofitab/i,          weight: 3, signal: 'profitability' },
  { re: /\bunit\s+economics\b/i,weight: 4, signal: 'unit-economics' },
  { re: /\broi\b/i,             weight: 3, signal: 'roi' },
  { re: /\bcohort\b/i,          weight: 4, signal: 'cohort' },
  { re: /\b\d+[\.,]?\d*\s*%/,  weight: 2, signal: 'numeric-percent' },
  { re: /\b[£$€]\s*\d+/,       weight: 2, signal: 'currency-figure' },
  // Turkish
  { re: /\bgel[iı]r\b/i,        weight: 2, signal: 'gelir' },
  { re: /\bmüşteri\s+kaybı/i,   weight: 4, signal: 'müşteri-kaybı' },
  { re: /\bdönüşüm\s*oran/i,    weight: 3, signal: 'dönüşüm' },
  { re: /\bkâr\s+marjı/i,       weight: 3, signal: 'kâr-marjı' },
  { re: /\bbüyüme\s*oran/i,     weight: 3, signal: 'büyüme-oranı' },
  { re: /\belde\s+tutma/i,      weight: 3, signal: 'elde-tutma' },
  { re: /\bkıyaslama\b/i,       weight: 3, signal: 'kıyaslama' },
]

// ── MRR Tier reference data (embedded, no external fetch needed) ───────────────

export interface MrrTierBenchmark {
  tier:       string
  mrrRange:   string
  medianGrowth: number  // % per month
  medianChurn:  number  // % per month
  topQuartileCAC: number  // USD
}

export const MRR_TIERS: MrrTierBenchmark[] = [
  { tier: 'Seed',      mrrRange: '$0–$10k',    medianGrowth: 12, medianChurn: 8,  topQuartileCAC: 180  },
  { tier: 'Early',     mrrRange: '$10k–$50k',  medianGrowth: 8,  medianChurn: 6,  topQuartileCAC: 320  },
  { tier: 'Growth',    mrrRange: '$50k–$200k', medianGrowth: 5,  medianChurn: 4,  topQuartileCAC: 580  },
  { tier: 'Scale',     mrrRange: '$200k–$1M',  medianGrowth: 3,  medianChurn: 3,  topQuartileCAC: 940  },
  { tier: 'Expansion', mrrRange: '$1M+',        medianGrowth: 2,  medianChurn: 2,  topQuartileCAC: 1400 },
]

// ── Classifier ─────────────────────────────────────────────────────────────────

function scorePatterns(text: string, patterns: Pattern[]): { score: number; signals: string[] } {
  let score   = 0
  const signals: string[] = []
  for (const { re, weight, signal } of patterns) {
    if (re.test(text)) {
      score += weight
      signals.push(signal)
    }
  }
  return { score, signals }
}

/**
 * Classify a user query into a SailIntent.
 *
 * @param text  The raw user input (TR or EN).
 * @returns     IntentResult with intent, confidence (0–1), and matched signals.
 */
export function classifyIntent(text: string): IntentResult {
  const creative  = scorePatterns(text, CREATIVE_PATTERNS)
  const technical = scorePatterns(text, TECHNICAL_PATTERNS)
  const analytic  = scorePatterns(text, ANALYTIC_PATTERNS)

  const scores: Record<SailIntent, number> = {
    creative:  creative.score,
    technical: technical.score,
    analytic:  analytic.score,
  }

  const total = creative.score + technical.score + analytic.score

  // Fallback: numeric heavy input with revenue/% → analytic
  if (total === 0) {
    const hasNumbers = /\d/.test(text)
    return {
      intent:     hasNumbers ? 'analytic' : 'creative',
      confidence: 0.35,
      signals:    hasNumbers ? ['numeric-fallback'] : ['no-signal-fallback'],
    }
  }

  // Pick winner
  const winner = (Object.entries(scores) as [SailIntent, number][])
    .sort((a, b) => b[1] - a[1])[0]

  const intent     = winner[0]
  const confidence = Math.min(winner[1] / total, 1)

  const signalMap: Record<SailIntent, string[]> = {
    creative:  creative.signals,
    technical: technical.signals,
    analytic:  analytic.signals,
  }

  return { intent, confidence, signals: signalMap[intent] }
}

// ── System prompt builders by intent ──────────────────────────────────────────

export function buildSailSystemPrompt(intent: SailIntent, language = 'en'): string {
  const langNote = language !== 'en'
    ? `LANGUAGE: Respond entirely in the user's language (locale: ${language}).\n\n`
    : ''

  const base = `${langNote}You are Aetheris SAIL — an elite adaptive business intelligence system. `

  switch (intent) {
    case 'creative':
      return base + `Your role is visionary strategist and narrative architect.

STYLE: Expansive, inspiring, forward-looking. Use vivid language grounded in real precedent.
FORMAT: Use markdown headings (##), short paragraphs, and bullet lists for distinct ideas.
CONTENT: Lead with a bold strategic vision. Support with market-context. End with 3 concrete first moves.
CONSTRAINT: Every claim must be achievable — no hand-waving. Cite real brands or case precedents where possible.`

    case 'technical':
      return base + `Your role is technical architect and systems strategist.

STYLE: Precise, structured, implementation-ready.
FORMAT: Use markdown headings (##), numbered steps, and fenced code blocks for any scripts, configs, or commands.
CODE BLOCKS: Always wrap code with language tags (\`\`\`bash, \`\`\`typescript, etc.). Make code copy-paste ready.
CONTENT: Lead with the technical decision, follow with implementation steps, end with verification commands.
CONSTRAINT: Be specific about versions, tools, and commands. Avoid vague "use a framework" recommendations.`

    case 'analytic':
      return base + `Your role is data analyst and benchmark strategist.

STYLE: Data-dense, benchmark-referenced, metric-precise.
FORMAT: Use markdown headings (##) and tables for comparative data. Include numbers in every key sentence.
TABLES: Use GitHub-flavoured markdown tables for benchmark comparisons.
CONTENT: Lead with the key metric diagnosis. Follow with sector benchmarks. Close with a prioritised lever list.
CONSTRAINT: Every recommendation must include a metric to measure success and a realistic timeline.`
  }
}
