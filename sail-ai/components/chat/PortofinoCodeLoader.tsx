'use client'

/**
 * PortofinoCodeLoader
 * ─────────────────────────────────────────────────────────────────────────────
 * A canvas-based generative-art animation that renders the Portofino harbour
 * skyline as a blueprint/wireframe being compiled in real-time.
 *
 * Visual layers (bottom → top):
 *   1. Faint coordinate grid (teal, 0.06 opacity)
 *   2. Building outlines drawn progressively, teal glow + gold roof hairlines
 *   3. Hill silhouette (filled arc, deep teal)
 *   4. Water ripples — 4 animated sine waves
 *   5. Sailboat assembles: hull → mast grows → sail unfurls (all gold)
 *   6. Horizontal compile sweep bar (teal ghost)
 *   7. HUD overlays: coordinates top-left, label top-right, progress bar bottom
 *
 * Palette: teal rgba(20,184,166), gold rgba(201,169,110), transparent bg
 */

import { useEffect, useRef, useMemo } from 'react'
import { motion }                      from 'framer-motion'

// ── Canvas dimensions ─────────────────────────────────────────────────────────
const W = 540
const H = 240

// ── Palette ───────────────────────────────────────────────────────────────────
const T = [20,  184, 166] as const   // teal
const G = [201, 169, 110] as const   // gold

// ── Building data: [x, width, height] from water baseline ─────────────────────
const BLDGS: [number,number,number][] = [
  [14,  26, 52], [42,  32, 68], [76,  26, 56],
  [104, 38, 80], [144, 28, 46], [174, 32, 62],
  [208, 26, 52], [236, 34, 70], [272, 28, 55],
  [302, 30, 44], [334, 24, 38], [360, 20, 32],
]

// ── Pre-generate windows (stable across frames, no flicker) ───────────────────
function makeWindows(bldgs: typeof BLDGS) {
  return bldgs.map(([bx, bw, bh]) => {
    const wins: [number, number][] = []
    const cols = Math.max(1, Math.floor(bw / 9))
    const rows = Math.max(1, Math.floor(bh / 14))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.42) wins.push([bx + 4 + c * 9, r])
      }
    }
    return wins
  })
}

// ── Ease functions ────────────────────────────────────────────────────────────
const easeOut3 = (t: number) => 1 - (1 - t) ** 3
const clamp    = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))

// ── Main component ────────────────────────────────────────────────────────────
interface PortofinoCodeLoaderProps {
  modeLabel?:  string
  isActive?:   boolean
  isComplete?: boolean
}

