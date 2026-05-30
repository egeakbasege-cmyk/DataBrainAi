'use client'

/**
 * AbyssLoader — SwanReveal Particle System (Points-based, CPU morphing)
 * ──────────────────────────────────────────────────────────────────────────
 * Architecture (reliability-first):
 *   • THREE.Points — single draw call, universally supported, no shader compile risk
 *   • CPU morphing in useFrame — spring-lerp positions each frame
 *   • Phase 1 — Matrix Rain:  particles fall from above (visible from frame 1)
 *   • Phase 2 — Formation:    spring-attraction toward swan silhouette targets
 *   • Phase 3 — Wing Flap:    wing particles oscillate via sin(time)
 *   • PointsMaterial with a sprite texture for glyph-like appearance
 *   • Bloom post-processing
 *
 * Interface (unchanged — ChatStage.tsx needs no edits):
 *   export function AbyssLoader({ modeLabel, isActive, isComplete })
 */

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom }      from '@react-three/postprocessing'
import * as THREE                     from 'three'
import gsap                           from 'gsap'

// ─── Config ───────────────────────────────────────────────────────────────────

function getN(): number {
  if (typeof navigator === 'undefined') return 5_000
  const mob  = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
  const c    = navigator.hardwareConcurrency ?? 4
  if (mob)      return c <= 4 ? 2_000 : 3_000
  if (c <= 4)   return 3_500
  if (c <= 7)   return 5_500
  return 8_000
}
const N = getN()

// Phase timing (seconds)
const T_RAIN = 2.0
const T_FORM = 5.5

// ─── Sprite texture (single glyph rendered to canvas) ─────────────────────────

function makeSprite(): THREE.CanvasTexture {
  const size = 64
  const cv   = Object.assign(document.createElement('canvas'), { width: size, height: size })
  const ctx  = cv.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  // Radial glow so points look like glowing chars
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
  grad.addColorStop(0,   'rgba(255,255,255,1)')
  grad.addColorStop(0.35,'rgba(255,255,255,0.85)')
  grad.addColorStop(0.7, 'rgba(255,255,255,0.3)')
  grad.addColorStop(1,   'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  // Draw a random char in the centre
  const chars = ['0','1','$','@','&','X','S','#']
  ctx.fillStyle = 'rgba(0,255,204,0.9)'
  ctx.font      = 'bold 36px "Courier New",monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(chars[Math.floor(Math.random() * chars.length)], size/2, size/2)
  const tex = new THREE.CanvasTexture(cv)
  tex.minFilter = THREE.LinearFilter
  return tex
}

// ─── Swan silhouette target points ────────────────────────────────────────────

interface Pt { x: number; y: number; z: number; isWing: boolean }

function ellOut(cx: number, cy: number, rx: number, ry: number, rot: number, n: number, wing = false): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const θ = i / n * Math.PI * 2
    const lx = Math.cos(θ) * rx, ly = Math.sin(θ) * ry
    return { x: cx + lx*Math.cos(rot) - ly*Math.sin(rot),
             y: cy + lx*Math.sin(rot) + ly*Math.cos(rot),
             z: (Math.random() - 0.5) * 0.3, isWing: wing }
  })
}

function ellFill(cx: number, cy: number, rx: number, ry: number, rot: number, n: number, wing = false): Pt[] {
  const pts: Pt[] = []
  let attempts = 0
  while (pts.length < n && attempts < n * 12) {
    attempts++
    const r = Math.sqrt(Math.random()), θ = Math.random() * Math.PI * 2
    const u = r * Math.cos(θ) * rx, v = r * Math.sin(θ) * ry
    pts.push({ x: cx + u*Math.cos(rot) - v*Math.sin(rot),
               y: cy + u*Math.sin(rot) + v*Math.cos(rot),
               z: (Math.random() - 0.5) * 0.3, isWing: wing })
  }
  return pts
}

