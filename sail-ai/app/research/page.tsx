'use client'

/**
 * /research — SAIL AI Deep Research Studio
 *
 * Dedicated research page with:
 *  • Always-on Tavily + Serper deep search
 *  • Real images from web search results
 *  • Structured intelligence report (sections, key findings, sources)
 *  • Separate from chat — editorial / report style UI
 */

import { useState, useRef } from 'react'
import { Nav }               from '@/components/Nav'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportSection {
  heading:    string
  content:    string
  dataPoints: string[]
}

interface MarketSnapshot {
  sentiment:  'bullish' | 'bearish' | 'neutral'
  confidence: number
  timeframe:  string
}

interface CompetitorInsight {
  name:    string
  insight: string
}

interface Source {
  url:              string
  title:            string
  domain:           string
  reliabilityScore: number
  publishedDate?:   string
  content:          string
}

interface ResearchImage {
  url:          string
  description?: string
}

interface ResearchReport {
  title:                     string
  summary:                   string
  keyFindings:               string[]
  sections:                  ReportSection[]
  marketSnapshot:            MarketSnapshot
  competitorInsights:        CompetitorInsight[]
  actionableRecommendations: string[]
  sources:                   Source[]
  images:                    ResearchImage[]
  queriesUsed:               string[]
  searchedAt:                string
  provider:                  string
  staleSourceCount:          number
}

// ── Colour helpers ────────────────────────────────────────────────────────────

const SENTIMENT_COLOR: Record<string, string> = {
  bullish: '#10B981',
  bearish: '#EF4444',
  neutral: '#F59E0B',
}

const SENTIMENT_LABEL: Record<string, string> = {
  bullish: 'Pozitif ↑',
  bearish: 'Negatif ↓',
  neutral: 'Nötr →',
}

// ── Loader animation ──────────────────────────────────────────────────────────

