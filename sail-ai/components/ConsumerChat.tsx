'use client'

/**
 * ConsumerChat — Unified AI layer for everyday users (B2C interface)
 * ──────────────────────────────────────────────────────────────────
 * Features:
 *  - Single intelligent input — no manual mode switching
 *  - Auto intent detection: shopping/price → Price Scout API
 *                           general/daily  → SAIL streaming chat
 *  - Inline price comparison table with cheapest badge
 *  - Friendly, conversational tone (non-corporate copy)
 *  - Voice input integrated
 *  - Quick-access suggestion chips
 */

import {
  useState, useRef, useCallback, useEffect, useLayoutEffect,
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VoiceInput } from './VoiceInput'

// ── Types ─────────────────────────────────────────────────────

interface PriceResult {
  title:         string
  price:         string
  currency:      string
  platform:      string
  url:           string
  rating?:       string
  reviewCount?:  string
  savings?:      string
  isAlternative: boolean
  snippet?:      string
}

type MessageRole  = 'user' | 'assistant' | 'price-results'
type MessageType  = 'text' | 'price-scout'

interface ChatMessage {
  id:      string
  role:    MessageRole
  type:    MessageType
  text?:   string
  results?: PriceResult[]
  summary?: string
  query?:  string
  loading?: boolean
}

// ── Intent detection ──────────────────────────────────────────

const SHOPPING_PATTERNS = [
  /\b(buy|purchase|price|cost|cheap|cheapest|deal|discount|sale|offer)\b/i,
  /\b(where to (buy|get|find)|how much (is|does|costs?)|best (price|deal))\b/i,
  /\b(compare|versus|vs\.?|alternative|similar|instead of)\b/i,
  /\b(amazon|ebay|aliexpress|temu|walmart|store|shop)\b/i,
  /\b(shipping|delivery|in stock|available)\b/i,
  /\ben (ucuz|iyi fiyat|al|satın|nereden|ne kadar)/i, // Turkish
]

function detectIntent(text: string): 'shopping' | 'chat' {
  return SHOPPING_PATTERNS.some(p => p.test(text)) ? 'shopping' : 'chat'
}

// ── Quick suggestion chips ─────────────────────────────────────

const SUGGESTIONS = [
  { emoji: '🛍️', label: 'Find cheapest price',   query: 'Find the cheapest price for AirPods Pro' },
  { emoji: '🏨', label: 'Compare hotels',         query: 'Compare hotel prices in Paris this weekend' },
  { emoji: '💡', label: 'Plan my day',            query: 'Help me plan a productive morning routine' },
  { emoji: '🍕', label: 'Find a recipe',          query: 'Give me a quick and easy dinner recipe for tonight' },
  { emoji: '✈️', label: 'Travel tips',            query: 'What are the best tips for traveling on a budget?' },
  { emoji: '💰', label: 'Save money on',          query: 'How can I save money on my monthly subscriptions?' },
]

// ── Helpers ───────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function formatPrice(result: PriceResult) {
  return result.price.startsWith('$') || result.price.startsWith('€') ||
         result.price.startsWith('£') || result.price.startsWith('₺')
    ? result.price
    : `${result.currency ? result.currency + ' ' : ''}${result.price}`
}

// ── Sub-components ─────────────────────────────────────────────

function TypingDots() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          style={{ width: 5, height: 5, borderRadius: '50%', background: '#C9A96E', display: 'inline-block' }}
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </span>
  )
}