function neckBezier(n: number): Pt[] {
  const P = [[1.55,0.0],[2.05,0.72],[2.55,0.95],[2.85,0.70]] as [number,number][]
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n-1), mt = 1 - t
    const bx = mt**3*P[0][0] + 3*mt**2*t*P[1][0] + 3*mt*t**2*P[2][0] + t**3*P[3][0]
    const by = mt**3*P[0][1] + 3*mt**2*t*P[1][1] + 3*mt*t**2*P[2][1] + t**3*P[3][1]
    return { x: bx + (Math.random()-.5)*.18, y: by + (Math.random()-.5)*.10, z: (Math.random()-.5)*.2, isWing: false }
  })
}

function buildTargets(): Pt[] {
  return [
    ...ellOut (-0.5,-0.38, 2.35,0.92,-0.08, 220),
    ...ellFill(-0.5,-0.38, 2.35,0.92,-0.08, 1350),
    ...ellOut (-0.7, 0.55, 2.15,0.70,-0.14, 200, true),
    ...ellFill(-0.7, 0.55, 2.15,0.70,-0.14, 2900, true),
    ...neckBezier(260),
    ...ellOut ( 3.0, 0.70, 0.48,0.45, 0.15, 110),
    ...ellFill( 3.0, 0.70, 0.48,0.45, 0.15, 480),
    ...ellOut ( 3.65,0.46, 0.47,0.17, 0.05,  90),
    ...ellFill( 3.65,0.46, 0.47,0.17, 0.05, 180),
    ...ellOut (-2.62,-0.20,0.70,0.40, 0.30,  70),
    ...ellFill(-2.62,-0.20,0.70,0.40, 0.30, 290),
    ...ellOut (-0.5,-1.35, 2.2,0.24,  0.0,   80),
    ...ellFill(-0.5,-1.35, 2.2,0.24,  0.0,  180),
  ]
}

// ─── Particle system data ─────────────────────────────────────────────────────

interface PS {
  // Rain start (world)
  rx: Float32Array; ry: Float32Array; rz: Float32Array; rvy: Float32Array
  // Swan target
  tx: Float32Array; ty: Float32Array; tz: Float32Array; tw: Uint8Array
  // Current (lerped) position
  cx: Float32Array; cy: Float32Array; cz: Float32Array
  // Wing base positions (stored so flap is computed as offset from target)
  wy: Float32Array
}

function initPS(): PS {
  const tgt = buildTargets()
  while (tgt.length < N) tgt.push({ x:(Math.random()-.5)*8, y:(Math.random()-.5)*4, z:(Math.random()-.5)*.5, isWing:false })
  const pts = tgt.slice(0, N)

  const ps: PS = {
    rx: new Float32Array(N), ry: new Float32Array(N), rz: new Float32Array(N),
    rvy: new Float32Array(N),
    tx: new Float32Array(N), ty: new Float32Array(N), tz: new Float32Array(N),
    tw: new Uint8Array(N),
    cx: new Float32Array(N), cy: new Float32Array(N), cz: new Float32Array(N),
    wy: new Float32Array(N),
  }

  for (let i = 0; i < N; i++) {
    // Rain start — within visible range immediately
    ps.rx[i]  = (Math.random() - .5) * 12
    ps.ry[i]  = 1 + Math.random() * 5     // y=[1..6], camera sees [-2.7..3.7]
    ps.rz[i]  = (Math.random() - .5) * 2
    ps.rvy[i] = -(1.8 + Math.random() * 3) // fall speed

    ps.tx[i]  = pts[i].x
    ps.ty[i]  = pts[i].y
    ps.tz[i]  = pts[i].z
    ps.tw[i]  = pts[i].isWing ? 1 : 0
    ps.wy[i]  = pts[i].y

    // Start at rain position
    ps.cx[i]  = ps.rx[i]
    ps.cy[i]  = ps.ry[i]
    ps.cz[i]  = ps.rz[i]
  }
  return ps
}

// ─── SwanPoints ───────────────────────────────────────────────────────────────

interface SProps { isActive: boolean; isComplete: boolean }

