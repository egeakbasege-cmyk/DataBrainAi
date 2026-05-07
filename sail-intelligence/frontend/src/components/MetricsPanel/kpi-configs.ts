/**
 * src/components/MetricsPanel/kpi-configs.ts
 *
 * Context-aware KPI schema.
 * MetricsPanel reads the active domain and renders the matching config.
 *
 * Adding a new domain:
 *   1. Add an entry to KPI_CONFIGS keyed by domain string.
 *   2. MetricsPanel picks it up automatically — no component change needed.
 */

export type Domain =
  | 'ecommerce'
  | 'real_estate'
  | 'automotive'
  | 'social'
  | 'creator'
  | 'default'

export interface KPIDefinition {
  key:        string     // field path in the agent result or anomaly object
  label:      string     // human-readable display label
  unit:       string     // suffix: "%" | "USD" | "TL/m²" | …
  format:     'number' | 'currency' | 'percent' | 'rank' | 'score'
  highlight:  'up_good' | 'down_good' | 'neutral'
  description: string   // tooltip / hover description
}

export interface DomainKPIConfig {
  domain:       Domain
  displayName:  string
  kpis:         KPIDefinition[]
  radarLabels:  [string, string, string, string, string]  // exactly 5 axis labels
}

export const KPI_CONFIGS: Record<Domain, DomainKPIConfig> = {

  ecommerce: {
    domain:      'ecommerce',
    displayName: 'E-Commerce Intelligence',
    radarLabels: ['Price', 'Ad Strength', 'Logistics Speed', 'Reputation', 'Trend Momentum'],
    kpis: [
      { key: 'buy_box_pct',      label: 'Buy Box %',          unit: '%',   format: 'percent',  highlight: 'up_good',   description: 'Percentage of time winning the Buy Box' },
      { key: 'gross_margin_pct', label: 'Gross Margin',        unit: '%',   format: 'percent',  highlight: 'up_good',   description: 'Retail price minus sourcing and logistics cost' },
      { key: 'bsr',              label: 'Best Seller Rank',    unit: '#',   format: 'rank',     highlight: 'down_good', description: 'Amazon category rank — lower is better' },
      { key: 'stock_depth',      label: 'Stock Depth',         unit: 'units', format: 'number', highlight: 'up_good',   description: 'Units currently available from the seller' },
      { key: 'opportunity_score',label: 'Arbitrage Score',     unit: '/1',  format: 'score',    highlight: 'up_good',   description: 'Composite arbitrage opportunity rating 0–1' },
      { key: 'avg_ad_cpm',       label: 'Avg. Ad CPM',         unit: 'USD', format: 'currency', highlight: 'down_good', description: 'Average cost per thousand impressions across tracked ads' },
    ],
  },

  real_estate: {
    domain:      'real_estate',
    displayName: 'Real Estate Intelligence',
    radarLabels: ['Price/m²', 'Demand', 'Liquidity', 'Yield', 'Location Score'],
    kpis: [
      { key: 'price_per_sqm',    label: 'Price per m²',        unit: 'TL/m²', format: 'currency', highlight: 'neutral',  description: 'Current asking price per square meter' },
      { key: 'avg_ad_lifespan',  label: 'Avg. Listing Age',    unit: 'days',  format: 'number',   highlight: 'down_good', description: 'How long listings stay active before sale — lower = more liquid' },
      { key: 'rental_yield',     label: 'Gross Rental Yield',  unit: '%',     format: 'percent',  highlight: 'up_good',   description: 'Annual rent / property price × 100' },
      { key: 'trust_index',      label: 'Seller Trust Index',  unit: '/1',    format: 'score',    highlight: 'up_good',   description: 'Composite seller reliability score 0–1' },
      { key: 'price_delta_pct',  label: 'Price Change (30d)',  unit: '%',     format: 'percent',  highlight: 'neutral',   description: 'Percentage price change over the last 30 days' },
      { key: 'new_listings',     label: 'New Listings (7d)',   unit: '',      format: 'number',   highlight: 'neutral',   description: 'Count of new listings added in the past 7 days' },
    ],
  },

  automotive: {
    domain:      'automotive',
    displayName: 'Automotive Intelligence',
    radarLabels: ['Price', 'Demand', 'Depreciation', 'Mileage Score', 'Trend'],
    kpis: [
      { key: 'avg_asking_price', label: 'Avg. Asking Price',   unit: 'TL',  format: 'currency', highlight: 'neutral',  description: 'Average asking price across tracked listings' },
      { key: 'avg_ad_lifespan',  label: 'Avg. Days on Market', unit: 'days', format: 'number',  highlight: 'down_good', description: 'Average listing age before sale or removal' },
      { key: 'depreciation_pct', label: 'Depreciation Rate',   unit: '%',   format: 'percent',  highlight: 'down_good', description: 'Estimated annual depreciation for the model' },
      { key: 'demand_score',     label: 'Demand Score',        unit: '/1',  format: 'score',    highlight: 'up_good',   description: 'Search volume + enquiry rate composite 0–1' },
      { key: 'price_delta_pct',  label: 'Price Trend (30d)',   unit: '%',   format: 'percent',  highlight: 'neutral',   description: 'Market average price change over 30 days' },
      { key: 'new_listings',     label: 'Supply (7d)',         unit: '',    format: 'number',   highlight: 'neutral',   description: 'New listings added in the past 7 days' },
    ],
  },

  social: {
    domain:      'social',
    displayName: 'Social & Ad Intelligence',
    radarLabels: ['Ad Strength', 'Reach', 'Engagement', 'Sentiment', 'Trend Momentum'],
    kpis: [
      { key: 'avg_engagement_rate', label: 'Avg. Engagement Rate', unit: '%',  format: 'percent', highlight: 'up_good',   description: 'Average (likes+comments+shares)/reach across tracked ads' },
      { key: 'avg_cpm',            label: 'Avg. CPM',              unit: 'USD', format: 'currency', highlight: 'down_good', description: 'Average cost per thousand impressions' },
      { key: 'avg_cpc',            label: 'Avg. CPC',              unit: 'USD', format: 'currency', highlight: 'down_good', description: 'Average cost per click' },
      { key: 'virality_score',     label: 'Virality Score',        unit: '/1',  format: 'score',    highlight: 'up_good',   description: 'Normalised share velocity composite 0–1' },
      { key: 'active_ads',         label: 'Active Competitor Ads', unit: '',    format: 'number',   highlight: 'neutral',   description: 'Currently running ads tracked in the library' },
      { key: 'avg_sentiment',      label: 'Avg. Sentiment',        unit: '/1',  format: 'score',    highlight: 'up_good',   description: 'NLP sentiment composite across ad copy −1→+1' },
    ],
  },

  creator: {
    domain:      'creator',
    displayName: 'Creator Economy Intelligence',
    radarLabels: ['Reach', 'Playlist Velocity', 'Engagement', 'Trend', 'Monetisation'],
    kpis: [
      { key: 'monthly_listeners',  label: 'Monthly Listeners',   unit: '',    format: 'number',   highlight: 'up_good',   description: 'Total monthly listeners on Spotify' },
      { key: 'playlist_adds_7d',   label: 'Playlist Adds (7d)',  unit: '',    format: 'number',   highlight: 'up_good',   description: 'New playlist additions in the last 7 days' },
      { key: 'engagement_rate',    label: 'Engagement Rate',     unit: '%',   format: 'percent',  highlight: 'up_good',   description: 'Saves + shares / plays ratio' },
      { key: 'virality_score',     label: 'Virality Score',      unit: '/1',  format: 'score',    highlight: 'up_good',   description: 'Rate-of-spread composite score 0–1' },
      { key: 'streams_delta_pct',  label: 'Stream Growth (30d)', unit: '%',   format: 'percent',  highlight: 'up_good',   description: 'Percentage stream count change over 30 days' },
      { key: 'top_playlist_reach', label: 'Top Playlist Reach',  unit: '',    format: 'number',   highlight: 'up_good',   description: 'Followers of the highest-reach playlist featuring the artist' },
    ],
  },

  default: {
    domain:      'default',
    displayName: 'Market Intelligence',
    radarLabels: ['Price', 'Ad Strength', 'Logistics Speed', 'Reputation', 'Trend Momentum'],
    kpis: [
      { key: 'opportunity_score', label: 'Opportunity Score',  unit: '/1', format: 'score',   highlight: 'up_good',  description: 'Composite market opportunity rating 0–1' },
      { key: 'anomaly_count',     label: 'Active Anomalies',   unit: '',   format: 'number',  highlight: 'neutral',  description: 'Number of live anomaly signals' },
      { key: 'entity_links',      label: 'Entity Links Found', unit: '',   format: 'number',  highlight: 'up_good',  description: 'Cross-platform identities resolved' },
      { key: 'forecasts',         label: 'Active Forecasts',   unit: '',   format: 'number',  highlight: 'neutral',  description: 'Number of live price/inventory forecasts' },
      { key: 'pl_simulations',    label: 'P&L Simulations',    unit: '',   format: 'number',  highlight: 'neutral',  description: 'Margin simulations computed this run' },
      { key: 'copy_angles',       label: 'Copy Angles',        unit: '',   format: 'number',  highlight: 'up_good',  description: 'Ad copy angles generated by NLP agent' },
    ],
  },
}
