'use client'

/**
 * /frameworks — Strategic Framework Visualisations
 * ─────────────────────────────────────────────────────────────────────────────
 * AI-powered Ansoff Matrix and BCG Growth-Share Matrix analysis.
 * Users describe their business; Groq 70B places them in the correct quadrant
 * and renders interactive visual frameworks with recommendations.
 */

import { useState, useCallback }  from 'react'
import { useSession }              from 'next-auth/react'
import { useRouter }               from 'next/navigation'
import { useEffect }               from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AnsoffMatrix }            from '@/components/AnsoffMatrix'
import { BcgMatrix }               from '@/components/BcgMatrix'
import { useLanguage }             from '@/lib/i18n/LanguageContext'
import { useBusinessContext }      from '@/lib/context/BusinessContext'
import type { AnsoffData }         from '@/components/AnsoffMatrix'
import type { BcgData }            from '@/components/BcgMatrix'

// ── Example prompts ───────────────────────────────────────────────────────────

const EXAMPLES = [
  'Independent coffee shop in London with 3 locations. Looking to grow without opening new branches.',
  'B2B SaaS tool for project management with 800 paying customers. Considering entering the HR tech space.',
  'Family-owned bakery with strong local brand. Want to launch an e-commerce channel.',
  'Digital marketing agency with steady retainer clients. Market is saturating — need a strategic direction.',
]

// ── Framework result type ─────────────────────────────────────────────────────

