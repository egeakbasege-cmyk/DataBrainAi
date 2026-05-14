'use client'

/**
 * ConnectorDock — platform data source selector
 * Uses official SVG logos from simpleicons.org CDN.
 * Persisted to localStorage.
 */

import { useState, useEffect } from 'react'

// ── Connector definitions ────────────────────────────────────────────────────

export interface ConnectorDef {
  id:          string
  label:       string
  domain:      string
  /** simpleicons slug, e.g. "ebay" → cdn.simpleicons.org/ebay/{color} */
  siSlug?:     string
  /** jsdelivr path for icons not on simpleicons CDN */
  jsdSlug?:    string
  /** Fallback letter when no icon available */
  letter?:     string
  accentColor: string
}

export const ALL_CONNECTORS: ConnectorDef[] = [
  { id: 'ebay-product-price',   label: 'eBay',       domain: 'ecommerce',  siSlug: 'ebay',       accentColor: '#E43137' },
  { id: 'amazon-product-price', label: 'Amazon',     domain: 'ecommerce',  jsdSlug: 'amazon',    accentColor: '#FF9900' },
  { id: 'etsy-marketplace',     label: 'Etsy',       domain: 'ecommerce',  siSlug: 'etsy',       accentColor: '#F16521' },
  { id: 'walmart-marketplace',  label: 'Walmart',    domain: 'ecommerce',  jsdSlug: 'walmart',   accentColor: '#0071CE' },
  { id: 'aliexpress-sourcing',  label: 'AliExpress', domain: 'ecommerce',  siSlug: 'aliexpress', accentColor: '#FF6A00' },
  { id: 'shopify-store',        label: 'Shopify',    domain: 'ecommerce',  siSlug: 'shopify',    accentColor: '#96BF48' },
  { id: 'tiktok-ads',           label: 'TikTok',     domain: 'social',     siSlug: 'tiktok',     accentColor: '#010101' },
  { id: 'meta-ads',             label: 'Meta',       domain: 'social',     siSlug: 'meta',       accentColor: '#0467DF' },
  { id: 'pinterest-shopping',   label: 'Pinterest',  domain: 'social',     siSlug: 'pinterest',  accentColor: '#BD081C' },
  { id: 'youtube-creator',      label: 'YouTube',    domain: 'creator',    siSlug: 'youtube',    accentColor: '#FF0000' },
  { id: 'spotify-creator',      label: 'Spotify',    domain: 'creator',    siSlug: 'spotify',    accentColor: '#1ED760' },
  { id: 'poshmark-resale',      label: 'Poshmark',   domain: 'secondhand', letter: 'P',          accentColor: '#7D3F98' },
  { id: 'google-trends',        label: 'Trends',     domain: 'analytics',  siSlug: 'google',     accentColor: '#4285F4' },
  { id: 'real-estate',          label: 'Real Estate',domain: 'local',      letter: '🏠',         accentColor: '#10B981' },
]

const DOMAIN_GROUPS = [
  { domain: 'ecommerce',  label: 'Marketplace' },
  { domain: 'social',     label: 'Social & Ads' },
  { domain: 'creator',    label: 'Creator' },
  { domain: 'secondhand', label: 'Resale' },
  { domain: 'analytics',  label: 'Analytics' },
  { domain: 'local',      label: 'Real Estate' },
]

// ── Logo component ────────────────────────────────────────────────────────────

function ConnectorLogo({ c, active, size = 22 }: { c: ConnectorDef; active: boolean; size?: number }) {
  const [imgError, setImgError] = useState(false)

  const src = c.siSlug
    ? `https://cdn.simpleicons.org/${c.siSlug}/${active ? c.accentColor.replace('#', '') : 'A0A0A0'}`
    : c.jsdSlug
    ? `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${c.jsdSlug}.svg`
    : null

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={c.label}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        style={{
          display:  'block',
          filter:   c.jsdSlug && !active ? 'grayscale(1) opacity(0.5)'
                  : c.jsdSlug && active  ? `opacity(1)` + colorFilter(c.accentColor)
                  : undefined,
          transition: 'filter 0.15s',
        }}
      />
    )
  }

  // Fallback: letter or emoji badge
  const letter = c.letter ?? c.label[0]
  return (
    <span style={{
      display:      'flex',
      alignItems:   'center',
      justifyContent: 'center',
      width:        size,
      height:       size,
      borderRadius: 4,
      background:   active ? c.accentColor + '22' : '#F3F4F6',
      color:        active ? c.accentColor : '#9CA3AF',
      fontSize:     letter.length === 1 ? size * 0.6 : size * 0.85,
      fontWeight:   700,
      lineHeight:   1,
      fontFamily:   'Inter, sans-serif',
      flexShrink:   0,
    }}>
      {letter}
    </span>
  )
}

