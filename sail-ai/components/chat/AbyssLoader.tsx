'use client'

/**
 * AbyssLoader — Code Art Swan
 * ─────────────────────────────────────────────────────────────────────────────
 * ASCII / code-art loading animation inspired by Perplexity Comet's character
 * field effect.  A swan silhouette emerges from animated code characters:
 *
 *   • Dark glass card, dark teal/gold palette
 *   • ~650 character cells in a uniform grid
 *   • Each cell is checked against 3 Path2D regions (body / neck / head)
 *   • Swan cells breathe at individual speeds; background cells are near-invisible
 *   • A shimmer wave sweeps through the swan periodically
 *   • Pure Canvas2D — zero Three.js / WebGL dependency
 *
 * isPointInPath safety note:
 *   Path2D coordinates are in CSS pixels.
 *   We call ctx.isPointInPath() BEFORE ctx.scale(DPR) so the test-point
 *   coordinates (also in CSS pixels) match the path coordinates.
 *   After the hit-test the DPR scale is applied only for crisp rasterisation.
 */

import { useRef, useEffect, useState } from 'react'

// ── Character sets ────────────────────────────────────────────────────────────

const CHARS_BODY: string[] = ['@', '#', '$', '0', '8', 'S', 'X', '@', '#', '0', '$', 'S', '8']
const CHARS_NECK: string[] = ['@', '#', '$', '0', '8', 'S', '#', '$', '0']
const CHARS_HEAD: string[] = ['@', '#', '$', '0', '8', '@', '#', '$', 'S']
const CHARS_BG:   string[] = ['.', '+', 'x', '·', '°', '0', 'S', '.', ' ', ' ']

// ── Colour helpers ────────────────────────────────────────────────────────────

type RGB = readonly [number, number, number]

const TEAL: RGB  = [20,  184, 166]
const GOLD: RGB  = [201, 169, 110]
const WHITE: RGB = [220, 235, 250]

function rgba([r, g, b]: RGB, a: number): string {
  const clamped = Math.max(0, Math.min(1, a))
  return `rgba(${r},${g},${b},${clamped.toFixed(3)})`
}

// ── Swan Path2D factories (all coords in CSS px for a W×H canvas) ─────────────

function buildBodyPath(W: number, H: number): Path2D {
  const sx = W / 640, sy = H / 300
  const p  = new Path2D()
  // Large body ellipse, slightly rotated clockwise
  p.ellipse(232 * sx, 192 * sy, 170 * sx, 78 * sy, -0.08, 0, Math.PI * 2)
  return p
}

function buildNeckPath(W: number, H: number): Path2D {
  const sx = W / 640, sy = H / 300
  const p  = new Path2D()
  // Curved trapezoidal band — upper edge curves up toward head, lower follows body
  p.moveTo(394 * sx, 130 * sy)
  p.quadraticCurveTo(440 * sx,  82 * sy, 464 * sx, 100 * sy)
  p.lineTo(478 * sx, 124 * sy)
  p.quadraticCurveTo(450 * sx, 152 * sy, 426 * sx, 166 * sy)
  p.closePath()
  return p
}

function buildHeadPath(W: number, H: number): Path2D {
  const sx = W / 640, sy = H / 300
  const p  = new Path2D()
  // Slightly tilted ellipse for a side-profile head
  p.ellipse(492 * sx, 110 * sy, 43 * sx, 38 * sy, 0.22, 0, Math.PI * 2)
  return p
}

// ── Cell type ─────────────────────────────────────────────────────────────────

type Region = 'body' | 'neck' | 'head' | 'bg'