function PriceCard({ result, cheapest }: { result: PriceResult; cheapest: boolean }) {
  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display:        'block',
        textDecoration: 'none',
        background:     cheapest ? 'rgba(201,169,110,0.06)' : '#FFFFFF',
        border:         `1.5px solid ${cheapest ? 'rgba(201,169,110,0.4)' : 'rgba(0,0,0,0.07)'}`,
        borderRadius:   '10px',
        padding:        '0.75rem 1rem',
        transition:     'transform 0.15s, box-shadow 0.15s',
        position:       'relative',
        overflow:       'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.transform = 'none'
        el.style.boxShadow = 'none'
      }}
    >
      {cheapest && (
        <span style={{
          position:      'absolute',
          top:           6,
          right:         8,
          background:    '#C9A96E',
          color:         '#0C0C0E',
          fontSize:      '0.55rem',
          fontWeight:    800,
          letterSpacing: '0.1em',
          padding:       '2px 7px',
          borderRadius:  '4px',
          fontFamily:    'var(--font-inter), sans-serif',
        }}>
          BEST PRICE
        </span>
      )}
      {result.isAlternative && (
        <span style={{
          position:      'absolute',
          top:           6,
          right:         8,
          background:    'rgba(99,102,241,0.12)',
          color:         '#6366F1',
          fontSize:      '0.55rem',
          fontWeight:    700,
          letterSpacing: '0.08em',
          padding:       '2px 7px',
          borderRadius:  '4px',
          fontFamily:    'var(--font-inter), sans-serif',
          border:        '1px solid rgba(99,102,241,0.25)',
        }}>
          ALT
        </span>
      )}

      <p style={{
        fontFamily:   'var(--font-inter), sans-serif',
        fontSize:     '0.82rem',
        fontWeight:   500,
        color:        '#0C0C0E',
        margin:       '0 0 0.2rem',
        lineHeight:   1.35,
        paddingRight: '3rem',
        overflow:     'hidden',
        display:      '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }}>
        {result.title}
      </p>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
        <span style={{
          fontFamily: 'var(--font-cormorant), Georgia, serif',
          fontSize:   '1.15rem',
          fontWeight: 700,
          color:      cheapest ? '#B8902A' : '#0C0C0E',
        }}>
          {formatPrice(result)}
        </span>
        {result.savings && (
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', color: '#059669', fontWeight: 600 }}>
            {result.savings}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--font-inter), sans-serif',
          fontSize:   '0.7rem',
          color:      '#71717A',
          fontWeight: 500,
        }}>
          {result.platform}
        </span>
        {result.rating && (
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.68rem', color: '#F59E0B' }}>
            ★ {result.rating}
            {result.reviewCount && (
              <span style={{ color: '#A1A1AA' }}> ({result.reviewCount})</span>
            )}
          </span>
        )}
      </div>

      {result.snippet && (
        <p style={{
          fontFamily:  'var(--font-inter), sans-serif',
          fontSize:    '0.7rem',
          color:       '#A1A1AA',
          margin:      '0.3rem 0 0',
          lineHeight:  1.5,
          overflow:    'hidden',
          display:     '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {result.snippet}
        </p>
      )}
    </a>
  )
}

function PriceScoutResults({ msg }: { msg: ChatMessage }) {
  if (!msg.results) return null
  const direct = msg.results.filter(r => !r.isAlternative)
  const alts   = msg.results.filter(r => r.isAlternative)

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* AI summary */}
      {msg.summary && (
        <div style={{
          background:    'rgba(201,169,110,0.05)',
          border:        '1px solid rgba(201,169,110,0.2)',
          borderRadius:  '10px',
          padding:       '0.75rem 1rem',
          marginBottom:  '1rem',
          fontFamily:    'var(--font-inter), sans-serif',
          fontSize:      '0.82rem',
          color:         '#3D3D3D',
          lineHeight:    1.7,
        }}>
          <span style={{ color: '#C9A96E', fontWeight: 700, marginRight: '0.4rem' }}>💡</span>
          {msg.summary}
        </div>
      )}

      {/* Direct matches */}
      {direct.length > 0 && (
        <>
          <p style={{
            fontFamily:    'var(--font-inter), sans-serif',
            fontSize:      '0.68rem',
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         '#A1A1AA',
            margin:        '0 0 0.5rem',
          }}>
            Price Comparison · {direct.length} results
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {direct.map((r, i) => (
              <PriceCard key={r.url + i} result={r} cheapest={i === 0} />
            ))}
          </div>
        </>
      )}

      {/* Alternatives */}
      {alts.length > 0 && (
        <>
          <p style={{
            fontFamily:    'var(--font-inter), sans-serif',
            fontSize:      '0.68rem',
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color:         '#A1A1AA',
            margin:        '0 0 0.5rem',
          }}>
            You Might Also Consider
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {alts.map((r, i) => (
              <PriceCard key={r.url + i + 'alt'} result={r} cheapest={false} />
            ))}
          </div>
        </>
      )}

      {msg.results.length === 0 && (
        <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.82rem', color: '#71717A', textAlign: 'center', padding: '1rem 0' }}>
          No price results found. Try a more specific product name.
        </p>
      )}
    </div>
  )
}