/**
 * Generate a CSS filter to tint a black SVG to a target hex color.
 * Used for jsdelivr icons (which are black by default).
 */
function colorFilter(hex: string): string {
  // Parse hex to RGB
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  // Rough approximation using sepia + hue-rotate + saturate
  // Good enough for brand colors; precise calculation not needed
  const hue = Math.round(Math.atan2(
    Math.sqrt(3) * (g - b),
    2 * r - g - b
  ) * 180 / Math.PI)
  const sat = Math.round(Math.max(r, g, b) === 0 ? 0 :
    (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b) * 100)
  return ` sepia(1) saturate(${sat * 5}%) hue-rotate(${hue}deg)`
}

// ── localStorage persistence ──────────────────────────────────────────────────

const STORAGE_KEY = 'sail-connector-store-v2'

interface StoredState { enabledIds: string[]; analysisActive: boolean }

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

// ── Exported hook ─────────────────────────────────────────────────────────────

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

  function enableAll()  {
    const all = ALL_CONNECTORS.map(c => c.id)
    setEnabledIds(new Set(all))
    saveState({ enabledIds: all, analysisActive })
  }

  function disableAll() {
    setEnabledIds(new Set())
    saveState({ enabledIds: [], analysisActive })
  }

  const activeConnectorIds = mounted && analysisActive ? Array.from(enabledIds) : []

  return { enabledIds, analysisActive, toggle, setActive, enableAll, disableAll, activeConnectorIds, mounted }
}

// ── ConnectorDock component ───────────────────────────────────────────────────

interface ConnectorDockProps {
  enabledIds:    Set<string>
  analysisActive: boolean
  onToggle:      (id: string) => void
  onSetActive:   (v: boolean) => void
  onEnableAll:   () => void
  onDisableAll:  () => void
  onImportClick: () => void
}

export function ConnectorDock({
  enabledIds, analysisActive, onToggle, onSetActive, onEnableAll, onDisableAll, onImportClick,
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
      opacity:      analysisActive ? 1 : 0.65,
      transition:   'opacity 0.2s',
    }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.875rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {/* Master toggle */}
          <button
            onClick={() => onSetActive(!analysisActive)}
            style={{
              position:   'relative',
              width:      28,
              height:     15,
              borderRadius: 999,
              background: analysisActive ? '#C9A96E' : '#D1D5DB',
              border:     'none',
              cursor:     'pointer',
              flexShrink: 0,
              transition: 'background 0.2s',
              padding:    0,
            }}
          >
            <span style={{
              position:   'absolute',
              top:        1.5,
              left:       analysisActive ? 14 : 1.5,
              width:      12,
              height:     12,
              borderRadius: '50%',
              background: '#FFF',
              boxShadow:  '0 1px 3px rgba(0,0,0,0.2)',
              transition: 'left 0.2s',
              display:    'block',
            }} />
          </button>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', fontWeight: 600, color: '#0C0C0E' }}>
            Connector Analysis
          </span>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.62rem', color: '#9CA3AF' }}>
            — hangi platformları analiz etsin?
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button onClick={onEnableAll}   style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Tümünü aç</button>
          <span style={{ color: '#E5E7EB' }}>·</span>
          <button onClick={onDisableAll}  style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Kapat</button>
          <span style={{ color: '#E5E7EB' }}>·</span>
          <button onClick={onImportClick} style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', color: '#C9A96E', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>+ Verim Ekle</button>
        </div>
      </div>

      {/* Pill row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.5rem 0.875rem 0.625rem', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {grouped.map(group => (
          <div key={group.domain} style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.52rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C4C4CC', paddingLeft: 1 }}>
              {group.label}
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
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
                      gap:           '0.2rem',
                      padding:       '0.35rem 0.45rem',
                      borderRadius:  '8px',
                      border:        `1.5px solid ${active ? c.accentColor + '44' : 'rgba(0,0,0,0.07)'}`,
                      background:    active ? c.accentColor + '10' : 'rgba(0,0,0,0.015)',
                      cursor:        'pointer',
                      minWidth:      48,
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
                      }} />
                    )}
                    <ConnectorLogo c={c} active={active} size={20} />
                    <span style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize:   '0.52rem',
                      fontWeight: 500,
                      color:      active ? c.accentColor : '#9CA3AF',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                    }}>
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