interface Cell {
  x:      number    // CSS px
  y:      number    // CSS px
  chars:  string[]
  region: Region
  phase:  number    // random offset 0–1 for independent animation
  speed:  number    // individual animation speed multiplier
  size:   number    // font-size px
  isEye:  boolean   // true for the single eye cell
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface AbyssLoaderProps {
  modeLabel?:  string
  isActive:    boolean
  isComplete:  boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AbyssLoader({
  modeLabel  = 'Intelligence',
  isActive,
  isComplete,
}: AbyssLoaderProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const frameRef    = useRef(0)
  const phaseRef    = useRef<'idle' | 'active' | 'complete'>('idle')
  const [uiPhase, setUiPhase] = useState<'idle' | 'active' | 'complete'>('idle')

  // Sync external props → internal ref (readable inside rAF without re-init)
  useEffect(() => {
    const p = isActive ? 'active' : isComplete ? 'complete' : 'idle'
    phaseRef.current = p
    setUiPhase(p)
  }, [isActive, isComplete])

  // ── Canvas setup + animation loop (runs once on mount) ─────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rawCtx = canvas.getContext('2d')
    if (!rawCtx) return
    // Cast to non-null — we just proved it's non-null; TypeScript doesn't narrow across closures
    const cx = rawCtx as CanvasRenderingContext2D

    // CSS dimensions
    const W   = canvas.offsetWidth  || 640
    const H   = canvas.offsetHeight || 300
    const DPR = Math.min(window.devicePixelRatio || 1, 2)

    // Physical canvas size — DPR scale applied AFTER isPointInPath calls
    canvas.width  = W * DPR
    canvas.height = H * DPR

    // ── Build swan paths (CSS coordinates) ──────────────────────────────────
    const bodyPath = buildBodyPath(W, H)
    const neckPath = buildNeckPath(W, H)
    const headPath = buildHeadPath(W, H)

    // Eye position in CSS px (upper-right of head ellipse)
    const EYE_X = 504 * (W / 640)
    const EYE_Y = 100 * (H / 300)

    // ── Build cell grid ──────────────────────────────────────────────────────
    const COLS  = 40
    const ROWS  = 17
    const cellW = W / COLS
    const cellH = H / ROWS
    const cells: Cell[] = []

    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const x = (col + 0.5) * cellW
        const y = (row + 0.5) * cellH

        // isPointInPath ignores ctx transform → works in CSS coords ✓
        const inHead = cx.isPointInPath(headPath, x, y)
        const inNeck = !inHead && cx.isPointInPath(neckPath, x, y)
        const inBody = !inHead && !inNeck && cx.isPointInPath(bodyPath, x, y)

        const region: Region = inHead ? 'head'
                             : inNeck ? 'neck'
                             : inBody ? 'body'
                             : 'bg'

        const isEye = inHead &&
          Math.hypot(x - EYE_X, y - EYE_Y) < Math.min(cellW, cellH) * 0.9

        cells.push({
          x, y, region, isEye,
          chars: region === 'head' ? CHARS_HEAD
               : region === 'neck' ? CHARS_NECK
               : region === 'body' ? CHARS_BODY
               : CHARS_BG,
          phase: Math.random(),
          speed: 0.45 + Math.random() * 0.75,
          size:  region !== 'bg' ? 13 : 10,
        })
      }
    }

    // ── Apply DPR scale for crisp text rendering ─────────────────────────────
    cx.scale(DPR, DPR)

    // ── Animation loop ───────────────────────────────────────────────────────
    const t0 = performance.now()

