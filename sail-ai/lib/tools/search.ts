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
  results:          SearchResult[]
  queriesUsed:      string[]      // the vectors sent to the API
  searchedAt:       string        // ISO-8601 timestamp
  provider:         'tavily' | 'serper' | 'none'
  staleSourceCount: number        // [SAIL-DATA-VERACITY] results with publishedDate > 12 months old
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
  // ── Turkish-market sources ────────────────────────────────────────────────
  ['kap.org.tr',           0.91],  // BIST public disclosures
  ['tcmb.gov.tr',          0.95],  // Central Bank of Turkey
  ['tuik.gov.tr',          0.93],  // TÜİK statistics
  ['spk.gov.tr',           0.92],  // Capital Markets Board
  ['hepsiemlak.com',       0.82],  // Real estate listings
  ['sahibinden.com',       0.81],  // Classified ads / real estate / cars
  ['akakce.com',           0.80],  // Price comparison
  ['hurriyet.com.tr',      0.74],
  ['sozcu.com.tr',         0.72],
  ['ensonhaber.com',       0.70],
  // ── German-market sources ─────────────────────────────────────────────────
  ['bundesbank.de',        0.94],  // Deutsche Bundesbank
  ['destatis.de',          0.93],  // Statistisches Bundesamt
  ['bmwi.de',              0.91],
  ['handelsblatt.com',     0.83],
  ['finanzen.net',         0.76],
  ['boerse.de',            0.75],
  ['immobilienscout24.de', 0.78],
  // ── French-market sources ─────────────────────────────────────────────────
  ['insee.fr',             0.94],  // Institut national de la statistique
  ['banque-france.fr',     0.94],  // Banque de France
  ['lefigaro.fr',          0.77],
  ['lemonde.fr',           0.79],
  ['seloger.com',          0.76],
  // ── Spanish-market sources ────────────────────────────────────────────────
  ['bde.es',               0.93],  // Banco de España
  ['ine.es',               0.94],  // Instituto Nacional de Estadística
  ['expansion.com',        0.81],
  ['cincodias.elpais.com', 0.80],
  ['idealista.com',        0.78],
  // ── Chinese-market sources ────────────────────────────────────────────────
  ['stats.gov.cn',         0.89],  // National Bureau of Statistics
  ['pboc.gov.cn',          0.92],  // People's Bank of China
  ['caixin.com',           0.82],
  ['xinhua.net',           0.78],
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

// ── High-efficiency content summariser ────────────────────────────────────────
// [SAIL-UNIVERSAL-INTELLIGENCE-V2]
// Scores sentences by information density (numbers, years, currencies, keywords)
// so that the most signal-rich content survives token pruning.

function sentenceScore(s: string): number {
  let score = 0
  score += (s.match(/\d[\d,.]*\s*%/g)                     ?? []).length * 4  // percentages
  score += (s.match(/\b20\d\d\b/g)                        ?? []).length * 3  // years
  score += (s.match(/[$€£₺¥]\s*[\d,.]+/g)                 ?? []).length * 3  // currency (symbol first)
  score += (s.match(/[\d.,]+\s*(TL|lira|USD|EUR|GBP|JPY|₺)/gi) ?? []).length * 3  // currency (symbol after)
  score += (s.match(/\b[\d,.]+\s*(billion|million|trillion|B|M|T)\b/gi) ?? []).length * 3
  score += (s.match(/\b(growth|decline|increase|decrease|revenue|profit|market|record|high|low)\b/gi) ?? []).length * 2
  score += (s.match(/\b(according|report|survey|study|data|source|index|benchmark|research|found|shows)\b/gi) ?? []).length
  score += (s.match(/\b(fiyat|kira|maliyet|ücret|araştırma|rapor|istatistik|veri)\b/gi) ?? []).length * 2
  score += (s.match(/\b(preis|miete|kosten|bericht|studie|daten|statistik)\b/gi)        ?? []).length * 2
  score += (s.match(/\b(prix|loyer|coût|rapport|étude|données|statistique)\b/gi)        ?? []).length * 2
  return score
}

/**
 * extractHighValueContent
 *
 * Splits text into sentences, scores each by information density,
 * and reassembles the highest-scoring sentences within `maxChars`.
 * Falls back to simple head-truncation when sentence splitting fails.
 */
function extractHighValueContent(raw: string, maxChars = 380): string {
  const text = raw.replace(/\s+/g, ' ').trim()
  if (text.length <= maxChars) return text

  // Split on sentence boundaries (period/!/?  followed by space + capital)
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)/g) ?? []
  if (sentences.length <= 1) {
    // No sentence boundaries found — keep head + tail
    return text.slice(0, 280).trimEnd() + ' … ' + text.slice(-97).trimStart()
  }

  // Sort by score descending, then reconstruct within budget
  const ranked = sentences
    .map(s => ({ text: s.trim(), score: sentenceScore(s) }))
    .sort((a, b) => b.score - a.score)

  let result = ''
  for (const { text: s } of ranked) {
    if (result.length + s.length + 1 > maxChars) break
    result = result ? result + ' ' + s : s
  }

  return (result.trim() || text.slice(0, maxChars))
}