function SwanPoints({ isActive, isComplete }: SProps) {
  const ptRef   = useRef<THREE.Points>(null!)
  const elapsed = useRef(0)
  const progRef = useRef(0)    // GSAP drives this
  const ampRef  = useRef(0)    // wing amplitude

  // Geometry + material built once
  const { geo, mat, ps } = useMemo(() => {
    const posArr = new Float32Array(N * 3)
    const colArr = new Float32Array(N * 3)   // per-vertex RGB

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(posArr, 3))
    g.setAttribute('color',    new THREE.BufferAttribute(colArr, 3))

    const sprite = makeSprite()
    const m = new THREE.PointsMaterial({
      size:             0.12,
      sizeAttenuation:  true,
      map:              sprite,
      vertexColors:     true,
      transparent:      true,
      opacity:          0.90,
      depthWrite:       false,
      blending:         THREE.AdditiveBlending,
    })

    const ps = initPS()

    // Seed initial positions
    for (let i = 0; i < N; i++) {
      posArr[i*3]   = ps.cx[i]
      posArr[i*3+1] = ps.cy[i]
      posArr[i*3+2] = ps.cz[i]
      colArr[i*3]   = 0.0   // cyan
      colArr[i*3+1] = 1.0
      colArr[i*3+2] = 0.8
    }

    return { geo: g, mat: m, ps }
  }, [])

  // Dispose on unmount
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])

  // GSAP drives progress on prop change
  useEffect(() => {
    const target = isComplete ? 1.0 : isActive ? 0.82 : 0.02
    const amp    = isComplete ? 0.08 : isActive ? 0.60 : 0.0
    const t1 = gsap.to(progRef, { current: target, duration: 3.5, ease: 'power3.inOut' })
    const t2 = gsap.to(ampRef,  { current: amp,    duration: 2.5, ease: 'elastic.out(1,.5)' })
    return () => { t1.kill(); t2.kill() }
  }, [isActive, isComplete])

  useFrame((_, dt) => {
    elapsed.current = Math.min(elapsed.current + dt, 9999)
    const t    = elapsed.current
    const prog = progRef.current
    const amp  = ampRef.current

    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const colAttr = geo.attributes.color    as THREE.BufferAttribute
    const posArr  = posAttr.array as Float32Array
    const colArr  = colAttr.array as Float32Array

    if (t < T_RAIN) {
      // ── Phase 1: Rain ──
      for (let i = 0; i < N; i++) {
        ps.cy[i] += ps.rvy[i] * dt
        if (ps.cy[i] < -4) {
          ps.cy[i] = 3 + Math.random() * 4
          ps.cx[i] = (Math.random() - .5) * 12
        }
        posArr[i*3]   = ps.cx[i]
        posArr[i*3+1] = ps.cy[i]
        posArr[i*3+2] = ps.cz[i]
        // Bright cyan rain
        colArr[i*3]   = 0.0 + Math.random() * 0.1
        colArr[i*3+1] = 0.9 + Math.random() * 0.1
        colArr[i*3+2] = 0.75 + Math.random() * 0.15
      }
    } else if (t < T_FORM) {
      // ── Phase 2: Formation ──
      const p     = (t - T_RAIN) / (T_FORM - T_RAIN)
      const speed = 1.5 + p * 5.0

      for (let i = 0; i < N; i++) {
        const tx = ps.tx[i], ty = ps.ty[i], tz = ps.tz[i]
        ps.cx[i] += (tx - ps.cx[i]) * Math.min(1, dt * speed)
        ps.cy[i] += (ty - ps.cy[i]) * Math.min(1, dt * speed)
        ps.cz[i] += (tz - ps.cz[i]) * Math.min(1, dt * speed)

        posArr[i*3]   = ps.cx[i]
        posArr[i*3+1] = ps.cy[i]
        posArr[i*3+2] = ps.cz[i]

        // Cyan → silver as formation completes
        const silver = p * p
        colArr[i*3]   = silver * 0.82
        colArr[i*3+1] = silver * 0.88 + (1-silver) * 1.0
        colArr[i*3+2] = silver * 1.0  + (1-silver) * 0.8
      }
    } else {
      // ── Phase 3: Wing Flap ──
      const flapT  = t - T_FORM
      const fFreq  = isActive ? 2.3 : 0.6

      for (let i = 0; i < N; i++) {
        let wx = ps.tx[i], wy = ps.ty[i]

        if (ps.tw[i]) {
          const distX = ps.tx[i] - (-0.7)
          const phase = flapT * fFreq * Math.PI * 2 + distX * 0.4
          const rawS  = Math.sin(phase)
          wy += (rawS - 0.18 * rawS * Math.abs(rawS)) * amp
          wx += Math.cos(phase) * amp * 0.10
        }

        ps.cx[i] += (wx - ps.cx[i]) * Math.min(1, dt * 16)
        ps.cy[i] += (wy - ps.cy[i]) * Math.min(1, dt * 16)

        posArr[i*3]   = ps.cx[i]
        posArr[i*3+1] = ps.cy[i]
        posArr[i*3+2] = ps.cz[i]

        // Silver-white for the formed swan, cyan tint on wing tips
        const wingTip = ps.tw[i] ? Math.abs(ps.tx[i]) / 3.8 : 0
        colArr[i*3]   = 0.82 - wingTip * 0.82
        colArr[i*3+1] = 0.92 - wingTip * 0.02
        colArr[i*3+2] = 1.0
      }
    }

    posAttr.needsUpdate = true
    colAttr.needsUpdate = true

    // Morph-based opacity
    if (ptRef.current) {
      mat.opacity = prog < 0.05 ? 0.85 : 0.90
    }
  })

  return <points ref={ptRef} geometry={geo} material={mat} frustumCulled={false} />
}

