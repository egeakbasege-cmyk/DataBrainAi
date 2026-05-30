'use client'

/**
 * AbyssLoader — SwanReveal Typographic Particle System
 * ──────────────────────────────────────────────────────────────────────────
 * Architecture:
 *   • React Three Fiber + drei + @react-three/postprocessing
 *   • 8 000 InstancedMesh planes, each textured from a Canvas glyph atlas
 *   • Phase 1 — Matrix Rain:  particles fall from above like code rain
 *   • Phase 2 — Formation:    particles are attracted to swan silhouette targets
 *   • Phase 3 — Wing Flap:    wing particles oscillate via sin(time) on Y / X axes
 *   • Bloom post-processing via EffectComposer for neon glow
 *
 * Coordinate system: camera at z=6, FOV≈50° → visible ~5.5 world-units tall
 * Swan occupies roughly X ∈ [-3.8, 3.8], Y ∈ [-1.8, 1.5]
 */

import { useRef, useMemo, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree }              from '@react-three/fiber'
import { EffectComposer, Bloom }                   from '@react-three/postprocessing'
import * as THREE                                  from 'three'

// ─── Constants ────────────────────────────────────────────────────────────────

const N           = 8_000          // total particle count
const CHARS       = '01$@&xs'      // 7 glyphs
const CHAR_COUNT  = CHARS.length   // 7
const ATLAS_COLS  = 4
const ATLAS_ROWS  = 2              // 4×2 = 8 cells (7 used + 1 empty)
const CELL_PX     = 64             // atlas cell size in pixels
const CHAR_SIZE   = 0.16           // world-units width/height of each plane quad

// Phase timing (seconds of elapsed time)
const T_RAIN_END  = 2.6
const T_FORM_END  = 5.8
const FLAP_FREQ   = 2.3            // Hz
const FLAP_AMP    = 0.60           // world-units peak displacement

// Colors
const CYAN   = new THREE.Color('#00ffcc')
const SILVER = new THREE.Color('#ccdcff')
const GOLD   = new THREE.Color('#ffdd88')   // beak/accent

// ─── Glyph Atlas (Canvas2D → THREE.CanvasTexture) ────────────────────────────

function buildAtlas(): THREE.CanvasTexture {
  const W = CELL_PX * ATLAS_COLS
  const H = CELL_PX * ATLAS_ROWS
  const cv = Object.assign(document.createElement('canvas'), { width: W, height: H })
  const c  = cv.getContext('2d')!
  c.clearRect(0, 0, W, H)
  c.fillStyle    = '#ffffff'
  c.font         = `bold ${Math.round(CELL_PX * 0.72)}px "JetBrains Mono","Courier New",monospace`
  c.textAlign    = 'center'
  c.textBaseline = 'middle'
  for (let i = 0; i < CHAR_COUNT; i++) {
    const col = i % ATLAS_COLS
    const row = Math.floor(i / ATLAS_COLS)
    c.fillText(CHARS[i], col * CELL_PX + CELL_PX / 2, row * CELL_PX + CELL_PX / 2)
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.minFilter   = THREE.LinearFilter
  tex.magFilter   = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

// ─── Swan Silhouette Target Generator ────────────────────────────────────────

interface SwanPt { x: number; y: number; isWing: boolean; colorT: number }

function ell_out(cx: number, cy: number, rx: number, ry: number, rot: number, n: number, wing = false, ct = 0): SwanPt[] {
  return Array.from({ length: n }, (_, i) => {
    const θ = (i / n) * Math.PI * 2
    const lx = Math.cos(θ) * rx, ly = Math.sin(θ) * ry
    return { x: cx + lx * Math.cos(rot) - ly * Math.sin(rot),
             y: cy + lx * Math.sin(rot) + ly * Math.cos(rot),
             isWing: wing, colorT: ct }
  })
}

function ell_fill(cx: number, cy: number, rx: number, ry: number, rot: number, n: number, wing = false, ct = 0): SwanPt[] {
  const pts: SwanPt[] = []
  let attempts = 0
  while (pts.length < n && attempts < n * 14) {
    attempts++
    const r = Math.sqrt(Math.random()), θ = Math.random() * Math.PI * 2
    const u = r * Math.cos(θ) * rx, v = r * Math.sin(θ) * ry
    pts.push({ x: cx + u * Math.cos(rot) - v * Math.sin(rot),
               y: cy + u * Math.sin(rot) + v * Math.cos(rot),
               isWing: wing, colorT: ct })
  }
  return pts
}

function neck_band(n: number): SwanPt[] {
  // Cubic bezier control points: body → head connection
  const P = [[1.55, 0.0], [2.05, 0.72], [2.55, 0.95], [2.85, 0.70]] as [number,number][]
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1), mt = 1 - t
    const bx = mt**3*P[0][0] + 3*mt**2*t*P[1][0] + 3*mt*t**2*P[2][0] + t**3*P[3][0]
    const by = mt**3*P[0][1] + 3*mt**2*t*P[1][1] + 3*mt*t**2*P[2][1] + t**3*P[3][1]
    return { x: bx + (Math.random() - 0.5) * 0.18, y: by + (Math.random() - 0.5) * 0.10, isWing: false, colorT: 0.15 }
  })
}

