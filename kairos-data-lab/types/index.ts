// ── Core Platform Types ───────────────────────────────────────────────────────

export type Platform = 'SHOPIFY' | 'AMAZON'
export type AnalysisStatus = 'PENDING' | 'SCRAPING' | 'ANALYZING' | 'COMPLETE' | 'ERROR'

// ── Shopify Types ─────────────────────────────────────────────────────────────

export interface ShopifyVariant {
  id:            number
  title:         string
  price:         string
  compare_at_price: string | null
  sku:           string
  inventory_quantity?: number
  available:     boolean
}

export interface ShopifyProduct {
  id:           number
  title:        string
  handle:       string
  body_html:    string
  vendor:       string
  product_type: string
  created_at:   string
  updated_at:   string
  published_at: string | null
  tags:         string
  images:       Array<{ src: string; alt: string | null }>
  variants:     ShopifyVariant[]
}

export interface ShopifyRawData {
  storeDomain:   string
  storeName:     string
  totalProducts: number
  products:      ShopifyProduct[]
  topProducts:   ShopifyProduct[]
  tagFrequency:  Record<string, number>
  priceRange:    { min: number; max: number; avg: number }
  scrapedAt:     string
}

// ── Amazon Types ──────────────────────────────────────────────────────────────

export interface AmazonReview {
  title:  string
  body:   string
  rating: number
  date:   string
  verified: boolean
}

export interface AmazonRawData {
  asin:         string
  title:        string
  brand:        string
  price:        number | null
  currency:     string
  rating:       number | null
  reviewCount:  number | null
  bulletPoints: string[]
  description:  string
  imageUrls:    string[]
  categories:   string[]
  reviews:      AmazonReview[]
  scrapedAt:    string
}

// ── AI Analysis Output ────────────────────────────────────────────────────────

export interface MarketPositioning {
  strengths:  string[]
  weaknesses: string[]
  pricePosition: 'premium' | 'mid-market' | 'budget' | 'unknown'
  targetAudience: string
}

export interface Vulnerability {
  category:    string   // e.g. "Pricing", "Product Quality", "Customer Support"
  finding:     string
  severity:    'HIGH' | 'MEDIUM' | 'LOW'
  opportunity: string   // what our user can do to exploit this
}

export interface BattlePlanStep {
  step:        number
  title:       string
  description: string
  timeframe:   string   // e.g. "Week 1-2"
  effort:      'HIGH' | 'MEDIUM' | 'LOW'
}

export interface AdCreativeScript {
  platform: 'TikTok' | 'Instagram' | 'YouTube Shorts'
  hook:     string   // opening 3-second hook
  script:   string   // full 15-30s script
  cta:      string   // call-to-action
}

export interface SupplierEstimate {
  productTitle:   string
  retailPrice:    number
  estimatedCost:  number
  grossMargin:    number
  grossMarginPct: number
}

export interface AIAnalysis {
  summary:             string
  marketPositioning:   MarketPositioning
  vulnerabilities:     Vulnerability[]
  actionableBattlePlan: BattlePlanStep[]
  seoKeywordsToTarget: string[]
  adCreativeScript:    AdCreativeScript
  supplierMatrix:      SupplierEstimate[]
  competitorScore:     number   // 0-100, threat level
  generatedAt:         string
}

// ── API Response Types ────────────────────────────────────────────────────────

export interface AnalysisRecord {
  id:          string
  platform:    Platform
  targetUrl:   string
  targetName:  string
  status:      AnalysisStatus
  rawData:     ShopifyRawData | AmazonRawData | Record<string, unknown>
  aiAnalysis:  AIAnalysis | Record<string, unknown>
  createdAt:   string
  updatedAt:   string
}

export interface AnalyzeRequest {
  url:    string
  userId?: string
}

export interface AnalyzeResponse {
  analysisId: string
  platform:   Platform
  status:     AnalysisStatus
}

export interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

// ── URL Router ────────────────────────────────────────────────────────────────

export interface RouterResult {
  platform: Platform
  url:      string
  asin?:    string
  domain?:  string
}
