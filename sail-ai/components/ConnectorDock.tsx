'use client'

/**
 * ConnectorDock — platform data source selector
 * Horizontal scrollable pill row with master on/off toggle.
 * Persisted to localStorage via connectorStore (zustand).
 */

import { useState, useEffect } from 'react'

// ── Connector definitions ────────────────────────────────────────────────────

export interface ConnectorDef {
  id:          string
  label:       string
  domain:      string
  icon:        string
  accentColor: string   // CSS color for active state
}

export const ALL_CONNECTORS: ConnectorDef[] = [
  // E-Commerce
  { id: 'ebay-product-price',   label: 'eBay',          domain: 'ecommerce',  icon: '🛒', accentColor: '#EAB308' },
  { id: 'amazon-product-price', label: 'Amazon',        domain: 'ecommerce',  icon: '📦', accentColor: '#F97316' },
  { id: 'etsy-marketplace',     label: 'Etsy',          domain: 'ecommerce',  icon: '🧶', accentColor: '#EA580C' },
  { id: 'walmart-marketplace',  label: 'Walmart',       domain: 'ecommerce',  icon: '🏪', accentColor: '#3B82F6' },
  { id: 'aliexpress-sourcing',  label: 'AliExpress',    domain: 'ecommerce',  icon: '🚢', accentColor: '#EF4444' },
  { id: 'shopify-store',        label: 'Shopify',       domain: 'ecommerce',  icon: '🏬', accentColor: '#22C55E' },
  // Social & Ads
  { id: 'tiktok-ads',           label: 'TikTok',        domain: 'social',     icon: '🎵', accentColor: '#EC4899' },
  { id: 'meta-ads',             label: 'Meta Ads',      domain: 'social',     icon: '📘', accentColor: '#2563EB' },
  { id: 'pinterest-shopping',   label: 'Pinterest',     domain: 'social',     icon: '📌', accentColor: '#DC2626' },
  // Creator
  { id: 'youtube-creator',      label: 'YouTube',       domain: 'creator',    icon: '▶️', accentColor: '#EF4444' },
  { id: 'spotify-creator',      label: 'Spotify',       domain: 'creator',    icon: '🎵', accentColor: '#16A34A' },
  // Secondhand
  { id: 'poshmark-resale',      label: 'Poshmark',      domain: 'secondhand', icon: '👗', accentColor: '#A855F7' },
  // Analytics
  { id: 'google-trends',        label: 'Trends',        domain: 'analytics',  icon: '📈', accentColor: '#06B6D4' },
  // Local
  { id: 'real-estate',          label: 'Real Estate',   domain: 'local',      icon: '🏠', accentColor: '#10B981' },
]

const DOMAIN_GROUPS: { domain: string; label: string }[] = [
  { domain: 'ecommerce',  label: 'Marketplace' },
  { domain: 'social',     label: 'Social & Ads' },
  { domain: 'creator',    label: 'Creator' },
  { domain: 'secondhand', label: 'Resale' },
  { domain: 'analytics',  label: 'Analytics' },
  { domain: 'local',      label: 'Real Estate' },
]

const STORAGE_KEY = 'sail-connector-store-v2'

interface StoredState {
  enabledIds:     string[]
  analysisActive: boolean
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredState
  } catch { /* ignore */ }
  return { enabledIds: ['ebay-product-price', 'tiktok-ads', 'google-trends'], analysisActive: true }
}

function saveState(s: StoredState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* ignore */ }
}

// ── Exported hook — use this in chat/page.tsx ─────────────────────────────────

export function useConnectorState() {
  const [enabledIds,     setEnabledIds]     = useState<Set<string>>(new Set())
  const [analysisActive, setAnalysisActive] = useState(true)
  const [mounted,        setMounted]        = useState(false)

  useEffect(() => {
    const s = loadState()
    setEnabledIds(new Set(s.enabledIds))
    setAnalysisActive(s.analysisActive)
    setMounted(true)
  }, [])

  function toggle(id: string) {
    setEnabledIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveState({ enabledIds: Array.from(next), analysisActive })
      return next
    })
  }

  function setActive(v: boolean) {
    setAnalysisActive(v)
    saveState({ enabledIds: Array.from(enabledIds), analysisActive: v })
  }

  function enableAll()  { const all = ALL_CONNECTORS.map(c => c.id); setEnabledIds(new Set(all)); saveState({ enabledIds: all, analysisActive }) }
  function disableAll() { setEnabledIds(new Set()); saveState({ enabledIds: [], analysisActive }) }

  const activeConnectorIds = mounted && analysisActive ? Array.from(enabledIds) : []

  return { enabledIds, analysisActive, toggle, setActive, enableAll, disableAll, activeConnectorIds, mounted }
}