function buildSwanTargets(): SwanPt[] {
  return [
    // ── Body ──
    ...ell_out ( -0.5, -0.38,  2.35, 0.92, -0.08, 220, false, 0.3),
    ...ell_fill( -0.5, -0.38,  2.35, 0.92, -0.08, 1_350, false, 0.4),
    // ── Wing (isWing = true → animated) ──
    ...ell_out ( -0.7,  0.55,  2.15, 0.70, -0.14, 200, true,  0.05),
    ...ell_fill( -0.7,  0.55,  2.15, 0.70, -0.14, 2_900, true, 0.1),
    // ── Neck ──
    ...neck_band(260),
    // ── Head ──
    ...ell_out (  3.0,  0.70,  0.48, 0.45,  0.15, 110, false, 0.2),
    ...ell_fill(  3.0,  0.70,  0.48, 0.45,  0.15, 480, false, 0.25),
    // ── Beak ──
    ...ell_out (  3.65, 0.46,  0.47, 0.17,  0.05,  90, false, 0.9),
    ...ell_fill(  3.65, 0.46,  0.47, 0.17,  0.05, 180, false, 0.9),
    // ── Tail feathers ──
    ...ell_out ( -2.62,-0.20,  0.70, 0.40,  0.30,  70, false, 0.35),
    ...ell_fill( -2.62,-0.20,  0.70, 0.40,  0.30, 290, false, 0.4),
    // ── Water ripples ──
    ...ell_out ( -0.5, -1.35,  2.2,  0.24,  0.0,   80, false, 0.6),
    ...ell_fill( -0.5, -1.35,  2.2,  0.24,  0.0,  180, false, 0.6),
    ...ell_out ( -0.4, -1.62,  1.5,  0.14,  0.0,   50, false, 0.6),
    // ambient scatter (fills up to N)
  ]
}

// ─── Shaders ──────────────────────────────────────────────────────────────────

const vertGLSL = /* glsl */`
  attribute float aChar;
  attribute float aColorT;
  attribute float aAlpha;

  varying vec2  vUv;
  varying float vChar;
  varying float vColorT;
  varying float vAlpha;

  void main() {
    vUv    = uv;
    vChar  = aChar;
    vColorT = aColorT;
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`

const fragGLSL = /* glsl */`
  uniform sampler2D uAtlas;

  varying vec2  vUv;
  varying float vChar;
  varying float vColorT;
  varying float vAlpha;

  const float COLS = ${ATLAS_COLS}.0;
  const float ROWS = ${ATLAS_ROWS}.0;

  void main() {
    float col = mod(vChar, COLS);
    float row = floor(vChar / COLS);
    vec2 uv2  = vec2((col + vUv.x) / COLS, 1.0 - (row + 1.0 - vUv.y) / ROWS);
    float g   = texture2D(uAtlas, uv2).r;
    if (g < 0.07) discard;

    // cyan → silver → gold gradient driven by vColorT
    vec3 cyan   = vec3(0.0, 1.0, 0.80);
    vec3 silver = vec3(0.80, 0.87, 1.0);
    vec3 gold   = vec3(1.0, 0.87, 0.53);

    vec3 col3;
    if (vColorT > 0.75) {
      col3 = mix(silver, gold, (vColorT - 0.75) * 4.0);
    } else {
      col3 = mix(cyan, silver, vColorT / 0.75);
    }

    gl_FragColor = vec4(col3 * g, g * vAlpha);
  }
`

// ─── Particle state (plain JS, mutable) ───────────────────────────────────────

interface PState {
  // Rain start position
  rx: Float32Array; ry: Float32Array; rz: Float32Array
  rvy: Float32Array             // vertical fall speed (negative = downward)
  // Swan target
  tx: Float32Array; ty: Float32Array; tz: Float32Array
  tw: Uint8Array                // 1 = wing particle
  // Current interpolated world position
  cx: Float32Array; cy: Float32Array; cz: Float32Array
  // Per-particle appearance
  char:   Float32Array
  colorT: Float32Array
  alpha:  Float32Array
}

