'use client'

/**
 * UserDataImport — slide-over drawer for user-owned store/seller data.
 * Two tabs: URL import and OAuth connect.
 */

import { useState, useEffect } from 'react'

// ── User source types ─────────────────────────────────────────────────────────

export interface UserDataSource {
  id:           string
  type:         'url' | 'oauth'
  platform:     string
  label:        string
  url?:         string
  connected_at: string
}

const SOURCES_KEY = 'sail-user-sources-v2'

export function loadUserSources(): UserDataSource[] {
  try { return JSON.parse(localStorage.getItem(SOURCES_KEY) ?? '[]') as UserDataSource[] } catch { return [] }
}

export function saveUserSources(sources: UserDataSource[]) {
  try { localStorage.setItem(SOURCES_KEY, JSON.stringify(sources)) } catch { /* ignore */ }
}

// ── Platform detection ────────────────────────────────────────────────────────

function detectPlatform(url: string): { name: string; icon: string; color: string } {
  const l = url.toLowerCase()
  if (l.includes('shopify') || l.includes('myshopify')) return { name: 'Shopify',    icon: '🏬', color: '#22C55E' }
  if (l.includes('etsy.com'))                            return { name: 'Etsy',       icon: '🧶', color: '#EA580C' }
  if (l.includes('amazon.com'))                          return { name: 'Amazon',     icon: '📦', color: '#F97316' }
  if (l.includes('ebay.com'))                            return { name: 'eBay',       icon: '🛒', color: '#EAB308' }
  if (l.includes('walmart.com'))                         return { name: 'Walmart',    icon: '🏪', color: '#3B82F6' }
  if (l.includes('poshmark.com'))                        return { name: 'Poshmark',   icon: '👗', color: '#A855F7' }
  if (l.includes('aliexpress.com'))                      return { name: 'AliExpress', icon: '🚢', color: '#EF4444' }
  if (l.includes('tiktok.com'))                          return { name: 'TikTok',     icon: '🎵', color: '#EC4899' }
  if (l.includes('youtube.com') || l.includes('youtu.be')) return { name: 'YouTube', icon: '▶️', color: '#EF4444' }
  if (l.includes('pinterest.com'))                       return { name: 'Pinterest',  icon: '📌', color: '#DC2626' }
  return { name: 'Custom URL', icon: '🔗', color: '#C9A96E' }
}

const OAUTH_PLATFORMS = [
  { id: 'shopify',  name: 'Shopify',       icon: '🏬', desc: 'Store products, orders & analytics', color: '#22C55E' },
  { id: 'amazon',   name: 'Amazon Seller', icon: '📦', desc: 'Seller Central: inventory, BSR',      color: '#F97316' },
  { id: 'etsy',     name: 'Etsy Shop',     icon: '🧶', desc: 'Listings, reviews & traffic',         color: '#EA580C' },
  { id: 'tiktok',   name: 'TikTok Shop',   icon: '🎵', desc: 'Shop orders, products & analytics',   color: '#EC4899' },
]

// ── Styles ────────────────────────────────────────────────────────────────────