// ─── Responsive Camera ────────────────────────────────────────────────────────

function CameraAdapter() {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = size.width < 500 ? 62 : size.width < 900 ? 52 : 44
    cam.position.set(0, 0.5, 7)
    cam.lookAt(0, 0.3, 0)
    cam.updateProjectionMatrix()
  }, [camera, size.width])
  return null
}

// ─── AbyssLoader (named export — ChatStage.tsx import unchanged) ──────────────

interface AbyssProps {
  modeLabel:  string
  isActive:   boolean
  isComplete: boolean
}

export function AbyssLoader({ modeLabel, isActive, isComplete }: AbyssProps) {
  const dotColor = isComplete ? '#C9A96E' : '#00ffcc'
  const status   = isActive   ? `${modeLabel} · Analysing…`
                 : isComplete ? `${modeLabel} · Complete`
                 :              `${modeLabel} · Standby`

  return (
    <div
      style={{
        position:     'relative',
        width:        '100%',
        height:        300,
        borderRadius:  16,
        overflow:     'hidden',
        background:   '#03050a',
        border:       '1px solid rgba(255,255,255,0.07)',
        boxShadow:    '0 2px 32px rgba(0,0,0,0.72)',
      }}
    >
      {/* Canvas */}
      <Canvas
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        camera={{ position: [0, 0.5, 7], fov: 44 }}
        dpr={[1, 2]}
        gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }}
      >
        <CameraAdapter />
        <SwanPoints isActive={isActive} isComplete={isComplete} />
        <EffectComposer>
          <Bloom intensity={1.6} luminanceThreshold={0.08} luminanceSmoothing={0.9} radius={0.8} />
        </EffectComposer>
      </Canvas>

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        background: 'radial-gradient(ellipse at center, transparent 25%, rgba(3,5,10,0.65) 100%)',
      }} />

      {/* Status bar */}
      <div style={{
        position: 'absolute', top: 12, left: 14, right: 14,
        zIndex: 10, display: 'flex', alignItems: 'center', gap: 8, pointerEvents: 'none',
      }}>
        <span style={{
          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
          background: dotColor, boxShadow: `0 0 10px ${dotColor}aa`,
          animation: 'abyss-pulse 1.1s ease-in-out infinite', transition: 'background .4s',
        }} />
        <span style={{
          background: 'rgba(6,11,25,0.45)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 8, padding: '3px 12px',
          color: `${dotColor}cc`, fontSize: 11,
          fontFamily: '"JetBrains Mono","Courier New",monospace',
          letterSpacing: '0.14em', fontWeight: 600, transition: 'color .4s',
        }}>
          {status}
        </span>
      </div>

      <style>{`
        @keyframes abyss-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50% { opacity:.3; transform:scale(1.7); }
        }
      `}</style>
    </div>
  )
}
