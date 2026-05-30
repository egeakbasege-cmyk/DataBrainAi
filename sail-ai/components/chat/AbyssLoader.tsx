'use client'

/**
 * AbyssLoader — Code Art Swan with Wing Animation
 * ──────────────────────────────────────────────────────────────────────────
 * A beautiful typographic swan (inspired by Carhartt WIP text-art) rendered
 * entirely from ASCII / code characters on a black canvas.
 *
 * Architecture:
 *   • Pure Canvas2D — no Three.js, no WebGL
 *   • Outline particles placed along ellipse/bezier contours of each body part
 *   • Fill particles scattered inside each region (very dim)
 *   • Wing particles rotate around a shoulder pivot each frame → real flapping
 *   • Colors: white swan, orange beak, bright-white eye; black background
 *   • Active → vigorous flap (±40°, 2.6 Hz) / Idle → gentle drift (±6°, 1 Hz)
 *
 * Coordinate system: 640×300 CSS px, scaled by DPR for crisp text
 */

import { useRef, useEffect, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Region = 'body' | 'wing' | 'wingFill' | 'head' | 'neck' | 'beak' | 'eye' | 'fill' | 'water'

interface Particle {
  x:      number   // CSS px (unrotated base position)
  y:      number   // CSS px
  region: Region
  isWing: boolean  // true → rotated each frame by wing flap angle
  phase:  number   // independent animation offset 0..1
  speed:  number   // individual animation speed
}

// ── Character sets ─────────────────────────────────────────────────────────────

const OUTLINE: string[] = ['@', '#', '$', '0', '8', 'S', 'X', '@', '#', '0', 'S']
const FILL:    string[] = ['.', '+', '·', '°', 'x', '.', ' ', ' ', '.']
const WATER:   string[] = ['~', '·', '~', '-', '~', '·']
const BEAK_CH: string[] = ['0', '$', '#', '@', '8']

// ── Geometry helpers ───────────────────────────────────────────────────────────

type Pt = readonly [number, number]

/** N evenly-spaced points on the outline of a rotated ellipse */
function ellipseOutline(cx: number, cy: number, rx: number, ry: number, rot: number, N: number): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i < N; i++) {
    const a  = (i / N) * Math.PI * 2
    const lx = rx * Math.cos(a)
    const ly = ry * Math.sin(a)
    pts.push([
      cx + lx * Math.cos(rot) - ly * Math.sin(rot),
      cy + lx * Math.sin(rot) + ly * Math.cos(rot),
    ])
  }
  return pts
}

/** N random points uniformly distributed inside a rotated ellipse */
function ellipseFill(cx: number, cy: number, rx: number, ry: number, rot: number, N: number): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i < N; i++) {
    const r  = Math.sqrt(Math.random()) * 0.86   // uniform disk
    const a  = Math.random() * Math.PI * 2
    const lx = rx * r * Math.cos(a)
    const ly = ry * r * Math.sin(a)
    pts.push([
      cx + lx * Math.cos(rot) - ly * Math.sin(rot),
      cy + lx * Math.sin(rot) + ly * Math.cos(rot),
    ])
  }
  return pts
}

/**
 * Points along a cubic bezier neck band.
 * Emits pairs of edge points (+ center) perpendicular to the curve tangent.
 * halfWidthStart → halfWidthEnd lets the neck taper toward the head.
 */
