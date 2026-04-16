/**
 * SAIL v2.1 — Bilingual Intent Classifier
 *
 * Auto-detects language (TR/EN) and classifies user intent into:
 * - Creative/Visionary: Executive summaries, strategies, brand positioning
 * - Technical: Code, architecture, implementation details
 * - Analytic: Data visualization, MRR calculations, metrics
 *
 * Uses fuzzy keyword matching with confidence scoring.
 */

import type { SailIntentCategory, SailIntentResult } from '@/types/chat'

// ── Language Detection ────────────────────────────────────────────────────────

/** Turkish-specific characters and common words for language detection */
const TURKISH_MARKERS = {
  characters: ['ı', 'ğ', 'ü', 'ş', 'ö', 'ç', 'İ', 'Ğ', 'Ü', 'Ş', 'Ö', 'Ç'],
  words: [
    'ne', 'nasıl', 'neden', 'için', 'ile', 'bu', 'bir', 've', 'olan',
    'gibi', 'daha', 'en', 'çok', 'her', 'kadar', 'sonra', 'önce',
    'yap', 'yapsın', 'olsun', 'lazım', 'gerek', 'istiyorum', 'ister',
    'misin', 'mısın', 'musun', 'müsün', 'miyim', 'mıyım', 'muyum', 'müyüm'
  ]
}

/**
 * Detects the language of input text.
 * Uses Turkish character presence and common word matching.
 */
export function detectLanguage(text: string): 'tr' | 'en' {
  const lowerText = text.toLowerCase()

  // Check for Turkish-specific characters
  const hasTurkishChars = TURKISH_MARKERS.characters.some(char =>
    text.includes(char)
  )
  if (hasTurkishChars) return 'tr'

  // Check for common Turkish words
  const words = lowerText.split(/\s+/)
  const turkishWordCount = words.filter(word =>
    TURKISH_MARKERS.words.includes(word)
  ).length

  // If more than 15% of words are Turkish markers, classify as Turkish
  if (turkishWordCount / words.length > 0.15) return 'tr'

  return 'en'
}

// ── Intent Classification Patterns ────────────────────────────────────────────

/** Keywords and phrases that indicate Creative/Visionary intent */
const CREATIVE_PATTERNS = {
  en: [
    'vision', 'strategy', 'growth', 'executive', 'phygital', 'brand',
    'market position', 'competitive advantage', 'roadmap', 'expansion',
    'opportunity', 'innovation', 'transform', 'disrupt', 'scale',
    'leadership', 'mission', 'value proposition', 'go-to-market',
    'positioning', 'differentiation', 'moat', 'flywheel', 'narrative',
    'story', 'pitch', 'investor', 'funding', 'raise', 'deck',
    'strategic', 'long-term', 'horizon', 'future', 'trend'
  ],
  tr: [
    'vizyon', 'strateji', 'büyüme', 'yönetici', 'marka', 'pazar konumu',
    'rekabet avantajı', 'yol haritası', 'genişleme', 'fırsat', 'inovasyon',
    'dönüşüm', 'ölçeklendirme', 'liderlik', 'misyon', 'değer önerisi',
    'pazara giriş', 'konumlandırma', 'farklılaştırma', 'anlatı', 'hikaye',
    'sunum', 'yatırımcı', 'fonlama', 'stratejik', 'uzun vadeli', 'gelecek', 'trend'
  ]
}

/** Keywords and phrases that indicate Technical intent */
const TECHNICAL_PATTERNS = {
  en: [
    'code', 'architecture', 'api', 'implementation', 'debug', 'deploy',
    'stack', 'function', 'class', 'component', 'hook', 'typescript',
    'javascript', 'react', 'next.js', 'nextjs', 'node', 'python',
    'database', 'sql', 'query', 'endpoint', 'route', 'middleware',
    'authentication', 'auth', 'jwt', 'token', 'session', 'cookie',
    'error', 'bug', 'fix', 'refactor', 'optimize', 'performance',
    'test', 'unit test', 'integration', 'ci/cd', 'pipeline', 'docker',
    'kubernetes', 'aws', 'vercel', 'railway', 'supabase', 'neon',
    'prisma', 'drizzle', 'orm', 'migration', 'schema', 'type',
    'interface', 'generic', 'async', 'await', 'promise', 'stream'
  ],
  tr: [
    'kod', 'mimari', 'api', 'uygulama', 'hata ayıklama', 'dağıtım',
    'fonksiyon', 'sınıf', 'bileşen', 'veritabanı', 'sorgu', 'endpoint',
    'rota', 'kimlik doğrulama', 'oturum', 'hata', 'düzeltme', 'optimizasyon',
    'test', 'performans', 'şema', 'tip', 'arayüz', 'asenkron'
  ]
}