function initParticleState(): PState {
  const swanPts = buildSwanTargets()
  // Trim or pad to exactly N
  while (swanPts.length < N) {
    swanPts.push({
      x: (Math.random() - 0.5) * 7,
      y: (Math.random() - 0.5) * 3.5,
      isWing: false,
      colorT: Math.random() * 0.4,
    })
  }
  const pts = swanPts.slice(0, N)

  const ps: PState = {
    rx: new Float32Array(N), ry: new Float32Array(N), rz: new Float32Array(N),
    rvy: new Float32Array(N),
    tx: new Float32Array(N), ty: new Float32Array(N), tz: new Float32Array(N),
    tw: new Uint8Array(N),
    cx: new Float32Array(N), cy: new Float32Array(N), cz: new Float32Array(N),
    char:   new Float32Array(N),
    colorT: new Float32Array(N),
    alpha:  new Float32Array(N),
  }

  for (let i = 0; i < N; i++) {
    const p     = pts[i]
    // Rain start: random X, high Y, shallow Z spread
    ps.rx[i]    = (Math.random() - 0.5) * 14
    ps.ry[i]    = 5 + Math.random() * 14
    ps.rz[i]    = (Math.random() - 0.5) * 1.8
    ps.rvy[i]   = -(2.2 + Math.random() * 3.8)
    // Swan target
    ps.tx[i]    = p.x
    ps.ty[i]    = p.y
    ps.tz[i]    = (Math.random() - 0.5) * 0.35
    ps.tw[i]    = p.isWing ? 1 : 0
    // Start at rain position
    ps.cx[i]    = ps.rx[i]
    ps.cy[i]    = ps.ry[i]
    ps.cz[i]    = ps.rz[i]
    // Appearance
    ps.char[i]  = Math.floor(Math.random() * CHAR_COUNT)
    ps.colorT[i] = p.colorT + (Math.random() - 0.5) * 0.08
    ps.alpha[i] = 0.65 + Math.random() * 0.35
  }

  return ps
}

// ─── SwanParticles ────────────────────────────────────────────────────────────

interface SProps {
  isActive:   boolean
  isComplete: boolean
}