// ── Message bubble ─────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  if (msg.type === 'price-scout') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ width: '100%' }}
      >
        <div style={{
          display:    'flex',
          alignItems: 'flex-start',
          gap:        '0.5rem',
          marginBottom: '0.25rem',
        }}>
          <span style={{ fontSize: '1rem' }}>🔍</span>
          <span style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize:   '0.78rem',
            fontWeight: 600,
            color:      '#71717A',
          }}>
            Price Scout {msg.query ? `· "${msg.query}"` : ''}
          </span>
        </div>
        {msg.loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem 0' }}>
            <TypingDots />
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', color: '#A1A1AA' }}>
              Scanning prices across the web…
            </span>
          </div>
        ) : (
          <PriceScoutResults msg={msg} />
        )}
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display:        'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        width:          '100%',
      }}
    >
      {!isUser && (
        <span style={{
          width:       28,
          height:      28,
          borderRadius:'50%',
          background:  'linear-gradient(135deg, #C9A96E, #B8902A)',
          display:     'flex',
          alignItems:  'center',
          justifyContent: 'center',
          flexShrink:  0,
          fontSize:    '0.7rem',
          marginRight: '0.5rem',
          marginTop:   '2px',
        }}>
          ✦
        </span>
      )}
      <div style={{
        maxWidth:     isUser ? '78%' : '88%',
        padding:      isUser ? '0.65rem 1rem' : '0.75rem 1rem',
        borderRadius: isUser ? '14px 14px 4px 14px' : '4px 14px 14px 14px',
        background:   isUser
          ? 'linear-gradient(135deg, #0C0C0E 0%, #1A1A20 100%)'
          : '#FFFFFF',
        border:       isUser
          ? '1px solid rgba(201,169,110,0.25)'
          : '1px solid rgba(0,0,0,0.07)',
        boxShadow:    '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        {msg.loading ? (
          <TypingDots />
        ) : (
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize:   '0.875rem',
            lineHeight: 1.65,
            color:      isUser ? '#FFFFFF' : '#0C0C0E',
            margin:     0,
            whiteSpace: 'pre-wrap',
            wordBreak:  'break-word',
          }}>
            {msg.text}
          </p>
        )}
      </div>
    </motion.div>
  )
}

// ── Main component ─────────────────────────────────────────────

interface Props {
  onSwitchToBusiness: () => void
}