/** Keywords and phrases that indicate Analytic intent */
const ANALYTIC_PATTERNS = {
  en: [
    'mrr', 'arr', 'growth', 'metrics', 'chart', 'calculate', 'data',
    'revenue', 'churn', 'retention', 'ltv', 'cac', 'unit economics',
    'cohort', 'analysis', 'benchmark', 'compare', 'percentage', 'rate',
    'increase', 'decrease', 'trend', 'forecast', 'projection', 'model',
    'kpi', 'dashboard', 'report', 'visualization', 'graph', 'table',
    'average', 'median', 'percentile', 'distribution', 'variance',
    'correlation', 'regression', 'segment', 'breakdown', 'attribution',
    'conversion', 'funnel', 'activation', 'engagement', 'nps', 'csat',
    'burn rate', 'runway', 'margin', 'profit', 'loss', 'ebitda',
    'valuation', 'multiple', 'saas', 'b2b', 'b2c', 'arpu', 'arppu'
  ],
  tr: [
    'mrr', 'arr', 'büyüme', 'metrik', 'grafik', 'hesapla', 'veri',
    'gelir', 'kayıp', 'tutundurma', 'birim ekonomisi', 'kohort',
    'analiz', 'kıyaslama', 'karşılaştırma', 'yüzde', 'oran', 'artış',
    'azalış', 'trend', 'tahmin', 'projeksiyon', 'model', 'kpi',
    'gösterge paneli', 'rapor', 'görselleştirme', 'tablo', 'ortalama',
    'medyan', 'dağılım', 'segment', 'dönüşüm', 'huni', 'aktivasyon',
    'etkileşim', 'karlılık', 'zarar', 'değerleme'
  ]
}

// ── MRR Tier Configuration ────────────────────────────────────────────────────

/** MRR tier thresholds and associated benchmark sectors */
export const MRR_TIERS = {
  seed: {
    tier: 'seed' as const,
    minMrr: 0,
    maxMrr: 10000,
    benchmarkSectors: ['early-stage', 'pre-seed', 'bootstrap'],
    suggestedMetrics: ['user-growth', 'activation-rate', 'burn-rate', 'runway']
  },
  growth: {
    tier: 'growth' as const,
    minMrr: 10001,
    maxMrr: 100000,
    benchmarkSectors: ['series-a', 'growth-stage', 'saas-growth'],
    suggestedMetrics: ['mrr-growth', 'churn-rate', 'ltv-cac', 'ndr']
  },
  scale: {
    tier: 'scale' as const,
    minMrr: 100001,
    maxMrr: 1000000,
    benchmarkSectors: ['series-b', 'scale-up', 'expansion'],
    suggestedMetrics: ['arr-growth', 'gross-margin', 'cac-payback', 'rule-of-40']
  },
  enterprise: {
    tier: 'enterprise' as const,
    minMrr: 1000001,
    maxMrr: Infinity,
    benchmarkSectors: ['late-stage', 'pre-ipo', 'enterprise'],
    suggestedMetrics: ['arr', 'nrr', 'magic-number', 'efficiency-score']
  }
}

/**
 * Determines MRR tier based on a given MRR value.
 */
export function getMrrTier(mrr: number): typeof MRR_TIERS[keyof typeof MRR_TIERS] {
  if (mrr <= MRR_TIERS.seed.maxMrr) return MRR_TIERS.seed
  if (mrr <= MRR_TIERS.growth.maxMrr) return MRR_TIERS.growth
  if (mrr <= MRR_TIERS.scale.maxMrr) return MRR_TIERS.scale
  return MRR_TIERS.enterprise
}

// ── Fuzzy Matching ────────────────────────────────────────────────────────────

/**
 * Simple fuzzy match using Levenshtein distance ratio.
 * Returns a similarity score between 0 and 1.
 */
function fuzzyMatch(str1: string, str2: string): number {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  // Exact match
  if (s1 === s2) return 1

  // Contains match (partial)
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.8
  }

  // Levenshtein distance for close matches
  const len1 = s1.length
  const len2 = s2.length
  const maxLen = Math.max(len1, len2)

  if (maxLen === 0) return 1

  // Quick rejection for very different lengths
  if (Math.abs(len1 - len2) / maxLen > 0.5) return 0

  // Calculate Levenshtein distance
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  const distance = matrix[len1][len2]
  return 1 - distance / maxLen
}

/**
 * Finds matching keywords in text with fuzzy matching support.
 * Returns matched keywords and their cumulative score.
 */
function findMatches(
  text: string,
  patterns: string[],
  fuzzyThreshold = 0.7
): { matches: string[]; score: number } {
  const lowerText = text.toLowerCase()
  const words = lowerText.split(/\s+/)
  const matches: string[] = []
  let score = 0

  for (const pattern of patterns) {
    // Exact phrase match
    if (lowerText.includes(pattern.toLowerCase())) {
      matches.push(pattern)
      score += 1
      continue
    }

    // Fuzzy word match
    for (const word of words) {
      const similarity = fuzzyMatch(word, pattern)
      if (similarity >= fuzzyThreshold) {
        matches.push(pattern)
        score += similarity
        break
      }
    }
  }

  return { matches, score }
}

// ── Main Intent Classifier ────────────────────────────────────────────────────

/**
 * Classifies user input into a SAIL intent category.
 *
 * Algorithm:
 * 1. Detect language (TR/EN)
 * 2. Match against all three pattern sets
 * 3. Calculate confidence based on match density
 * 4. Return highest-scoring intent with metadata
 */