export function PortofinoCodeLoader({
  modeLabel  = 'Upwind',
  isActive   = true,
  isComplete = false,
}: PortofinoCodeLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate window layout once per mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const windows = useMemo(() => makeWindows(BLDGS), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    if (!ctx) return

    canvas.width  = W
    canvas.height = H

    const WATER_Y   = H - 52
    const CYCLE     = 8_000    // full loop ms
    const startTime = performance.now()
    let raf: number

    function draw(now: number) {
      const elapsed = now - startTime
      const t       = isComplete ? 1 : (elapsed % CYCLE) / CYCLE

      ctx.clearRect(0, 0, W, H)

      // ── 1. Grid ─────────────────────────────────────────────────────────────
      const ga = clamp(t * 12) * 0.055
      ctx.strokeStyle = `rgba(${T.join(',')},${ga})`
      ctx.lineWidth   = 0.5
      for (let x = 0; x <= W; x += 24) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
      }
      for (let y = 0; y <= H; y += 24) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
      }

      // ── 2. Hill silhouette (faint deep teal fill) ────────────────────────────
      const hillA = clamp(t * 6) * 0.30
      ctx.fillStyle = `rgba(${T.join(',')},${hillA * 0.18})`
      ctx.beginPath()
      ctx.moveTo(-20, WATER_Y)
      ctx.bezierCurveTo(60, WATER_Y - 60, 200, WATER_Y - 80, 340, WATER_Y - 42)
      ctx.bezierCurveTo(420, WATER_Y - 20, 480, WATER_Y - 8, W + 20, WATER_Y)
      ctx.closePath()
      ctx.fill()

      // ── 3. Buildings ─────────────────────────────────────────────────────────
      BLDGS.forEach(([bx, bw, bh], i) => {
        const start = 0.06 + i * 0.048
        const bp    = easeOut3(clamp((t - start) / 0.14))
        if (bp <= 0) return

        const drawH = bh * bp
        const fy    = WATER_Y - drawH

        // Outer glow
        ctx.shadowBlur  = 8
        ctx.shadowColor = `rgba(${T.join(',')},0.45)`

        // Building outline
        ctx.strokeStyle = `rgba(${T.join(',')},${0.50 + bp * 0.35})`
        ctx.lineWidth   = 1
        ctx.strokeRect(bx, fy, bw, drawH)

        // Roof hairline (gold)
        if (bp > 0.75) {
          const ra = (bp - 0.75) / 0.25
          ctx.strokeStyle = `rgba(${G.join(',')},${ra * 0.70})`
          ctx.lineWidth   = 1.5
          ctx.shadowColor = `rgba(${G.join(',')},0.5)`
          ctx.beginPath(); ctx.moveTo(bx, fy); ctx.lineTo(bx + bw, fy); ctx.stroke()
        }

        // Windows
        if (bp > 0.65) {
          ctx.shadowBlur = 0
          const wA = (bp - 0.65) / 0.35
          windows[i].forEach(([wx, wr]) => {
            ctx.fillStyle = `rgba(${G.join(',')},${wA * 0.45})`
            ctx.fillRect(wx, WATER_Y - bh + 6 + wr * 14, 4, 6)
          })
        }
        ctx.shadowBlur = 0
      })

      // ── 4. Water ripples ─────────────────────────────────────────────────────
      const wa = clamp((t - 0.04) * 10) * 0.50
      for (let wave = 0; wave < 4; wave++) {
        ctx.strokeStyle = `rgba(${T.join(',')},${wa * (1 - wave * 0.18)})`
        ctx.lineWidth   = 0.9
        ctx.beginPath()
        for (let x = 0; x <= W; x += 3) {
          const wy = WATER_Y + wave * 7
                   + Math.sin(x / 38 + now / 950 + wave * 0.9) * 2.8
          x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy)
        }
        ctx.stroke()
      }

      // ── 5. Sailboat (gold, assembles after t=0.62) ────────────────────────────
      const boatT = easeOut3(clamp((t - 0.62) / 0.30))
      if (boatT > 0) {
        const bx  = W * 0.78
        const by  = WATER_Y - 4 + Math.sin(now / 1300) * 1.4
        const mH  = 52 * boatT

        ctx.shadowBlur  = 10
        ctx.shadowColor = `rgba(${G.join(',')},0.65)`
        ctx.strokeStyle = `rgba(${G.join(',')},${boatT * 0.90})`
        ctx.lineWidth   = 1.5

        // Hull
        ctx.beginPath()
        ctx.moveTo(bx - 22, by)
        ctx.lineTo(bx + 22, by)
        ctx.lineTo(bx + 16, by + 8)
        ctx.lineTo(bx - 16, by + 8)
        ctx.closePath()
        ctx.stroke()

        // Mast
        ctx.beginPath()
        ctx.moveTo(bx, by); ctx.lineTo(bx, by - mH)
        ctx.stroke()

        // Jib sail (small, forward)
        if (boatT > 0.35) {
          const sp = (boatT - 0.35) / 0.65
          ctx.strokeStyle = `rgba(${T.join(',')},${sp * 0.55})`
          ctx.fillStyle   = `rgba(${T.join(',')},${sp * 0.06})`
          ctx.beginPath()
          ctx.moveTo(bx, by - mH)
          ctx.lineTo(bx, by - 6)
          ctx.lineTo(bx - 26 * sp, by - mH * 0.28)
          ctx.closePath()
          ctx.fill(); ctx.stroke()
        }

        // Main sail (teal triangle — unfurls after jib)
        if (boatT > 0.50) {
          const sp = (boatT - 0.50) / 0.50
          ctx.strokeStyle = `rgba(${T.join(',')},${sp * 0.72})`
          ctx.fillStyle   = `rgba(${T.join(',')},${sp * 0.09})`
          ctx.beginPath()
          ctx.moveTo(bx, by - mH)
          ctx.lineTo(bx, by - 5)
          ctx.lineTo(bx + 34 * sp, by - mH * 0.32)
          ctx.closePath()
          ctx.fill(); ctx.stroke()
        }

        ctx.shadowBlur = 0
      }

      // ── 6. Horizontal compile sweep ──────────────────────────────────────────
      const sweepX = (t * W * 1.4) % (W + 60) - 30
      const sg = ctx.createLinearGradient(sweepX - 40, 0, sweepX + 40, 0)
      sg.addColorStop(0,   `rgba(${T.join(',')},0)`)
      sg.addColorStop(0.5, `rgba(${T.join(',')},0.06)`)
      sg.addColorStop(1,   `rgba(${T.join(',')},0)`)
      ctx.fillStyle = sg
      ctx.fillRect(sweepX - 40, 0, 80, H)

      // ── 7. HUD overlays ──────────────────────────────────────────────────────
      const hudA = clamp(t * 8) * 0.50
      ctx.font = '8px "JetBrains Mono","Courier New",monospace'

      // Top-left: coordinates
      ctx.fillStyle = `rgba(${T.join(',')},${hudA})`
      ctx.textAlign = 'left'
      ctx.fillText('44°18′N  9°12′E', 10, 14)

      // Top-right: label
      const dot    = isComplete ? `rgba(${G.join(',')},${hudA})` : `rgba(${T.join(',')},${hudA})`
      const status = isComplete ? `${modeLabel.toUpperCase()} · COMPLETE`
                   : isActive   ? `${modeLabel.toUpperCase()} · COMPILING…`
                   :              `${modeLabel.toUpperCase()} · STANDBY`
      ctx.fillStyle = dot
      ctx.textAlign = 'right'
      ctx.fillText(status, W - 10, 14)

      // Progress bar
      const barA = clamp((t - 0.15) * 5) * 0.55
      const barW = W - 20
      const barY = H - 16
      ctx.strokeStyle = `rgba(${T.join(',')},${barA * 0.35})`
      ctx.lineWidth   = 1
      ctx.textAlign   = 'left'
      ctx.strokeRect(10, barY, barW, 4)
      ctx.fillStyle = `rgba(${T.join(',')},${barA})`
      ctx.fillRect(10, barY, barW * clamp(t * 1.15), 4)

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  // Only restart if complete/active flags change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isComplete])

  const dot    = isComplete ? '#C9A96E' : isActive ? '#00FFCC' : 'rgba(255,255,255,0.18)'
  const glow   = isComplete ? '0 0 10px #C9A96E88' : isActive ? '0 0 10px #00FFCC66' : 'none'
  const label  = isComplete ? `${modeLabel} · complete`
               : isActive   ? `${modeLabel} · compiling…`
               :              `${modeLabel} · standby`

  return (
    <div style={{
      position:     'relative',
      width:        '100%',
      borderRadius:  14,
      overflow:     'hidden',
      background:   'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(20,184,166,0.04) 100%)',
      backdropFilter:      'blur(28px)',
      WebkitBackdropFilter:'blur(28px)',
      border:       '1px solid rgba(20,184,166,0.18)',
      boxShadow:    '0 4px 32px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.08)',
    }}>
      {/* Gold top hairline */}
      <div style={{
        height:     2,
        background: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.6), transparent)',
      }} />

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: H, display: 'block' }}
      />

      {/* Status bar (mirrors AbyssLoader layout) */}
      <div style={{
        position:      'absolute',
        top:            14,
        left:           14,
        right:          14,
        zIndex:         10,
        display:       'flex',
        alignItems:    'center',
        gap:            8,
        pointerEvents: 'none',
      }}>
        <motion.span
          animate={{ opacity: isActive && !isComplete ? [0.6, 1, 0.6] : 1 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: dot, boxShadow: glow,
            display: 'inline-block',
          }}
        />
        <span style={{
          background:           'rgba(8,9,13,0.65)',
          backdropFilter:       'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border:               '1px solid rgba(255,255,255,0.08)',
          borderRadius:          7,
          padding:              '3px 11px',
          color:                'rgba(255,255,255,0.55)',
          fontSize:              10,
          fontFamily:           '"JetBrains Mono","Courier New",monospace',
          letterSpacing:        '0.14em',
          fontWeight:            600,
          textTransform:        'uppercase',
        }}>
          {label}
        </span>
      </div>

      {/* Edge vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 14, zIndex: 1,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(8,9,13,0.45) 100%)',
      }} />
    </div>
  )
}
