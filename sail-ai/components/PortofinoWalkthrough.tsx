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
import { IPhoneFrame }       from '@/components/landing/IPhoneFrame'
import { UngatedApp }        from '@/components/landing/UngatedApp'
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
        opacity:     0.20,
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
        background:          'linear-gradient(135deg, rgba(201,169,110,0.10) 0%, rgba(255,255,255,0.04) 60%, rgba(20,184,166,0.05) 100%)',
        backdropFilter:      'blur(32px)',
        WebkitBackdropFilter:'blur(32px)',
        border:              '1px solid rgba(201,169,110,0.22)',
        borderRadius:         18,
        padding:             '30px 28px 28px',
        flex:                 1,
        minWidth:             0,
        position:            'relative',
        overflow:            'hidden',
        boxShadow:           '0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.10)',
      }}
    >
      {/* Gold top hairline */}
      <div style={{
        position:   'absolute',
        top:         0,
        left:       '8%',
        right:      '8%',
        height:      1,
        background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.70), transparent)',
      }} />

      <div style={{
        fontFamily:    'var(--font-cormorant), Georgia, serif',
        fontSize:       56,
        fontWeight:     300,
        color:         'rgba(201,169,110,0.55)',
        lineHeight:     1,
        marginBottom:   16,
        letterSpacing: '-0.03em',
        textShadow:    '0 2px 12px rgba(0,0,0,0.7)',
      }}>
        {n}
      </div>

      <div style={{ width: 24, height: 1, background: '#C9A96E', opacity: 0.75, marginBottom: 14 }} />

      <p style={{
        fontFamily:    'var(--font-inter), sans-serif',
        fontSize:       11,
        fontWeight:     700,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        color:         '#F0D080',
        margin:        '0 0 10px',
        textShadow:    '0 1px 8px rgba(0,0,0,0.9)',
      }}>
        {title}
      </p>
      <p style={{
        fontFamily: 'var(--font-inter), sans-serif',
        fontSize:    14,
        lineHeight:  1.72,
        color:      '#FFFFFF',
        fontWeight:  400,
        margin:      0,
        textShadow: '0 1px 8px rgba(0,0,0,0.85)',
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
        position:      'relative',
        minHeight:     '100vh',
        overflow:      'hidden',
        background:    '#08090D',
        display:       'flex',
        flexDirection: 'column',
        justifyContent:'center',
        scrollMarginTop: 72,
      }}
    >
      {/* ── Layer 0: Portofino 3D scene ── */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <PortofinoScene />
      </div>

      {/* ── Layer 1: ASCII rain ── */}
      <AsciiCanvas />

      {/* ── Layer 2a: radial edge vignette — softened so harbour shows through ── */}
      <div style={{
        position:   'absolute',
        inset:       0,
        zIndex:      6,
        background: 'radial-gradient(ellipse 85% 70% at 50% 50%, rgba(8,9,13,0.04) 0%, rgba(8,9,13,0.38) 100%)',
        pointerEvents: 'none',
      }} />
      {/* ── Layer 2b: linear top+bottom darkening ── */}
      <div style={{
        position:   'absolute',
        inset:       0,
        zIndex:      7,
        background: 'linear-gradient(180deg, rgba(8,9,13,0.32) 0%, rgba(8,9,13,0.0) 22%, rgba(8,9,13,0.0) 78%, rgba(8,9,13,0.32) 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── Layer 3: content — iPhone centre, steps right ── */}
      <div
        style={{
          position:       'relative',
          zIndex:          12,
          width:          '100%',
          maxWidth:        1200,
          margin:         '0 auto',
          padding:        '100px 32px 100px',
          display:        'flex',
          alignItems:     'center',
          gap:             48,
          flexWrap:       'wrap',
          justifyContent: 'center',
        }}
      >

        {/* ── Left: section label + iPhone ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, flex: '0 0 auto' }}>

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <div style={{ width: 28, height: 1, background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.55))' }} />
            <span style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#C9A96E', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>
              Live Demo
            </span>
            <div style={{ width: 28, height: 1, background: 'linear-gradient(90deg, rgba(201,169,110,0.55), transparent)' }} />
          </motion.div>

          {/* iPhone */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <IPhoneFrame>
              <UngatedApp />
            </IPhoneFrame>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{ fontFamily: 'var(--font-inter), sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.85)', textAlign: 'center', maxWidth: 220, textShadow: '0 1px 8px rgba(0,0,0,0.9)' }}
          >
            No account needed — tap the screen to begin
          </motion.p>
        </div>

        {/* ── Right: heading + steps ── */}
        <div style={{ flex: 1, minWidth: 280, maxWidth: 480 }}>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 36 }}
          >
            <h2 style={{
              fontFamily:    'var(--font-cormorant), Georgia, serif',
              fontSize:      'clamp(1.8rem, 3.5vw, 3rem)',
              fontWeight:     600,
              fontStyle:     'italic',
              color:         '#FFFFFF',
              lineHeight:     1.14,
              margin:        '0 0 14px',
              letterSpacing: '-0.02em',
              textShadow:    '0 2px 20px rgba(0,0,0,0.95), 0 4px 40px rgba(0,0,0,0.7)',
            }}>
              Three steps.{' '}
              <span style={{ color: '#F0D080', textShadow: '0 2px 20px rgba(0,0,0,0.95), 0 4px 40px rgba(0,0,0,0.7)' }}>One sovereign</span>
              {' '}intelligence layer.
            </h2>
            <p style={{
              fontFamily: 'var(--font-inter), sans-serif',
              fontSize:    14,
              lineHeight:  1.75,
              color:      '#FFFFFF',
              fontWeight:  400,
              margin:      0,
              textShadow: '0 1px 12px rgba(0,0,0,0.95)',
            }}>
              Each analysis draws on verified industry benchmarks — calibrated to your specific numbers.
            </p>
          </motion.div>

          {/* Steps — vertical stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {STEPS.map((s, i) => (
              <Step key={s.n} {...s} delay={0.12 + i * 0.10} />
            ))}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            style={{ marginTop: 32 }}
          >
            <a
              href="/chat"
              style={{
                display:       'inline-flex',
                alignItems:    'center',
                gap:            10,
                padding:       '13px 28px',
                background:    'rgba(201,169,110,0.12)',
                border:        '1px solid rgba(201,169,110,0.38)',
                borderRadius:   9999,
                fontFamily:    'var(--font-inter), sans-serif',
                fontSize:       11,
                fontWeight:     700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color:         '#C9A96E',
                textDecoration:'none',
                transition:    'all 0.2s ease',
              }}
              onMouseEnter={e => { const el = e.currentTarget; el.style.background = 'rgba(201,169,110,0.22)'; el.style.borderColor = 'rgba(201,169,110,0.60)' }}
              onMouseLeave={e => { const el = e.currentTarget; el.style.background = 'rgba(201,169,110,0.12)'; el.style.borderColor = 'rgba(201,169,110,0.38)' }}
            >
              Begin your analysis
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