const BASE_FONT = { fontFamily: 'Inter, sans-serif' }
const LABEL_STYLE = { ...BASE_FONT, fontSize: '0.65rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: '0.4rem' }
const INPUT_STYLE = {
  ...BASE_FONT,
  width:          '100%',
  padding:        '0.5rem 0.75rem',
  border:         '1.5px solid rgba(0,0,0,0.1)',
  borderRadius:   '8px',
  fontSize:       '0.8rem',
  color:          '#0C0C0E',
  background:     '#FAFAFA',
  outline:        'none',
  boxSizing:      'border-box' as const,
  transition:     'border-color 0.15s',
}
const BTN_GOLD = {
  ...BASE_FONT,
  width:          '100%',
  padding:        '0.5rem',
  background:     '#C9A96E',
  color:          '#FFFFFF',
  border:         'none',
  borderRadius:   '8px',
  fontSize:       '0.8rem',
  fontWeight:     600,
  cursor:         'pointer',
  marginTop:      '0.5rem',
}

// ── URL Import Tab ────────────────────────────────────────────────────────────

function URLTab({ sources, onAdd, onRemove }: { sources: UserDataSource[]; onAdd: (s: Omit<UserDataSource, 'id' | 'connected_at'>) => void; onRemove: (id: string) => void }) {
  const [url,     setUrl]     = useState('')
  const [label,   setLabel]   = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const detected = url.trim() ? detectPlatform(url.trim()) : null
  const urlSources = sources.filter(s => s.type === 'url')

  async function handleAdd() {
    const trimmed = url.trim()
    if (!trimmed) return
    setError('')
    try { new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`) }
    catch { setError('Geçerli bir URL girin (örn: https://mystore.myshopify.com)'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    onAdd({ type: 'url', platform: detected?.name ?? 'Custom', label: label.trim() || detected?.name || trimmed, url: trimmed.startsWith('http') ? trimmed : `https://${trimmed}` })
    setUrl(''); setLabel(''); setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <p style={{ ...BASE_FONT, fontSize: '0.72rem', color: '#6B7280', margin: 0 }}>
        Mağaza, satıcı profili veya ürün sayfası URL'sini yapıştır.
      </p>

      <div style={{ position: 'relative' }}>
        <input
          style={{ ...INPUT_STYLE, paddingRight: detected ? 110 : undefined }}
          placeholder="https://mystore.myshopify.com"
          value={url}
          onChange={e => { setUrl(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter') void handleAdd() }}
        />
        {detected && (
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', ...BASE_FONT, fontSize: '0.65rem', color: detected.color, fontWeight: 600 }}>
            {detected.icon} {detected.name}
          </span>
        )}
      </div>

      <input
        style={INPUT_STYLE}
        placeholder="Etiket (opsiyonel — örn: 'Rakip Mağaza 1')"
        value={label}
        onChange={e => setLabel(e.target.value)}
      />

      {error && <p style={{ ...BASE_FONT, fontSize: '0.7rem', color: '#EF4444', margin: 0 }}>{error}</p>}

      <button onClick={() => void handleAdd()} disabled={!url.trim() || loading} style={{ ...BTN_GOLD, opacity: (!url.trim() || loading) ? 0.5 : 1 }}>
        {loading ? 'Ekleniyor…' : 'Kaynak Ekle'}
      </button>

      {urlSources.length > 0 && (
        <div>
          <p style={LABEL_STYLE}>Bağlı kaynaklar</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {urlSources.map(src => {
              const p = detectPlatform(src.url ?? '')
              return (
                <div key={src.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#F9FAFB', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                    <span style={{ fontSize: '1rem' }}>{p.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ ...BASE_FONT, fontSize: '0.72rem', fontWeight: 600, color: '#0C0C0E', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.label}</p>
                      <p style={{ ...BASE_FONT, fontSize: '0.62rem', color: '#9CA3AF', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.url}</p>
                    </div>
                  </div>
                  <button onClick={() => onRemove(src.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '0.75rem', flexShrink: 0, marginLeft: 8 }}>✕</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── OAuth Tab ─────────────────────────────────────────────────────────────────

function OAuthTab({ sources, onAdd, onRemove }: { sources: UserDataSource[]; onAdd: (s: Omit<UserDataSource, 'id' | 'connected_at'>) => void; onRemove: (id: string) => void }) {
  const [connecting, setConnecting] = useState<string | null>(null)
  const connectedIds = new Set(sources.filter(s => s.type === 'oauth').map(s => s.platform.toLowerCase()))

  async function handleConnect(p: typeof OAUTH_PLATFORMS[0]) {
    if (connectedIds.has(p.id)) return
    setConnecting(p.id)
    await new Promise(r => setTimeout(r, 1000))
    onAdd({ type: 'oauth', platform: p.name, label: `${p.name} Hesabım` })
    setConnecting(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      <p style={{ ...BASE_FONT, fontSize: '0.72rem', color: '#6B7280', margin: 0 }}>
        Hesabınla giriş yap — satıcı verilerine doğrudan erişerek derin analiz yap.
      </p>
      {OAUTH_PLATFORMS.map(p => {
        const isConnected  = connectedIds.has(p.id)
        const isConnecting = connecting === p.id
        const src = sources.find(s => s.type === 'oauth' && s.platform.toLowerCase() === p.id)

        return (
          <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.875rem', border: `1.5px solid ${p.color}33`, borderRadius: '10px', background: `${p.color}08` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <span style={{ fontSize: '1.4rem' }}>{p.icon}</span>
              <div>
                <p style={{ ...BASE_FONT, fontSize: '0.78rem', fontWeight: 600, color: '#0C0C0E', margin: 0 }}>{p.name}</p>
                <p style={{ ...BASE_FONT, fontSize: '0.65rem', color: '#9CA3AF', margin: 0 }}>{p.desc}</p>
              </div>
            </div>
            <div style={{ flexShrink: 0, marginLeft: 12 }}>
              {isConnected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ ...BASE_FONT, fontSize: '0.65rem', color: p.color, fontWeight: 600 }}>✓ Bağlı</span>
                  {src && <button onClick={() => onRemove(src.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '0.65rem' }}>Kes</button>}
                </div>
              ) : isConnecting ? (
                <span style={{ ...BASE_FONT, fontSize: '0.7rem', color: '#9CA3AF' }}>Bağlanıyor…</span>
              ) : (
                <button onClick={() => void handleConnect(p)} style={{ ...BASE_FONT, padding: '0.3rem 0.75rem', background: p.color, color: '#FFF', border: 'none', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                  Bağlan
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main Drawer ───────────────────────────────────────────────────────────────

export function UserDataImport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab,     setTab]     = useState<'url' | 'oauth'>('url')
  const [sources, setSources] = useState<UserDataSource[]>([])

  useEffect(() => { setSources(loadUserSources()) }, [])

  function addSource(src: Omit<UserDataSource, 'id' | 'connected_at'>) {
    const next = [...sources, { ...src, id: crypto.randomUUID(), connected_at: new Date().toISOString() }]
    setSources(next); saveUserSources(next)
  }

  function removeSource(id: string) {
    const next = sources.filter(s => s.id !== id)
    setSources(next); saveUserSources(next)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)', zIndex: 50 }}
      />
      {/* Drawer */}
      <div style={{
        position:    'fixed',
        top:         0,
        right:       0,
        height:      '100%',
        width:       '100%',
        maxWidth:    380,
        background:  '#FFFFFF',
        borderLeft:  '1px solid rgba(0,0,0,0.08)',
        zIndex:      51,
        display:     'flex',
        flexDirection: 'column',
        boxShadow:   '-8px 0 32px rgba(0,0,0,0.08)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div>
            <h2 style={{ ...BASE_FONT, fontSize: '0.875rem', fontWeight: 700, color: '#0C0C0E', margin: 0 }}>Verim Ekle</h2>
            <p style={{ ...BASE_FONT, fontSize: '0.65rem', color: '#9CA3AF', margin: '0.15rem 0 0' }}>
              {sources.length > 0 ? `${sources.length} kaynak bağlı` : 'Kendi mağaza verilerini getir'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#9CA3AF', lineHeight: 1 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          {(['url', 'oauth'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex:        1,
                padding:     '0.625rem',
                ...BASE_FONT,
                fontSize:    '0.72rem',
                fontWeight:  600,
                color:       tab === t ? '#C9A96E' : '#9CA3AF',
                background:  'none',
                border:      'none',
                borderBottom: tab === t ? '2px solid #C9A96E' : '2px solid transparent',
                cursor:      'pointer',
                transition:  'all 0.15s',
              }}
            >
              {t === 'url' ? '🔗 URL ile İçe Aktar' : '🔑 Hesabınla Bağlan'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {tab === 'url'
            ? <URLTab   sources={sources} onAdd={addSource} onRemove={removeSource} />
            : <OAuthTab sources={sources} onAdd={addSource} onRemove={removeSource} />
          }
        </div>

        {/* Footer */}
        <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid rgba(0,0,0,0.07)', background: '#FAFAFA' }}>
          <p style={{ ...BASE_FONT, fontSize: '0.62rem', color: '#9CA3AF', textAlign: 'center', margin: 0 }}>
            Veriler yalnızca analiz için kullanılır ve saklanmaz.
          </p>
        </div>
      </div>
    </>
  )
}

// ── Exported hook for user sources ───────────────────────────────────────────

export function useUserSources() {
  const [sources, setSources] = useState<UserDataSource[]>([])

  useEffect(() => { setSources(loadUserSources()) }, [])

  const userUrls = sources.filter(s => s.url).map(s => s.url as string)

  return { sources, userUrls }
}
