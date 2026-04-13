'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

/* ── Pattern-matched insight library ─────────────────
   Each insight is deliberately measured, realistic,
   and references a data point the user can verify.   */
const INSIGHTS: { pattern: RegExp; insight: string; source: string }[] = [
  {
    pattern: /e[\-\s]?com|shopify|store|cart|woo|product|checkout/i,
    insight: 'The Baymard Institute puts the average e-commerce checkout abandonment rate at 70.2%. Narrowing that gap by 10 percentage points — through a simplified checkout and one targeted email — is a realistic 90-day objective for most operators.',
    source:  'Baymard Institute, 2024',
  },
  {
    pattern: /saas|software|subscription|mrr|arr|churn|trial/i,
    insight: 'SaaS benchmarks from OpenView Partners show that improving month-1 activation by 15% is typically worth more than equivalent ad spend — the compounding effect on retention makes it the highest-leverage action for sub-$500k ARR businesses.',
    source:  'OpenView Partners SaaS Benchmarks 2024',
  },
  {
    pattern: /agency|consultant|freelanc|service|client|retainer/i,
    insight: 'Agency benchmarks indicate that structured quarterly business reviews (QBRs) reduce involuntary churn by 18–22%. For a 6-client book of business, implementing one QBR template typically recovers 1–2 at-risk retainers annually.',
    source:  'Agency Analytics Industry Report 2024',
  },
  {
    pattern: /coach|train|fitness|personal train|instruct/i,
    insight: 'Conversion data from fitness platforms shows that offering a fixed-term package (e.g. 8-session block) alongside open-ended sessions increases average transaction value by 30–40%, with no significant change in close rate.',
    source:  'Mindbody Business Index 2024',
  },
  {
    pattern: /restaurant|cafe|coffee|food|hospitality|dining/i,
    insight: 'For hospitality businesses, increasing table turn rate from 1.8× to 2.2× per service period (achievable through streamlined ordering) adds roughly 20% to dinner-period revenue with no increase in covers or staff.',
    source:  'National Restaurant Association Report 2024',
  },
  {
    pattern: /retail|shop|boutique|fashion|clothing|apparel/i,
    insight: 'Retail data from KPMG shows that a loyalty programme in the first tier (points-only) increases average basket size by 11–14% and visit frequency by 20% over 6 months — the payback period for implementation is typically under 60 days.',
    source:  'KPMG Retail Pulse 2024',
  },
  {
    pattern: /real estate|property|letting|landlord|agent/i,
    insight: 'Lead-to-appointment conversion in property is highly responsive to response time. Agencies responding to enquiries within 5 minutes convert at 4× the rate of those responding after 30 minutes, per NAR lead-response data.',
    source:  'National Association of Realtors, 2024',
  },
  {
    pattern: /market|brand|content|social|seo|ads|paid|campaign/i,
    insight: 'HubSpot data shows that businesses publishing 4+ blog posts per week generate 3.5× more organic traffic than those publishing once weekly — but the quality-per-post threshold matters more than volume beyond that point.',
    source:  'HubSpot Marketing Benchmarks 2024',
  },
]

const DEFAULT_INSIGHT = {
  insight: 'McKinsey research consistently shows that improving customer retention by 5% increases profit by 25–95%, depending on sector. For most owner-managed businesses, this is a higher-return allocation than new customer acquisition at the same cost.',
  source:  'McKinsey & Company',
}

function matchInsight(input: string) {
  for (const item of INSIGHTS) {
    if (item.pattern.test(input)) return item
  }
  return DEFAULT_INSIGHT
}

const PLACEHOLDERS = [
  'E-commerce, 1.5% conversion rate, £8k/month revenue…',
  'B2B SaaS, 340 free users, 4% monthly churn…',
  'Personal training, 12 active clients, $120/session…',
  'Digital agency, 5 retainer clients, £22k MRR…',
]

export function MicroAnalysis() {
  const [input,   setInput]   = useState('')
  const [insight, setInsight] = useState<typeof DEFAULT_INSIGHT | null>(null)
  const [focused, setFocused] = useState(false)
  const [phIdx,   setPhIdx]   = useState(0)
  const inputRef              = useRef<HTMLInputElement>(null)

  // Rotate placeholder quietly
  useEffect(() => {
    const iv = setInterval(() => setPhIdx(i => (i + 1) % PLACEHOLDERS.length), 3500)
    return () => clearInterval(iv)
  }, [])

  function handleAnalyse() {
    const t = input.trim()
    if (!t) return
    setInsight(matchInsight(t))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAnalyse()
  }

  return (
    <div>
      {/* ── Input row ──────────────────────────────── */}
      <div
        style={{
          display:        'flex',
          alignItems:     'stretch',
          border:         `1px solid ${focused ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.14)'}`,
          transition:     'border-color 0.2s',
          background:     '#FFFFFF',
        }}
      >
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setInsight(null) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={PLACEHOLDERS[phIdx]}
          style={{
            flex:        1,
            padding:     '0.9375rem 1.125rem',
            fontFamily:  'Inter, sans-serif',
            fontSize:    '0.875rem',
            color:       '#0C0C0E',
            background:  'transparent',
            border:      'none',
            minWidth:    0,
          }}
        />
        <button
          onClick={handleAnalyse}
          disabled={!input.trim()}
          style={{
            padding:        '0.9375rem 1.25rem',
            background:     input.trim() ? '#0C0C0E' : 'rgba(0,0,0,0.05)',
            color:          input.trim() ? '#FFFFFF' : '#A1A1AA',
            fontFamily:     'Inter, sans-serif',
            fontSize:       '0.75rem',
            fontWeight:     600,
            letterSpacing:  '0.08em',
            textTransform:  'uppercase',
            border:         'none',
            borderLeft:     '1px solid rgba(0,0,0,0.1)',
            cursor:         input.trim() ? 'pointer' : 'default',
            transition:     'background 0.18s, color 0.18s',
            flexShrink:     0,
            whiteSpace:     'nowrap',
          }}
        >
          Preview →
        </button>
      </div>

      {/* ── Insight result ─────────────────────────── */}
      <AnimatePresence>
        {insight && (
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
                    fontFamily: 'Cormorant Garamond, Georgia, serif',
                    fontStyle:  'italic',
                    fontSize:   'clamp(1rem, 1.8vw, 1.15rem)',
                    lineHeight: 1.55,
                    color:      '#0C0C0E',
                    marginBottom: '0.75rem',
                  }}
                >
                  {insight.insight}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#A1A1AA', letterSpacing: '0.06em' }}>
                    Source: {insight.source}
                  </span>
                  <Link
                    href={`/chat?q=${encodeURIComponent(input)}`}
                    style={{
                      fontFamily:    'Inter, sans-serif',
                      fontSize:      '0.72rem',
                      fontWeight:    600,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color:         '#0C0C0E',
                      textDecoration:'none',
                      borderBottom:  '1px solid rgba(0,0,0,0.2)',
                      paddingBottom: '1px',
                      transition:    'border-color 0.15s',
                    }}
                  >
                    Full analysis →
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Helper text ────────────────────────────── */}
      {!insight && (
        <p
          style={{
            marginTop:  '0.625rem',
            fontFamily: 'Inter, sans-serif',
            fontSize:   '0.75rem',
            color:      '#A1A1AA',
            letterSpacing: '0.02em',
          }}
        >
          Enter a sector and one metric for an instant data-backed insight.
        </p>
      )}
    </div>
  )
}