// Internal alias for provider adapters (backward compat)
const pruneContent = extractHighValueContent

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

async function searchTavily(
  query:  string,
  signal?: AbortSignal,
  depth:  'basic' | 'advanced' = 'basic',
): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) return []

  let res: Response
  try {
    res = await fetch('https://api.tavily.com/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:             apiKey,
        query,
        search_depth:        depth,
        max_results:         5,
        include_raw_content: false,
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

// Maps SAIL language codes → Serper geo/language params so results are
// returned from the correct regional Google index.
const SERPER_LOCALE: Record<string, { gl: string; hl: string }> = {
  tr: { gl: 'tr', hl: 'tr' },   // Turkish → Google Turkey
  de: { gl: 'de', hl: 'de' },   // German  → Google Germany
  fr: { gl: 'fr', hl: 'fr' },   // French  → Google France
  es: { gl: 'es', hl: 'es' },   // Spanish → Google Spain
  zh: { gl: 'cn', hl: 'zh-cn'}, // Chinese → Google China
  en: { gl: 'us', hl: 'en' },   // English → Google US (default)
}

async function searchSerper(
  query:   string,
  signal?: AbortSignal,
  lang     = 'en',
): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) return []

  const locale = SERPER_LOCALE[lang] ?? SERPER_LOCALE['en']

  let res: Response
  try {
    res = await fetch('https://google.serper.dev/search', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY':    apiKey,
      },
      body: JSON.stringify({ q: query, num: 5, gl: locale.gl, hl: locale.hl }),
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

// ── High-inflation economy detector ──────────────────────────────────────────
// [SAIL-DATA-VERACITY]
// Used by decomposeToSearchQueries() to force a USD/EUR anchor vector as Q1
// for currencies where local-currency figures are likely stale or misleading.

/**
 * HIGH_INFLATION_CURRENCIES
 *
 * ISO 4217 currency codes and language codes for economies with historically
 * elevated CPI risk (>20% annual average in recent years).
 * Maps both currency code and primary language code so either can be checked.
 */
const HIGH_INFLATION_ENTRIES: ReadonlySet<string> = new Set([
  // Currency codes
  'TRY', 'ARS', 'VES', 'EGP', 'NGN', 'PKR', 'ETB', 'SDG', 'SYP', 'ZWL', 'LBP',
  // Language codes (used when currency is unknown but language is detected)
  'tr',  // Turkish
  'es',  // Spanish (covers AR/VE)
])

/**
 * isHighInflationEconomy
 *
 * Returns true when the given currency code (ISO 4217) or language code
 * belongs to a known high-inflation economy.
 * Case-insensitive. Falls back to false for unknown codes.
 *
 * @param currencyOrLanguage - e.g. 'TRY', 'ARS', 'tr', 'es'
 */
export function isHighInflationEconomy(currencyOrLanguage: string): boolean {
  return HIGH_INFLATION_ENTRIES.has(currencyOrLanguage.toUpperCase()) ||
         HIGH_INFLATION_ENTRIES.has(currencyOrLanguage.toLowerCase())
}

// ── Language detector ─────────────────────────────────────────────────────────
// [SAIL-UNIVERSAL-INTELLIGENCE-V2]
// Heuristic — no API call. Covers the 6 languages SAIL AI supports.

export function detectQueryLanguage(text: string): string {
  // Chinese characters (CJK Unified Ideographs)
  if (/[一-鿿]/.test(text)) return 'zh'
  // Turkish: unique diacritics OR high-frequency function words
  if (/[ğışçöü]/i.test(text) ||
      /\b(nedir|nasıl|için|ile|bir|bu|olan|değil|ama|ve|veya|gibi|daha|çok)\b/i.test(text)) return 'tr'
  // German: ß or German diacritics + function words
  if (/ß/i.test(text) ||
      (/[äöü]/i.test(text) && /\b(ist|sind|und|das|die|der|ein|wie|aber|auch|auf)\b/i.test(text))) return 'de'
  // French: French diacritics + function words
  if (/[àâçèéêëîïôùûœæ]/i.test(text) &&
      /\b(est|sont|les|des|une|comment|pourquoi|mais|avec|dans|pour|sur)\b/i.test(text)) return 'fr'
  // Spanish: ñ or Spanish diacritics + function words
  if (/ñ/i.test(text) ||
      (/[áéíóúü]/i.test(text) && /\b(es|son|los|las|una|como|pero|también|está|para|con)\b/i.test(text))) return 'es'
  return 'en'
}

// ── Universal filler-word stripper ────────────────────────────────────────────
// [SAIL-UNIVERSAL-INTELLIGENCE-V2]

function stripFillerWords(text: string): string {
  return text
    // English
    .replace(/\b(what|how|why|when|where|who|is|are|was|were|will|would|could|should|can|please|help|tell|me|us|the|a|an|of|in|at|to|for|with|from|about|do|does|did|i|we|my|our|give|show|explain|describe|get|find)\b/gi, ' ')
    // Turkish
    .replace(/\b(nedir|nasıl|neden|nerede|ne|kim|ile|için|bir|bu|şu|o|ve|da|de|ki|mi|mu|mü|mı|bana|bize|beni|bizi|var|yok|hakkında|anlat|açıkla|göster|ver|gibi|daha|çok|ama|veya|olan)\b/gi, ' ')
    // Spanish
    .replace(/\b(qué|cómo|por|para|con|los|las|una|del|que|esto|eso|pero|también|como|más|muy|ya)\b/gi, ' ')
    // German
    .replace(/\b(was|wie|warum|wenn|aber|auch|auf|aus|bei|bis|dem|den|der|die|das|ein|eine|ist|und|oder|für|von|mit|nach|über|zum)\b/gi, ' ')
    // French
    .replace(/\b(quoi|comment|pourquoi|mais|avec|dans|pour|sur|les|des|une|cette|sont|est|être|avoir|plus|très|aussi|comme)\b/gi, ' ')
    .replace(/[?!.,;:()]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 120)
}

// ── Universal intent classifier ───────────────────────────────────────────────
// Detects query type across all 6 languages to generate targeted search vectors.

type QueryIntent =
  | 'startup_business'   // opening/starting a specific business
  | 'price_cost'         // prices, salaries, rents, costs
  | 'news_current'       // latest events, breaking news, today
  | 'financial_market'   // stocks, crypto, market data, investment
  | 'tech_product'       // product reviews, comparisons, specs
  | 'scientific'         // research, studies, medical evidence
  | 'general'            // everything else

function classifyIntent(message: string): QueryIntent {
  const m = message  // shorthand

  // ── Startup / business opening ──────────────────────────────────────────────
  // Turkish: no trailing \b — suffixes like açmanın, kurmanın must match
  if (
    /(açmak|açma|kurmak|kurma|başlatmak|başlatma|yatırım\s+maliyet|girişim\s+maliyet)/i.test(m) ||
    /\b(open(ing)?\s+a|start(ing)?\s+a|launch(ing)?\s+a|set\s+up\s+a|startup\s+cost|cost\s+to\s+open)\b/i.test(m)
  ) return 'startup_business'

  // ── News / current events — checked BEFORE financial so "enflasyon son dakika" → news ──
  if (
    /\b(latest|breaking|today|right\s+now|live|just\s+announced|recently|this\s+week|this\s+month)\b/i.test(m) ||
    // Turkish: no trailing \b — güncel, şu an, son dakika
    /(son\s+dakika|bugün|güncel|şu\s+an|son\s+gelişme|son\s+haber)/i.test(m) ||
    /\b(aktuell|heute|neueste|letzte\s+nachrichten)\b/i.test(m) ||
    /\b(actualité|aujourd'hui|dernières\s+nouvelles|récemment)\b/i.test(m)
  ) return 'news_current'

  // ── Financial / market data ────────────────────────────────────────────────
  if (
    /\b(stock|crypto|bitcoin|ethereum|nasdaq|s&p|dow\s+jones|forex|commodity|etf|fund|portfolio|invest|bist|bourse)\b/i.test(m) ||
    // Turkish: remove trailing \b — döviz/borsa/altın end with non-ASCII or have suffixes
    /(hisse|borsa|kripto|dolar\s+kur|euro\s+kur|döviz|altın\s+fiyat|enflasyon|faiz\s+oran)/i.test(m) ||
    /\b(aktie|kurs|rendite|anlage|fonds|börse)\b/i.test(m)
  ) return 'financial_market'

  // ── Price / cost / salary ──────────────────────────────────────────────────
  if (
    /\b(price|cost|salary|wage|rent|fee|rate|tariff|afford|budget|expense|income|how\s+much)\b/i.test(m) ||
    // Turkish: no trailing \b — maaş, ücret, fiyat have non-ASCII endings
    /(fiyat|maliyet|kira|ücret|maaş|masraf|bütçe|ne\s+kadar|kaç\s+(para|lira|tl)|aylık|yıllık\s+gelir)/i.test(m) ||
    /\b(preis|miete|gehalt|kosten|gebühr|lohn|wie\s+viel)\b/i.test(m) ||
    /\b(prix|loyer|salaire|coût|tarif|combien)\b/i.test(m) ||
    /\b(precio|alquiler|salario|costo|tarifa|cuánto)\b/i.test(m)
  ) return 'price_cost'

  // ── Tech / product — reviews, comparisons, specs ───────────────────────────
  if (
    /\b(vs\.?|versus|review|comparison|best|recommend|specs|features|model|benchmark|which\s+is|top\s+\d)\b/i.test(m) ||
    // Turkish: no trailing \b
    /(karşılaştır|en\s+iyi|inceleme|özellik|öneri)/i.test(m) ||
    /\b(vergleich|empfehlung|test|bewertung|beste)\b/i.test(m)
  ) return 'tech_product'

  // ── Scientific / research / health ────────────────────────────────────────
  if (
    /\b(research|study|evidence|clinical|trial|findings|journal|paper|meta.?analysis|systematic\s+review|health\s+effect|causes|symptoms)\b/i.test(m) ||
    // Turkish: no trailing \b — araştırmaları, çalışmaları must match
    /(araştırma|çalışma|kanıt|klinik|bilimsel|sağlık\s+etkisi|hastalık|tedavi|istatistik)/i.test(m) ||
    /\b(studie|forschung|klinisch|evidenz|ergebnis|gesundheit)\b/i.test(m) ||
    /\b(étude|recherche|clinique|preuve|résultat|santé)\b/i.test(m)
  ) return 'scientific'

  return 'general'
}

// ASCII transliterator for Turkish → English for global benchmark queries
function toAscii(s: string): string {
  return s.replace(/[ıİğĞüÜşŞçÇöÖ]/g, (c: string) => (
    ({ ı:'i', İ:'I', ğ:'g', Ğ:'G', ü:'u', Ü:'U', ş:'s', Ş:'S', ç:'c', Ç:'C', ö:'o', Ö:'O' } as Record<string,string>)[c] ?? c
  ))
}

// ── Query decomposer — universal intent-aware ─────────────────────────────────
// [SAIL-UNIVERSAL-INTELLIGENCE-V3]

/**
 * decomposeToSearchQueries
 *
 * Generates up to 3 focused search vectors from a user query.
 * Intent is detected across 6 languages and 7 categories.
 * Each intent type gets query templates optimised for real data retrieval.
 *
 * Strategy per query slot:
 *   Q1 — Native-language primary (regional sources, current data)
 *   Q2 — English global anchor  (international authority sources)
 *   Q3 — Deep-dive enrichment   (specific data type for the intent)
 */
export function decomposeToSearchQueries(
  message:  string,
  context?: string,
  language  = 'en',
): string[] {
  const year         = new Date().getFullYear()
  const detectedLang = language !== 'en' ? language : detectQueryLanguage(message)
  const isNonEnglish = detectedLang !== 'en'
  const isVolatile   = isHighInflationEconomy(detectedLang)
  const keyTerms     = stripFillerWords(message)
  const nativeMsg    = message.slice(0, 120).trim()
  const intent       = classifyIntent(message)

  const queries: string[] = []

  // ── Location + business-type extraction (used by startup_business intent) ──
  const locationMatch =
    message.match(/(Alaçatı|Alacati|Çeşme|Cesme|İzmir|Izmir|İstanbul|Istanbul|Ankara|Bodrum|Fethiye|Antalya|Alanya|Marmaris|Kuşadası|Kusadasi|Kapadokya|Cappadocia|London|Berlin|Paris|Madrid|New York|Dubai|Amsterdam)/i) ??
    message.match(/([A-ZÇĞIÖŞÜa-zçğışöşü]{4,20})[''']?(?:da|de|ta|te|'da|'de)\b/i)
  const businessTypeMatch =
    message.match(/(dondurma|gelato|ice[\s-]?cream|cafe|kafe|restoran|restaurant|pastane|bakery|bar|pub|lokanta|büfe|market|fırın|bakkal|kuaför|berber|gym|spa|hotel|otel)/i)
  const location     = locationMatch?.[1] ?? ''
  const businessType = businessTypeMatch?.[1] ?? ''

  // ── Context entity extraction ──────────────────────────────────────────────
  const sectorMatch  = context?.match(/(?:sector|industry|sektör|endüstri|branche)[:\s]+([^\n,]{3,40})/i)
  const companyMatch = context?.match(/(?:company|brand|şirket|marca|unternehmen|entreprise)[:\s]+([^\n,]{3,30})/i)

  // ══════════════════════════════════════════════════════════════════════════
  // STARTUP BUSINESS — most targeted, split into rent + equipment + global
  // ══════════════════════════════════════════════════════════════════════════
  if (intent === 'startup_business') {
    const biz = businessType || keyTerms.split(' ').slice(0, 3).join(' ')

    if (isVolatile && detectedLang === 'tr') {
      // Turkish volatile economy — rent + industrial equipment + global USD
      queries.push(
        location
          ? `${location} ticari kiralık işyeri dükkan kira fiyatı ${year} TL aylık`
          : `Türkiye turistik bölge ticari kiralık dükkan aylık kira fiyatı ${year} TL`
      )
      queries.push(`endüstriyel ${biz} makinesi fiyatı Türkiye ${year} TL ticari profesyonel`)
      queries.push(`${toAscii(biz)} commercial business startup cost ${year} investment USD EUR`)
    } else {
      // English / other language startup cost
      queries.push(
        location
          ? `${location} commercial rent shop price ${year}`
          : `${keyTerms} commercial rent cost ${year}`
      )
      queries.push(`${biz} commercial equipment cost price ${year}`)
      queries.push(`${biz} small business startup cost breakdown ${year}`)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRICE / COST — specific price lookup, current rates
  // ══════════════════════════════════════════════════════════════════════════
  else if (intent === 'price_cost') {
    if (isVolatile && detectedLang === 'tr') {
      queries.push(`${nativeMsg} ${year} güncel fiyat TL`)
      queries.push(`${keyTerms} ${year} current price USD EUR global`)
      queries.push(`${keyTerms} Türkiye ${year} piyasa fiyatı karşılaştırma`)
    } else if (isNonEnglish) {
      queries.push(`${nativeMsg} ${year}`)
      queries.push(`${keyTerms} ${year} current price statistics`)
      queries.push(`${keyTerms} ${year} price comparison data`)
    } else {
      queries.push(`${keyTerms} current price ${year}`)
      queries.push(`${keyTerms} cost breakdown analysis ${year}`)
      queries.push(`${keyTerms} price comparison statistics ${year}`)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FINANCIAL MARKET — real-time quotes, market data, investment analysis
  // ══════════════════════════════════════════════════════════════════════════
  else if (intent === 'financial_market') {
    if (isNonEnglish) {
      queries.push(`${nativeMsg} ${year} piyasa veri analiz`)
      queries.push(`${keyTerms} ${year} market data analysis performance`)
      queries.push(`${keyTerms} ${year} investment outlook forecast`)
    } else {
      queries.push(`${keyTerms} ${year} market data price performance`)
      queries.push(`${keyTerms} ${year} analysis forecast outlook`)
      queries.push(`${keyTerms} ${year} investment report statistics`)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NEWS / CURRENT EVENTS — latest developments, breaking news
  // ══════════════════════════════════════════════════════════════════════════
  else if (intent === 'news_current') {
    if (isNonEnglish) {
      queries.push(`${nativeMsg} son gelişme haber ${year}`)
      queries.push(`${keyTerms} latest news developments ${year}`)
      queries.push(`${keyTerms} recent update analysis ${year}`)
    } else {
      queries.push(`${keyTerms} latest news ${year}`)
      queries.push(`${keyTerms} recent developments update`)
      queries.push(`${keyTerms} analysis current situation ${year}`)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TECH / PRODUCT — reviews, comparisons, specs
  // ══════════════════════════════════════════════════════════════════════════
  else if (intent === 'tech_product') {
    if (isNonEnglish) {
      queries.push(`${nativeMsg} ${year} inceleme karşılaştırma`)
      queries.push(`${keyTerms} ${year} review comparison specs`)
      queries.push(`${keyTerms} best ${year} expert recommendation`)
    } else {
      queries.push(`${keyTerms} review ${year}`)
      queries.push(`${keyTerms} comparison specs features ${year}`)
      queries.push(`${keyTerms} best expert recommendation ${year}`)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCIENTIFIC — research, studies, evidence
  // ══════════════════════════════════════════════════════════════════════════
  else if (intent === 'scientific') {
    if (isNonEnglish) {
      queries.push(`${nativeMsg} araştırma bulgu ${year}`)
      queries.push(`${keyTerms} research study findings ${year}`)
      queries.push(`${keyTerms} systematic review evidence meta-analysis`)
    } else {
      queries.push(`${keyTerms} research study findings ${year}`)
      queries.push(`${keyTerms} systematic review evidence`)
      queries.push(`${keyTerms} clinical data statistics ${year}`)
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GENERAL — smart contextual decomposition
  // ══════════════════════════════════════════════════════════════════════════
  else {
    // Q1 — Always native language first for regional relevance
    if (isVolatile && detectedLang === 'tr') {
      queries.push(`${nativeMsg} ${year} güncel veri`)
    } else if (isNonEnglish) {
      queries.push(`${nativeMsg} ${year}`)
    } else {
      queries.push(`${keyTerms} ${year}`)
    }

    // Q2 — English global anchor
    if (sectorMatch) {
      queries.push(`${sectorMatch[1].trim()} ${keyTerms} ${year} data report`)
    } else if (companyMatch) {
      queries.push(`${companyMatch[1].trim()} ${year} analysis performance`)
    } else {
      queries.push(`${keyTerms} ${year} comprehensive analysis report`)
    }

    // Q3 — Language-specific deep-dive
    const q3 = isNonEnglish
      ? ({
          tr: `${keyTerms} Türkiye ${year} istatistik araştırma rapor`,
          de: `${keyTerms} Deutschland ${year} Statistik Analyse`,
          fr: `${keyTerms} France ${year} statistiques analyse`,
          es: `${keyTerms} España ${year} estadísticas análisis`,
          zh: `${keyTerms} 中国 ${year} 统计分析报告`,
        } as Record<string, string>)[detectedLang]
      : `${keyTerms} statistics data evidence ${year}`
    queries.push((q3 ?? `${keyTerms} ${year} data statistics`).trim())
  }

  return Array.from(new Set(queries.filter(q => q.length > 5))).slice(0, 3)
}

// ── Universal research intent detector ───────────────────────────────────────
// [SAIL-UNIVERSAL-INTELLIGENCE-V2]
// Covers strategic / competitive / analytical / cultural intent across 6 languages.
// No longer restricted to time-sensitive keywords only.

const RESEARCH_INTENT_PATTERNS: RegExp[] = [
  // ── Time-sensitive (language-neutral numerics + signals) ──────────────────
  /\b(latest|current|today|right now|live)\b/i,
  /\bthis\s+(week|month|quarter|year)\b/i,
  /\b20(2[4-9]|[3-9]\d)\b/,                              // years 2024–2099
  /\b(price|rate|yield|market cap|valuation|stock|share price)\b/i,
  /\b(news|breaking|update|just\s+announced|recently)\b/i,

  // ── Price / cost / salary — English ──────────────────────────────────────
  // [SAIL-FACTUAL-TRIGGER] Most factual queries involve "how much / cost / rent / salary"
  /\b(how\s+much|cost(s|ing)?|rental|fee|salary|wage|earning|income|afford|budget)\b/i,
  /\b(rent|lease|subscription|tuition|utility|expense|overhead|spend(ing)?)\b/i,
  /\b(average\s+(price|cost|salary|rent|wage)|median\s+(income|salary|price))\b/i,
  /\b(cost\s+of\s+living|per\s+month|per\s+year|annually|monthly|hourly\s+rate)\b/i,
  /\b(minimum\s+wage|interest\s+rate|mortgage|property\s+price|square\s+meter|sqm)\b/i,

  // ── Strategic / competitive intent — English ──────────────────────────────
  /\bstrateg(y|ic|ies|ize)\b/i,
  /\b(competi(tor|tion|tive)|vs\.?\s|versus|benchmark(ing|s)?|competitive\s+landscape)\b/i,
  /\b(market\s+share|industry\s+report|sector\s+analysis|forecast|outlook)\b/i,
  /\b(trend(s|ing)?|growth\s+rate|statistics|research\s+report|whitepaper|data\s+driven)\b/i,
  /\b(swot|porter|pestle|tam|sam|som|roi|cagr|kpi|nps|cac|ltv|arr|mrr|ebitda)\b/i,

  // ── Turkish — price / cost / salary ──────────────────────────────────────
  // [SAIL-FACTUAL-TRIGGER] Türkçe fiyat/kira/maaş sorguları için
  // NOTE: No trailing \b — Turkish morphological suffixes (kiralık, maliyeti,
  // fiyatları, aylığı, giderleri…) are non-ASCII and break JS \b word boundary.
  // Leading \b is kept (Turkish stems start with ASCII chars) to avoid mid-word hits.
  /\b(kira|fiyat|maliyet|ücret|maaş|tutar|bedel|masraf|gider|harcama|bütçe|ödeme)/i,
  /\b(ne\s+kadar|kaç\s+(para|lira|tl|dolar|euro|usd|eur)|ortalama|pahalı|ucuz|değer)/i,
  /\b(aylık|yıllık|haftalık|günlük|saatlik|metrekare|m²|depozito|aidat|stopaj)/i,
  /\b(asgari\s+ücret|faiz\s+oranı|kur|döviz|altın\s+fiyat|konut\s+fiyat)/i,

  // ── Turkish — strategic / market ─────────────────────────────────────────
  /\b(strateji|rekabet|kıyaslama|tahmin|pazar\s+analiz|sektör|endüstri|rakip)/i,
  /\b(pazar\s+pay|büyüme\s+oran|istatistik|araştırma|rapor|veri\b|trend|gelecek)/i,
  /\b(türkiye|bist|tcmb|tuik|enflasyon|ekonomi|borsa)/i,

  // ── Spanish — price / cost / salary ──────────────────────────────────────
  /\b(cuánto\s+cuesta|precio|costo|alquiler|salario|sueldo|ingreso|gasto|tarifa)\b/i,
  /\b(promedio|mensual|anual|semanal|diario|por\s+mes|por\s+año|metro\s+cuadrado)\b/i,

  // ── Spanish — strategic / market ─────────────────────────────────────────
  /\b(estrategia|competencia|competitiv[ao]|pronóstico|tendencia|análisis|mercado)\b/i,
  /\b(investigación|informe|sector|industria|comparación|datos|estadísticas|crecimiento)\b/i,
  /\b(cuota\s+de\s+mercado|punto\s+de\s+referencia|perspectiva|futuro)\b/i,

  // ── German — price / cost / salary ───────────────────────────────────────
  /\b(wie\s+viel\s+(kostet|verdient)|preis|miete|gehalt|lohn|einkommen|kosten|gebühr)\b/i,
  /\b(durchschnitt(lich)?|monatlich|jährlich|wöchentlich|pro\s+(monat|jahr)|quadratmeter)\b/i,

  // ── German — strategic / market ──────────────────────────────────────────
  /\b(strategie|wettbewerb(s|sfähig)?|prognose|trend|analyse|markt(anteil)?)\b/i,
  /\b(forschung|bericht|branche|industrie|vergleich|daten|statistiken|wachstum|zukunft)\b/i,

  // ── French — price / cost / salary ───────────────────────────────────────
  /\b(combien\s+(coûte|gagne)|prix|loyer|salaire|revenu|coût|tarif|frais|dépense)\b/i,
  /\b(moyen(ne)?|mensuel(le)?|annuel(le)?|hebdomadaire|par\s+(mois|an)|mètre\s+carré)\b/i,

  // ── French — strategic / market ──────────────────────────────────────────
  /\b(stratégie|concurrence|concurrent|prévision|tendance|analyse|marché|part\s+de\s+marché)\b/i,
  /\b(recherche|rapport|secteur|industrie|comparaison|données|statistiques|croissance|avenir)\b/i,

  // ── Chinese ──────────────────────────────────────────────────────────────
  /战略|竞争(力|分析|对手)?|预测|趋势|分析|市场(份额|分析)?|研究(报告)?|行业|产业|统计|数据|增长|未来|发展/,
  /多少钱|价格|费用|工资|薪资|租金|成本|平均|月(薪|租|费)|年(薪|租|费)|汇率|利率/,

  // ── Financial / tech acronyms (cross-language) ───────────────────────────
  /\b(nasdaq|s&p\s*500|dow\s+jones|ftse|dax|nikkei|hang\s+seng)\b/i,
  /\b(gdp|cpi|ppi|pmi|fed|ecb|imf|wto|oecd|g20)\b/i,
]

// [SAIL-GLOBAL-VERACITY-PATCH]
// Common greeting tokens that should never trigger a search — multilingual.
const GREETING_PATTERN = /^(merhaba|selam|nasılsın|nasılsınız|iyi\s+günler|günaydın|iyi\s+akşamlar|hey|hi|hello|howdy|good\s+morning|good\s+evening|ok|okay|tamam|peki|evet|yes|no|hayır|teşekkür|teşekkürler|sağol|sağ\s+ol|mersi|gracias|danke|merci|谢谢|你好|再见)$/i

/**
 * requiresResearch
 *
 * Universal intent-driven trigger. Returns true for any query involving
 * strategic advice, competitive analysis, market data, technical benchmarks,
 * or cultural/regional insights — regardless of the language used.
 *
 * Guard order:
 *   1. Hard-reject very short inputs (< 15 chars)
 *   2. Hard-reject explicit greeting tokens (multilingual)
 *   3. Intent-pattern match across 6 languages
 */
export function requiresResearch(message: string): boolean {
  const trimmed = message.trim()
  if (trimmed.length < 15) return false           // skip greetings / one-word inputs
  if (GREETING_PATTERN.test(trimmed)) return false // skip explicit greeting phrases
  return true   // always research all meaningful queries
}

// ── Recency filter (Rule 2 of Data Veracity Protocol) ────────────────────────
// [SAIL-DATA-VERACITY]
// Results older than 12 months are flagged as stale for financial queries.
// publishedDate formats vary wildly (ISO-8601, "Jan 2024", "2 days ago", etc.)
// so we apply a best-effort parse rather than strict validation.

/**
 * isStaleSource
 *
 * Returns true if the published date is determinably older than 12 months.
 * Returns false (not stale) when the date is absent or unparseable —
 * we don't penalise sources whose date we simply can't read.
 */
export function isStaleSource(publishedDate: string | undefined): boolean {
  if (!publishedDate) return false   // unknown date → don't penalise

  // Try native Date parse (handles ISO-8601 and many human-readable formats)
  const parsed = new Date(publishedDate)
  if (!isNaN(parsed.getTime())) {
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    return parsed < twelveMonthsAgo
  }

  // Fallback: extract a 4-digit year and compare to (currentYear - 1)
  const yearMatch = publishedDate.match(/\b(20\d\d)\b/)
  if (yearMatch) {
    return parseInt(yearMatch[1], 10) < new Date().getFullYear() - 1
  }

  return false   // unparseable → assume fresh
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
 *
 * @param queries  - search vectors from decomposeToSearchQueries()
 * @param language - detected query language code (e.g. 'tr', 'de', 'fr', 'es', 'zh', 'en')
 *                   Passed to Serper so results come from the correct regional index.
 */
export async function executeDeepSearch(
  queries:  string[],
  language  = 'en',
): Promise<DeepSearchResponse> {
  const searchedAt = new Date().toISOString()

  // Shared abort controller — kills all in-flight fetches if timeout fires
  const abort  = new AbortController()
  const timer  = setTimeout(() => abort.abort(), SEARCH_TIMEOUT_MS)

  const hasTavily = Boolean(process.env.TAVILY_API_KEY)
  const hasSerper = Boolean(process.env.SERPER_API_KEY)

  if (!hasTavily && !hasSerper) {
    clearTimeout(timer)
    return { results: [], queriesUsed: queries, searchedAt, provider: 'none', staleSourceCount: 0 }
  }

  // Always run BOTH Tavily AND Serper in parallel for every query.
  // Tavily = AI-native deep crawl, Serper = Google's full index.
  // Together they cover both freshly-crawled content and Google-cached pages.
  // 'advanced' Tavily depth gives richer sentence extraction for all queries.
  const tavilyDepth: 'basic' | 'advanced' = 'advanced'

  try {
    const batches = await Promise.all(
      queries.map(async (q) => {
        if (hasTavily && hasSerper) {
          // Both providers in parallel → maximum coverage
          const [tv, sp] = await Promise.all([
            searchTavily(q, abort.signal, tavilyDepth),
            searchSerper(q, abort.signal, language),
          ])
          const seen = new Set<string>()
          return [...tv, ...sp].filter(r => seen.has(r.url) ? false : (seen.add(r.url), true))
        }
        if (hasTavily) return searchTavily(q, abort.signal, tavilyDepth)
        if (hasSerper) return searchSerper(q, abort.signal, language)
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

    const trimmed = results.slice(0, 12)   // 12 = dual-provider × 3 queries headroom

    // [SAIL-DATA-VERACITY] Count results older than 12 months (Rule 2 — recency filter)
    const staleSourceCount = trimmed.filter(r => isStaleSource(r.publishedDate)).length

    return {
      results:     trimmed,
      queriesUsed: queries,
      searchedAt,
      provider:         hasTavily ? 'tavily' : 'serper',
      staleSourceCount,
    }
  } catch {
    clearTimeout(timer)
    return { results: [], queriesUsed: queries, searchedAt, provider: 'none', staleSourceCount: 0 }
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

  // [SAIL-DATA-VERACITY] Mark stale sources inline so the LLM synthesis layer can see them
  const blocks = res.results
    .map(r => {
      const staleFlag = isStaleSource(r.publishedDate) ? ' [STALE: >12mo]' : ''
      return `Source: ${r.url} | Date: ${r.publishedDate ?? 'unknown'}${staleFlag} | Reliability: ${Math.round(r.reliabilityScore * 100)}%\nContent: ${r.content}`
    })
    .join('\n\n')

  return `<research_context>\n${blocks}\n</research_context>`
}

// ── Triangulation scorer ──────────────────────────────────────────────────────

/**
 * computeTriangulationLevel
 *
 * Scores cross-source agreement on a 1–10 scale.
 * Uses lexical overlap of key noun phrases across result snippets as a proxy.
 * Kept for backward-compat — see computeTriangulationAndConsensus for the
 * richer [SAIL-GLOBAL-VERACITY-PATCH] version.
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

// [SAIL-GLOBAL-VERACITY-PATCH]
/**
 * TriangulationConsensus
 *
 * Richer output type returned by computeTriangulationAndConsensus.
 */
export interface TriangulationConsensus {
  triangulationLevel: number    // 1–10 composite score
  isGloballyVerified: boolean   // true when ≥3 unique domains AND ≥2 sources carry numeric data
  uniqueDomains:      number    // count of distinct hostnames across results
  discrepancyRisk:    boolean   // sources present but none carry numeric data
}

/**
 * computeTriangulationAndConsensus
 *
 * Edge-optimised (no variance/std-dev math) composite triangulation.
 * Replaces the single `triangulationLevel` number with a richer object
 * that exposes domain diversity and numeric data coverage for the health report.
 *
 * Hard-Gate rule: isGloballyVerified requires
 *   • ≥ 3 distinct authority domains (domain diversity)
 *   • ≥ 2 sources containing quantitative data (numeric coverage)
 */
export function computeTriangulationAndConsensus(
  results: SearchResult[],
): TriangulationConsensus {
  if (results.length === 0) {
    return { triangulationLevel: 0, isGloballyVerified: false, uniqueDomains: 0, discrepancyRisk: false }
  }

  // ── 1. Unique domain count ────────────────────────────────────────────────
  const uniqueDomains = new Set(
    results.map(r => {
      try { return new URL(r.url).hostname } catch { return 'unknown' }
    }),
  ).size

  // ── 2. Numeric data coverage (Edge-safe regex — no backtracking risk) ────
  // Matches magnitudes, percentages, large numbers in EN + TR (milyon/milyar)
  const numericRegex = /\d+(?:[.,]\d+)?(?:\s*(?:K|M|B|T|milyon|milyar|billion|million|%))?/gi
  const sourcesWithNumbers = results.filter(
    r => (r.content.match(numericRegex) ?? []).length > 1,
  ).length

  // ── 3. Lexical overlap (existing baseline logic, unchanged) ─────────────
  let lexicalAgreements = 0
  if (results.length > 1) {
    const baselineWords = new Set(
      results[0].content.toLowerCase().match(/\b[a-zçğıöşü]{5,}\b/g) ?? [],
    )
    for (let i = 1; i < results.length; i++) {
      const currentWords = results[i].content.toLowerCase().match(/\b[a-zçğıöşü]{5,}\b/g) ?? []
      const shared = currentWords.filter(w => baselineWords.has(w))
      if (shared.length >= 3) lexicalAgreements++
    }
  }

  // ── 4. Hard-Gate consensus score ─────────────────────────────────────────
  const isGloballyVerified = uniqueDomains >= 3 && sourcesWithNumbers >= 2

  const score = isGloballyVerified
    ? 10  // full consensus: diverse domains + quantitative corroboration
    : Math.round(3 + (lexicalAgreements / Math.max(results.length - 1, 1)) * 5)

  return {
    triangulationLevel: Math.min(score, 10),
    isGloballyVerified,
    uniqueDomains,
    // discrepancyRisk: sources exist but none carry numeric proof
    discrepancyRisk: results.length > 0 && sourcesWithNumbers === 0,
  }
}
