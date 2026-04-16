'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/i18n/LanguageContext'
import type { TranslationKey } from '@/lib/i18n/translations'

/* ── Insight key map — indexed by sector pattern ──────────────────────── */
const INSIGHT_KEYS: { pattern: RegExp; insightKey: TranslationKey; source: string }[] = [
  {
    pattern:    /e[\-\s]?com|shopify|store|cart|woo|product|checkout/i,
    insightKey: 'micro.insight.ecommerce',
    source:     'Baymard Institute, 2024',
  },
  {
    pattern:    /saas|software|subscription|mrr|arr|churn|trial/i,
    insightKey: 'micro.insight.saas',
    source:     'OpenView Partners SaaS Benchmarks 2024',
  },
  {
    pattern:    /agency|consultant|freelanc|service|client|retainer/i,
    insightKey: 'micro.insight.agency',
    source:     'Agency Analytics Industry Report 2024',
  },
  {
    pattern:    /coach|train|fitness|personal train|instruct/i,
    insightKey: 'micro.insight.coaching',
    source:     'Mindbody Business Index 2024',
  },
  {
    pattern:    /restaurant|cafe|coffee|food|hospitality|dining/i,
    insightKey: 'micro.insight.restaurant',
    source:     'National Restaurant Association Report 2024',
  },
  {
    pattern:    /retail|shop|boutique|fashion|clothing|apparel/i,
    insightKey: 'micro.insight.retail',
    source:     'KPMG Retail Pulse 2024',
  },
  {
    pattern:    /real estate|property|letting|landlord|agent/i,
    insightKey: 'micro.insight.realestate',
    source:     'National Association of Realtors, 2024',
  },
  {
    pattern:    /market|brand|content|social|seo|ads|paid|campaign/i,
    insightKey: 'micro.insight.marketing',
    source:     'HubSpot Marketing Benchmarks 2024',
  },
]

const DEFAULT_INSIGHT_KEY: TranslationKey = 'micro.insight.default'
const DEFAULT_SOURCE = 'McKinsey & Company'

const PLACEHOLDER_KEYS: TranslationKey[] = [
  'micro.placeholder.0',
  'micro.placeholder.1',
  'micro.placeholder.2',
  'micro.placeholder.3',
]

function matchInsight(input: string) {
  for (const item of INSIGHT_KEYS) {
    if (item.pattern.test(input)) return { insightKey: item.insightKey, source: item.source }
  }
  return { insightKey: DEFAULT_INSIGHT_KEY, source: DEFAULT_SOURCE }
}

export function MicroAnalysis() {
  const { t } = useLanguage()
  const [input,   setInput]   = useState('')
  const [matched, setMatched] = useState<{ insightKey: TranslationKey; source: string } | null>(null)
  const [focused, setFocused] = useState(false)
  const [phIdx,   setPhIdx]   = useState(0)
  const inputRef              = (null as unknown as React.RefObject<HTMLInputElement>)

  // Rotate placeholder quietly
  useEffect(() => {
    const iv = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDER_KEYS.length), 3500)
    return () => clearInterval(iv)
  }, [])

  function handleAnalyse() {
    const txt = input.trim()
    if (!txt) return
    setMatched(matchInsight(txt))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAnalyse()
  }

  return (
    <div>
      {/* ── Input row ──────────────────────────────── */}
      <div
        style={{
          display:    'flex',
          alignItems: 'stretch',
          border:     `1px solid ${focused ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.14)'}`,
          transition: 'border-color 0.2s',
          background: '#FFFFFF',
        }}
      >
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setMatched(null) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t(PLACEHOLDER_KEYS[phIdx])}
          style={{
            flex:       1,
            padding:    '0.9375rem 1.125rem',
            fontFamily: 'Inter, sans-serif',
            fontSize:   '0.875rem',
            color:      '#0C0C0E',
            background: 'transparent',
            border:     'none',
            minWidth:   0,
          }}
        />
        <button
          onClick={handleAnalyse}
          disabled={!input.trim()}
          style={{
            padding:       '0.9375rem 1.25rem',
            background:    input.trim() ? '#0C0C0E' : 'rgba(0,0,0,0.05)',
            color:         input.trim() ? '#FFFFFF' : '#A1A1AA',
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.75rem',
            fontWeight:    600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            border:        'none',
            borderLeft:    '1px solid rgba(0,0,0,0.1)',
            cursor:        input.trim() ? 'pointer' : 'default',
            transition:    'background 0.18s, color 0.18s',
            flexShrink:    0,
            whiteSpace:    'nowrap',
          }}
        >
          {t('micro.preview')}
        </button>
      </div>

      {/* ── Insight result ─────────────────────────── */}
      <AnimatePresence>
        {matched && (
          <motion.div
            key="insight"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              marginTop:  '1px',
              padding:    '1.5rem',
              background: '#FFFFFF',
              border:     '1px solid rgba(0,0,0,0.09)',
              borderTop:  '2px solid #C9A96E',
            }}
          >
            <div className="flex items-start gap-3">
              <span style={{ color: '#C9A96E', fontSize: '0.9rem', flexShrink: 0, marginTop: '0.1rem' }}>◆</span>
              <div>
                <p
                  style={{
                    fontFamily:   'Cormorant Garamond, Georgia, serif',
                    fontStyle:    'italic',
                    fontSize:     'clamp(1rem, 1.8vw, 1.15rem)',
                    lineHeight:   1.55,
                    color:        '#0C0C0E',
                    marginBottom: '0.75rem',
                  }}
                >
                  {t(matched.insightKey)}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#A1A1AA', letterSpacing: '0.06em' }}>
                    {t('micro.source')} {matched.source}
                  </span>
                  <Link
                    href={`/chat?q=${encodeURIComponent(input)}`}
                    style={{
                      fontFamily:     'Inter, sans-serif',
                      fontSize:       '0.72rem',
                      fontWeight:     600,
                      letterSpacing:  '0.1em',
                      textTransform:  'uppercase',
                      color:          '#0C0C0E',
                      textDecoration: 'none',
                      borderBottom:   '1px solid rgba(0,0,0,0.2)',
                      paddingBottom:  '1px',
                      transition:     'border-color 0.15s',
                    }}
                  >
                    {t('micro.fullAnalysis')}
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Helper text ────────────────────────────── */}
      {!matched && (
        <p
          style={{
            marginTop:     '0.625rem',
            fontFamily:    'Inter, sans-serif',
            fontSize:      '0.75rem',
            color:         '#A1A1AA',
            letterSpacing: '0.02em',
          }}
        >
          {t('micro.helperText')}
        </p>
      )}
    </div>
  )
}