export function classifyIntent(text: string): SailIntentResult {
  const language = detectLanguage(text)
  const patterns = language === 'tr'
    ? { creative: CREATIVE_PATTERNS.tr, technical: TECHNICAL_PATTERNS.tr, analytic: ANALYTIC_PATTERNS.tr }
    : { creative: CREATIVE_PATTERNS.en, technical: TECHNICAL_PATTERNS.en, analytic: ANALYTIC_PATTERNS.en }

  // Calculate scores for each intent
  const creativeResult = findMatches(text, patterns.creative)
  const technicalResult = findMatches(text, patterns.technical)
  const analyticResult = findMatches(text, patterns.analytic)

  // Find the winning intent
  const scores: Array<{ intent: SailIntentCategory; score: number; keywords: string[] }> = [
    { intent: 'creative', score: creativeResult.score, keywords: creativeResult.matches },
    { intent: 'technical', score: technicalResult.score, keywords: technicalResult.matches },
    { intent: 'analytic', score: analyticResult.score, keywords: analyticResult.matches }
  ]

  scores.sort((a, b) => b.score - a.score)
  const winner = scores[0]
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0)

  // Calculate confidence (0-1 scale)
  // High confidence when one intent dominates
  const confidence = totalScore > 0
    ? Math.min(winner.score / Math.max(totalScore, 1), 1)
    : 0.33 // Default to low confidence when no matches

  // Determine MRR tier if analytic intent (look for numeric values)
  let mrrTier: SailIntentResult['mrrTier'] = undefined
  if (winner.intent === 'analytic') {
    // Try to extract MRR value from text
    const mrrMatch = text.match(/(?:mrr|arr|revenue)[:\s]*\$?([\d,]+)/i)
    if (mrrMatch) {
      const mrrValue = parseInt(mrrMatch[1].replace(/,/g, ''), 10)
      mrrTier = getMrrTier(mrrValue).tier
    }
  }

  return {
    intent: winner.intent,
    confidence: Math.round(confidence * 100) / 100,
    language,
    keywords: winner.keywords.slice(0, 5), // Return top 5 keywords
    mrrTier
  }
}

/**
 * Quick intent check for routing decisions.
 * Returns true if confidence is above threshold.
 */
export function isConfidentIntent(
  result: SailIntentResult,
  threshold = 0.5
): boolean {
  return result.confidence >= threshold
}

/**
 * Generates a system prompt modifier based on intent classification.
 * Injected into the LLM call to guide response format.
 */
export function getIntentDirective(result: SailIntentResult): string {
  const { intent, language } = result

  const directives = {
    creative: {
      en: `RESPONSE FORMAT: Executive Summary Mode
- Lead with a bold strategic insight
- Structure as: Vision → Strategy → Execution Horizons (30/60/90 days)
- Use confident, visionary language
- Include market positioning and competitive differentiation
- End with actionable next steps\n\n`,
      tr: `YANIT FORMATI: Yönetici Özeti Modu
- Cesur bir stratejik içgörü ile başla
- Yapı: Vizyon → Strateji → Uygulama Ufukları (30/60/90 gün)
- Kendinden emin, vizyoner bir dil kullan
- Pazar konumlandırması ve rekabet farklılaştırması dahil et
- Uygulanabilir sonraki adımlarla bitir\n\n`
    },
    technical: {
      en: `RESPONSE FORMAT: Technical Documentation Mode
- Lead with the solution, not the problem
- Provide complete, production-ready code
- Use proper TypeScript types and error handling
- Include inline comments for complex logic
- Structure as: Solution → Code → Implementation Notes
- Use full-width code blocks with syntax highlighting\n\n`,
      tr: `YANIT FORMATI: Teknik Dokümantasyon Modu
- Çözüm ile başla, problem ile değil
- Tam, üretime hazır kod sağla
- Uygun TypeScript tipleri ve hata işleme kullan
- Karmaşık mantık için satır içi yorumlar ekle
- Yapı: Çözüm → Kod → Uygulama Notları
- Sözdizimi vurgulu tam genişlik kod blokları kullan\n\n`
    },
    analytic: {
      en: `RESPONSE FORMAT: Data Visualization Mode
- Lead with the key metric or insight
- Present data in structured tables (use markdown tables)
- Include trend analysis and benchmarks
- Provide calculation breakdowns when relevant
- Structure as: Key Finding → Data Table → Analysis → Recommendations
- Use precise numbers and percentages\n\n`,
      tr: `YANIT FORMATI: Veri Görselleştirme Modu
- Anahtar metrik veya içgörü ile başla
- Verileri yapılandırılmış tablolarda sun (markdown tabloları kullan)
- Trend analizi ve kıyaslamalar dahil et
- İlgili olduğunda hesaplama dökümü sağla
- Yapı: Anahtar Bulgu → Veri Tablosu → Analiz → Öneriler
- Kesin sayılar ve yüzdeler kullan\n\n`
    }
  }

  return directives[intent][language]
}
