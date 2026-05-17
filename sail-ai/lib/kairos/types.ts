// ── KAIROS Data Lab — Type Definitions ────────────────────────────────────────

export type KairosPlatform     = 'SHOPIFY' | 'AMAZON'
export type KairosAnalysisStatus = 'PENDING' | 'SCRAPING' | 'ANALYZING' | 'COMPLETE' | 'ERROR'

// ── Shopify Types ─────────────────────────────────────────────────────────────

export interface ShopifyVariant {
  id:               number
  title:            string
  price:            string
  compare_at_price: string | null
  sku:              string
  inventory_quantity?: number
  available:        boolean
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
  title:    string
  body:     string
  rating:   number
  date:     string
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
  strengths:      string[]
  weaknesses:     string[]
  pricePosition:  'premium' | 'mid-market' | 'budget' | 'unknown'
  targetAudience: string
}

export interface KairosVulnerability {
  category:    string
  finding:     string
  severity:    'HIGH' | 'MEDIUM' | 'LOW'
  opportunity: string
}

export interface BattlePlanStep {
  step:        number
  title:       string
  description: string
  timeframe:   string
  effort:      'HIGH' | 'MEDIUM' | 'LOW'
}

export interface AdCreativeScript {
  platform: 'TikTok' | 'Instagram' | 'YouTube Shorts'
  hook:     string
  script:   string
  cta:      string
}

export interface SupplierEstimate {
  productTitle:   string
  retailPrice:    number
  estimatedCost:  number
  grossMargin:    number
  grossMarginPct: number
}

export interface KairosAIAnalysis {
  summary:              string
  marketPositioning:    MarketPositioning
  vulnerabilities:      KairosVulnerability[]
  actionableBattlePlan: BattlePlanStep[]
  seoKeywordsToTarget:  string[]
  adCreativeScript:     AdCreativeScript
  supplierMatrix:       SupplierEstimate[]
  competitorScore:      number
  generatedAt:          string
}

// ── API Response Types ────────────────────────────────────────────────────────

export interface KairosAnalysisRecord {
  id:          string
  platform:    KairosPlatform
  targetUrl:   string
  targetName:  string
  status:      KairosAnalysisStatus
  rawData:     ShopifyRawData | AmazonRawData | Record<string, unknown>
  aiAnalysis:  KairosAIAnalysis | Record<string, unknown>
  createdAt:   string
  updatedAt:   string
}

export interface KairosChatMessage {
  role:    'user' | 'assistant'
  content: string
}

export interface RouterResult {
  platform: KairosPlatform
  url:      string
  asin?:    string
  domain?:  string
}
