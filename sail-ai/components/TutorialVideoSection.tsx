'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'

const QUERY = 'Shopify mağazamın dönüşüm oranı 1.3%, sektör ortalaması nedir?'

const CHAPTERS = [
  { time: '0:12', title: 'Set your business context' },
  { time: '0:28', title: 'Choose your analysis mode' },
  { time: '0:45', title: 'Read a benchmark report' },
  { time: '1:05', title: 'Export & act on results' },
]

type Phase = 'typing' | 'loading' | 'result' | 'pause'

export function TutorialVideoSection() {
  const [phase, setPhase] = useState<Phase>('typing')
  const [typed, setTyped]   = useState('')
  const [activeChapter, setActiveChapter] = useState(0)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    let interval: ReturnType<typeof setInterval>

    function runCycle() {
      // Phase 1: typing
      setPhase('typing')
      setTyped('')
      let i = 0
      interval = setInterval(() => {
        i++
        setTyped(QUERY.slice(0, i))
        if (i >= QUERY.length) {
          clearInterval(interval)
          // Phase 2: loading
          timeout = setTimeout(() => {
            setPhase('loading')
            // Phase 3: result
            timeout = setTimeout(() => {
              setPhase('result')
              // Phase 4: pause then restart
              timeout = setTimeout(() => {
                setPhase('pause')
                timeout = setTimeout(runCycle, 600)
              }, 4000)
            }, 1400)
          }, 300)
        }
      }, 38)
    }

    runCycle()

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  // Cycle active chapter indicator in sync with animation
  useEffect(() => {
    const id = setInterval(() => {
      setActiveChapter(c => (c + 1) % CHAPTERS.length)
    }, 8000 / CHAPTERS.length)
    return () => clearInterval(id)
  }, [])

  return (
    <section
      id="tutorial"
      style={{ background: '#FAFAF8', borderTop: '1px solid rgba(0,0,0,0.07)', borderBottom: '1px solid rgba(0,0,0,0.07)' }}
    >
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-20">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '0.625rem' }}>
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#71717A' }}>
            How it works
          </span>
          <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.09)' }} />
        </div>
        <h2
          style={{
            fontFamily:    'Cormorant Garamond, Georgia, serif',
            fontStyle:     'italic',
            fontSize:      'clamp(1.5rem, 3vw, 2.2rem)',
            fontWeight:    600,
            color:         '#0C0C0E',
            letterSpacing: '-0.02em',
            marginBottom:  '3rem',
          }}
        >
          See how it works in 90 seconds
        </h2>

        {/* Two-column layout */}
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: '1fr 1fr',
            gap:                 '3rem',
            alignItems:          'start',
          }}
        >
          {/* Left: Simulated chat window */}
          <div
            style={{
              background:   '#111318',
              border:       '1px solid rgba(255,255,255,0.09)',
              borderRadius: '12px',
              overflow:     'hidden',
            }}
          >
            {/* Window chrome */}
            <div
              style={{
                padding:      '0.75rem 1rem',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                display:      'flex',
                alignItems:   'center',
                gap:          '0.5rem',
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <span
                style={{
                  fontFamily:    'Inter, sans-serif',
                  fontSize:      '0.65rem',
                  color:         'rgba(255,255,255,0.25)',
                  marginLeft:    '0.5rem',
                  letterSpacing: '0.06em',
                }}
              >
                SAIL AI — Benchmark Analysis
              </span>
            </div>

            {/* Chat body */}
            <div style={{ padding: '1.5rem', minHeight: '280px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* User message bubble */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    background:   'rgba(201,169,110,0.12)',
                    border:       '1px solid rgba(201,169,110,0.25)',
                    borderRadius: '10px 10px 2px 10px',
                    padding:      '0.75rem 1rem',
                    maxWidth:     '80%',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize:   '0.8rem',
                      lineHeight: 1.6,
                      color:      'rgba(255,255,255,0.85)',
                      margin:     0,
                    }}
                  >
                    {typed}
                    {(phase === 'typing') && (
                      <span
                        style={{
                          display:         'inline-block',
                          width:           '2px',
                          height:          '0.85em',
                          background:      '#C9A96E',
                          marginLeft:      '1px',
                          verticalAlign:   'text-bottom',
                          animation:       'sail-blink 0.75s step-end infinite',
                        }}
                      />
                    )}
                  </p>
                </div>
              </div>

              {/* Loading shimmer */}
              {phase === 'loading' && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div
                    style={{
                      width:        32,
                      height:       32,
                      borderRadius: '50%',
                      background:   'rgba(201,169,110,0.15)',
                      border:       '1px solid rgba(201,169,110,0.3)',
                      flexShrink:   0,
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3L12 19L4 19Z" fill="#C9A96E" opacity="0.85"/>
                      <line x1="12" y1="2" x2="12" y2="20" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div
                    style={{
                      background:   'rgba(255,255,255,0.05)',
                      border:       '1px solid rgba(255,255,255,0.07)',
                      borderRadius: '10px 10px 10px 2px',
                      padding:      '0.75rem 1.25rem',
                      overflow:     'hidden',
                      position:     'relative',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize:   '0.75rem',
                        color:      'rgba(255,255,255,0.3)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Analyzing benchmarks…
                    </div>
                    <div
                      style={{
                        position:   'absolute',
                        inset:      0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(201,169,110,0.08) 50%, transparent 100%)',
                        animation:  'sail-shimmer 1.2s ease-in-out infinite',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Result card */}
              {(phase === 'result' || phase === 'pause') && (
                <div
                  style={{
                    display:      'flex',
                    gap:          '0.5rem',
                    alignItems:   'flex-start',
                    animation:    'sail-fadein 0.45s ease',
                  }}
                >
                  <div
                    style={{
                      width:          32,
                      height:         32,
                      borderRadius:   '50%',
                      background:     'rgba(201,169,110,0.15)',
                      border:         '1px solid rgba(201,169,110,0.3)',
                      flexShrink:     0,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M12 3L12 19L4 19Z" fill="#C9A96E" opacity="0.85"/>
                      <line x1="12" y1="2" x2="12" y2="20" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div
                    style={{
                      background:   'rgba(255,255,255,0.04)',
                      border:       '1px solid rgba(255,255,255,0.08)',
                      borderTop:    '2px solid #C9A96E',
                      borderRadius: '0 10px 10px 10px',
                      padding:      '1rem 1.25rem',
                      flex:         1,
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontFamily:    'Inter, sans-serif',
                          fontSize:      '0.58rem',
                          fontWeight:    700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color:         '#C9A96E',
                          border:        '1px solid rgba(201,169,110,0.35)',
                          padding:       '2px 6px',
                        }}
                      >
                        E-Commerce
                      </span>
                      <span
                        style={{
                          fontFamily:    'Inter, sans-serif',
                          fontSize:      '0.58rem',
                          fontWeight:    700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color:         'rgba(255,255,255,0.3)',
                          border:        '1px solid rgba(255,255,255,0.1)',
                          padding:       '2px 6px',
                        }}
                      >
                        CVR Benchmark
                      </span>
                    </div>

                    <p
                      style={{
                        fontFamily: 'Cormorant Garamond, Georgia, serif',
                        fontStyle:  'italic',
                        fontSize:   '0.9rem',
                        lineHeight: 1.55,
                        color:      'rgba(255,255,255,0.8)',
                        marginBottom: '0.875rem',
                      }}
                    >
                      Your conversion rate sits 1.0 pp below the sector median. Closing this gap is achievable within 90 days with focused checkout optimisation.
                    </p>

                    {/* Mini stat grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '0.875rem' }}>
                      {[
                        { label: 'Your CVR',       value: '1.3%', accent: '#C07A6A' },
                        { label: 'Sector median',  value: '2.3%', accent: '#C9A96E' },
                        { label: 'Gap',            value: '−1.0pp', accent: 'rgba(255,255,255,0.45)' },
                      ].map(s => (
                        <div
                          key={s.label}
                          style={{
                            background:   'rgba(255,255,255,0.03)',
                            border:       '1px solid rgba(255,255,255,0.07)',
                            borderRadius: '6px',
                            padding:      '0.5rem 0.625rem',
                            textAlign:    'center',
                          }}
                        >
                          <div
                            style={{
                              fontFamily:    'Cormorant Garamond, Georgia, serif',
                              fontSize:      '1.1rem',
                              fontWeight:    700,
                              color:         s.accent,
                              lineHeight:    1,
                              marginBottom:  '0.2rem',
                            }}
                          >
                            {s.value}
                          </div>
                          <div
                            style={{
                              fontFamily:    'Inter, sans-serif',
                              fontSize:      '0.58rem',
                              color:         'rgba(255,255,255,0.28)',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 3 recommendations */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {[
                        'Reduce checkout to 3 steps — target: −15% abandonment',
                        'Add cart recovery email within 1 hour — target: +8% recovery',
                        'Show trust signals at payment step — target: +0.4pp CVR',
                      ].map((rec, i) => (
                        <div
                          key={i}
                          style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}
                        >
                          <span
                            style={{
                              fontFamily:    'Cormorant Garamond, Georgia, serif',
                              fontSize:      '0.7rem',
                              fontWeight:    700,
                              color:         '#C9A96E',
                              flexShrink:    0,
                              marginTop:     '1px',
                            }}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span
                            style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize:   '0.72rem',
                              color:      'rgba(255,255,255,0.5)',
                              lineHeight: 1.5,
                            }}
                          >
                            {rec}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: chapter list + CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
              <p
                style={{
                  fontFamily:   'Inter, sans-serif',
                  fontSize:     '0.8rem',
                  color:        '#71717A',
                  lineHeight:   1.75,
                  fontWeight:   300,
                  marginBottom: '1.75rem',
                  maxWidth:     '38ch',
                }}
              >
                Watch the full walkthrough to see how SAIL turns a single question into a structured, benchmark-grounded action plan.
              </p>

              {/* Chapter list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {CHAPTERS.map((ch, i) => (
                  <div
                    key={ch.title}
                    style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          '1rem',
                      padding:      '0.875rem 0',
                      borderBottom: '1px solid rgba(0,0,0,0.07)',
                      cursor:       'default',
                    }}
                  >
                    <span
                      style={{
                        fontFamily:    'Inter, sans-serif',
                        fontSize:      '0.65rem',
                        fontWeight:    600,
                        letterSpacing: '0.06em',
                        color:         activeChapter === i ? '#C9A96E' : 'rgba(0,0,0,0.2)',
                        minWidth:      '2.5rem',
                        transition:    'color 0.3s ease',
                      }}
                    >
                      {ch.time}
                    </span>
                    <div
                      style={{
                        width:        3,
                        height:       '1.2rem',
                        background:   activeChapter === i ? '#C9A96E' : 'rgba(0,0,0,0.08)',
                        borderRadius: '2px',
                        flexShrink:   0,
                        transition:   'background 0.3s ease',
                      }}
                    />
                    <span
                      style={{
                        fontFamily:  'Inter, sans-serif',
                        fontSize:    '0.82rem',
                        color:       activeChapter === i ? '#0C0C0E' : '#71717A',
                        fontWeight:  activeChapter === i ? 500 : 300,
                        transition:  'all 0.3s ease',
                      }}
                    >
                      {ch.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA button */}
            <Link
              href="#"
              style={{
                display:       'inline-flex',
                alignItems:    'center',
                gap:           '0.5rem',
                fontFamily:    'Inter, sans-serif',
                fontSize:      '0.78rem',
                fontWeight:    600,
                letterSpacing: '0.06em',
                color:         '#0C0C0E',
                textDecoration:'none',
                borderBottom:  '1px solid rgba(0,0,0,0.25)',
                paddingBottom: '2px',
                width:         'fit-content',
              }}
            >
              Watch Full Tutorial
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Keyframe styles injected once */}
      <style>{`
        @keyframes sail-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes sail-shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes sail-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
      `}</style>
    </section>
  )
}
