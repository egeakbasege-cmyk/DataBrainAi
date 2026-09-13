'use client'

/**
 * StarfieldBackground — purple-glow twinkling starfield for dark sections
 * ─────────────────────────────────────────────────────────────────────────────
 * A calm field of stars with:
 *   • Light motion   — each star drifts very slowly and twinkles (opacity + size
 *                      breathe on independent phases) so the field feels alive.
 *   • Purple glow     — every star is drawn with a soft violet halo (radial fill
 *                      + shadowBlur) so it reads as a "shadow light".
 *   • Dark-purple cast— a second, offset dark-violet shadow pass gives each star
 *                      a subtle grounded shadow rather than a flat dot.
 *   • Random vanish   — ~half the field is flagged "blinker"; each blinker fades
 *                      fully out and back in at its own randomised interval, so
 *                      at any moment a random ~half count is disappearing.
 *
 * Canvas-based for performance: DPR capped at 2, single rAF loop, ResizeObserver
 * for layout changes, and a static single-frame render under
 * prefers-reduced-motion. Fixedly aria-hidden and pointer-transparent.
 */

import { useEffect, useRef } from 'react'

interface Star {
  x: number          // normalised 0..1 across width
  y: number          // normalised 0..1 across height
  r: number          // base radius in css px
  twPhase: number    // twinkle phase offset
  twSpeed: number    // twinkle speed
  dx: number         // horizontal drift (css px / sec)
  dy: number         // vertical drift (css px / sec)
  blinker: boolean   // participates in the random vanish cycle
  // Blink state (only used when blinker)
  onFor: number      // seconds visible
  offFor: number     // seconds hidden
  cycle: number      // running timer
  phaseOff: number   // initial offset so blinkers desync
}

export function StarfieldBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const canvas = cv

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2)

    let stars: Star[] = []

    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    const build = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      // Density tuned for mobile first: ~1 star / 8500 css px², capped so tall
      // desktop sections never explode the count.
      const count = Math.max(28, Math.min(150, Math.round((w * h) / 8500)))
      stars = Array.from({ length: count }, () => {
        const blinker = Math.random() < 0.5 // ~half the field can vanish
        return {
          x: Math.random(),
          y: Math.random(),
          r: rand(0.6, 1.9),
          twPhase: rand(0, Math.PI * 2),
          twSpeed: rand(0.4, 1.3),
          dx: rand(-4, 4),
          dy: rand(-3, 3),
          blinker,
          onFor: rand(2.2, 5.5),
          offFor: rand(1.2, 3.8),
          cycle: 0,
          phaseOff: rand(0, 6),
        }
      })
    }

    const syncSize = () => {
      const d = dpr()
      canvas.width = canvas.offsetWidth * d
      canvas.height = canvas.offsetHeight * d
      build()
    }
    syncSize()

    const ro = new ResizeObserver(syncSize)
    ro.observe(canvas)

    // Colours
    const GLOW = '168,120,255'      // violet halo
    const CORE = '236,226,255'      // near-white violet core
    const DARK = '38,14,74'         // dark-purple grounded shadow

    const drawStar = (
      ctx: CanvasRenderingContext2D,
      px: number,
      py: number,
      radius: number,
      alpha: number,
    ) => {
      // 1 — dark-purple cast, offset slightly down-right
      ctx.beginPath()
      ctx.fillStyle = `rgba(${DARK},${(alpha * 0.5).toFixed(3)})`
      ctx.arc(px + radius * 0.9, py + radius * 1.1, radius * 1.7, 0, Math.PI * 2)
      ctx.fill()

      // 2 — purple glow halo
      const halo = ctx.createRadialGradient(px, py, 0, px, py, radius * 6)
      halo.addColorStop(0, `rgba(${GLOW},${(alpha * 0.55).toFixed(3)})`)
      halo.addColorStop(0.4, `rgba(${GLOW},${(alpha * 0.22).toFixed(3)})`)
      halo.addColorStop(1, `rgba(${GLOW},0)`)
      ctx.beginPath()
      ctx.fillStyle = halo
      ctx.arc(px, py, radius * 6, 0, Math.PI * 2)
      ctx.fill()

      // 3 — bright core with a violet shadow bloom
      ctx.save()
      ctx.shadowColor = `rgba(${GLOW},${alpha.toFixed(3)})`
      ctx.shadowBlur = radius * 5
      ctx.beginPath()
      ctx.fillStyle = `rgba(${CORE},${alpha.toFixed(3)})`
      ctx.arc(px, py, radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    let raf = 0
    let last = performance.now()
    let t = 0

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) // clamp for tab-switch spikes
      last = now
      t += dt

      const d = dpr()
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const W = canvas.offsetWidth
      const H = canvas.offsetHeight

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(d, d)

      for (const s of stars) {
        // Drift (wrap around edges), normalised so it's resolution-independent.
        s.x += (s.dx * dt) / W
        s.y += (s.dy * dt) / H
        if (s.x < -0.02) s.x = 1.02
        if (s.x > 1.02) s.x = -0.02
        if (s.y < -0.02) s.y = 1.02
        if (s.y > 1.02) s.y = -0.02

        // Twinkle: opacity + radius breathe together.
        const tw = 0.5 + 0.5 * Math.sin(t * s.twSpeed + s.twPhase)
        let alpha = 0.35 + tw * 0.65
        let radius = s.r * (0.82 + tw * 0.4)

        // Random vanish for ~half the field.
        if (s.blinker) {
          s.cycle += dt
          const period = s.onFor + s.offFor
          const local = (s.cycle + s.phaseOff) % period
          if (local > s.onFor) {
            // Hidden window — ease out then back in at the edges of the window.
            const into = local - s.onFor
            const edge = Math.min(into, s.offFor - into) // 0 at window edges
            const fade = Math.min(1, edge / 0.5)          // 0.5s crossfade
            alpha *= 1 - fade
          }
        }

        if (alpha <= 0.01) continue
        drawStar(ctx, s.x * W, s.y * H, radius, alpha)
      }

      ctx.restore()
      raf = requestAnimationFrame(frame)
    }

    if (reduce) {
      // Single static render — no motion, no vanish.
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.save()
        ctx.scale(dpr(), dpr())
        for (const s of stars) {
          drawStar(ctx, s.x * canvas.offsetWidth, s.y * canvas.offsetHeight, s.r, 0.8)
        }
        ctx.restore()
      }
    } else {
      raf = requestAnimationFrame(frame)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 1, // above section bg, below topo lines (z:2) and content (z:2)
      }}
    />
  )
}

export default StarfieldBackground
