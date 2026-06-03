'use client'

/**
 * PortofinoWalkthrough
 * ─────────────────────────────────────────────────────────────────────────────
 * Replaces ProductWalkthrough. The section shows:
 *
 *   Layer 0 — Portofino 3D harbour scene (fixed-position behind everything)
 *   Layer 1 — ASCII character rain canvas (semi-transparent, coloured in the
 *              harbour palette: teal / gold / navy whites) — same effect as
 *              Perplexity Comet / ASCII Magic landing pages
 *   Layer 2 — Three-step "how it works" content centred over the scene
 *
 * The sail in the 3D scene is the classic Portofino build-in scene.
 * This component only owns the ASCII overlay + content shell.
 */

import { useEffect, useRef } from 'react'
import { motion }            from 'framer-motion'
import { PortofinoScene }    from '@/components/landing/PortofinoScene'
import { useLanguage }       from '@/lib/i18n/LanguageContext'

// ── ASCII palette — matches the harbour colours ───────────────────────────────
const CHARS   = '@#S0Xx+=-:. '
const PALETTE = [
  'rgba(20,184,166,',    // tiffany
  'rgba(201,169,110,',   // gold
  'rgba(200,216,232,',   // sky-blue white
  'rgba(250,250,248,',   // near-white
]

// ── ASCII rain canvas ─────────────────────────────────────────────────────────
function AsciiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx    = canvas.getContext('2d')
    if (!ctx)    return

    const FONT_SIZE  = 13
    let cols         = 0
    let drops: number[] = []

    function resize() {
      canvas!.width  = window.innerWidth
      canvas!.height = window.innerHeight
      cols  = Math.floor(canvas!.width / FONT_SIZE)
      drops = Array.from({ length: cols }, () => Math.random() * -80)
    }
    resize()
    window.addEventListener('resize', resize)

    // Each column has a fixed colour and speed so it looks organic
    const colPalette = Array.from({ length: 400 }, (_, i) => {
      const base  = PALETTE[i % PALETTE.length]
      const alpha = (0.18 + Math.random() * 0.45).toFixed(2)
      return base + alpha + ')'
    })
    const colSpeed  = Array.from({ length: 400 }, () => 0.28 + Math.random() * 0.55)

    let raf: number
    function draw() {
      // Fade trail
      ctx!.fillStyle = 'rgba(8,9,13,0.18)'
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)

      ctx!.font = `${FONT_SIZE}px "JetBrains Mono", "Courier New", monospace`

      for (let i = 0; i < cols; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        ctx!.fillStyle = colPalette[i % colPalette.length]
        ctx!.fillText(char, i * FONT_SIZE, drops[i] * FONT_SIZE)

        drops[i] += colSpeed[i]
        // Reset when off-screen — randomise to avoid sync wave
        if (drops[i] * FONT_SIZE > canvas!.height && Math.random() > 0.975) {
          drops[i] = Math.random() * -40
        }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:   'absolute',
        inset:       0,
        width:      '100%',
        height:     '100%',
        pointerEvents: 'none',
        zIndex:      5,
        mixBlendMode:'screen',
        opacity:     0.55,
      }}
    />
  )
}