function SwanParticles({ isActive, isComplete }: SProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null!)

  // ── Build geometry + material (once) ────────────────────────────────────────
  const { geo, mat, ps } = useMemo(() => {
    const base = new THREE.PlaneGeometry(CHAR_SIZE, CHAR_SIZE)

    // Per-instance attributes
    const charArr   = new Float32Array(N)
    const colorTArr = new Float32Array(N)
    const alphaArr  = new Float32Array(N)
    base.setAttribute('aChar',   new THREE.InstancedBufferAttribute(charArr,   1))
    base.setAttribute('aColorT', new THREE.InstancedBufferAttribute(colorTArr, 1))
    base.setAttribute('aAlpha',  new THREE.InstancedBufferAttribute(alphaArr,  1))

    const atlas = buildAtlas()
    const mat   = new THREE.ShaderMaterial({
      uniforms:    { uAtlas: { value: atlas } },
      vertexShader:   vertGLSL,
      fragmentShader: fragGLSL,
      transparent: true,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    })

    const ps = initParticleState()
    return { geo: base, mat, ps }
  }, [])

  // Dispose on unmount
  useEffect(() => () => { geo.dispose(); mat.dispose() }, [geo, mat])

  // ── Seed initial matrices ────────────────────────────────────────────────────
  useEffect(() => {
    const m = new THREE.Matrix4()
    for (let i = 0; i < N; i++) {
      m.makeTranslation(ps.cx[i], ps.cy[i], ps.cz[i])
      meshRef.current.setMatrixAt(i, m)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [ps])

  // ── Animation state ──────────────────────────────────────────────────────────
  const elapsed       = useRef(0)
  const charTimer     = useRef(0)
  const matBuf        = useRef<Float32Array | null>(null)

  useFrame((_, dt) => {
    if (!meshRef.current) return
    elapsed.current  += dt
    charTimer.current += dt
    const t = elapsed.current

    // Lazy-init direct buffer reference (faster than setMatrixAt)
    if (!matBuf.current) {
      matBuf.current = meshRef.current.instanceMatrix.array as Float32Array
    }
    const mb = matBuf.current

    const charAttr   = geo.attributes.aChar   as THREE.InstancedBufferAttribute
    const colorTAttr = geo.attributes.aColorT as THREE.InstancedBufferAttribute
    const alphaAttr  = geo.attributes.aAlpha  as THREE.InstancedBufferAttribute
    const cArr   = charAttr.array   as Float32Array
    const ctArr  = colorTAttr.array as Float32Array
    const aArr   = alphaAttr.array  as Float32Array

    const flickerNow = charTimer.current > 0.085
    if (flickerNow) charTimer.current = 0

    // ── Phase 0: Matrix Rain ─────────────────────────────────────────────────
    if (t < T_RAIN_END) {
      const tNorm = t / T_RAIN_END   // 0 → 1 for brightness ramp

      for (let i = 0; i < N; i++) {
        ps.cy[i] += ps.rvy[i] * dt
        // Reset particle to top when it exits below screen
        if (ps.cy[i] < -7) {
          ps.cy[i]  = 6 + Math.random() * 10
          ps.cx[i]  = (Math.random() - 0.5) * 14
        }
        // Flicker glyphs
        if (flickerNow && Math.random() < 0.28) {
          ps.char[i] = Math.floor(Math.random() * CHAR_COUNT)
        }

        // Write matrix (translation only — column-major)
        const b = i * 16
        mb[b]  = 1; mb[b+4] = 0; mb[b+8]  = 0; mb[b+12] = ps.cx[i]
        mb[b+1]= 0; mb[b+5] = 1; mb[b+9]  = 0; mb[b+13] = ps.cy[i]
        mb[b+2]= 0; mb[b+6] = 0; mb[b+10] = 1; mb[b+14] = ps.cz[i]
        mb[b+3]= 0; mb[b+7] = 0; mb[b+11] = 0; mb[b+15] = 1

        cArr[i]  = ps.char[i]
        ctArr[i] = 0.05 + tNorm * 0.1     // stays bright cyan during rain
        aArr[i]  = 0.3 + Math.random() * 0.55
      }

    // ── Phase 1: Formation ───────────────────────────────────────────────────
    } else if (t < T_FORM_END) {
      const p     = (t - T_RAIN_END) / (T_FORM_END - T_RAIN_END)  // 0 → 1
      const speed = 1.8 + p * 5.0    // accelerates as formation completes

      for (let i = 0; i < N; i++) {
        // Spring attraction toward target
        ps.cx[i] += (ps.tx[i] - ps.cx[i]) * Math.min(1, dt * speed)
        ps.cy[i] += (ps.ty[i] - ps.cy[i]) * Math.min(1, dt * speed)
        ps.cz[i] += (ps.tz[i] - ps.cz[i]) * Math.min(1, dt * speed)

        if (flickerNow && Math.random() < 0.12) {
          ps.char[i] = Math.floor(Math.random() * CHAR_COUNT)
        }

        const b = i * 16
        mb[b]=1; mb[b+4]=0; mb[b+8]=0;  mb[b+12]=ps.cx[i]
        mb[b+1]=0;mb[b+5]=1;mb[b+9]=0;  mb[b+13]=ps.cy[i]
        mb[b+2]=0;mb[b+6]=0;mb[b+10]=1; mb[b+14]=ps.cz[i]
        mb[b+3]=0;mb[b+7]=0;mb[b+11]=0; mb[b+15]=1

        cArr[i]  = ps.char[i]
        ctArr[i] = ps.colorT[i] * p + 0.05 * (1 - p)
        aArr[i]  = Math.min(1, 0.25 + p * 0.85)
      }

    // ── Phase 2: Wing Flap ───────────────────────────────────────────────────
    } else {
      const ft   = t - T_FORM_END
      const fAmp = isComplete ? 0.08
                 : isActive   ? FLAP_AMP
                 :              FLAP_AMP * 0.35
      const fFreq = isActive ? FLAP_FREQ : FLAP_FREQ * 0.45

      for (let i = 0; i < N; i++) {
        let wx = ps.tx[i], wy = ps.ty[i]

        if (ps.tw[i]) {
          // Phase offset based on X distance from wing pivot → wave propagation
          const distX   = ps.tx[i] - (-0.7)
          const phase   = ft * fFreq * Math.PI * 2 + distX * 0.38
          // Asymmetric flap: upstroke faster than downstroke
          const rawSin  = Math.sin(phase)
          const flapY   = (rawSin - 0.18 * rawSin * Math.abs(rawSin)) * fAmp
          const flapX   = Math.cos(phase) * fAmp * 0.12
          wy += flapY
          wx += flapX
        }

        // Snap to flap position (high follow speed)
        ps.cx[i] += (wx - ps.cx[i]) * Math.min(1, dt * 18)
        ps.cy[i] += (wy - ps.cy[i]) * Math.min(1, dt * 18)

        if (flickerNow && Math.random() < 0.032) {
          ps.char[i] = Math.floor(Math.random() * CHAR_COUNT)
        }

        const b = i * 16
        mb[b]=1; mb[b+4]=0; mb[b+8]=0;  mb[b+12]=ps.cx[i]
        mb[b+1]=0;mb[b+5]=1;mb[b+9]=0;  mb[b+13]=ps.cy[i]
        mb[b+2]=0;mb[b+6]=0;mb[b+10]=1; mb[b+14]=ps.cz[i]
        mb[b+3]=0;mb[b+7]=0;mb[b+11]=0; mb[b+15]=1

        cArr[i]  = ps.char[i]
        ctArr[i] = ps.colorT[i]
        aArr[i]  = ps.alpha[i]
      }
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    charAttr.needsUpdate   = true
    colorTAttr.needsUpdate = true
    alphaAttr.needsUpdate  = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, N]}
      frustumCulled={false}
    />
  )
}

// ─── Responsive Camera ────────────────────────────────────────────────────────

function CameraAdapter() {
  const { camera, size } = useThree()
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    // Wider FOV on narrow containers to keep swan visible
    cam.fov = size.width < 500 ? 68 : size.width < 800 ? 58 : 50
    cam.updateProjectionMatrix()
    cam.position.set(0, 0, 6)
  }, [camera, size.width])
  return null
}