function neckBand(
  P0: Pt, P1: Pt, P2: Pt, P3: Pt,
  hwStart: number, hwEnd: number,
  N: number,
): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i < N; i++) {
    const t  = i / Math.max(N - 1, 1)
    const mt = 1 - t
    // Point on bezier
    const bx  = mt*mt*mt*P0[0] + 3*mt*mt*t*P1[0] + 3*mt*t*t*P2[0] + t*t*t*P3[0]
    const by  = mt*mt*mt*P0[1] + 3*mt*mt*t*P1[1] + 3*mt*t*t*P2[1] + t*t*t*P3[1]
    // Tangent
    const dbx = 3*(mt*mt*(P1[0]-P0[0]) + 2*mt*t*(P2[0]-P1[0]) + t*t*(P3[0]-P2[0]))
    const dby = 3*(mt*mt*(P1[1]-P0[1]) + 2*mt*t*(P2[1]-P1[1]) + t*t*(P3[1]-P2[1]))
    const len = Math.hypot(dbx, dby) || 1
    const nx  = -dby / len    // left-normal
    const ny  =  dbx / len
    const hw  = hwStart + (hwEnd - hwStart) * t
    // Both edges
    pts.push([bx + nx * hw, by + ny * hw])
    pts.push([bx - nx * hw, by - ny * hw])
    // Centerline every other step (avoids over-density)
    if (i % 2 === 0) pts.push([bx, by])
  }
  return pts
}

// ── Build all particles (called once on canvas mount) ─────────────────────────

function buildParticles(W: number, H: number): Particle[] {
  const sx = W / 640
  const sy = H / 300
  const ps: Particle[] = []

  function add(pts: Pt[], region: Region, isWing: boolean) {
    for (const [rawX, rawY] of pts) {
      ps.push({
        x: rawX * sx,
        y: rawY * sy,
        region, isWing,
        phase: Math.random(),
        speed: 0.45 + Math.random() * 0.75,
      })
    }
  }

  // ── Body — large central oval ────────────────────────────────────────────
  // Center(220,205), rx=168, ry=78, tilt=-5°
  add(ellipseOutline(220, 205, 168, 78, -0.09, 56), 'body', false)
  add(ellipseFill   (220, 205, 168, 78, -0.09, 92), 'fill', false)

  // ── Wing — sits on top of body, flaps around shoulder pivot ─────────────
  // Neutral center (218,150), rx=155, ry=50, slight tilt
  add(ellipseOutline(218, 150, 155, 50, -0.14, 48), 'wing',     true)
  add(ellipseFill   (218, 150, 155, 50, -0.14, 62), 'wingFill', true)

  // ── Neck — S-curve bezier band from body to head ─────────────────────────
  // Cubic bezier: (365,170) → (398,105) → (442,86) → (467,108)
  // Half-width: 14px at body end, 10px at head end
  add(
    neckBand(
      [365, 170], [398, 105], [442, 86], [467, 108],
      14, 10, 24,
    ),
    'neck', false,
  )

  // ── Head — slightly tilted ellipse ───────────────────────────────────────
  add(ellipseOutline(490, 90, 37, 33, 0.18, 24), 'head', false)
  add(ellipseFill   (490, 90, 37, 33, 0.18, 14), 'fill', false)

  // ── Beak — small flat ellipse extending right ────────────────────────────
  add(ellipseOutline(538, 92, 29, 12, 0.06, 14), 'beak', false)

  // ── Eye — single bright point ────────────────────────────────────────────
  ps.push({ x: 504 * sx, y: 80 * sy, region: 'eye', isWing: false, phase: 0.5, speed: 0.9 })

  // ── Water ripples — bottom of canvas ────────────────────────────────────
  for (let i = 0; i < 11; i++) {
    ps.push({
      x: (52 + i * 52) * sx,
      y: (283 + (i % 3 === 1 ? 5 : 0)) * sy,
      region: 'water', isWing: false,
      phase: Math.random(), speed: 0.22 + Math.random() * 0.12,
    })
  }

  return ps
}

// ── Colour per region (RGBA as [r,g,b] + base alpha) ─────────────────────────