interface FrameworkResult {
  ansoff: AnsoffData
  bcg:    BcgData
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FrameworksPage() {
  const { data: session, status } = useSession()
  const router  = useRouter()
  const { t }   = useLanguage()
  const { profile } = useBusinessContext()

  const [description, setDescription] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [result,      setResult]      = useState<FrameworkResult | null>(null)

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/onboarding')
  }, [status, router])

  // Pre-fill from vault sector if available
  useEffect(() => {
    if (profile.sector && !description) {
      setDescription(`Business in the ${profile.sector} sector.`)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.sector])

  const handleAnalyse = useCallback(async () => {
    if (!description.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/frameworks', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          description: description.trim(),
          sector:      profile.sector || undefined,
          metrics:     profile.metrics.length > 0 ? profile.metrics : undefined,
        }),
      })

      const data = await res.json() as FrameworkResult & { error?: string }
      if (data.error) throw new Error(data.error)
      setResult(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [description, profile, loading])

  if (status === 'loading' || status === 'unauthenticated') return null

  return (
    <main style={{ minHeight: '100vh', background: '#F9F9F7', padding: '40px 20px 80px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{
            fontFamily:    'var(--font-inter), sans-serif',
            fontSize:      '0.6rem',
            fontWeight:    700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color:         '#C9A96E',
            margin:        '0 0 8px',
          }}>
            Strategic Frameworks
          </p>
          <h1 style={{
            fontFamily:    'var(--font-cormorant), Georgia, serif',
            fontSize:      'clamp(1.6rem, 4vw, 2.4rem)',
            fontWeight:    600,
            color:         '#0C0C0E',
            margin:        '0 0 12px',
            lineHeight:    1.2,
          }}>
            Visual Framework Analysis
          </h1>
          <p style={{
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize:   '0.9rem',
            color:      '#71717A',
            lineHeight: 1.6,
            maxWidth:   560,
            margin:     0,
          }}>
            Describe your business. Sail AI places you on the Ansoff Growth Matrix
            and BCG Growth-Share Matrix with AI-powered rationale and recommendations.
          </p>
        </div>

        {/* Input card */}
        <div style={{
          background:  '#FFFFFF',
          border:      '1px solid rgba(0,0,0,0.08)',
          boxShadow:   '0 1px 4px rgba(0,0,0,0.05)',
          padding:     '28px 32px 24px',
          marginBottom: 32,
        }}>
          {/* Gold hairline */}
          <div style={{
            height:     2,
            background: 'linear-gradient(90deg, transparent, #C9A96E, transparent)',
            margin:     '-28px -32px 24px',
          }} />

          <label style={{
            fontFamily:    'var(--font-inter), sans-serif',
            fontSize:      '0.7rem',
            fontWeight:    600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:         '#71717A',
            display:       'block',
            marginBottom:  10,
          }}>
            Describe your business
          </label>

          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="E.g. Independent coffee shop with 3 locations in London. Currently focused on walk-in customers and corporate catering contracts. Considering expanding the loyalty programme and potentially franchising."
            rows={4}
            style={{
              width:      '100%',
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:   '0.88rem',
              color:      '#0C0C0E',
              background: 'rgba(0,0,0,0.02)',
              border:     '1px solid rgba(0,0,0,0.09)',
              padding:    '12px 14px',
              resize:     'vertical',
              lineHeight: 1.6,
              outline:    'none',
              boxSizing:  'border-box',
            }}
          />

          {/* Example prompts */}
          <div style={{ marginTop: 12 }}>
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.65rem', color: '#A1A1AA', marginBottom: 8 }}>
              Try an example:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => setDescription(ex)} style={{
                  fontFamily:    'var(--font-inter), sans-serif',
                  fontSize:      '0.68rem',
                  color:         '#71717A',
                  background:    'rgba(0,0,0,0.03)',
                  border:        '1px solid rgba(0,0,0,0.09)',
                  padding:       '4px 10px',
                  cursor:        'pointer',
                  textAlign:     'left',
                  lineHeight:    1.4,
                  maxWidth:      260,
                  transition:    'border-color 0.15s',
                }}>
                  {ex.length > 60 ? ex.slice(0, 60) + '…' : ex}
                </button>
              ))}
            </div>
          </div>

          {/* Vault context note */}
          {(profile.sector || profile.metrics.length > 0) && (
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:   '0.7rem',
              color:      '#14B8A6',
              marginTop:  12,
              marginBottom: 0,
            }}>
              ✓ Your Data Vault context will be included in the analysis
              {profile.sector ? ` (sector: ${profile.sector})` : ''}
              {profile.metrics.length > 0 ? `, ${profile.metrics.length} metric${profile.metrics.length > 1 ? 's' : ''}` : ''}.
            </p>
          )}

          <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={handleAnalyse}
              disabled={!description.trim() || loading}
              style={{
                padding:       '10px 28px',
                background:    loading || !description.trim() ? 'rgba(0,0,0,0.06)' : '#0C0C0E',
                color:         loading || !description.trim() ? '#A1A1AA' : '#FFFFFF',
                fontFamily:    'var(--font-inter), sans-serif',
                fontSize:      '0.75rem',
                fontWeight:    600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                border:        'none',
                cursor:        loading || !description.trim() ? 'not-allowed' : 'pointer',
                transition:    'background 0.2s',
              }}
            >
              {loading ? 'Analysing…' : 'Analyse with Sail AI'}
            </button>

            {result && !loading && (
              <button onClick={() => { setResult(null); setDescription('') }} style={{
                fontFamily: 'var(--font-inter), sans-serif',
                fontSize:   '0.72rem',
                color:      '#A1A1AA',
                background: 'none',
                border:     'none',
                cursor:     'pointer',
                padding:    0,
              }}>
                Clear
              </button>
            )}
          </div>

          {error && (
            <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.78rem', color: '#DC2626', marginTop: 12, marginBottom: 0 }}>
              ⚠ {error}
            </p>
          )}
        </div>

        {/* Results */}
        <AnimatePresence>
          {(loading || result) && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24 }}
            >
              {/* Ansoff */}
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '24px 28px' }}>
                <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #14B8A6, transparent)', margin: '-24px -28px 24px' }} />
                <AnsoffMatrix data={result?.ansoff ?? null} loading={loading} />
              </div>

              {/* BCG */}
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '24px 28px' }}>
                <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #C9A96E, transparent)', margin: '-24px -28px 24px' }} />
                <BcgMatrix data={result?.bcg ?? null} loading={loading} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info section (shown when no result) */}
        {!result && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ marginTop: 48 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {[
                {
                  title:    'Ansoff Growth Matrix',
                  subtitle: 'Igor Ansoff, 1957',
                  desc:     'Maps your growth strategy across two axes: existing vs. new products, and existing vs. new markets. Determines whether you should penetrate deeper, develop new markets, develop new products, or diversify.',
                  accent:   '#14B8A6',
                },
                {
                  title:    'BCG Growth-Share Matrix',
                  subtitle: 'Boston Consulting Group, 1970',
                  desc:     'Positions your business unit on market growth rate versus relative market share. Classifies as Star, Cash Cow, Question Mark, or Dog — each with distinct investment and strategy implications.',
                  accent:   '#C9A96E',
                },
              ].map(card => (
                <div key={card.title} style={{
                  padding:    '20px 24px',
                  background: '#FFFFFF',
                  border:     '1px solid rgba(0,0,0,0.07)',
                  borderLeft: `3px solid ${card.accent}`,
                }}>
                  <p style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontSize: '1.05rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 4px' }}>
                    {card.title}
                  </p>
                  <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.65rem', color: card.accent, letterSpacing: '0.08em', margin: '0 0 12px', textTransform: 'uppercase', fontWeight: 600 }}>
                    {card.subtitle}
                  </p>
                  <p style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: '0.8rem', color: '#71717A', lineHeight: 1.65, margin: 0 }}>
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </main>
  )
}