export function ConsumerChat({ onSwitchToBusiness }: Props) {
  const [messages,   setMessages]   = useState<ChatMessage[]>([])
  const [input,      setInput]      = useState('')
  const [isStreaming,setIsStreaming] = useState(false)
  const scrollRef    = useRef<HTMLDivElement>(null)
  const textareaRef  = useRef<HTMLTextAreaElement>(null)
  const abortRef     = useRef<AbortController | null>(null)
  const MAX          = 1000

  // Auto-scroll to bottom on new messages
  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 180)}px`
  }, [input])

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  // ── Price Scout handler ──────────────────────────────────────
  const handlePriceScout = useCallback(async (query: string) => {
    const msgId = uid()

    // Add loading placeholder
    setMessages(prev => [...prev, {
      id: msgId, role: 'assistant', type: 'price-scout',
      query, loading: true,
    }])

    try {
      const res  = await fetch('/api/data-lab/price-scout/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query }),
      })
      const data = await res.json()

      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m,
        loading: false,
        results: data.results ?? [],
        summary: data.aiSummary ?? '',
      } : m))
    } catch {
      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m,
        loading: false,
        results: [],
        summary: 'Sorry, I couldn\'t fetch prices right now. Please try again.',
      } : m))
    }
  }, [])

  // ── Streaming chat handler ───────────────────────────────────
  const handleChat = useCallback(async (text: string, history: ChatMessage[]) => {
    const msgId = uid()
    setIsStreaming(true)
    abortRef.current = new AbortController()

    // Add loading placeholder
    setMessages(prev => [...prev, {
      id: msgId, role: 'assistant', type: 'text', loading: true, text: '',
    }])

    // Build compressed conversation history for context
    const msgs = history
      .filter(m => m.type === 'text' && m.role !== 'assistant' || (m.role === 'assistant' && m.text))
      .slice(-8)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text ?? '' }))

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message:      text,
          analysisMode: 'sail',
          businessMode: false,
          messages:     msgs,
          sessionId:    'consumer',
          userId:       'consumer',
          agentMode:    'standard',
          language:     'en',
          // Friendly consumer system override hint
          consumerMode: true,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error('Request failed')

      const reader  = res.body!.getReader()
      const decoder = new TextDecoder()
      let   buf     = ''
      let   metaDone = false

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        // Strip the meta JSON first line
        if (!metaDone) {
          const nl = buf.indexOf('\n')
          if (nl !== -1) {
            buf = buf.slice(nl + 1)
            metaDone = true
          }
        }

        setMessages(prev => prev.map(m => m.id === msgId
          ? { ...m, loading: false, text: buf }
          : m
        ))
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m, loading: false,
        text: 'Sorry, something went wrong. Please try again.',
      } : m))
    } finally {
      setIsStreaming(false)
    }
  }, [])

  // ── Submit handler ───────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')

    // Add user message
    const userMsg: ChatMessage = {
      id:   uid(),
      role: 'user',
      type: 'text',
      text,
    }
    setMessages(prev => {
      const next = [...prev, userMsg]
      const intent = detectIntent(text)

      if (intent === 'shopping') {
        handlePriceScout(text)
      } else {
        handleChat(text, next)
      }

      return next
    })
  }, [input, isStreaming, handlePriceScout, handleChat])

  // ── Suggestion click ─────────────────────────────────────────
  const handleSuggestion = useCallback((query: string) => {
    setInput(query)
    setTimeout(() => textareaRef.current?.focus(), 50)
  }, [])

  const isEmpty = messages.length === 0

  return (
    <div style={{
      display:        'flex',
      flexDirection:  'column',
      height:         '100%',
      background:     'linear-gradient(160deg, #F8F7F4 0%, #F2F1ED 60%, #F8F7F4 100%)',
      paddingBottom:  '5.5rem',   // space for Dock
    }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        padding:        '1rem 1.25rem 0.75rem',
        borderBottom:   '1px solid rgba(0,0,0,0.06)',
        background:     'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        gap:            '0.75rem',
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-cormorant), Georgia, serif',
            fontSize:   '1.15rem',
            fontWeight: 600,
            color:      '#0C0C0E',
            margin:     0,
            lineHeight: 1.2,
          }}>
            Your Personal AI
          </h1>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize:   '0.7rem',
            color:      '#A1A1AA',
            margin:     '2px 0 0',
          }}>
            Ask me anything — deals, recipes, planning, questions
          </p>
        </div>

        {/* Switch to Business mode */}
        <button
          onClick={onSwitchToBusiness}
          style={{
            display:       'flex',
            alignItems:    'center',
            gap:           '0.3rem',
            padding:       '0.3rem 0.75rem',
            background:    'rgba(201,169,110,0.08)',
            border:        '1px solid rgba(201,169,110,0.3)',
            borderRadius:  '999px',
            cursor:        'pointer',
            fontFamily:    'var(--font-inter), sans-serif',
            fontSize:      '0.65rem',
            fontWeight:    600,
            letterSpacing: '0.06em',
            color:         '#B8902A',
            flexShrink:    0,
            transition:    'all 0.15s',
          }}
        >
          💼 Switch to Business
        </button>
      </div>

      {/* ── Message thread ───────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '1.25rem 1rem',
          display:   'flex',
          flexDirection: 'column',
          gap:       '0.875rem',
        }}
      >
        <AnimatePresence>
          {isEmpty && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', paddingTop: '1.5rem', paddingBottom: '0.75rem' }}
            >
              {/* Hero greeting */}
              <div style={{
                width:        64,
                height:       64,
                borderRadius: '50%',
                background:   'linear-gradient(135deg, #C9A96E 0%, #B8902A 100%)',
                display:      'flex',
                alignItems:   'center',
                justifyContent:'center',
                margin:       '0 auto 1rem',
                fontSize:     '1.5rem',
                boxShadow:    '0 8px 24px rgba(201,169,110,0.3)',
              }}>
                ✦
              </div>
              <h2 style={{
                fontFamily: 'var(--font-cormorant), Georgia, serif',
                fontSize:   'clamp(1.3rem, 5vw, 1.65rem)',
                fontWeight: 600,
                color:      '#0C0C0E',
                margin:     '0 0 0.4rem',
              }}>
                Hi! How can I help you today?
              </h2>
              <p style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize:   '0.82rem',
                color:      '#71717A',
                margin:     '0 auto 1.5rem',
                maxWidth:   360,
                lineHeight: 1.6,
              }}>
                Find the best prices, plan your day, answer questions — just ask in plain English.
              </p>

              {/* Suggestion chips */}
              <div style={{
                display:        'flex',
                flexWrap:       'wrap',
                gap:            '0.5rem',
                justifyContent: 'center',
                maxWidth:       500,
                margin:         '0 auto',
              }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.label}
                    onClick={() => handleSuggestion(s.query)}
                    style={{
                      display:       'flex',
                      alignItems:    'center',
                      gap:           '0.35rem',
                      padding:       '0.4rem 0.875rem',
                      background:    '#FFFFFF',
                      border:        '1px solid rgba(0,0,0,0.09)',
                      borderRadius:  '999px',
                      cursor:        'pointer',
                      fontFamily:    'var(--font-inter), sans-serif',
                      fontSize:      '0.78rem',
                      color:         '#3D3D3D',
                      fontWeight:    400,
                      transition:    'all 0.15s',
                      boxShadow:     '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = 'rgba(201,169,110,0.4)'
                      el.style.background  = 'rgba(201,169,110,0.04)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.borderColor = 'rgba(0,0,0,0.09)'
                      el.style.background  = '#FFFFFF'
                    }}
                  >
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
      </div>

      {/* ── Input area ───────────────────────────────────────── */}
      <div style={{
        padding:        '0.75rem 1rem 0.875rem',
        borderTop:      '1px solid rgba(0,0,0,0.06)',
        background:     'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}>
        <div style={{
          maxWidth:     640,
          margin:       '0 auto',
          background:   '#FFFFFF',
          border:       `1.5px solid ${isStreaming ? 'rgba(201,169,110,0.5)' : 'rgba(0,0,0,0.1)'}`,
          borderRadius: '14px',
          boxShadow:    isStreaming
            ? '0 0 0 3px rgba(201,169,110,0.08), 0 4px 16px rgba(0,0,0,0.06)'
            : '0 2px 8px rgba(0,0,0,0.04)',
          transition:   'border-color 0.25s, box-shadow 0.25s',
          overflow:     'hidden',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => { if (e.target.value.length <= MAX) setInput(e.target.value) }}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                void handleSubmit()
              }
            }}
            placeholder="Ask me anything — best price for X, plan my day, help with…"
            disabled={isStreaming}
            rows={2}
            style={{
              width:      '100%',
              padding:    '0.875rem 1.125rem 0.5rem',
              color:      '#0C0C0E',
              caretColor: '#C9A96E',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:   '0.9rem',
              lineHeight: 1.65,
              resize:     'none',
              background: 'transparent',
              border:     'none',
              outline:    'none',
              opacity:    isStreaming ? 0.5 : 1,
            }}
          />

          {/* Toolbar */}
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '0.375rem 0.875rem 0.625rem',
            borderTop:      '1px solid rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <VoiceInput
                disabled={isStreaming}
                onTranscript={t => setInput(prev => prev ? `${prev} ${t}` : t)}
              />
              {/* Intent hint */}
              {input.length > 3 && !isStreaming && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    fontFamily:    'var(--font-inter), sans-serif',
                    fontSize:      '0.62rem',
                    letterSpacing: '0.06em',
                    padding:       '2px 8px',
                    borderRadius:  '999px',
                    background:    detectIntent(input) === 'shopping'
                      ? 'rgba(201,169,110,0.1)'
                      : 'rgba(99,102,241,0.08)',
                    color: detectIntent(input) === 'shopping'
                      ? '#B8902A'
                      : '#6366F1',
                    border: detectIntent(input) === 'shopping'
                      ? '1px solid rgba(201,169,110,0.3)'
                      : '1px solid rgba(99,102,241,0.2)',
                  }}
                >
                  {detectIntent(input) === 'shopping' ? '🛍️ Price search' : '💬 Chat'}
                </motion.span>
              )}
            </div>

            {/* Send button */}
            <button
              onClick={() => void handleSubmit()}
              disabled={isStreaming || !input.trim()}
              style={{
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                width:           36,
                height:          36,
                borderRadius:   '10px',
                background:     isStreaming || !input.trim()
                  ? 'rgba(0,0,0,0.06)'
                  : 'linear-gradient(135deg, #C9A96E 0%, #B8902A 100%)',
                border:          'none',
                cursor:          isStreaming || !input.trim() ? 'not-allowed' : 'pointer',
                transition:      'all 0.15s',
                flexShrink:      0,
              }}
            >
              {isStreaming ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ fontSize: '0.8rem' }}
                >
                  ⟳
                </motion.span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke={input.trim() ? '#0C0C0E' : '#A1A1AA'}
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Char counter & shortcut hint */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          maxWidth:       640,
          margin:         '0.35rem auto 0',
          padding:        '0 0.25rem',
        }}>
          <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.62rem', color: '#C4C4CC' }}>
            ⌘ + Enter to send
          </span>
          {input.length > MAX * 0.8 && (
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.62rem', color: input.length >= MAX ? '#991B1B' : '#C4C4CC' }}>
              {MAX - input.length} left
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
