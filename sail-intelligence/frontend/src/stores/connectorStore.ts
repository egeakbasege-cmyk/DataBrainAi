/**
 * src/stores/connectorStore.ts
 *
 * Zustand store for connector selection dock and user data sources.
 *
 * Persisted to localStorage so selections survive page refresh.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Connector registry ─────────────────────────────────────────────────────────

export interface ConnectorDef {
  id:          string
  label:       string
  domain:      string
  icon:        string          // emoji icon
  color:       string          // tailwind bg color class
  description: string
}

export const ALL_CONNECTORS: ConnectorDef[] = [
  // E-Commerce
  { id: 'ebay-product-price',   label: 'eBay',          domain: 'ecommerce',  icon: '🛒', color: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400', description: 'Product listings, arbitrage, auctions' },
  { id: 'amazon-product-price', label: 'Amazon',        domain: 'ecommerce',  icon: '📦', color: 'bg-orange-500/20 border-orange-500/40 text-orange-400', description: 'Products, BSR, pricing intel' },
  { id: 'etsy-marketplace',     label: 'Etsy',          domain: 'ecommerce',  icon: '🧶', color: 'bg-orange-600/20 border-orange-600/40 text-orange-300', description: 'Handmade, vintage & craft market' },
  { id: 'walmart-marketplace',  label: 'Walmart',       domain: 'ecommerce',  icon: '🏪', color: 'bg-blue-500/20 border-blue-500/40 text-blue-400',   description: 'Retail & marketplace listings' },
  { id: 'aliexpress-sourcing',  label: 'AliExpress',    domain: 'ecommerce',  icon: '🚢', color: 'bg-red-500/20 border-red-500/40 text-red-400',      description: 'Sourcing & arbitrage margins' },
  { id: 'shopify-store',        label: 'Shopify',       domain: 'ecommerce',  icon: '🏬', color: 'bg-green-500/20 border-green-500/40 text-green-400', description: 'Competitor store analysis' },
  // Social & Ads
  { id: 'tiktok-ads',           label: 'TikTok',        domain: 'social',     icon: '🎵', color: 'bg-pink-500/20 border-pink-500/40 text-pink-400',    description: 'Viral content & TikTok Shop' },
  { id: 'meta-ads',             label: 'Meta Ads',      domain: 'social',     icon: '📘', color: 'bg-blue-600/20 border-blue-600/40 text-blue-300',   description: 'Facebook & Instagram ads intel' },
  { id: 'pinterest-shopping',   label: 'Pinterest',     domain: 'social',     icon: '📌', color: 'bg-red-600/20 border-red-600/40 text-red-300',      description: 'Visual shopping trends' },
  // Creator
  { id: 'youtube-creator',      label: 'YouTube',       domain: 'creator',    icon: '▶️', color: 'bg-red-500/20 border-red-500/40 text-red-400',      description: 'Channel & video analytics' },
  { id: 'spotify-creator',      label: 'Spotify',       domain: 'creator',    icon: '🎵', color: 'bg-green-600/20 border-green-600/40 text-green-300', description: 'Artist & playlist intelligence' },
  // Secondhand
  { id: 'poshmark-resale',      label: 'Poshmark',      domain: 'secondhand', icon: '👗', color: 'bg-purple-500/20 border-purple-500/40 text-purple-400', description: 'Resale & brand premium signals' },
  // Analytics
  { id: 'google-trends',        label: 'Google Trends', domain: 'analytics',  icon: '📈', color: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400',   description: 'Search trend momentum' },
  // Local Markets
  { id: 'real-estate',          label: 'Real Estate',   domain: 'local',      icon: '🏠', color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400', description: 'Multi-market property intel' },
]

// ── User data sources ──────────────────────────────────────────────────────────

export interface UserDataSource {
  id:           string
  type:         'url' | 'oauth'
  platform:     string
  label:        string
  url?:         string
  connected_at: string
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface ConnectorState {
  // Which connectors are enabled in the dock
  enabledIds:    Set<string>
  // Analysis toggle (master switch — like "use profile context")
  analysisActive: boolean
  // User-imported data sources
  userSources:   UserDataSource[]
  // Import drawer open state
  importOpen:    boolean

  toggleConnector:   (id: string) => void
  enableAll:         () => void
  disableAll:        () => void
  setAnalysisActive: (v: boolean) => void
  addUserSource:     (source: Omit<UserDataSource, 'id' | 'connected_at'>) => void
  removeUserSource:  (id: string) => void
  setImportOpen:     (v: boolean) => void
}

export const useConnectorStore = create<ConnectorState>()(
  persist(
    (set, _get) => ({
      enabledIds:     new Set<string>(['ebay-product-price', 'tiktok-ads', 'google-trends']),
      analysisActive: true,
      userSources:    [],
      importOpen:     false,

      toggleConnector: (id) =>
        set((s) => {
          const next = new Set(s.enabledIds)
          next.has(id) ? next.delete(id) : next.add(id)
          return { enabledIds: next }
        }),

      enableAll:  () => set({ enabledIds: new Set(ALL_CONNECTORS.map(c => c.id)) }),
      disableAll: () => set({ enabledIds: new Set() }),

      setAnalysisActive: (v) => set({ analysisActive: v }),

      addUserSource: (src) =>
        set((s) => ({
          userSources: [
            ...s.userSources,
            { ...src, id: crypto.randomUUID(), connected_at: new Date().toISOString() },
          ],
        })),

      removeUserSource: (id) =>
        set((s) => ({ userSources: s.userSources.filter(x => x.id !== id) })),

      setImportOpen: (v) => set({ importOpen: v }),
    }),
    {
      name: 'sail-connector-store',
      // Serialize Set as array for localStorage
      partialize: (s) => ({
        enabledIds:     Array.from(s.enabledIds),
        analysisActive: s.analysisActive,
        userSources:    s.userSources,
      }),
      merge: (persisted: any, current) => ({
        ...current,
        enabledIds:     new Set((persisted as any).enabledIds ?? []),
        analysisActive: (persisted as any).analysisActive ?? true,
        userSources:    (persisted as any).userSources ?? [],
      }),
    },
  ),
)