// ── ConnectorDock component ───────────────────────────────────────────────────

interface ConnectorDockProps {
  enabledIds:     Set<string>
  analysisActive: boolean
  onToggle:       (id: string) => void
  onSetActive:    (v: boolean) => void
  onEnableAll:    () => void
  onDisableAll:   () => void
  onImportClick:  () => void
}

export function ConnectorDock({
  enabledIds,
  analysisActive,
  onToggle,
  onSetActive,
  onEnableAll,
  onDisableAll,
  onImportClick,
}: ConnectorDockProps) {
  const grouped = DOMAIN_GROUPS.map(g => ({
    ...g,
    connectors: ALL_CONNECTORS.filter(c => c.domain === g.domain),
  })).filter(g => g.connectors.length > 0)

  return (
    <div style={{
      background:   '#FFFFFF',
      border:       '1.5px solid rgba(0,0,0,0.08)',
      borderRadius: '14px',
      overflow:     'hidden',
      marginBottom: '0.625rem',
      boxShadow:    '0 2px 8px rgba(0,0,0,0.04)',
      opacity:      analysisActive ? 1 : 0.6,
      transition:   'opacity 0.2s',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 1rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Master toggle */}
          <button
            onClick={() => onSetActive(!analysisActive)}
            title={analysisActive ? 'Connector analysis on' : 'Connector analysis off'}
            style={{
              position:        'relative',
              width:           32,
              height:          16,
              borderRadius:    999,
              background:      analysisActive ? '#C9A96E' : '#D1D5DB',
              border:          'none',
              cursor:          'pointer',
              flexShrink:      0,
              transition:      'background 0.2s',
              padding:         0,
            }}
          >
            <span style={{
              position:   'absolute',
              top:        2,
              left:       analysisActive ? 16 : 2,
              width:      12,
              height:     12,
              borderRadius: '50%',
              background: '#FFFFFF',
              boxShadow:  '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'left 0.2s',
            }} />
          </button>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', fontWeight: 600, color: '#0C0C0E' }}>
            Connector Analysis
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#9CA3AF' }}>
            — hangi platformları analiz etsin?
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={onEnableAll}   style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>Tümünü aç</button>
          <span style={{ color: '#E5E7EB', fontSize: '0.7rem' }}>·</span>
          <button onClick={onDisableAll}  style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>Kapat</button>
          <span style={{ color: '#E5E7EB', fontSize: '0.7rem' }}>·</span>
          <button onClick={onImportClick} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: '#C9A96E', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>+ Verim Ekle</button>
        </div>
      </div>

      {/* Pill row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.625rem 1rem', overflowX: 'auto' }}>
        {grouped.map(group => (
          <div key={group.domain} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9CA3AF', paddingLeft: 2 }}>
              {group.label}
            </span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {group.connectors.map(c => {
                const active = analysisActive && enabledIds.has(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => onToggle(c.id)}
                    title={c.label}
                    style={{
                      display:       'flex',
                      flexDirection: 'column',
                      alignItems:    'center',
                      gap:           '0.15rem',
                      padding:       '0.35rem 0.5rem',
                      borderRadius:  '8px',
                      border:        `1px solid ${active ? c.accentColor + '55' : 'rgba(0,0,0,0.07)'}`,
                      background:    active ? c.accentColor + '12' : 'rgba(0,0,0,0.02)',
                      cursor:        'pointer',
                      minWidth:      52,
                      transition:    'all 0.15s',
                      position:      'relative',
                    }}
                  >
                    {active && (
                      <span style={{
                        position:     'absolute',
                        top:          3,
                        right:        3,
                        width:        4,
                        height:       4,
                        borderRadius: '50%',
                        background:   c.accentColor,
                        animation:    'pulse 2s infinite',
                      }} />
                    )}
                    <span style={{ fontSize: '1rem', lineHeight: 1 }}>{c.icon}</span>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.55rem', fontWeight: 500, color: active ? c.accentColor : '#9CA3AF', whiteSpace: 'nowrap' }}>
                      {c.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