const COL: Record<Region, [number, number, number, number]> = {
  body:     [242, 246, 252, 0.84],
  fill:     [230, 238, 248, 0.07],
  wing:     [248, 251, 255, 0.92],
  wingFill: [238, 244, 252, 0.06],
  head:     [252, 254, 255, 0.90],
  neck:     [236, 243, 250, 0.82],
  beak:     [228, 138, 48,  0.95],   // orange
  eye:      [255, 255, 255, 1.00],
  water:    [100, 205, 195, 0.28],
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface AbyssLoaderProps {
  modeLabel?:  string
  isActive:    boolean
  isComplete:  boolean
}

type LoadPhase = 'idle' | 'active' | 'complete'

// ── Component ──────────────────────────────────────────────────────────────────

export function AbyssLoader({
  modeLabel  = 'Intelligence',
  isActive,
  isComplete,
}: AbyssLoaderProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const frameRef   = useRef(0)
  const phaseRef   = useRef<LoadPhase>('idle')
  const [uiPhase, setUiPhase] = useState<LoadPhase>('idle')

  // Keep phaseRef in sync so the rAF loop reads it without re-initialising
  useEffect(() => {
    const p: LoadPhase = isActive ? 'active' : isComplete ? 'complete' : 'idle'
    phaseRef.current = p
    setUiPhase(p)
  }, [isActive, isComplete])

  // ── Canvas init + animation loop ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rawCtx = canvas.getContext('2d')
    if (!rawCtx) return
    const cx = rawCtx as CanvasRenderingContext2D

    const W   = canvas.offsetWidth  || 640
    const H   = canvas.offsetHeight || 300
    const DPR = Math.min(window.devicePixelRatio || 1, 2)

    // Physical canvas size
    canvas.width  = W * DPR
    canvas.height = H * DPR
    cx.scale(DPR, DPR)

    const particles = buildParticles(W, H)

    // Wing shoulder-pivot in CSS px
    // Pivot is at the joint where the wing base meets the body top (~shoulder blade)
    const PIVOT_X = 218 * (W / 640)
    const PIVOT_Y = 192 * (H / 300)

    const t0 = performance.now()

    function draw(now: DOMHighResTimeStamp) {
      frameRef.current = requestAnimationFrame(draw)

      const t       = (now - t0) / 1000
      const current = phaseRef.current

      cx.clearRect(0, 0, W, H)
      cx.textAlign    = 'center'
      cx.textBaseline = 'middle'

      // ── Wing flap parameters ────────────────────────────────────────────
      // Active: vigorous ±40° at 2.6 Hz with slight downstroke asymmetry
      // Idle:   gentle ±6° at 1 Hz
      // Complete: settle toward resting, small residual
      const flapAmp  = current === 'active'  ? 0.42
                     : current === 'complete' ? 0.04
                     : 0.06
      const flapFreq = current === 'active'  ? 2.6
                     : current === 'complete' ? 0.8
                     : 1.0
      // Asymmetric easing: faster down-stroke, slower up-stroke
      const rawSin    = Math.sin(t * flapFreq * Math.PI * 2)
      const flapAngle = (rawSin - 0.18 * rawSin * rawSin) * flapAmp

      // ── Shimmer: left-to-right brightness wave every 5 s ────────────────
      const shimmerPx = ((t % 5) / 5) * W

      for (const p of particles) {
        // ── Wing rotation around shoulder pivot ──────────────────────────
        let dx = p.x
        let dy = p.y
        if (p.isWing) {
          const relX = p.x - PIVOT_X
          const relY = p.y - PIVOT_Y
          const cos  = Math.cos(flapAngle)
          const sin  = Math.sin(flapAngle)
          dx = PIVOT_X + relX * cos - relY * sin
          dy = PIVOT_Y + relX * sin + relY * cos
        }

        // ── Character cycling ────────────────────────────────────────────
        const localT = t * p.speed + p.phase * 11.7
        let char: string
        if (p.region === 'eye') {
          char = '●'
        } else if (p.region === 'water') {
          char = WATER[Math.floor(localT * 0.7) % WATER.length]!
        } else if (p.region === 'beak') {
          char = BEAK_CH[Math.floor(localT * 1.4) % BEAK_CH.length]!
        } else if (p.region === 'fill' || p.region === 'wingFill') {
          char = FILL[Math.floor(localT * 1.2) % FILL.length]!
        } else {
          char = OUTLINE[Math.floor(localT * 1.7) % OUTLINE.length]!
        }

        // ── Breathing opacity ────────────────────────────────────────────
        const breath = Math.sin(localT * 2.2) * 0.5 + 0.5    // 0..1

        // Shimmer boost on swan outline cells
        const shimmerBoost = (p.region !== 'fill' && p.region !== 'wingFill' && p.region !== 'water')
          ? Math.max(0, 1 - Math.abs(dx - shimmerPx) / 55) * 0.20
          : 0

        const [r, g, b, baseA] = COL[p.region]

        let alpha: number
        if (p.region === 'eye') {
          alpha = 0.95
        } else if (p.region === 'fill' || p.region === 'wingFill') {
          alpha = 0.04 + breath * 0.05
        } else if (p.region === 'water') {
          alpha = 0.14 + breath * 0.16
        } else {
          alpha = baseA * (0.65 + breath * 0.35) + shimmerBoost
          // Wing flaps brighter when active
          if (p.isWing && current === 'active') alpha = Math.min(1, alpha * 1.3)
        }

        // ── Font ─────────────────────────────────────────────────────────
        const bold = p.region === 'wing' || p.region === 'head' || p.region === 'eye'
        const fs   = p.region === 'eye' ? 11
                   : (p.region === 'fill' || p.region === 'wingFill') ? 9
                   : p.region === 'water' ? 11
                   : 13
        cx.font      = `${bold ? 'bold ' : ''}${fs}px "JetBrains Mono","SF Mono","Fira Code",monospace`
        cx.fillStyle = `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha)).toFixed(3)})`
        cx.fillText(char, dx, dy)
      }
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])   // runs once — phaseRef stays in sync via separate effect

  // ── UI overlay ────────────────────────────────────────────────────────────
  const dotColor   = uiPhase === 'complete' ? '#C9A96E' : '#14B8A6'
  const statusText = uiPhase === 'active'   ? `${modeLabel} · Analysing…`
                   : uiPhase === 'complete'  ? `${modeLabel} · Complete`
                   : `${modeLabel} · Standby`

  return (
    <div style={{
      position:     'relative',
      width:        '100%',
      height:        300,
      borderRadius:  16,
      overflow:     'hidden',
      background:   '#000000',
      border:       '1px solid rgba(255,255,255,0.07)',
      boxShadow:    '0 2px 24px rgba(0,0,0,0.65)',
    }}>

      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      {/* Status label */}
      <div style={{
        position:      'absolute',
        top:            14, left: 16, right: 16,
        zIndex:         10,
        display:       'flex',
        alignItems:    'center',
        gap:            8,
        pointerEvents: 'none',
      }}>
        <span style={{
          display:      'inline-block',
          width:         6, height: 6,
          borderRadius: '50%',
          background:   dotColor,
          flexShrink:   0,
          animation:    'abyss-pulse 1.1s ease-in-out infinite',
          boxShadow:    `0 0 10px ${dotColor}90`,
          transition:   'background 0.4s ease',
        }} />
        <span style={{
          fontFamily:    '"JetBrains Mono","SF Mono",monospace',
          fontSize:       10,
          fontWeight:     600,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color:          uiPhase === 'complete' ? '#C9A96E' : 'rgba(255,255,255,0.42)',
          transition:    'color 0.5s ease',
        }}>
          {statusText}
        </span>
      </div>

      {/* Quiet signature */}
      <div style={{
        position: 'absolute', bottom: 12, right: 16,
        zIndex: 10, pointerEvents: 'none',
      }}>
        <span style={{
          fontFamily:    '"JetBrains Mono","SF Mono",monospace',
          fontSize:       9,
          color:         'rgba(255,255,255,0.09)',
          letterSpacing: '0.08em',
        }}>
          // sail · intelligence
        </span>
      </div>

      <style>{`
        @keyframes abyss-pulse {
          0%, 100% { opacity: 1;    transform: scale(1);    }
          50%       { opacity: 0.2; transform: scale(0.52); }
        }
      `}</style>
    </div>
  )
}