    function draw(now: DOMHighResTimeStamp) {
      frameRef.current = requestAnimationFrame(draw)
      const t       = (now - t0) / 1000
      const current = phaseRef.current

      cx.clearRect(0, 0, W, H)
      cx.textAlign    = 'center'
      cx.textBaseline = 'middle'

      // Shimmer wave: brightness pulse sweeping left→right every 4 s
      const shimmerPx = ((t % 4) / 4) * W

      for (const cell of cells) {
        const localT = t * cell.speed + cell.phase * 9.1

        // Character cycling
        const idx  = Math.floor(localT * 1.6) % cell.chars.length
        const char = cell.chars[idx]!

        // Breathing (per-cell sine)
        const breath = Math.sin(localT * 2.3) * 0.5 + 0.5   // 0..1

        // Shimmer boost for swan cells
        const shimmerBoost = cell.region !== 'bg'
          ? Math.max(0, 1 - Math.abs(cell.x - shimmerPx) / 60) * 0.28
          : 0

        // Per-region colour + opacity
        let color:   RGB
        let opacity: number

        if (cell.isEye) {
          color   = WHITE
          opacity = 0.90 + breath * 0.10
          cx.font = `bold 14px "JetBrains Mono","SF Mono",monospace`
        } else if (cell.region === 'head') {
          color   = GOLD
          opacity = 0.52 + breath * 0.32 + shimmerBoost
          cx.font = `bold ${cell.size}px "JetBrains Mono","SF Mono",monospace`
        } else if (cell.region === 'neck') {
          color   = GOLD
          opacity = 0.38 + breath * 0.28 + shimmerBoost
          cx.font = `${cell.size}px "JetBrains Mono","SF Mono",monospace`
        } else if (cell.region === 'body') {
          color   = TEAL
          opacity = (0.35 + breath * 0.30 + shimmerBoost) * (current === 'idle' ? 0.55 : 1)
          cx.font = `${cell.size}px "JetBrains Mono","SF Mono",monospace`
        } else {
          color   = TEAL
          opacity = 0.030 + breath * 0.028
          cx.font = `${cell.size}px "JetBrains Mono","SF Mono",monospace`
        }

        cx.fillStyle = rgba(color, opacity)
        cx.fillText(char, cell.x, cell.y)
      }
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameRef.current)
  }, []) // runs once — phaseRef keeps in sync via the other useEffect

  // ── Derived UI values ─────────────────────────────────────────────────────
  const dotColor = uiPhase === 'complete' ? '#C9A96E' : '#14B8A6'

  const statusText = uiPhase === 'active'
    ? `${modeLabel} · Analysing…`
    : uiPhase === 'complete'
    ? `${modeLabel} · Complete`
    : `${modeLabel} · Standby`

  return (
    <div style={{
      position:     'relative',
      width:        '100%',
      height:        300,
      borderRadius:  16,
      overflow:     'hidden',
      background:   'rgba(2,2,8,0.96)',
      border:       '1px solid rgba(20,184,166,0.14)',
      boxShadow: [
        '0 0 0 1px rgba(20,184,166,0.05)',
        '0 8px 40px rgba(20,184,166,0.07)',
        '0 2px 12px rgba(0,0,0,0.50)',
      ].join(', '),
    }}>

      {/* Code art canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* Top-left: pulsing dot + status label */}
      <div style={{
        position:      'absolute',
        top:            14,
        left:           16,
        right:          16,
        zIndex:         10,
        display:       'flex',
        alignItems:    'center',
        gap:            8,
        pointerEvents: 'none',
      }}>
        <span style={{
          display:      'inline-block',
          width:         6,
          height:        6,
          borderRadius: '50%',
          background:   dotColor,
          flexShrink:   0,
          animation:    'abyss-pulse 1.1s ease-in-out infinite',
          boxShadow:    `0 0 10px ${dotColor}90`,
          transition:   'background 0.4s ease',
        }} />
        <span style={{
          fontFamily:    '"JetBrains Mono","SF Mono","Fira Code",monospace',
          fontSize:       10,
          fontWeight:     600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:          uiPhase === 'complete' ? '#C9A96E' : 'rgba(20,184,166,0.60)',
          transition:    'color 0.5s ease',
        }}>
          {statusText}
        </span>
      </div>

      {/* Bottom-right: quiet signature */}
      <div style={{
        position:      'absolute',
        bottom:         12,
        right:          16,
        zIndex:         10,
        pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily:    '"JetBrains Mono","SF Mono",monospace',
          fontSize:       9,
          color:         'rgba(20,184,166,0.16)',
          letterSpacing: '0.08em',
        }}>
          // sail · intelligence
        </span>
      </div>

      {/* Keyframe for pulsing dot */}
      <style>{`
        @keyframes abyss-pulse {
          0%, 100% { opacity: 1;    transform: scale(1);    }
          50%       { opacity: 0.2; transform: scale(0.52); }
        }
      `}</style>
    </div>
  )
}