function ResearchLoader({ query }: { query: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
      <div style={{
        width:         56,
        height:        56,
        borderRadius:  '50%',
        border:        '3px solid rgba(201,169,110,0.15)',
        borderTop:     '3px solid #C9A96E',
        animation:     'spin 0.9s linear infinite',
        margin:        '0 auto 1.5rem',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#9CA3AF', margin: 0 }}>
        Araştırılıyor: <strong style={{ color: '#0C0C0E' }}>{query}</strong>
      </p>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#C4C4CC', marginTop: '0.5rem' }}>
        Tavily + Serper paralel tarama yapıyor…
      </p>
    </div>
  )
}

// ── Key Findings ──────────────────────────────────────────────────────────────

function FindingCard({ text, index }: { text: string; index: number }) {
  const colors = ['#C9A96E', '#10B981', '#6366F1', '#F59E0B']
  const color  = colors[index % colors.length]
  return (
    <div style={{
      background:   `${color}08`,
      border:       `1px solid ${color}33`,
      borderLeft:   `3px solid ${color}`,
      borderRadius: '8px',
      padding:      '0.75rem 1rem',
      flex:         '1 1 calc(50% - 0.5rem)',
      minWidth:     260,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
        <span style={{ color, fontSize: '0.65rem', fontWeight: 700, marginTop: 2, flexShrink: 0, fontFamily: 'Inter, sans-serif' }}>
          #{index + 1}
        </span>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#1E293B', lineHeight: 1.55, margin: 0 }}>
          {text}
        </p>
      </div>
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: ReportSection }) {
  return (
    <div style={{
      background:   '#FFFFFF',
      border:       '1px solid rgba(0,0,0,0.08)',
      borderRadius: '10px',
      padding:      '1.25rem 1.5rem',
    }}>
      <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', fontWeight: 700, color: '#0C0C0E', margin: '0 0 0.625rem' }}>
        {section.heading}
      </h3>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#4B5563', lineHeight: 1.65, margin: '0 0 0.875rem' }}>
        {section.content}
      </p>
      {section.dataPoints?.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {section.dataPoints.map((dp, i) => (
            <li key={i} style={{
              background:   'rgba(12,12,14,0.04)',
              border:       '1px solid rgba(12,12,14,0.08)',
              borderRadius: '6px',
              padding:      '0.3rem 0.65rem',
              fontFamily:   'Inter, sans-serif',
              fontSize:     '0.73rem',
              color:        '#374151',
              fontWeight:   500,
            }}>
              {dp}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Image gallery ─────────────────────────────────────────────────────────────

function ImageGallery({ images }: { images: ResearchImage[] }) {
  const [failed, setFailed] = useState<Set<string>>(new Set())
  const visible = images.filter(img => !failed.has(img.url)).slice(0, 9)
  if (visible.length === 0) return null

  return (
    <div>
      <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.75rem' }}>
        Kaynaklardan Görseller
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        {visible.map((img, i) => (
          <div key={i} style={{ position: 'relative', aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', background: '#F3F4F6' }}>
            <img
              src={img.url}
              alt={img.description ?? `Görsel ${i + 1}`}
              onError={() => setFailed(prev => new Set(prev).add(img.url))}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {img.description && (
              <div style={{
                position:   'absolute',
                bottom:     0,
                left:       0,
                right:      0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                padding:    '0.375rem 0.5rem',
                fontFamily: 'Inter, sans-serif',
                fontSize:   '0.6rem',
                color:      '#FFF',
                lineHeight: 1.3,
              }}>
                {img.description.slice(0, 80)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Source list ───────────────────────────────────────────────────────────────

function SourceRow({ source, index }: { source: Source; index: number }) {
  const reliability = Math.round(source.reliabilityScore * 100)
  const reliColor   = reliability >= 85 ? '#10B981' : reliability >= 70 ? '#F59E0B' : '#9CA3AF'
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display:        'flex',
        alignItems:     'flex-start',
        gap:            '0.75rem',
        padding:        '0.625rem 0.875rem',
        borderBottom:   '1px solid rgba(0,0,0,0.05)',
        textDecoration: 'none',
        transition:     'background 0.1s',
      }}
    >
      <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', color: '#C4C4CC', fontWeight: 600, marginTop: 2, flexShrink: 0 }}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {source.title}
        </p>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#9CA3AF', margin: 0 }}>
          {source.domain} {source.publishedDate ? `· ${source.publishedDate}` : ''}
        </p>
      </div>
      <span style={{
        fontFamily:   'Inter, sans-serif',
        fontSize:     '0.62rem',
        fontWeight:   700,
        color:        reliColor,
        background:   `${reliColor}15`,
        border:       `1px solid ${reliColor}33`,
        borderRadius: '4px',
        padding:      '0.15rem 0.4rem',
        flexShrink:   0,
      }}>
        {reliability}%
      </span>
    </a>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const [query,   setQuery]   = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [report,  setReport]  = useState<ResearchReport | null>(null)
  const [error,   setError]   = useState('')
  const [showSources, setShowSources] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  async function runResearch(e?: React.FormEvent) {
    e?.preventDefault()
    const q = query.trim()
    if (!q || loading) return
    setLoading(true)
    setError('')
    setReport(null)

    try {
      const res  = await fetch('/api/research', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: q, context: context.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Research failed')
      setReport(data as ResearchReport)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const sentiment = report?.marketSnapshot?.sentiment ?? 'neutral'
  const confidence = Math.round((report?.marketSnapshot?.confidence ?? 0) * 100)

  return (
    <div style={{ minHeight: '100vh', background: '#FAFAF8' }}>
      <Nav />

      {/* ── Hero search bar ─────────────────────────────── */}
      <div style={{
        background:    'linear-gradient(135deg, #0C0C0E 0%, #1E1E24 60%, #0C0C0E 100%)',
        padding:       '3rem 1.5rem 2.5rem',
        borderBottom:  '1px solid rgba(201,169,110,0.15)',
      }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: 18 }}>🔍</span>
            <h1 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.4rem', fontWeight: 600, color: '#FAFAF8', letterSpacing: '0.06em', margin: 0 }}>
              DEEP RESEARCH
            </h1>
            <span style={{
              fontFamily:   'Inter, sans-serif',
              fontSize:     '0.55rem',
              fontWeight:   700,
              letterSpacing:'0.06em',
              color:        '#1E293B',
              background:   'rgba(201,169,110,0.85)',
              padding:      '2px 6px',
              borderRadius: '3px',
            }}>
              LIVE
            </span>
          </div>

          <form onSubmit={runResearch}>
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <textarea
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void runResearch() } }}
                placeholder="Araştırmak istediğiniz konuyu yazın… (ör: Türkiye e-ticaret sektörü 2026, TikTok reklam maliyetleri, Shopify vs WooCommerce karşılaştırması)"
                rows={3}
                style={{
                  width:          '100%',
                  padding:        '0.875rem 4.5rem 0.875rem 1rem',
                  background:     'rgba(255,255,255,0.06)',
                  border:         '1px solid rgba(255,255,255,0.15)',
                  borderRadius:   '10px',
                  fontFamily:     'Inter, sans-serif',
                  fontSize:       '0.9rem',
                  color:          '#FAFAF8',
                  outline:        'none',
                  resize:         'none',
                  boxSizing:      'border-box',
                  lineHeight:     1.6,
                }}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                style={{
                  position:     'absolute',
                  right:        '0.625rem',
                  bottom:       '0.625rem',
                  padding:      '0.5rem 1rem',
                  background:   loading || !query.trim() ? 'rgba(201,169,110,0.3)' : '#C9A96E',
                  border:       'none',
                  borderRadius: '7px',
                  color:        '#0C0C0E',
                  fontFamily:   'Inter, sans-serif',
                  fontSize:     '0.72rem',
                  fontWeight:   700,
                  letterSpacing:'0.07em',
                  cursor:       loading || !query.trim() ? 'not-allowed' : 'pointer',
                  transition:   'background 0.15s',
                }}
              >
                {loading ? '…' : 'ARAŞTIR'}
              </button>
            </div>

            {/* Optional context */}
            <input
              type="text"
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="Ek bağlam (opsiyonel): sektör, bölge, ürün türü…"
              style={{
                width:        '100%',
                padding:      '0.6rem 1rem',
                background:   'rgba(255,255,255,0.04)',
                border:       '1px solid rgba(255,255,255,0.09)',
                borderRadius: '7px',
                fontFamily:   'Inter, sans-serif',
                fontSize:     '0.78rem',
                color:        'rgba(250,250,248,0.7)',
                outline:      'none',
                boxSizing:    'border-box',
              }}
            />
          </form>

          {/* Example queries */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.875rem' }}>
            {[
              'Amazon FBA karlılık analizi 2026',
              'TikTok Shop Türkiye fiyatlandırma',
              'Shopify vs Etsy komisyon karşılaştırması',
              "eBay'de en çok satan ürünler",
            ].map(example => (
              <button
                key={example}
                onClick={() => { setQuery(example); setTimeout(() => inputRef.current?.focus(), 50) }}
                style={{
                  padding:      '0.3rem 0.7rem',
                  background:   'rgba(255,255,255,0.06)',
                  border:       '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '20px',
                  fontFamily:   'Inter, sans-serif',
                  fontSize:     '0.68rem',
                  color:        'rgba(250,250,248,0.65)',
                  cursor:       'pointer',
                  transition:   'all 0.1s',
                }}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content area ────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* Loader */}
        {loading && <ResearchLoader query={query} />}

        {/* Error */}
        {error && !loading && (
          <div style={{
            background:   'rgba(239,68,68,0.05)',
            border:       '1px solid rgba(239,68,68,0.2)',
            borderRadius: '8px',
            padding:      '1rem 1.25rem',
            fontFamily:   'Inter, sans-serif',
            fontSize:     '0.85rem',
            color:        '#B91C1C',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !report && !error && (
          <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ fontSize: 48, marginBottom: '1rem' }}>📊</div>
            <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.4rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.5rem' }}>
              Derin Pazar Araştırması
            </h2>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', color: '#9CA3AF', maxWidth: 480, margin: '0 auto' }}>
              Tavily + Serper çift arama motoru ile gerçek zamanlı web verisi çekilir,
              Groq 70B ile yapılandırılmış istihbarat raporu üretilir.
              Sonuçlar gerçek kaynaklardan alınan görsellerle desteklenir.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '2rem' }}>
              {[
                { icon: '🔎', label: 'Canlı Web Araması' },
                { icon: '🖼️', label: 'Gerçek Görseller' },
                { icon: '📈', label: 'Piyasa Analizi' },
                { icon: '📚', label: 'Kaynak Doğrulama' },
              ].map(f => (
                <div key={f.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: '0.25rem' }}>{f.icon}</div>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#9CA3AF', margin: 0 }}>{f.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Report ─────────────────────────────────────── */}
        {report && !loading && (
          <div>
            {/* Report header */}
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.875rem' }}>
                <div>
                  <h2 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '1.6rem', fontWeight: 600, color: '#0C0C0E', margin: '0 0 0.25rem' }}>
                    {report.title}
                  </h2>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.68rem', color: '#9CA3AF', margin: 0 }}>
                    {new Date(report.searchedAt).toLocaleString('tr-TR')} · {report.queriesUsed?.length ?? 0} arama vektörü · {report.sources?.length ?? 0} kaynak
                  </p>
                </div>
                {/* Market sentiment badge */}
                <div style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '0.75rem',
                  background:   '#FFFFFF',
                  border:       '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '10px',
                  padding:      '0.625rem 1rem',
                }}>
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 2px' }}>
                      Piyasa Duyarlılığı
                    </p>
                    <span style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize:   '0.82rem',
                      fontWeight: 700,
                      color:      SENTIMENT_COLOR[sentiment],
                    }}>
                      {SENTIMENT_LABEL[sentiment]}
                    </span>
                  </div>
                  <div style={{ width: 1, height: 32, background: 'rgba(0,0,0,0.08)' }} />
                  <div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.58rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', margin: '0 0 2px' }}>
                      Güven
                    </p>
                    <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', fontWeight: 700, color: '#0C0C0E' }}>
                      {confidence}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div style={{
                background:   '#FFFFFF',
                border:       '1px solid rgba(201,169,110,0.25)',
                borderLeft:   '3px solid #C9A96E',
                borderRadius: '0 8px 8px 0',
                padding:      '1rem 1.25rem',
              }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', color: '#1E293B', lineHeight: 1.7, margin: 0 }}>
                  {report.summary}
                </p>
              </div>
            </div>

            {/* Two-column layout: main content + image sidebar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>

              {/* ── Left: analysis content ─────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                {/* Key findings */}
                {report.keyFindings?.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.75rem' }}>
                      Temel Bulgular
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                      {report.keyFindings.map((f, i) => (
                        <FindingCard key={i} text={f} index={i} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis sections */}
                {report.sections?.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.75rem' }}>
                      Detaylı Analiz
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {report.sections.map((section, i) => (
                        <SectionCard key={i} section={section} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Competitor insights */}
                {report.competitorInsights?.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.75rem' }}>
                      Rakip İstihbaratı
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                      {report.competitorInsights.map((c, i) => (
                        <div key={i} style={{
                          background:   '#FFFFFF',
                          border:       '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '8px',
                          padding:      '0.75rem 1rem',
                        }}>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 700, color: '#0C0C0E', margin: '0 0 0.3rem' }}>{c.name}</p>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>{c.insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actionable recommendations */}
                {report.actionableRecommendations?.length > 0 && (
                  <div>
                    <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.75rem' }}>
                      Eylem Önerileri
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {report.actionableRecommendations.map((rec, i) => (
                        <div key={i} style={{
                          display:      'flex',
                          alignItems:   'flex-start',
                          gap:          '0.625rem',
                          background:   '#FFFFFF',
                          border:       '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '8px',
                          padding:      '0.625rem 0.875rem',
                        }}>
                          <span style={{ fontSize: '0.8rem', flexShrink: 0, marginTop: 1 }}>→</span>
                          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.82rem', color: '#1E293B', margin: 0, lineHeight: 1.55 }}>{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Right: images + search meta ──────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'sticky', top: '5rem' }}>

                {/* Image gallery */}
                {report.images?.length > 0
                  ? <ImageGallery images={report.images} />
                  : (
                    <div style={{
                      background:   '#FFFFFF',
                      border:       '1px solid rgba(0,0,0,0.08)',
                      borderRadius: '10px',
                      padding:      '1.25rem',
                      textAlign:    'center',
                    }}>
                      <div style={{ fontSize: 28, marginBottom: '0.5rem' }}>🖼️</div>
                      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#9CA3AF', margin: 0 }}>
                        Bu arama için görsel bulunamadı
                      </p>
                    </div>
                  )
                }

                {/* Search meta */}
                <div style={{
                  background:   '#FFFFFF',
                  border:       '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '10px',
                  padding:      '1rem 1.125rem',
                }}>
                  <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.625rem' }}>
                    Arama Detayları
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {[
                      { label: 'Provider', value: report.provider?.toUpperCase() },
                      { label: 'Kaynak', value: `${report.sources?.length ?? 0} sonuç` },
                      { label: 'Görsel', value: `${report.images?.length ?? 0} adet` },
                      { label: 'Eski Kaynak', value: `${report.staleSourceCount ?? 0} adet (>12ay)` },
                      { label: 'Zaman Dilimi', value: report.marketSnapshot?.timeframe },
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', color: '#9CA3AF' }}>{row.label}</span>
                        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.72rem', fontWeight: 600, color: '#0C0C0E' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Search vectors used */}
                {report.queriesUsed?.length > 0 && (
                  <div style={{
                    background:   '#FFFFFF',
                    border:       '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '10px',
                    padding:      '1rem 1.125rem',
                  }}>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9CA3AF', marginBottom: '0.625rem' }}>
                      Arama Vektörleri
                    </p>
                    {report.queriesUsed.map((q, i) => (
                      <p key={i} style={{
                        fontFamily:   'Inter, sans-serif',
                        fontSize:     '0.7rem',
                        color:        '#6B7280',
                        background:   'rgba(0,0,0,0.03)',
                        borderRadius: '4px',
                        padding:      '0.3rem 0.5rem',
                        margin:       '0 0 0.25rem',
                        wordBreak:    'break-word',
                        lineHeight:   1.5,
                      }}>
                        {i + 1}. {q}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sources accordion */}
            {report.sources?.length > 0 && (
              <div style={{ marginTop: '2rem' }}>
                <button
                  onClick={() => setShowSources(v => !v)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '0.5rem',
                    background:   'none',
                    border:       '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '8px',
                    padding:      '0.6rem 1rem',
                    cursor:       'pointer',
                    fontFamily:   'Inter, sans-serif',
                    fontSize:     '0.75rem',
                    fontWeight:   600,
                    color:        '#6B7280',
                    marginBottom: showSources ? '0.5rem' : 0,
                  }}
                >
                  <span>{showSources ? '▼' : '▶'}</span>
                  Tüm Kaynaklar ({report.sources.length})
                </button>

                {showSources && (
                  <div style={{
                    background:   '#FFFFFF',
                    border:       '1px solid rgba(0,0,0,0.08)',
                    borderRadius: '10px',
                    overflow:     'hidden',
                  }}>
                    {report.sources.map((src, i) => (
                      <SourceRow key={i} source={src} index={i} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
