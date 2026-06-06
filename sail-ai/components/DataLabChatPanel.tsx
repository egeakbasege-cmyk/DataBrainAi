'use client'

/**
 * DataLabChatPanel
 * ─────────────────────────────────────────────────────────────────────────────
 * Slide-in AI chat panel for Data Lab.
 * • Context-aware: knows which data source is connected + its summary
 * • Calls /api/chat/ in 'operator' mode with the source data injected as context
 * • App Integration menu: shows connectable external apps (Slack, Notion, etc.)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence }                  from 'framer-motion'
import { SailAdapter }                              from '@/components/SailAdapter'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SourceSummary {
  type:       string
  name:       string
  syncedAt:   string
  revenue:    string
  orders:     string
  aov:        string
  topProduct: string
  extra:      { label: string; value: string }[]
}

interface ChatMsg {
  id:        string
  role:      'user' | 'assistant'
  text:      string
  streaming: boolean
}

interface AppIntegration {
  id:       string
  name:     string
  icon:     string
  desc:     string
  color:    string
  category: string
}

// ── App integrations catalogue ────────────────────────────────────────────────

const APP_INTEGRATIONS: AppIntegration[] = [
  { id: 'slack',    name: 'Slack',         icon: '💬', desc: 'Push AI reports to channels', color: '#4A154B', category: 'Messaging'  },
  { id: 'notion',   name: 'Notion',        icon: '📝', desc: 'Export analyses to pages',   color: '#000000', category: 'Productivity'},
  { id: 'sheets',   name: 'Google Sheets', icon: '📊', desc: 'Sync metrics automatically', color: '#0F9D58', category: 'Data'        },
  { id: 'zapier',   name: 'Zapier',        icon: '⚡', desc: 'Connect to 5000+ apps',      color: '#FF4A00', category: 'Automation'  },
  { id: 'make',     name: 'Make',          icon: '🔗', desc: 'Visual workflow builder',     color: '#6D00CC', category: 'Automation'  },
  { id: 'airtable', name: 'Airtable',      icon: '🗃️', desc: 'Structured data pipelines',  color: '#18BFFF', category: 'Data'        },
  { id: 'hubspot',  name: 'HubSpot',       icon: '🧲', desc: 'CRM sync & lead scoring',    color: '#FF7A59', category: 'CRM'         },
  { id: 'teams',    name: 'MS Teams',      icon: '🟣', desc: 'Team alerts & dashboards',   color: '#464EB8', category: 'Messaging'  },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function AppConnectionMenu({
  onClose,
  connectedApps,
  onToggle,
}: {
  onClose:       () => void
  connectedApps: Set<string>
  onToggle:      (id: string) => void
}) {
  const categories = Array.from(new Set(APP_INTEGRATIONS.map(a => a.category)))

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 8 }}
      animate={{ opacity: 1, scale: 1,    y: 0 }}
      exit={{    opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.18 }}
      style={{
        position:       'absolute',
        bottom:         'calc(100% + 0.5rem)',
        right:           0,
        width:           340,
        background:     'linear-gradient(160deg, rgba(14,16,28,0.97) 0%, rgba(8,9,13,0.98) 100%)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border:         '1px solid rgba(20,184,166,0.22)',
        borderRadius:   16,
        boxShadow:      '0 20px 60px rgba(0,0,0,0.5)',
        zIndex:          10,
        overflow:        'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding:        '1rem 1.25rem 0.75rem',
        borderBottom:   '1px solid rgba(255,255,255,0.07)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#14B8A6', margin: 0 }}>
            App Bağlantıları
          </p>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: 'rgba(255,255,255,0.40)', margin: '0.15rem 0 0' }}>
            AI analizlerini uygulamalarınıza gönderin
          </p>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>✕</button>
      </div>

      {/* App grid */}
      <div style={{ padding: '0.75rem', maxHeight: 340, overflowY: 'auto' }}>
        {categories.map(cat => (
          <div key={cat} style={{ marginBottom: '0.75rem' }}>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.30)', margin: '0 0 0.4rem 0.25rem' }}>
              {cat}
            </p>
            {APP_INTEGRATIONS.filter(a => a.category === cat).map(app => {
              const connected = connectedApps.has(app.id)
              return (
                <div
                  key={app.id}
                  style={{
                    display:        'flex',
                    alignItems:     'center',
                    gap:            '0.75rem',
                    padding:        '0.6rem 0.75rem',
                    borderRadius:   10,
                    marginBottom:   '0.25rem',
                    background:     connected ? `${app.color}15` : 'rgba(255,255,255,0.03)',
                    border:         connected ? `1px solid ${app.color}40` : '1px solid transparent',
                    cursor:         'pointer',
                    transition:     'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!connected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseLeave={e => { if (!connected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
                  onClick={() => onToggle(app.id)}
                >
                  <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{app.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>{app.name}</p>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: 'rgba(255,255,255,0.40)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.desc}</p>
                  </div>
                  <div style={{
                    width:        32,
                    height:       18,
                    borderRadius: 9,
                    background:   connected ? '#14B8A6' : 'rgba(255,255,255,0.12)',
                    position:     'relative',
                    flexShrink:   0,
                    transition:   'background 0.2s',
                  }}>
                    <div style={{
                      position:   'absolute',
                      top:         2,
                      left:        connected ? 16 : 2,
                      width:       14,
                      height:      14,
                      borderRadius: '50%',
                      background:  '#fff',
                      transition:  'left 0.2s',
                    }} />
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ padding: '0.65rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', margin: 0, textAlign: 'center' }}>
          {connectedApps.size} uygulama bağlı · Webhook URL yakında
        </p>
      </div>
    </motion.div>
  )
}

// ── Main chat panel ───────────────────────────────────────────────────────────

export function DataLabChatPanel({
  source,
  open,
  onClose,
}: {
  source:   SourceSummary | null
  open:     boolean
  onClose:  () => void
}) {
  const [messages,      setMessages]      = useState<ChatMsg[]>([])
  const [input,         setInput]         = useState('')
  const [loading,       setLoading]       = useState(false)
  const [showApps,      setShowApps]      = useState(false)
  const [connectedApps, setConnectedApps] = useState<Set<string>>(new Set())
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300)
  }, [open])

  // Welcome message when source connects
  useEffect(() => {
    if (source && messages.length === 0) {
      setMessages([{
        id:        'welcome',
        role:      'assistant',
        text:      `**${source.name}** bağlandı 🎯\n\nGelir: **${source.revenue}** · Sipariş: **${source.orders}** · AOV: **${source.aov}**\n\nVeri kaynağınız hakkında ne öğrenmek istersiniz? Performans analizi, fiyat karşılaştırması veya stratejik öneriler için sorun.`,
        streaming: false,
      }])
    }
  }, [source, messages.length])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return

    setInput('')
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', text, streaming: false }
    setMessages(prev => [...prev, userMsg])

    const assistantId = (Date.now() + 1).toString()
    const assistantMsg: ChatMsg = { id: assistantId, role: 'assistant', text: '', streaming: true }
    setMessages(prev => [...prev, assistantMsg])
    setLoading(true)

    try {
      // Build context from connected source
      const sourceContext = source
        ? `Connected data source: ${source.name} | Revenue: ${source.revenue} | Orders: ${source.orders} | AOV: ${source.aov} | Top Product: ${source.topProduct} | ${source.extra.map(e => `${e.label}: ${e.value}`).join(' | ')}`
        : 'No data source connected yet.'

      const res = await fetch('/api/chat/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:      text,
          context:      sourceContext,
          mode:         'operator',
          businessMode: true,
          language:     'tr',
          messages:     messages.slice(-6).map(m => ({
            role:    m.role,
            content: m.text,
          })),
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error(`API error: ${res.status}`)
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let   fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
        // Strip any JSON meta lines (healthReport, scopeMetadata)
        const displayText = fullText
          .split('\n')
          .filter(l => {
            try { const p = JSON.parse(l); return !p.__healthReport && !p.scopeMetadata && !p.__scenarioMeta; }
            catch { return true }
          })
          .join('\n')
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, text: displayText, streaming: true } : m
        ))
      }

      // Mark streaming done
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, streaming: false } : m
      ))
    } catch (err) {
      console.error('[DataLabChat]', err)
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, text: 'Bağlantı hatası. Lütfen tekrar deneyin.', streaming: false }
          : m
      ))
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, source])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const QUICK_PROMPTS = source ? [
    `${source.name} için büyüme stratejisi öner`,
    'En yüksek kâr marjlı ürünleri analiz et',
    'Bu ay için 3 öncelikli aksiyon planı',
  ] : [
    'Bir veri kaynağı bağladıktan sonra analize başlayabilirsiniz',
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay (mobile) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 49, display: 'block' }}
            className="dl-chat-overlay"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0,      opacity: 1 }}
            exit={{    x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            style={{
              position:       'fixed',
              top:             0,
              right:           0,
              bottom:          0,
              width:           'min(420px, 100vw)',
              background:     'linear-gradient(160deg, rgba(10,12,22,0.97) 0%, rgba(8,9,13,0.98) 100%)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              borderLeft:     '1px solid rgba(20,184,166,0.20)',
              boxShadow:      '-20px 0 60px rgba(0,0,0,0.5)',
              zIndex:          50,
              display:         'flex',
              flexDirection:   'column',
            }}
          >
            {/* Header */}
            <div style={{
              padding:        '1rem 1.25rem',
              borderBottom:   '1px solid rgba(255,255,255,0.07)',
              display:        'flex',
              alignItems:     'center',
              gap:            '0.75rem',
              flexShrink:      0,
            }}>
              <div style={{
                width:        36,
                height:       36,
                borderRadius: '50%',
                background:   'linear-gradient(135deg, rgba(20,184,166,0.35) 0%, rgba(8,9,13,0.6) 100%)',
                border:       '1px solid rgba(20,184,166,0.45)',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                fontSize:     '1rem',
                flexShrink:    0,
              }}>
                ⚗️
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.87rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)', margin: 0 }}>
                  Data Lab AI
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: source ? '#14B8A6' : 'rgba(255,255,255,0.38)', margin: 0 }}>
                  {source ? `${source.name} bağlı` : 'Veri kaynağı bekleniyor…'}
                </p>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: '0.8rem' }}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {messages.length === 0 && !source && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔌</div>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem', color: 'rgba(255,255,255,0.65)', margin: '0 0 0.5rem' }}>Veri kaynağı bağlayın</p>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: 0 }}>Shopify, Stripe, Google Ads veya başka bir kaynak bağladıktan sonra AI analizi başlatabilirsiniz.</p>
                </div>
              )}

              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display:        'flex',
                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}
                >
                  {msg.role === 'user' ? (
                    <div style={{
                      maxWidth:       '85%',
                      background:     'linear-gradient(135deg, rgba(20,184,166,0.20) 0%, rgba(8,9,13,0.75) 100%)',
                      border:         '1px solid rgba(20,184,166,0.35)',
                      borderRadius:   '14px 14px 4px 14px',
                      padding:        '0.7rem 1rem',
                      fontFamily:     'Inter, sans-serif',
                      fontSize:       '0.85rem',
                      color:          'rgba(255,255,255,0.90)',
                      lineHeight:     1.6,
                      whiteSpace:     'pre-wrap',
                      wordBreak:      'break-word',
                    }}>
                      {msg.text}
                    </div>
                  ) : (
                    <div style={{
                      maxWidth: '92%',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(20,184,166,0.15)',
                      borderTop: '2px solid rgba(20,184,166,0.60)',
                      borderRadius: '4px 14px 14px 14px',
                      padding: '0.85rem 1rem',
                      fontSize: '0.85rem',
                    }}>
                      {msg.text ? (
                        <SailAdapter text={msg.text} intent="analytic" streaming={msg.streaming} />
                      ) : (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '0.25rem 0' }}>
                          {[0,1,2].map(i => (
                            <motion.div key={i}
                              animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.8, 1.1, 0.8] }}
                              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                              style={{ width: 6, height: 6, borderRadius: '50%', background: '#14B8A6' }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            {messages.length <= 1 && source && (
              <div style={{ padding: '0 1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0 }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', margin: '0 0 0.25rem' }}>Hızlı başlangıç</p>
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => { setInput(p); setTimeout(() => inputRef.current?.focus(), 50) }}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(20,184,166,0.25)', borderRadius: 8, padding: '0.55rem 0.875rem', fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', color: 'rgba(255,255,255,0.70)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', lineHeight: 1.4 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(20,184,166,0.10)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.70)' }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input bar */}
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, position: 'relative' }}>
              {/* App menu */}
              <AnimatePresence>
                {showApps && (
                  <AppConnectionMenu
                    onClose={() => setShowApps(false)}
                    connectedApps={connectedApps}
                    onToggle={id => setConnectedApps(prev => {
                      const next = new Set(prev)
                      next.has(id) ? next.delete(id) : next.add(id)
                      return next
                    })}
                  />
                )}
              </AnimatePresence>

              <div style={{
                display:        'flex',
                alignItems:     'flex-end',
                gap:            '0.5rem',
                background:     'rgba(255,255,255,0.06)',
                border:         '1px solid rgba(20,184,166,0.25)',
                borderRadius:   12,
                padding:        '0.6rem 0.6rem 0.6rem 0.875rem',
              }}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={source ? 'Veri kaynağınız hakkında sorun…' : 'Önce bir veri kaynağı bağlayın…'}
                  disabled={!source || loading}
                  style={{
                    flex:        1,
                    background:  'transparent',
                    border:      'none',
                    outline:     'none',
                    resize:      'none',
                    fontFamily:  'Inter, sans-serif',
                    fontSize:    '0.87rem',
                    color:       'rgba(255,255,255,0.88)',
                    lineHeight:  1.55,
                    maxHeight:   120,
                    overflowY:   'auto',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    fieldSizing: 'content' as any,
                  }}
                />
                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                  {/* App connect button */}
                  <button
                    onClick={() => setShowApps(s => !s)}
                    title="App bağlantıları"
                    style={{
                      width:        32,
                      height:       32,
                      borderRadius: 8,
                      background:   connectedApps.size > 0 ? 'rgba(20,184,166,0.20)' : 'rgba(255,255,255,0.07)',
                      border:       connectedApps.size > 0 ? '1px solid rgba(20,184,166,0.45)' : '1px solid rgba(255,255,255,0.12)',
                      color:        connectedApps.size > 0 ? '#14B8A6' : 'rgba(255,255,255,0.45)',
                      cursor:       'pointer',
                      fontSize:     '0.9rem',
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'center',
                      position:     'relative',
                    }}
                  >
                    🔗
                    {connectedApps.size > 0 && (
                      <span style={{ position: 'absolute', top: -4, right: -4, background: '#14B8A6', color: '#000', borderRadius: '50%', width: 14, height: 14, fontSize: '0.55rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {connectedApps.size}
                      </span>
                    )}
                  </button>
                  {/* Send button */}
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading || !source}
                    style={{
                      width:        32,
                      height:       32,
                      borderRadius: 8,
                      background:   input.trim() && source && !loading ? '#14B8A6' : 'rgba(255,255,255,0.08)',
                      border:       'none',
                      color:        input.trim() && source && !loading ? '#000' : 'rgba(255,255,255,0.30)',
                      cursor:       input.trim() && source && !loading ? 'pointer' : 'not-allowed',
                      fontSize:     '0.85rem',
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'center',
                      transition:   'all 0.15s',
                      flexShrink:    0,
                    }}
                  >
                    {loading ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }}
                      />
                    ) : '↑'}
                  </button>
                </div>
              </div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', color: 'rgba(255,255,255,0.22)', textAlign: 'center', margin: '0.4rem 0 0' }}>
                Enter ile gönder · Shift+Enter yeni satır
              </p>
            </div>
          </motion.div>

          <style>{`
            @media (max-width: 480px) {
              .dl-chat-overlay { display: block !important; }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  )
}
