'use client'

/**
 * TopoBackground — animated topographic contour canvas
 *
 * Renders soft liquid-gold organic contour lines that flow slowly
 * across the full canvas.  Designed for dark (#0C0C0E) sections.
 *
 * Visual anatomy:
 *   • 22 full-width horizontal contour waves — each distorted by a
 *     multi-harmonic sine stack that amplifies toward the edges,
 *     leaving the centre calm.
 *   • 4 "island" clusters (2 left, 2 right) of 6–7 nested organic
 *     loops that breathe gently over a ~35-second cycle.
 *   • Lines never touch the centre zone (~40–60% of width).
 *
 * Performance:
 *   • Caps at devicePixelRatio ≤ 2 to stay under 4×4K canvas budget.
 *   • Clears & redraws every rAF tick (~16 ms) — canvas is GPU-composited.
 *   • ResizeObserver updates canvas physical pixels on layout change.
 */

import { useEffect, useRef } from 'react'

export function TopoBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = ref.current
    if (!cv) return

    let raf = 0
    let t   = 0

    // ── Pixel ratio (capped for performance) ────────────────
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2)

    const syncSize = () => {
      const d = dpr()
      cv.width  = cv.offsetWidth  * d
      cv.height = cv.offsetHeight * d
    }
    syncSize()

    const ro = new ResizeObserver(syncSize)
    ro.observe(cv)

    // ── Gold colour helper ───────────────────────────────────
    const gold = (a: number) => `rgba(201,169,110,${a.toFixed(3)})`

    // ── Draw frame ───────────────────────────────────────────
    // Capture `cv` into a non-null local so TypeScript is happy
    // inside the closure (ref could theoretically become null after
    // initial guard, but in practice it won't during the effect lifecycle).
    const canvas = cv
    function draw() {
      const d   = dpr()
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const W = canvas.offsetWidth
      const H = canvas.offsetHeight

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.save()
      ctx.scale(d, d)

      ctx.lineCap  = 'round'
      ctx.lineJoin = 'round'

      // ══════════════════════════════════════════════════════
      // 1 — FULL-WIDTH HORIZONTAL CONTOUR WAVES
      //     Sine harmonics create organic undulation.
      //     Side-weight function keeps the centre quiet.
      // ══════════════════════════════════════════════════════
      const nLines = 22
      for (let i = 0; i < nLines; i++) {
        const fy    = i / (nLines - 1)
        const baseY = H * 0.025 + H * 0.95 * fy
        const thick = i % 5 === 0           // every 5th line is a "major" contour

        ctx.beginPath()
        ctx.strokeStyle = gold(thick ? 0.15 : 0.07)
        ctx.lineWidth   = thick ? 0.95 : 0.65

        const steps = 200
        for (let j = 0; j <= steps; j++) {
          const nx = j / steps
          const x  = W * nx

          // Side-weight: 0 at centre (nx=0.5), 1 at edges
          const edge = 1 - Math.exp(-6 * Math.pow(nx - 0.5, 2))

          // Four harmonics with independent time speeds per line
          const h1 = Math.sin(nx * 5.6  + t * 0.22 + i * 0.55) * 32
          const h2 = Math.sin(nx * 11.3 + t * 0.14 + i * 1.20) * 14
          const h3 = Math.sin(nx * 18.7 + t * 0.09 + i * 0.38) *  6
          const h4 = Math.sin(nx * 2.1  + t * 0.07 + i * 0.85) * 20

          const y = baseY + (h1 + h2 + h3 + h4) * edge

          j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // ══════════════════════════════════════════════════════
      // 2 — ISLAND CLUSTERS  (left × 2 + right × 2)
      //     Nested organic ellipses — each loop breathes
      //     slightly differently via angular harmonics.
      // ══════════════════════════════════════════════════════
      const clusters = [
        // ── Left ─────────────────────────────────────────
        { cx: W * 0.07, cy: H * 0.27, loops: 7, rx: W * 0.105, ry: H * 0.145, phase:  0.0  },
        { cx: W * 0.05, cy: H * 0.75, loops: 6, rx: W * 0.085, ry: H * 0.120, phase:  1.2  },
        // ── Right ────────────────────────────────────────
        { cx: W * 0.93, cy: H * 0.22, loops: 7, rx: W * 0.105, ry: H * 0.145, phase:  0.7  },
        { cx: W * 0.95, cy: H * 0.68, loops: 6, rx: W * 0.085, ry: H * 0.120, phase:  2.1  },
      ]

      for (const c of clusters) {
        for (let lp = c.loops; lp >= 1; lp--) {
          const s = lp / c.loops           // 1.0 (outermost) → 1/n (innermost)

          // Inner loops slightly brighter so the "peak" reads clearly
          ctx.beginPath()
          ctx.strokeStyle = gold(0.055 + (1 - s) * 0.10)
          ctx.lineWidth   = 0.72

          const N = 60                     // polygon resolution (smooth enough at this scale)
          for (let k = 0; k <= N; k++) {
            const θ = (k / N) * Math.PI * 2

            // Angular harmonic distortions — each loop on its own cycle
            const d1 = Math.sin(θ * 2 + t * 0.17 + lp * 0.90) * c.rx * s * 0.14
            const d2 = Math.sin(θ * 3 - t * 0.11 + lp * 0.65) * c.ry * s * 0.10
            const d3 = Math.sin(θ * 5 + t * 0.08             ) * c.rx * s * 0.05
            const d4 = Math.cos(θ * 4 + t * 0.06 + c.phase   ) * c.ry * s * 0.07

            const px = c.cx + (c.rx * s + d1 + d3) * Math.cos(θ)
            const py = c.cy + (c.ry * s + d2 + d4) * Math.sin(θ)

            k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.stroke()
        }
      }

      ctx.restore()
    }

    // ── Animation loop ───────────────────────────────────────
    function tick() {
      t  += 0.0045          // ~35-second full cycle at 60 fps
      draw()
      raf = requestAnimationFrame(tick)
    }

    tick()

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
        position:      'absolute',
        inset:         0,
        width:         '100%',
        height:        '100%',
        pointerEvents: 'none',
        userSelect:    'none',
        zIndex:        2,           // above photo (z:0/1), below text content
      }}
    />
  )
}

export default TopoBackground
