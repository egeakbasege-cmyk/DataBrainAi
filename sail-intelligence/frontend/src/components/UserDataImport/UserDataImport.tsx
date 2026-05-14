/**
 * src/components/UserDataImport/UserDataImport.tsx
 *
 * Slide-over drawer for importing user's own store/seller data.
 *
 * Two modes:
 *   1. URL Import — paste any store URL (Shopify, Etsy, Amazon seller page, etc.)
 *   2. OAuth Connect — one-click connect buttons for major platforms
 *
 * Connected sources are stored in connectorStore.userSources.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConnectorStore } from '@/stores/connectorStore'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'

// ── Platform detection from URL ───────────────────────────────────────────────

interface DetectedPlatform {
  name:  string
  icon:  string
  color: string
}

function detectPlatform(url: string): DetectedPlatform {
  const lower = url.toLowerCase()
  if (lower.includes('shopify') || lower.includes('myshopify'))
    return { name: 'Shopify', icon: '🏬', color: 'text-green-400' }
  if (lower.includes('etsy.com'))
    return { name: 'Etsy', icon: '🧶', color: 'text-orange-400' }
  if (lower.includes('amazon.com') || lower.includes('seller.amazon'))
    return { name: 'Amazon', icon: '📦', color: 'text-orange-300' }
  if (lower.includes('ebay.com'))
    return { name: 'eBay', icon: '🛒', color: 'text-yellow-400' }
  if (lower.includes('walmart.com'))
    return { name: 'Walmart', icon: '🏪', color: 'text-blue-400' }
  if (lower.includes('poshmark.com'))
    return { name: 'Poshmark', icon: '👗', color: 'text-purple-400' }
  if (lower.includes('aliexpress.com'))
    return { name: 'AliExpress', icon: '🚢', color: 'text-red-400' }
  if (lower.includes('tiktok.com'))
    return { name: 'TikTok', icon: '🎵', color: 'text-pink-400' }
  if (lower.includes('youtube.com') || lower.includes('youtu.be'))
    return { name: 'YouTube', icon: '▶️', color: 'text-red-400' }
  if (lower.includes('pinterest.com'))
    return { name: 'Pinterest', icon: '📌', color: 'text-red-300' }
  return { name: 'Custom URL', icon: '🔗', color: 'text-sail-accent' }
}

// ── OAuth platform definitions ────────────────────────────────────────────────

const OAUTH_PLATFORMS = [
  {
    id:          'shopify',
    name:        'Shopify',
    icon:        '🏬',
    color:       'bg-green-600/20 border-green-600/40 hover:bg-green-600/30',
    description: 'Store products, orders & analytics',
    note:        'Requires store URL',
  },
  {
    id:          'amazon',
    name:        'Amazon Seller',
    icon:        '📦',
    color:       'bg-orange-500/20 border-orange-500/40 hover:bg-orange-500/30',
    description: 'Seller Central: inventory, sales rank',
    note:        'SP-API credentials required',
  },
  {
    id:          'etsy',
    name:        'Etsy Shop',
    icon:        '🧶',
    color:       'bg-orange-600/20 border-orange-600/40 hover:bg-orange-600/30',
    description: 'Shop listings, reviews & traffic',
    note:        'OAuth via Etsy API',
  },
  {
    id:          'tiktok',
    name:        'TikTok Shop',
    icon:        '🎵',
    color:       'bg-pink-500/20 border-pink-500/40 hover:bg-pink-500/30',
    description: 'Shop orders, products & analytics',
    note:        'Seller Center account required',
  },
]

// ── URL Import tab ────────────────────────────────────────────────────────────

function URLImportTab() {
  const { addUserSource, userSources, removeUserSource } = useConnectorStore()
  const [url, setUrl]         = useState('')
  const [label, setLabel]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const detected = url.trim() ? detectPlatform(url.trim()) : null

  async function handleAdd() {
    const trimmed = url.trim()
    if (!trimmed) return
    setError('')
    setLoading(true)

    // Validate URL format
    try {
      new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    } catch {
      setError('Geçerli bir URL girin (örn: https://mystore.myshopify.com)')
      setLoading(false)
      return
    }

    // Small delay for UX
    await new Promise((r) => setTimeout(r, 600))

    addUserSource({
      type:     'url',
      platform: detected?.name ?? 'Custom',
      label:    label.trim() || detected?.name || trimmed,
      url:      trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
    })

    setUrl('')
    setLabel('')
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-sail-muted mb-3">
          Mağaza, satıcı profili veya ürün sayfası URL'sini yapıştır.
          Sistem platformu otomatik tanır ve veri çekme analizi başlatır.
        </p>

        {/* URL input */}
        <div className="space-y-2">
          <div className="relative">
            <input
              className="input-field w-full pr-16 text-sm"
              placeholder="https://mystore.myshopify.com"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
            />
            {detected && (
              <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${detected.color}`}>
                {detected.icon} {detected.name}
              </span>
            )}
          </div>

          <input
            className="input-field w-full text-sm"
            placeholder="Etiket (opsiyonel — örn: 'Rakip Mağaza 1')"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />

          {error && (
            <p className="text-xs text-sail-danger">{error}</p>
          )}

          <Button
            onClick={handleAdd}
            loading={loading}
            disabled={!url.trim()}
            size="sm"
            className="w-full"
          >
            Kaynak Ekle
          </Button>
        </div>
      </div>

      {/* Connected URL sources */}
      {userSources.filter(s => s.type === 'url').length > 0 && (
        <div>
          <p className="text-xs text-sail-muted font-medium mb-2">Bağlı kaynaklar</p>
          <div className="space-y-1.5">
            {userSources.filter(s => s.type === 'url').map((src) => (
              <div
                key={src.id}
                className="flex items-center justify-between bg-sail-900/60 border border-sail-700/50 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm">{detectPlatform(src.url ?? '').icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{src.label}</p>
                    <p className="text-[10px] text-sail-muted truncate">{src.url}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeUserSource(src.id)}
                  className="text-sail-muted hover:text-sail-danger transition-colors shrink-0 ml-2 text-xs"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── OAuth Connect tab ─────────────────────────────────────────────────────────

function OAuthTab() {
  const { addUserSource, userSources, removeUserSource } = useConnectorStore()
  const [connecting, setConnecting] = useState<string | null>(null)

  const connectedIds = new Set(userSources.filter(s => s.type === 'oauth').map(s => s.platform.toLowerCase()))

  async function handleConnect(platform: typeof OAUTH_PLATFORMS[0]) {
    if (connectedIds.has(platform.id)) return

    setConnecting(platform.id)

    // Simulate OAuth flow (in production: open OAuth popup window)
    await new Promise((r) => setTimeout(r, 1200))

    // For now: mark as connected (real OAuth would exchange tokens)
    addUserSource({
      type:     'oauth',
      platform: platform.name,
      label:    `${platform.name} Hesabım`,
    })

    setConnecting(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-sail-muted">
        Hesabınla giriş yap — satıcı verilerine doğrudan erişerek derin analiz yap.
      </p>

      {OAUTH_PLATFORMS.map((p) => {
        const isConnected = connectedIds.has(p.id)
        const isConnecting = connecting === p.id

        return (
          <div
            key={p.id}
            className={[
              'flex items-center justify-between rounded-xl border px-4 py-3 transition-all',
              p.color,
            ].join(' ')}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{p.icon}</span>
              <div>
                <p className="text-sm font-medium text-white">{p.name}</p>
                <p className="text-[10px] text-sail-muted">{p.description}</p>
                <p className="text-[9px] text-sail-muted/70 mt-0.5">{p.note}</p>
              </div>
            </div>

            <div className="shrink-0 ml-3">
              {isConnected ? (
                <Badge variant="green">Bağlı ✓</Badge>
              ) : isConnecting ? (
                <Spinner size="sm" />
              ) : (
                <Button size="sm" onClick={() => handleConnect(p)}>
                  Bağlan
                </Button>
              )}
            </div>
          </div>
        )
      })}

      {/* Connected OAuth sources */}
      {userSources.filter(s => s.type === 'oauth').length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-sail-muted font-medium mb-2">Bağlı hesaplar</p>
          {userSources.filter(s => s.type === 'oauth').map((src) => (
            <div key={src.id} className="flex items-center justify-between text-xs py-1.5 border-b border-sail-700/40">
              <span className="text-white">{src.label}</span>
              <button
                onClick={() => removeUserSource(src.id)}
                className="text-sail-muted hover:text-sail-danger"
              >
                Bağlantıyı kes
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main drawer ───────────────────────────────────────────────────────────────

export function UserDataImport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'url' | 'oauth'>('url')
  const { userSources } = useConnectorStore()

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-sail-800 border-l border-sail-700 z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-sail-700">
              <div>
                <h2 className="text-sm font-semibold text-white">Verim Ekle</h2>
                <p className="text-[10px] text-sail-muted mt-0.5">
                  {userSources.length > 0
                    ? `${userSources.length} kaynak bağlı`
                    : 'Kendi mağaza verilerini getir'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-sail-muted hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-sail-700">
              {(['url', 'oauth'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={[
                    'flex-1 py-2.5 text-xs font-medium transition-colors',
                    tab === t
                      ? 'text-sail-accent border-b-2 border-sail-accent'
                      : 'text-sail-muted hover:text-white',
                  ].join(' ')}
                >
                  {t === 'url' ? '🔗 URL ile İçe Aktar' : '🔑 Hesabınla Bağlan'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {tab === 'url' ? <URLImportTab /> : <OAuthTab />}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-sail-700 bg-sail-900/50">
              <p className="text-[10px] text-sail-muted text-center">
                Veriler yalnızca analiz için kullanılır ve saklanmaz.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