// ── Step card ─────────────────────────────────────────────────────────────────
function Step({ n, title, body, delay }: { n: string; title: string; body: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background:          'rgba(8,14,28,0.72)',
        backdropFilter:      'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
        border:              '1px solid rgba(201,169,110,0.22)',
        borderRadius:         16,
        padding:             '28px 28px 26px',
        flex:                 1,
        minWidth:             0,
        position:            'relative',
        overflow:            'hidden',
      }}
    >
      {/* Gold top hairline */}
      <div style={{
        position:   'absolute',
        top:         0,
        left:       '8%',
        right:      '8%',
        height:      1,
        background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.55), transparent)',
      }} />

      <div style={{
        fontFamily:    'Cormorant Garamond, Georgia, serif',
        fontSize:       56,
        fontWeight:     300,
        color:         'rgba(201,169,110,0.18)',
        lineHeight:     1,
        marginBottom:   16,
        letterSpacing: '-0.03em',
      }}>
        {n}
      </div>

      <div style={{ width: 24, height: 1, background: '#C9A96E', opacity: 0.55, marginBottom: 14 }} />

      <p style={{
        fontFamily:    'Inter, sans-serif',
        fontSize:       11,
        fontWeight:     700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color:         '#C9A96E',
        margin:        '0 0 10px',
      }}>
        {title}
      </p>
      <p style={{
        fontFamily: 'Inter, sans-serif',
        fontSize:    14,
        lineHeight:  1.72,
        color:      'rgba(250,250,248,0.62)',
        fontWeight:  300,
        margin:      0,
      }}>
        {body}
      </p>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function PortofinoWalkthrough() {
  const { t } = useLanguage()

  const STEPS = [
    {
      n:     '01',
      title: t('landing.how1title'),
      body:  t('landing.how1body'),
    },
    {
      n:     '02',
      title: t('landing.how2title'),
      body:  t('landing.how2body'),
    },
    {
      n:     '03',
      title: t('landing.how3title'),
      body:  t('landing.how3body'),
    },
  ]

  return (
    <section
      id="tutorial"
      style={{
        position:   'relative',
        minHeight:  '100vh',
        overflow:   'hidden',
        background: '#08090D',
        display:    'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {/* ── Layer 0: Portofino 3D scene ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <PortofinoScene />
      </div>

      {/* ── Layer 1: ASCII rain ── */}
      <AsciiCanvas />

      {/* ── Layer 2: dark vignette so text stays readable ── */}
      <div style={{
        position:   'absolute',
        inset:       0,
        zIndex:      6,
        background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(8,9,13,0.08) 0%, rgba(8,9,13,0.72) 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Layer 3: content ── */}
      <div
        className="max-w-6xl mx-auto px-6 md:px-10"
        style={{
          position:       'relative',
          zIndex:          10,
          paddingTop:      120,
          paddingBottom:   120,
          width:          '100%',
        }}
      >
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 64, textAlign: 'center' }}
        >
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: 20 }}>
            <div style={{ width: 36, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.5))' }} />
            <span style={{
              fontFamily:    'Inter, sans-serif',
              fontSize:       10,
              fontWeight:     700,
              letterSpacing: '0.20em',
              textTransform: 'uppercase',
              color:         'rgba(201,169,110,0.75)',
            }}>
              Methodology
            </span>
            <div style={{ width: 36, height: 1, background: 'linear-gradient(90deg, rgba(201,169,110,0.5), transparent)' }} />
          </div>

          <h2 style={{
            fontFamily:    'Cormorant Garamond, Georgia, serif',
            fontSize:      'clamp(2rem, 4.5vw, 3.5rem)',
            fontWeight:     600,
            fontStyle:     'italic',
            color:         '#FAFAF8',
            lineHeight:     1.12,
            margin:        '0 0 20px',
            letterSpacing: '-0.02em',
          }}>
            Three steps.{' '}
            <span style={{ color: '#C9A96E' }}>One sovereign</span>
            {' '}intelligence layer.
          </h2>

          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontSize:    15,
            lineHeight:  1.75,
            color:      'rgba(250,250,248,0.42)',
            fontWeight:  300,
            maxWidth:   '52ch',
            margin:     '0 auto',
          }}>
            Each analysis draws on verified industry benchmarks — not heuristics — and is calibrated to your specific numbers.
          </p>
        </motion.div>

        {/* Step cards */}
        <div style={{
          display:   'flex',
          gap:        20,
          flexWrap:  'wrap',
        }}>
          {STEPS.map((s, i) => (
            <Step key={s.n} {...s} delay={0.10 + i * 0.12} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: 'center', marginTop: 52 }}
        >
          <a
            href="/chat"
            style={{
              display:       'inline-flex',
              alignItems:    'center',
              gap:            10,
              padding:       '14px 32px',
              background:    'rgba(201,169,110,0.12)',
              border:        '1px solid rgba(201,169,110,0.38)',
              borderRadius:   9999,
              fontFamily:    'Inter, sans-serif',
              fontSize:       12,
              fontWeight:     700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color:         '#C9A96E',
              textDecoration:'none',
              transition:    'all 0.2s ease',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.background = 'rgba(201,169,110,0.22)'
              el.style.borderColor = 'rgba(201,169,110,0.60)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.background = 'rgba(201,169,110,0.12)'
              el.style.borderColor = 'rgba(201,169,110,0.38)'
            }}
          >
            Begin your analysis
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  )
}