// ─── AbyssLoader (exported) ───────────────────────────────────────────────────

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
        background:   '#000005',
        border:       '1px solid rgba(255,255,255,0.06)',
        boxShadow:    '0 2px 32px rgba(0,0,0,0.72)',
      }}
    >
      {/* ── R3F Canvas (z-index: 0) ──────────────────────────────────────── */}
      <Canvas
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0 }}
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 2]}
        gl={{
          antialias:           false,
          alpha:               false,
          powerPreference:     'high-performance',
          preserveDrawingBuffer: false,
        }}
      >
        <CameraAdapter />

        <SwanParticles isActive={isActive} isComplete={isComplete} />

        {/* Neon bloom — threshold low so cyan chars glow */}
        <EffectComposer>
          <Bloom
            intensity={1.4}
            luminanceThreshold={0.05}
            luminanceSmoothing={0.5}
            radius={0.75}
          />
        </EffectComposer>
      </Canvas>

      {/* ── Vignette overlay ────────────────────────────────────────────── */}
      <div
        style={{
          position:      'absolute',
          inset:          0,
          zIndex:         1,
          pointerEvents: 'none',
          background:    'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,5,0.65) 100%)',
        }}
      />

      {/* ── Status bar (z-index: 10, glassmorphism) ─────────────────────── */}
      <div
        style={{
          position:       'absolute',
          top:             12,
          left:            14,
          right:           14,
          zIndex:          10,
          display:        'flex',
          alignItems:     'center',
          gap:             8,
          pointerEvents:  'none',
        }}
      >
        {/* Pulse dot */}
        <span
          style={{
            display:      'inline-block',
            width:         6,
            height:        6,
            borderRadius: '50%',
            flexShrink:    0,
            background:   dotColor,
            boxShadow:    `0 0 10px ${dotColor}aa`,
            animation:    'abyss-pulse 1.1s ease-in-out infinite',
            transition:   'background 0.4s',
          }}
        />

        {/* Label pill — glassmorphism */}
        <span
          style={{
            background:           'rgba(10, 15, 30, 0.40)',
            backdropFilter:       'blur(16px) saturate(180%)',
            WebkitBackdropFilter: 'blur(16px) saturate(180%)',
            border:               '1px solid rgba(255,255,255,0.05)',
            borderRadius:          8,
            padding:              '3px 12px',
            color:                `${dotColor}cc`,
            fontSize:              11,
            fontFamily:           '"JetBrains Mono","Courier New",monospace',
            letterSpacing:        '0.14em',
            fontWeight:            600,
            transition:           'color 0.4s',
          }}
        >
          {status}
        </span>
      </div>

      {/* Keyframe for pulse dot */}
      <style>{`
        @keyframes abyss-pulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:.4; transform:scale(1.6); }
        }
      `}</style>
    </div>
  )
}
